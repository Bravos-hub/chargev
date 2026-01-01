import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator'
import { PaymentMethod } from '@prisma/client'

export class CreatePaymentIntentDto {
    @IsNumber()
    @Min(1)
    amount: number

    @IsString()
    @IsNotEmpty()
    currency: string // 'USD', 'KES', etc.

    @IsEnum(PaymentMethod)
    method: PaymentMethod

    @IsString()
    @IsOptional()
    bookingId?: string

    @IsString()
    @IsOptional()
    sessionId?: string
}

export class ConfirmPaymentDto {
    @IsString()
    @IsNotEmpty()
    paymentId: string

    @IsString()
    @IsNotEmpty()
    providerTxId: string
}
