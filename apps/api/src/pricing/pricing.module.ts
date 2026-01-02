import { Module } from '@nestjs/common'
import { PricingController } from './pricing.controller'
import { SubscriptionController } from './subscription.controller'
import { PricingService } from './pricing.service'
import { DynamicPricingService } from './dynamic-pricing.service'
import { SubscriptionService } from './subscription.service'
import { PrismaModule } from '../common/prisma/prisma.module'

@Module({
    imports: [PrismaModule],
    controllers: [PricingController, SubscriptionController],
    providers: [PricingService, DynamicPricingService, SubscriptionService],
    exports: [PricingService, DynamicPricingService, SubscriptionService],
})
export class PricingModule {}

