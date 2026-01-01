import { Module } from '@nestjs/common'
import { ChargersController } from './chargers/chargers.controller'
import { SessionsController } from './sessions/sessions.controller'
import { PrismaModule } from '../common/prisma/prisma.module'
import { RedisModule } from '../integrations/redis/redis.module'
import { KafkaModule } from '../integrations/kafka/kafka.module'
import { SessionsManagerModule } from '../sessions/sessions-manager.module'

@Module({
    imports: [PrismaModule, RedisModule, KafkaModule, SessionsManagerModule],
    controllers: [ChargersController, SessionsController],
})
export class ApiModule { }
