import { Body, Controller, Get, Post, Request, UseGuards, Param } from '@nestjs/common'
import { WalletService } from './wallet.service'
import { TopUpWalletDto } from '../payments/dto/wallet.dto'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'

@Controller('wallet')
@UseGuards(JwtAuthGuard)
export class WalletController {
    constructor(private readonly walletService: WalletService) { }

    @Get('balance')
    async getBalance(@Request() req: any) {
        const wallet = await this.walletService.getWallet(req.user.id)
        return { balance: wallet.balance, currency: wallet.currency }
    }

    @Get('transactions')
    getTransactions(@Request() req: any) {
        return this.walletService.getTransactions(req.user.id)
    }

    @Post('topup')
    async topUp(@Request() req: any, @Body() dto: TopUpWalletDto) {
        // Mocking topup - usually would involve checking a successful payment intent
        return this.walletService.creditWallet(req.user.id, dto.amount, 'Wallet Top-up', 'TOPUP-' + Date.now())
    }

    @Post('lock')
    lock(@Request() req: any) {
        return this.walletService.setLockStatus(req.user.id, true)
    }

    @Post('unlock')
    unlock(@Request() req: any) {
        return this.walletService.setLockStatus(req.user.id, false)
    }

    @Post('transfer')
    transfer(@Request() req: any, @Body() dto: { toUserId: string, amount: number, description: string }) {
        return this.walletService.transfer(req.user.id, dto.toUserId, dto.amount, dto.description)
    }
}
