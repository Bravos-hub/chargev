import { Body, Controller, Get, Post, Request, UseGuards, Param } from '@nestjs/common'
import { PaymentsService } from './payments.service'
import { WalletService } from './wallet.service'
import { CreatePaymentIntentDto, ConfirmPaymentDto } from './dto/payment.dto'
import { TopUpWalletDto } from './dto/wallet.dto'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'

@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentsController {
    constructor(
        private paymentsService: PaymentsService,
        private walletService: WalletService
    ) { }

    // =================== PAYMENT ===================
    @Post('intent')
    createIntent(@Request() req: any, @Body() dto: CreatePaymentIntentDto) {
        return this.paymentsService.createIntent(req.user.id, dto)
    }

    @Post('confirm')
    confirmPayment(@Request() req: any, @Body() dto: ConfirmPaymentDto) {
        return this.paymentsService.confirmPayment(req.user.id, dto)
    }

    @Post(':id/refund')
    refund(@Param('id') id: string) {
        return this.paymentsService.refund(id)
    }

    @Post('cash')
    processCash(@Request() req: any, @Body() dto: { amount: number, reference: string }) {
        return this.paymentsService.processCashPayment(req.user.id, dto.amount, dto.reference)
    }

    @Post('mobile')
    processMobile(@Request() req: any, @Body() dto: { amount: number, phone: string }) {
        return this.paymentsService.processMobilePayment(req.user.id, dto.amount, dto.phone)
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.paymentsService.findOne(id)
    }

    @Get('session/:sessionId')
    findBySession(@Param('sessionId') sessionId: string) {
        return this.paymentsService.findBySession(sessionId)
    }
}
