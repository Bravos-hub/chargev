import { Module, forwardRef } from '@nestjs/common'
import { ChargersService } from './chargers.service'
import { ChargersController } from './chargers.controller'
import { ChargerGroupService } from './charger-group.service'
import { VendorConfigService } from './vendor-config.service'
import { RedisModule } from '../integrations/redis/redis.module'
import { KafkaModule } from '../integrations/kafka/kafka.module'
import { PrismaModule } from '../common/prisma/prisma.module'

@Module({
    imports: [RedisModule, forwardRef(() => KafkaModule), PrismaModule],
    controllers: [ChargersController],
    providers: [ChargersService, ChargerGroupService, VendorConfigService],
    exports: [ChargersService, ChargerGroupService, VendorConfigService],
})
export class ChargersManagerModule {}

