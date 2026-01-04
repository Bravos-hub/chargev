import { Module } from '@nestjs/common'
import { PaymentsService } from './payments.service'
import { PaymentsController } from './payments.controller'
import { AdyenService } from './adyen.service'
import { CurrencyConverterService } from './currency-converter.service'
import { PrismaModule } from '../common/prisma/prisma.module'
import { WalletModule } from '../wallet/wallet.module'
import { RedisModule } from '../integrations/redis/redis.module'

@Module({
    imports: [PrismaModule, WalletModule, RedisModule],
    controllers: [PaymentsController],
    providers: [PaymentsService, AdyenService, CurrencyConverterService],
    exports: [PaymentsService, CurrencyConverterService],
})
export class PaymentsModule { }
