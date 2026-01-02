import { Module, forwardRef } from '@nestjs/common'
import { KafkaService } from './kafka.service'
import { KafkaConsumerService } from './kafka-consumer.service'
import { PrismaModule } from '../../common/prisma/prisma.module'
import { RedisModule } from '../redis/redis.module'
import { SessionsManagerModule } from '../../sessions/sessions-manager.module'

@Module({
  imports: [PrismaModule, RedisModule, forwardRef(() => SessionsManagerModule)],
  providers: [KafkaService, KafkaConsumerService],
  exports: [KafkaService],
})
export class KafkaModule { }
