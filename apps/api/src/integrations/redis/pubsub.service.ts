import { Injectable, Logger } from '@nestjs/common'
import { RedisService } from './redis.service'
import Redis from 'ioredis'

@Injectable()
export class PubSubService {
    private readonly logger = new Logger(PubSubService.name)
    private publisher: Redis | null = null
    private subscriber: Redis | null = null

    constructor(private redis: RedisService) {
        const client = this.redis.getClient()
        if (client) {
            // Create separate publisher and subscriber connections
            this.publisher = client
            this.subscriber = client.duplicate()
            this.logger.log('Redis Pub/Sub initialized')
        } else {
            this.logger.warn('Redis not available, Pub/Sub disabled')
        }
    }

    /**
     * Publish message to a channel
     */
    async publish(channel: string, message: any): Promise<number> {
        if (!this.publisher) return 0

        try {
            const serialized = JSON.stringify(message)
            const receivers = await this.publisher.publish(channel, serialized)
            this.logger.debug(`Published to ${channel}: ${receivers} receivers`)
            return receivers
        } catch (error) {
            this.logger.error(`Error publishing to ${channel}:`, error)
            return 0
        }
    }

    /**
     * Subscribe to a channel
     */
    async subscribe(channel: string, callback: (message: any) => void): Promise<void> {
        if (!this.subscriber) return

        try {
            await this.subscriber.subscribe(channel)
            this.subscriber.on('message', (ch, msg) => {
                if (ch === channel) {
                    try {
                        const parsed = JSON.parse(msg)
                        callback(parsed)
                    } catch (error) {
                        this.logger.error(`Error parsing message from ${channel}:`, error)
                    }
                }
            })
            this.logger.log(`Subscribed to channel: ${channel}`)
        } catch (error) {
            this.logger.error(`Error subscribing to ${channel}:`, error)
        }
    }

    /**
     * Unsubscribe from a channel
     */
    async unsubscribe(channel: string): Promise<void> {
        if (!this.subscriber) return

        try {
            await this.subscriber.unsubscribe(channel)
            this.logger.log(`Unsubscribed from channel: ${channel}`)
        } catch (error) {
            this.logger.error(`Error unsubscribing from ${channel}:`, error)
        }
    }

    /**
     * Subscribe to multiple channels with pattern matching
     */
    async psubscribe(pattern: string, callback: (channel: string, message: any) => void): Promise<void> {
        if (!this.subscriber) return

        try {
            await this.subscriber.psubscribe(pattern)
            this.subscriber.on('pmessage', (pat, ch, msg) => {
                if (pat === pattern) {
                    try {
                        const parsed = JSON.parse(msg)
                        callback(ch, parsed)
                    } catch (error) {
                        this.logger.error(`Error parsing message from ${ch}:`, error)
                    }
                }
            })
            this.logger.log(`Pattern subscribed: ${pattern}`)
        } catch (error) {
            this.logger.error(`Error pattern subscribing to ${pattern}:`, error)
        }
    }

    /**
     * Clean up on module destroy
     */
    async onModuleDestroy() {
        if (this.subscriber) {
            await this.subscriber.quit()
        }
    }
}
