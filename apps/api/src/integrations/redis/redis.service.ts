import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import Redis from 'ioredis'

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name)
  private client: Redis | null = null

  constructor(private config: ConfigService) {
    const url = this.config.get<string>('REDIS_URL')
    if (!url) {
      this.logger.warn('REDIS_URL not set; Redis disabled')
      return
    }

    this.client = new Redis(url)

    // Add connection event listeners
    this.client.on('connect', () => {
      this.logger.log('Redis connected successfully')
    })

    this.client.on('ready', () => {
      this.logger.log('Redis ready to accept commands')
    })

    this.client.on('error', (error) => {
      this.logger.error('Redis connection error:', error)
    })

    this.client.on('close', () => {
      this.logger.warn('Redis connection closed')
    })
  }

  getClient(): Redis | null {
    return this.client
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.quit()
    }
  }
}
