import { Module } from '@nestjs/common'
import { SmartChargingService } from './smart-charging.service'
import { SmartChargingController } from './smart-charging.controller'
import { PrismaModule } from '../common/prisma/prisma.module'
import { RedisModule } from '../integrations/redis/redis.module'
import { SessionsManagerModule } from '../sessions/sessions-manager.module'
import { KafkaModule } from '../integrations/kafka/kafka.module'

@Module({
    imports: [PrismaModule, RedisModule, SessionsManagerModule, KafkaModule],
    controllers: [SmartChargingController],
    providers: [SmartChargingService],
    exports: [SmartChargingService],
})
export class SmartChargingModule { }
