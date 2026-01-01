import { Injectable, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../../common/prisma/prisma.service'
import { WalletService } from './wallet.service'
import { CreatePaymentIntentDto, ConfirmPaymentDto } from './dto/payment.dto'

@Injectable()
export class PaymentsService {
    constructor(
        private prisma: PrismaService,
        private walletService: WalletService
    ) { }

    async createIntent(userId: string, dto: CreatePaymentIntentDto) {
        // 1. If method is WALLET, verify balance immediately
        if (dto.method === 'WALLET') {
            const wallet = await this.walletService.getWallet(userId)
            if (Number(wallet.balance) < dto.amount) {
                throw new BadRequestException('Insufficient wallet balance')
            }
        }

        // 2. Create Payment Record (Pending)
        const payment = await this.prisma.payment.create({
            data: {
                userId,
                amount: dto.amount,
                currency: dto.currency,
                method: dto.method,
                status: 'PENDING',
                provider: dto.method === 'WALLET' ? 'INTERNAL' : 'STRIPE_MOCK', // Dynamic based on method/config
                bookingId: dto.bookingId,
                sessionId: dto.sessionId,
            }
        })

        // 3. If external provider, call their API here to get clientSecret/link
        // const providerResponse = await stripe.paymentIntents.create(...)

        return {
            paymentId: payment.id,
            clientSecret: 'mock_client_secret_' + payment.id, // Replace with real integration
            status: 'REQUIRES_CONFIRMATION'
        }
    }

    async confirmPayment(userId: string, dto: ConfirmPaymentDto) {
        const payment = await this.prisma.payment.findUnique({
            where: { id: dto.paymentId }
        })

        if (!payment || payment.userId !== userId) {
            throw new BadRequestException('Invalid payment')
        }

        if (payment.status === 'SUCCEEDED') {
            return payment
        }

        // If Wallet, process immediately
        if (payment.method === 'WALLET') {
            await this.walletService.chargeWallet(
                userId,
                Number(payment.amount),
                `Payment for ${payment.bookingId ? 'Booking' : 'Session'}`,
                payment.id
            )
        }

        // Update status
        return this.prisma.payment.update({
            where: { id: payment.id },
            data: {
                status: 'SUCCEEDED',
                providerTxId: dto.providerTxId
            }
        })
    }

    async processWebhook(event: any) {
        // Handle Stripe/PayPal webhooks to update payment status
        return { received: true }
    }
}
