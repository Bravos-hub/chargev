import { Module } from '@nestjs/common'
import { OCPIService } from './ocpi.service'
import { OCPIController } from './ocpi.controller'
import { TariffSyncService } from './tariff-sync.service'
import { PrismaModule } from '../common/prisma/prisma.module'
import { PricingModule } from '../pricing/pricing.module'
import { ScheduleModule } from '@nestjs/schedule'

@Module({
    imports: [PrismaModule, PricingModule, ScheduleModule],
    controllers: [OCPIController],
    providers: [OCPIService, TariffSyncService],
    exports: [OCPIService, TariffSyncService],
})
export class OCPIModule {}

