import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common'
import { PrismaService } from '../common/prisma/prisma.service'
import { WalletService } from '../wallet/wallet.service'
import { CreatePaymentIntentDto, ConfirmPaymentDto } from './dto/payment.dto'
import { ConfigService } from '@nestjs/config'
import Stripe from 'stripe'
import axios from 'axios'

@Injectable()
export class PaymentsService {
    private readonly logger = new Logger(PaymentsService.name)
    private stripe: Stripe | null = null

    constructor(
        private prisma: PrismaService,
        private walletService: WalletService,
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
    }

    private ensureStripe(): Stripe {
        if (!this.stripe) {
            throw new BadRequestException('Stripe payments are not configured')
        }
        return this.stripe
    }

    async createIntent(userId: string, dto: CreatePaymentIntentDto) {
        const stripe = this.ensureStripe()
        const intent = await stripe.paymentIntents.create({
            amount: Math.round(dto.amount * 100), // cents
            currency: dto.currency || 'usd',
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

        // Verify with Stripe
        if (!payment.providerTxId) {
            throw new BadRequestException('Payment provider transaction ID missing')
        }
        const stripe = this.ensureStripe()
        const intent = await stripe.paymentIntents.retrieve(payment.providerTxId)
        if (intent.status !== 'succeeded') {
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

        if (payment.provider === 'stripe') {
            if (!payment.providerTxId) {
                throw new BadRequestException('Payment provider transaction ID missing for refund')
            }
            const stripe = this.ensureStripe()
            await stripe.refunds.create({ payment_intent: payment.providerTxId })
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
}
