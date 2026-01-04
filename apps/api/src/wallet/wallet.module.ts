import { Module } from '@nestjs/common'
import { WalletService } from './wallet.service'
import { WalletController } from './wallet.controller'
import { GroupWalletService } from './group-wallet.service'
import { GroupWalletController } from './group-wallet.controller'
import { PrismaModule } from '../common/prisma/prisma.module'

@Module({
    imports: [PrismaModule],
    controllers: [WalletController, GroupWalletController],
    providers: [WalletService, GroupWalletService],
    exports: [WalletService, GroupWalletService],
})
export class WalletModule { }
