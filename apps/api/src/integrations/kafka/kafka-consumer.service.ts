import { Injectable, Logger, OnModuleInit, OnModuleDestroy, Inject, forwardRef } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Kafka, Consumer, EachMessagePayload } from 'kafkajs'
import { PrismaService } from '../../common/prisma/prisma.service'
import { CacheService } from '../redis/cache.service'
import { PubSubService } from '../redis/pubsub.service'
import { SessionManagerService } from '../../sessions/session-manager.service'

@Injectable()
export class KafkaConsumerService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(KafkaConsumerService.name)
    private consumer: Consumer | null = null
    private kafka: Kafka | null = null

    constructor(
        private config: ConfigService,
        private prisma: PrismaService,
        private cache: CacheService,
        private pubsub: PubSubService,
        @Inject(forwardRef(() => SessionManagerService))
        private sessionManager: SessionManagerService
    ) { }

    async onModuleInit() {
        const brokers = this.config.get<string>('KAFKA_BROKERS')
        if (!brokers) {
            this.logger.warn('KAFKA_BROKERS not set; Kafka consumer disabled')
            return
        }

        const clientId = this.config.get<string>('KAFKA_CLIENT_ID') || 'evzone-api'
        const groupId = this.config.get<string>('KAFKA_CONSUMER_GROUP') || 'evzone-api-consumers'

        this.kafka = new Kafka({
            clientId,
            brokers: brokers.split(',').map((b) => b.trim()),
        })

        this.consumer = this.kafka.consumer({ groupId })
        await this.consumer.connect()
        this.logger.log('Kafka consumer connected')

        // Subscribe to topics
        await this.consumer.subscribe({
            topics: [
                'charger.connected',
                'charger.boot',
                'charge_point.status_update',
                'session.start_requested',
                'session.stop_requested',
                'session.meter_values'
            ],
            fromBeginning: false
        })

        // Start consuming
        await this.consumer.run({
            eachMessage: async (payload: EachMessagePayload) => {
                await this.handleMessage(payload)
            },
        })

        this.logger.log('Kafka consumer started')
    }

    async onModuleDestroy() {
        if (this.consumer) {
            await this.consumer.disconnect()
            this.logger.log('Kafka consumer disconnected')
        }
    }

    private async handleMessage(payload: EachMessagePayload) {
        const { topic, partition, message } = payload
        const value = message.value?.toString()

        if (!value) return

        try {
            const data = JSON.parse(value)
            this.logger.log(`Received message from topic ${topic}: ${JSON.stringify(data)}`)

            switch (topic) {
                case 'charger.connected':
                    await this.handleChargerConnected(data)
                    break
                case 'charger.boot':
                    await this.handleChargerBoot(data)
                    break
                case 'charge_point.status_update':
                    await this.handleStatusUpdate(data)
                    break
                case 'session.start_requested':
                    await this.handleSessionStart(data)
                    break
                case 'session.stop_requested':
                    await this.handleSessionStop(data)
                    break
                case 'session.meter_values':
                    await this.handleMeterValues(data)
                    break
                default:
                    this.logger.warn(`Unknown topic: ${topic}`)
            }
        } catch (error) {
            this.logger.error(`Error processing message from ${topic}:`, error)
        }
    }

    private async handleChargerConnected(data: any) {
        this.logger.log(`Processing charger.connected: ${data.chargerCode}`)

        // Update station status in database
        try {
            await this.prisma.station.update({
                where: { id: data.chargerId },
                data: {
                    status: 'ONLINE',
                },
            })

            // Cache charger status with 1 hour TTL
            await this.cache.set(`charger:${data.chargerId}:status`, {
                status: 'ONLINE',
                chargerCode: data.chargerCode,
                lastConnected: data.timestamp,
            }, 3600) // 1 hour

            // Add to set of online chargers
            await this.cache.sAdd('chargers:online', data.chargerId)

            // Publish to Redis Pub/Sub for real-time updates
            await this.pubsub.publish(`charger:${data.chargerId}:connected`, {
                chargerId: data.chargerId,
                chargerCode: data.chargerCode,
                status: 'ONLINE',
                timestamp: data.timestamp,
            })

            this.logger.log(`Updated and cached station ${data.chargerCode} status to ONLINE`)
        } catch (error) {
            this.logger.error(`Failed to update station status:`, error)
        }
    }

    private async handleChargerBoot(data: any) {
        this.logger.log(`Processing charger.boot: ${JSON.stringify(data.chargerInfo)}`)

        // Cache boot information with charger metadata
        await this.cache.hSet(`charger:${data.uniqueId}:info`, 'bootInfo', data.chargerInfo)
        await this.cache.hSet(`charger:${data.uniqueId}:info`, 'lastBoot', data.timestamp)

        // Publish boot event
        await this.pubsub.publish(`charger:${data.uniqueId}:boot`, {
            chargerInfo: data.chargerInfo,
            timestamp: data.timestamp,
        })
    }

    private async handleStatusUpdate(data: any) {
        this.logger.log(`Processing status update for connector ${data.connectorId}: ${data.status}`)

        // Cache connector status
        const key = `connector:${data.uniqueId}:${data.connectorId}`
        await this.cache.set(key, {
            status: data.status,
            errorCode: data.errorCode,
            timestamp: data.timestamp,
        }, 300) // 5 minutes TTL

        // If charger is offline, remove from online set
        if (data.status === 'Unavailable' || data.errorCode !== 'NoError') {
            await this.cache.sRem('chargers:online', data.uniqueId)
        }

        // Publish status update for real-time notifications
        await this.pubsub.publish(`charger:${data.uniqueId}:status`, {
            connectorId: data.connectorId,
            status: data.status,
            errorCode: data.errorCode,
            timestamp: data.timestamp,
        })
    }

    private async handleSessionStart(data: any) {
        this.logger.log(`Processing session.start_requested: ${data.transactionId}`)

        try {
            // Start session via SessionManager
            const session = await this.sessionManager.startSession({
                stationId: data.chargerId,
                connectorId: data.connectorId,
                transactionId: data.transactionId,
                userId: data.idTag, // Map RFID tag to user if available
            })

            this.logger.log(`Session started: ${session.id}`)
        } catch (error) {
            this.logger.error(`Failed to start session:`, error)
        }
    }

    private async handleSessionStop(data: any) {
        this.logger.log(`Processing session.stop_requested: ${data.transactionId}`)

        try {
            // Calculate energy delivered from meter values
            const session = await this.sessionManager.getSession(data.transactionId)
            if (session) {
                // Update with final meter value if available
                if (data.meterStop !== undefined) {
                    const energyDelivered = (data.meterStop - (session.metadata?.meterStart || 0)) / 1000 // Wh to kWh
                    await this.sessionManager.updateSession(data.transactionId, {
                        energyDelivered,
                        metadata: { meterStop: data.meterStop, stopReason: data.reason }
                    })
                }

                // End the session
                await this.sessionManager.endSession(data.transactionId, 'COMPLETED')
            }
        } catch (error) {
            this.logger.error(`Failed to stop session:`, error)
        }
    }

    private async handleMeterValues(data: any) {
        this.logger.log(`Processing meter values for transaction: ${data.transactionId}`)

        try {
            if (!data.transactionId) return

            // Extract energy value from meter values
            const meterValues = data.meterValues || []
            let energyDelivered = 0

            for (const mv of meterValues) {
                const sampledValues = mv.sampledValue || []
                for (const sv of sampledValues) {
                    if (sv.measurand === 'Energy.Active.Import.Register') {
                        energyDelivered = parseFloat(sv.value) / 1000 // Wh to kWh
                    }
                }
            }

            // Update session with latest meter values
            if (energyDelivered > 0) {
                await this.sessionManager.updateSession(data.transactionId, {
                    energyDelivered,
                    cost: energyDelivered * 0.30, // Simple pricing: $0.30/kWh
                    metadata: { lastMeterUpdate: new Date().toISOString() }
                })
            }
        } catch (error) {
            this.logger.error(`Failed to process meter values:`, error)
        }
    }
}
