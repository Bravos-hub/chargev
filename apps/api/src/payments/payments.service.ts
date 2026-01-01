import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../common/prisma/prisma.service'
import { WalletService } from '../wallet/wallet.service'
import { CreatePaymentIntentDto, ConfirmPaymentDto } from './dto/payment.dto'
import { PaymentMethod } from '@prisma/client'

@Injectable()
export class PaymentsService {
    constructor(
        private prisma: PrismaService,
        private walletService: WalletService
    ) { }

    async createIntent(userId: string, dto: CreatePaymentIntentDto) {
        return this.prisma.payment.create({
            data: {
                userId,
                amount: dto.amount,
                currency: dto.currency || 'USD',
                method: dto.method,
                bookingId: dto.bookingId,
                sessionId: dto.sessionId,
                status: 'PENDING',
                provider: 'stripe'
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

        // Mock refund logic
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
        // Mock M-Pesa / Mobile Money logic
        return this.prisma.payment.create({
            data: {
                userId,
                amount,
                currency: 'KES',
                method: 'MOBILE_MONEY',
                status: 'PENDING',
                provider: 'mpesa',
                metadata: { phone }
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
