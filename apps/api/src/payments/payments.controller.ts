import { Body, Controller, Get, Post, Request, UseGuards } from '@nestjs/common'
import { PaymentsService } from './payments.service'
import { WalletService } from './wallet.service'
import { CreatePaymentIntentDto, ConfirmPaymentDto } from './dto/payment.dto'
import { TopUpWalletDto } from './dto/wallet.dto'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'

@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentsController {
    constructor(
        private paymentsService: PaymentsService,
        private walletService: WalletService
    ) { }

    // =================== PAYMENT ===================
    @Post('intent')
    createIntent(@Request() req, @Body() dto: CreatePaymentIntentDto) {
        return this.paymentsService.createIntent(req.user.id, dto)
    }

    @Post('confirm')
    confirmPayment(@Request() req, @Body() dto: ConfirmPaymentDto) {
        return this.paymentsService.confirmPayment(req.user.id, dto)
    }

    // =================== WALLET ===================
    @Get('wallet')
    getWallet(@Request() req) {
        return this.walletService.getWallet(req.user.id)
    }

    @Get('wallet/transactions')
    getTransactions(@Request() req) {
        return this.walletService.getTransactions(req.user.id)
    }

    @Post('wallet/top-up')
    async topUp(@Request() req, @Body() dto: TopUpWalletDto) {
        // For now, simple mock top-up
        // In reality, this would initiate a payment intent first, then credit on success
        await this.walletService.creditWallet(req.user.id, dto.amount, 'Manual Top-up', 'REF-' + Date.now())
        return { success: true, message: 'Wallet credited (Mock)' }
    }
}
