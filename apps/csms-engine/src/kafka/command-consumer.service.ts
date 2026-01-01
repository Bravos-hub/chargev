import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Kafka, Consumer, EachMessagePayload } from 'kafkajs'
import { OcppCommandService } from '../ocpp/ocpp-command.service'

@Injectable()
export class CommandConsumerService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(CommandConsumerService.name)
    private consumer: Consumer | null = null
    private kafka: Kafka | null = null

    constructor(
        private config: ConfigService,
        private commandService: OcppCommandService
    ) { }

    async onModuleInit() {
        const brokers = this.config.get<string>('KAFKA_BROKERS')
        if (!brokers) {
            this.logger.warn('KAFKA_BROKERS not set; command consumer disabled')
            return
        }

        const clientId = 'evzone-csms'
        const groupId = 'csms-command-consumers'

        this.kafka = new Kafka({
            clientId,
            brokers: brokers.split(',').map((b) => b.trim()),
        })

        this.consumer = this.kafka.consumer({ groupId })
        await this.consumer.connect()
        this.logger.log('Command consumer connected')

        // Subscribe to command topics
        await this.consumer.subscribe({
            topics: ['ocpp.command.request'],
            fromBeginning: false
        })

        // Start consuming
        await this.consumer.run({
            eachMessage: async (payload: EachMessagePayload) => {
                await this.handleCommand(payload)
            },
        })

        this.logger.log('Command consumer started')
    }

    async onModuleDestroy() {
        if (this.consumer) {
            await this.consumer.disconnect()
            this.logger.log('Command consumer disconnected')
        }
    }

    private async handleCommand(payload: EachMessagePayload) {
        const { topic, message } = payload
        const value = message.value?.toString()

        if (!value) return

        try {
            const command = JSON.parse(value)
            const { chargerId, action, params, responseKey } = command

            this.logger.log(`Processing command ${action} for charger ${chargerId}`)

            let result: any

            switch (action) {
                case 'RemoteStartTransaction':
                    result = await this.commandService.remoteStartTransaction(
                        chargerId,
                        params.idTag,
                        params.connectorId,
                        params.chargingProfile
                    )
                    break

                case 'RemoteStopTransaction':
                    result = await this.commandService.remoteStopTransaction(
                        chargerId,
                        params.transactionId
                    )
                    break

                case 'Reset':
                    result = await this.commandService.reset(chargerId, params.type || 'Soft')
                    break

                case 'UnlockConnector':
                    result = await this.commandService.unlockConnector(
                        chargerId,
                        params.connectorId
                    )
                    break

                case 'ChangeConfiguration':
                    result = await this.commandService.changeConfiguration(
                        chargerId,
                        params.key,
                        params.value
                    )
                    break

                case 'GetConfiguration':
                    result = await this.commandService.getConfiguration(
                        chargerId,
                        params.keys
                    )
                    break

                case 'GetDiagnostics':
                    result = await this.commandService.getDiagnostics(
                        chargerId,
                        params.location,
                        params.retries,
                        params.retryInterval,
                        params.startTime,
                        params.stopTime
                    )
                    break

                case 'UpdateFirmware':
                    result = await this.commandService.updateFirmware(
                        chargerId,
                        params.location,
                        params.retrieveDate,
                        params.retries,
                        params.retryInterval
                    )
                    break

                default:
                    throw new Error(`Unknown command: ${action}`)
            }

            this.logger.log(`Command ${action} completed for ${chargerId}:`, result)

            // Publish result back if responseKey provided
            if (responseKey && this.kafka) {
                const producer = this.kafka.producer()
                await producer.connect()
                await producer.send({
                    topic: 'ocpp.command.response',
                    messages: [{
                        key: responseKey,
                        value: JSON.stringify({ success: true, result, chargerId, action })
                    }]
                })
                await producer.disconnect()
            }
        } catch (error) {
            this.logger.error(`Error processing command:`, error)

            // Publish error response if responseKey provided
            const command = JSON.parse(value)
            if (command.responseKey && this.kafka) {
                const producer = this.kafka.producer()
                await producer.connect()
                await producer.send({
                    topic: 'ocpp.command.response',
                    messages: [{
                        key: command.responseKey,
                        value: JSON.stringify({
                            success: false,
                            error: error.message,
                            chargerId: command.chargerId,
                            action: command.action
                        })
                    }]
                })
                await producer.disconnect()
            }
        }
    }
}
