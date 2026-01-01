import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common'
import { PaymentsService } from './payments.service'
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard'
import { CreatePaymentIntentDto } from './dto/create-payment-intent.dto'

@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentsController {
  constructor(private payments: PaymentsService) {}

  @Get('invoices')
  listInvoices() {
    return this.payments.listInvoices()
  }

  @Get('transactions')
  listTransactions() {
    return this.payments.listTransactions()
  }

  @Post('intent')
  createIntent(@Body() dto: CreatePaymentIntentDto) {
    return this.payments.createIntent(dto)
  }
}
