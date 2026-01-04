import { Body, Controller, Get, Post, Request, UseGuards, Param, Query } from '@nestjs/common'
import { PaymentsService } from './payments.service'
import { WalletService } from '../wallet/wallet.service'
import { CurrencyConverterService } from './currency-converter.service'
import { CreatePaymentIntentDto, ConfirmPaymentDto } from './dto/payment.dto'
import { TopUpWalletDto } from './dto/wallet.dto'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'

@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentsController {
    constructor(
        private paymentsService: PaymentsService,
        private walletService: WalletService,
        private currencyConverter: CurrencyConverterService,
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

    // =================== CURRENCY CONVERSION ===================

    @Get('currency/convert')
    async convertCurrency(
        @Query('amount') amount: string,
        @Query('from') from: string,
        @Query('to') to: string,
    ) {
        return this.currencyConverter.convert(parseFloat(amount), from, to)
    }

    @Get('currency/rate')
    async getExchangeRate(
        @Query('from') from: string,
        @Query('to') to: string,
    ) {
        return this.currencyConverter.getExchangeRate(from, to)
    }

    @Get('currency/rates')
    async getMultipleRates(
        @Query('from') from: string,
        @Query('to') to: string, // Comma-separated list
    ) {
        const toCurrencies = to.split(',').map((c) => c.trim())
        return this.currencyConverter.getMultipleRates(from, toCurrencies)
    }

    // =================== ADYEN WEBHOOK ===================

    @Post('adyen/webhook')
    async handleAdyenWebhook(@Body() notification: any) {
        // Note: In production, verify webhook signature
        return this.paymentsService.handleAdyenWebhook(notification)
    }
}
