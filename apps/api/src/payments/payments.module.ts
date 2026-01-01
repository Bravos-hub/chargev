import { Module } from '@nestjs/common'
import { PaymentsService } from './payments.service'
import { WalletService } from './wallet.service'
import { PaymentsController } from './payments.controller'
import { PrismaModule } from '../../common/prisma/prisma.module'

@Module({
    imports: [PrismaModule],
    controllers: [PaymentsController],
    providers: [PaymentsService, WalletService],
    exports: [PaymentsService, WalletService],
})
export class PaymentsModule { }
