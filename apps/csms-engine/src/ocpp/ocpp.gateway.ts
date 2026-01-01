import {
    OnGatewayConnection,
    OnGatewayDisconnect,
    OnGatewayInit,
    SubscribeMessage,
    WebSocketGateway,
    WebSocketServer,
} from '@nestjs/websockets'
import { Logger } from '@nestjs/common'
import { Server, WebSocket } from 'ws'
import { IncomingMessage } from 'http'
import { PrismaService } from '../prisma/prisma.service'
import { KafkaService } from '../kafka/kafka.service'
import { OcppCommandService } from './ocpp-command.service'

@WebSocketGateway({
    path: '/ocpp',
    transports: ['websocket'],
})
export class OcppGateway
    implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
    private readonly logger = new Logger(OcppGateway.name)

    @WebSocketServer()
    server!: Server

    constructor(
        private prisma: PrismaService,
        private kafka: KafkaService,
        private commandService: OcppCommandService
    ) { }

    async afterInit(server: Server) {
        this.logger.log('OCPP WebSocket Gateway initialized')
    }

    async handleConnection(client: WebSocket, request: IncomingMessage) {
        const chargerId = request.url?.split('/').pop()
        this.logger.log(`Charger attempting connection: ${chargerId}`)

        if (!chargerId) {
            this.logger.warn('Connection rejected: No charger ID provided')
            client.close(1008, 'No charger ID provided')
            return
        }

        // Validate charger exists in database
        try {
            const station = await this.prisma.station.findUnique({
                where: { code: chargerId }
            })

            if (!station) {
                this.logger.warn(`Connection rejected: Unknown charger ${chargerId}`)
                client.close(1008, 'Unknown charger ID')
                return
            }

            this.logger.log(`Charger connected: ${chargerId}`)

                // Store chargerID on client for disconnect tracking
                ; (client as any).chargerId = chargerId

            // Register client with command service for remote commands
            this.commandService.registerClient(chargerId, client)

            // Publish connection event to Kafka
            await this.kafka.emit('charger.connected', {
                chargerId: station.id,
                chargerCode: station.code,
                timestamp: new Date().toISOString()
            })
        } catch (error) {
            this.logger.error(`Error validating charger ${chargerId}:`, error)
            client.close(1011, 'Internal server error')
        }
    }

    handleDisconnect(client: WebSocket & { chargerId?: string }) {
        if (client.chargerId) {
            this.commandService.unregisterClient(client.chargerId)
            this.logger.log(`Charger disconnected: ${client.chargerId}`)
        } else {
            this.logger.log('Charger disconnected (unknown ID)')
        }
    }

    @SubscribeMessage('message')
    async handleMessage(client: WebSocket, payload: any): Promise<void> {
        try {
            const message = JSON.parse(payload) // Payload is usually a string in raw ws
            if (!Array.isArray(message)) return

            const [messageTypeId, uniqueId, action, data] = message

            if (messageTypeId === 2) { // CALL
                this.logger.log(`Received ${action} from ${uniqueId}: ${JSON.stringify(data)}`)

                if (action === 'BootNotification') {
                    const response = [
                        3, // CALLRESULT
                        uniqueId,
                        {
                            status: 'Accepted',
                            currentTime: new Date().toISOString(),
                            interval: 300 // Heartbeat interval
                        }
                    ]
                    client.send(JSON.stringify(response))
                    this.logger.log(`Sent BootNotification response to ${uniqueId}`)

                    // Publish to Kafka
                    await this.kafka.emit('charger.boot', {
                        uniqueId,
                        chargerInfo: data,
                        timestamp: new Date().toISOString()
                    })
                } else if (action === 'Heartbeat') {
                    const response = [
                        3,
                        uniqueId,
                        { currentTime: new Date().toISOString() }
                    ]
                    client.send(JSON.stringify(response))
                } else if (action === 'StatusNotification') {
                    const response = [3, uniqueId, {}]
                    client.send(JSON.stringify(response))

                    // Publish to Kafka
                    await this.kafka.emit('charge_point.status_update', {
                        uniqueId,
                        status: data.status,
                        connectorId: data.connectorId,
                        errorCode: data.errorCode,
                        timestamp: data.timestamp || new Date().toISOString()
                    })
                } else if (action === 'StartTransaction') {
                    // Start a new charging session
                    const transactionId = `txn_${Date.now()}_${data.connectorId}`

                    const response = [
                        3,
                        uniqueId,
                        {
                            transactionId,
                            idTagInfo: {
                                status: 'Accepted',
                                expiryDate: new Date(Date.now() + 86400000).toISOString() // 24 hours
                            }
                        }
                    ]
                    client.send(JSON.stringify(response))

                    // Publish to Kafka for SessionManager to handle
                    await this.kafka.emit('session.start_requested', {
                        transactionId,
                        chargerId: uniqueId,
                        connectorId: data.connectorId,
                        idTag: data.idTag,
                        meterStart: data.meterStart,
                        timestamp: data.timestamp || new Date().toISOString(),
                        reservationId: data.reservationId
                    })

                    this.logger.log(`StartTransaction accepted: ${transactionId}`)
                } else if (action === 'StopTransaction') {
                    const response = [
                        3,
                        uniqueId,
                        {
                            idTagInfo: {
                                status: 'Accepted'
                            }
                        }
                    ]
                    client.send(JSON.stringify(response))

                    // Publish to Kafka for SessionManager to finalize
                    await this.kafka.emit('session.stop_requested', {
                        transactionId: data.transactionId,
                        meterStop: data.meterStop,
                        timestamp: data.timestamp || new Date().toISOString(),
                        reason: data.reason,
                        transactionData: data.transactionData
                    })

                    this.logger.log(`StopTransaction accepted: ${data.transactionId}`)
                } else if (action === 'MeterValues') {
                    const response = [3, uniqueId, {}]
                    client.send(JSON.stringify(response))

                    // Publish meter values to Kafka for session updates
                    await this.kafka.emit('session.meter_values', {
                        connectorId: data.connectorId,
                        transactionId: data.transactionId,
                        meterValues: data.meterValue,
                        timestamp: new Date().toISOString()
                    })
                }
            } else if (messageTypeId === 3) { // CALLRESULT
                this.logger.log(`Received CALLRESULT for ${uniqueId}`)
                this.commandService.handleResponse(uniqueId, action) // action is actually the payload for CALLRESULT
            } else if (messageTypeId === 4) { // CALLERROR
                this.logger.log(`Received CALLERROR for ${uniqueId}: ${action}`) // action is errorCode for CALLERROR
                this.commandService.handleResponse(uniqueId, { errorCode: action, errorDescription: data }, true)
            }
        } catch (e) {
            this.logger.error('Failed to parse message', e)
        }
    }
}
