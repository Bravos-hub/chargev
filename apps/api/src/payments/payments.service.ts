import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common'
import { PrismaService } from '../common/prisma/prisma.service'
import { WalletService } from '../wallet/wallet.service'
import { AdyenService } from './adyen.service'
import { CurrencyConverterService } from './currency-converter.service'
import { CreatePaymentIntentDto, ConfirmPaymentDto } from './dto/payment.dto'
import { ConfigService } from '@nestjs/config'
import Stripe from 'stripe'
import axios from 'axios'

export type PaymentGateway = 'stripe' | 'adyen' | 'auto'

@Injectable()
export class PaymentsService {
    private readonly logger = new Logger(PaymentsService.name)
    private stripe: Stripe | null = null
    private readonly defaultGateway: PaymentGateway

    constructor(
        private prisma: PrismaService,
        private walletService: WalletService,
        private adyenService: AdyenService,
        private currencyConverter: CurrencyConverterService,
        private configService: ConfigService
    ) {
        const stripeSecret = this.configService.get<string>('STRIPE_SECRET_KEY')
        if (!stripeSecret) {
            this.logger.warn('STRIPE_SECRET_KEY not configured - Stripe payments disabled')
        } else {
            this.stripe = new Stripe(stripeSecret, {
                apiVersion: '2024-06-20' as any,
            })
        }

        this.defaultGateway = (this.configService.get<string>('DEFAULT_PAYMENT_GATEWAY') || 'auto') as PaymentGateway
    }

    private ensureStripe(): Stripe {
        if (!this.stripe) {
            throw new BadRequestException('Stripe payments are not configured')
        }
        return this.stripe
    }

    /**
     * Select payment gateway based on currency, region, or preference.
     */
    private selectGateway(currency?: string, preferredGateway?: PaymentGateway): 'stripe' | 'adyen' {
        if (preferredGateway && preferredGateway !== 'auto') {
            return preferredGateway
        }

        // Auto-select based on currency or region
        // Adyen supports more currencies and regions
        const adyenPreferredCurrencies = ['EUR', 'GBP', 'KES', 'ZAR', 'NGN', 'GHS']
        
        if (currency && adyenPreferredCurrencies.includes(currency.toUpperCase())) {
            return 'adyen'
        }

        // Default to Stripe if available, otherwise Adyen
        return this.stripe ? 'stripe' : 'adyen'
    }

    async createIntent(userId: string, dto: CreatePaymentIntentDto, preferredGateway?: PaymentGateway) {
        const gateway = this.selectGateway(dto.currency, preferredGateway || this.defaultGateway)
        const currency = (dto.currency || 'USD').toUpperCase()

        if (gateway === 'stripe') {
            return this.createStripeIntent(userId, dto)
        } else {
            return this.createAdyenIntent(userId, dto)
        }
    }

    private async createStripeIntent(userId: string, dto: CreatePaymentIntentDto) {
        const stripe = this.ensureStripe()
        const currency = (dto.currency || 'USD').toLowerCase()
        
        const intent = await stripe.paymentIntents.create({
            amount: Math.round(dto.amount * 100), // cents
            currency,
            metadata: { userId, bookingId: dto.bookingId || '', sessionId: dto.sessionId || '' }
        })

        return this.prisma.payment.create({
            data: {
                userId,
                amount: dto.amount,
                currency: dto.currency || 'USD',
                method: dto.method,
                bookingId: dto.bookingId,
                sessionId: dto.sessionId,
                status: 'PENDING',
                provider: 'stripe',
                providerTxId: intent.id,
                providerData: intent as any
            },
        })
    }

    private async createAdyenIntent(userId: string, dto: CreatePaymentIntentDto) {
        const currency = (dto.currency || 'USD').toUpperCase()
        const reference = `PAY-${userId}-${Date.now()}`
        const returnUrl = this.configService.get<string>('ADYEN_RETURN_URL') || 'https://evzone.app/payment/return'

        const adyenResponse = await this.adyenService.createPaymentSession(
            dto.amount,
            currency,
            reference,
            returnUrl,
            {
                userId,
                bookingId: dto.bookingId || '',
                sessionId: dto.sessionId || '',
            },
        )

        return this.prisma.payment.create({
            data: {
                userId,
                amount: dto.amount,
                currency,
                method: dto.method,
                bookingId: dto.bookingId,
                sessionId: dto.sessionId,
                status: 'PENDING',
                provider: 'adyen',
                providerTxId: adyenResponse.pspReference,
                providerData: adyenResponse as any
            },
        })
    }

    async confirmPayment(userId: string, dto: ConfirmPaymentDto) {
        const payment = await this.prisma.payment.findUnique({
            where: { id: dto.paymentId },
        })

        if (!payment) {
            throw new BadRequestException('Payment not found')
        }

        if (payment.userId !== userId) {
            throw new BadRequestException('Unauthorized payment confirmation')
        }

        if (!payment.providerTxId) {
            throw new BadRequestException('Payment provider transaction ID missing')
        }

        // Verify with appropriate gateway
        let verified = false
        if (payment.provider === 'stripe') {
            const stripe = this.ensureStripe()
            const intent = await stripe.paymentIntents.retrieve(payment.providerTxId)
            verified = intent.status === 'succeeded'
        } else if (payment.provider === 'adyen') {
            const status = await this.adyenService.getPaymentStatus(payment.providerTxId)
            verified = status.resultCode === 'Authorised' || status.resultCode === 'Captured'
        } else {
            throw new BadRequestException(`Unknown payment provider: ${payment.provider}`)
        }

        if (!verified) {
            throw new BadRequestException('Payment not yet succeeded on provider')
        }

        const updatedPayment = await this.prisma.payment.update({
            where: { id: dto.paymentId },
            data: {
                status: 'SUCCEEDED',
                providerTxId: dto.providerTxId,
            },
        })

        if (updatedPayment.status === 'SUCCEEDED') {
            await this.walletService.creditWallet(payment.userId, Number(payment.amount), 'Payment Top-up', payment.id)
        }

        return updatedPayment
    }

    async refund(id: string) {
        const payment = await this.prisma.payment.findUnique({ where: { id } })
        if (!payment) throw new NotFoundException('Payment not found')

        if (!payment.providerTxId) {
            throw new BadRequestException('Payment provider transaction ID missing for refund')
        }

        if (payment.provider === 'stripe') {
            const stripe = this.ensureStripe()
            await stripe.refunds.create({ payment_intent: payment.providerTxId })
        } else if (payment.provider === 'adyen') {
            await this.adyenService.refundPayment(
                payment.providerTxId,
                Number(payment.amount),
                payment.currency,
            )
        } else {
            throw new BadRequestException(`Refund not supported for provider: ${payment.provider}`)
        }

        return this.prisma.payment.update({
            where: { id },
            data: { status: 'REFUNDED' }
        })
    }

    async processCashPayment(userId: string, amount: number, reference: string) {
        return this.prisma.payment.create({
            data: {
                userId,
                amount,
                currency: 'USD',
                method: 'CASH',
                status: 'SUCCEEDED',
                provider: 'manual',
                providerTxId: reference
            }
        })
    }

    async processMobilePayment(userId: string, amount: number, phone: string) {
        // structural M-Pesa STK Push logic
        // TODO: Get access token, then call process.env.MPESA_STK_PUSH_URL
        console.log(`[MPESA] Initiating STK Push for ${phone}, amount ${amount}`)

        return this.prisma.payment.create({
            data: {
                userId,
                amount,
                currency: 'KES',
                method: 'MOBILE_MONEY',
                status: 'PENDING',
                provider: 'mpesa',
                providerData: { phone } as any
            }
        })
    }

    async findOne(id: string) {
        const payment = await this.prisma.payment.findUnique({ where: { id } })
        if (!payment) throw new NotFoundException('Payment not found')
        return payment
    }

    async findBySession(sessionId: string) {
        return this.prisma.payment.findMany({
            where: { sessionId }
        })
    }

    async getHistory(userId: string) {
        return this.prisma.payment.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
        })
    }

    /**
     * Handle Adyen webhook.
     */
    async handleAdyenWebhook(notification: any) {
        return this.adyenService.handleWebhook(notification)
    }
}
