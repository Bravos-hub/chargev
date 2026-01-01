import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../common/prisma/prisma.service'
import { CreatePaymentIntentDto } from './dto/create-payment-intent.dto'

@Injectable()
export class PaymentsService {
  constructor(private prisma: PrismaService) {}

  listInvoices() {
    return this.prisma.invoice.findMany({ orderBy: { issuedAt: 'desc' }, take: 100 })
  }

  listTransactions() {
    return this.prisma.transaction.findMany({ orderBy: { createdAt: 'desc' }, take: 100 })
  }

  createIntent(dto: CreatePaymentIntentDto) {
    return this.prisma.paymentIntent.create({
      data: {
        amount: dto.amount,
        currency: dto.currency || 'USD',
        provider: dto.provider || 'manual',
        status: 'created',
      },
    })
  }
}
