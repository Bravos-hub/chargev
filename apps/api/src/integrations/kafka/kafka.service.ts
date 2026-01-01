import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Kafka, Producer } from 'kafkajs'

@Injectable()
export class KafkaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaService.name)
  private producer: Producer | null = null

  constructor(private config: ConfigService) {}

  async onModuleInit() {
    const brokers = this.config.get<string>('KAFKA_BROKERS')
    if (!brokers) {
      this.logger.warn('KAFKA_BROKERS not set; Kafka disabled')
      return
    }

    const clientId = this.config.get<string>('KAFKA_CLIENT_ID') || 'evzone-api'
    const kafka = new Kafka({
      clientId,
      brokers: brokers.split(',').map((b) => b.trim()),
    })
    this.producer = kafka.producer()
    await this.producer.connect()
    this.logger.log('Kafka producer connected')
  }

  async onModuleDestroy() {
    if (this.producer) {
      await this.producer.disconnect()
    }
  }

  async emit(topic: string, message: unknown) {
    if (!this.producer) return
    await this.producer.send({
      topic,
      messages: [{ value: JSON.stringify(message) }],
    })
  }
}
