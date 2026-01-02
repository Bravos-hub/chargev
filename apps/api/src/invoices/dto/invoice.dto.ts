import { IsString, IsOptional, IsNumber, IsEnum, IsDateString, IsArray, IsObject, Min, ValidateNested, IsBoolean } from 'class-validator'
import { Type } from 'class-transformer'
import { InvoiceStatus } from '@prisma/client'

export class CreateInvoiceDto {
    @IsString()
    orgId: string

    @IsNumber()
    @Min(0)
    amount: number

    @IsOptional()
    @IsString()
    currency?: string

    @IsOptional()
    @IsEnum(InvoiceStatus)
    status?: InvoiceStatus

    @IsDateString()
    issuedAt: string

    @IsDateString()
    dueAt: string

    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => InvoiceLineItemDto)
    lineItems?: InvoiceLineItemDto[]

    @IsOptional()
    @IsString()
    notes?: string
}

export class InvoiceLineItemDto {
    @IsString()
    description: string

    @IsNumber()
    quantity: number

    @IsNumber()
    unitPrice: number

    @IsNumber()
    total: number

    @IsOptional()
    @IsString()
    type?: 'session' | 'subscription' | 'fee' | 'adjustment' | 'other'

    @IsOptional()
    @IsString()
    referenceId?: string
}

export class UpdateInvoiceDto {
    @IsOptional()
    @IsNumber()
    @Min(0)
    amount?: number

    @IsOptional()
    @IsEnum(InvoiceStatus)
    status?: InvoiceStatus

    @IsOptional()
    @IsDateString()
    dueAt?: string

    @IsOptional()
    @IsDateString()
    paidAt?: string

    @IsOptional()
    @IsString()
    notes?: string
}

export class GenerateInvoiceDto {
    @IsString()
    orgId: string

    @IsDateString()
    periodStart: string

    @IsDateString()
    periodEnd: string

    @IsOptional()
    @IsBoolean()
    includeSubscriptions?: boolean

    @IsOptional()
    @IsBoolean()
    includeSessions?: boolean

    @IsOptional()
    @IsBoolean()
    includeFees?: boolean
}

export class InvoiceQueryDto {
    @IsOptional()
    @IsString()
    orgId?: string

    @IsOptional()
    @IsEnum(InvoiceStatus)
    status?: InvoiceStatus

    @IsOptional()
    @IsDateString()
    issuedAfter?: string

    @IsOptional()
    @IsDateString()
    issuedBefore?: string

    @IsOptional()
    @IsDateString()
    dueAfter?: string

    @IsOptional()
    @IsDateString()
    dueBefore?: string

    @IsOptional()
    @IsNumber()
    @Min(1)
    limit?: number

    @IsOptional()
    @IsNumber()
    @Min(0)
    offset?: number
}

export class SendInvoiceDto {
    @IsOptional()
    @IsString()
    email?: string

    @IsOptional()
    @IsBoolean()
    sendCopy?: boolean
}

export interface InvoiceDetails {
    id: string
    invoiceNumber: string
    organization: {
        id: string
        name: string
        address?: string
        email?: string
    }
    amount: number
    currency: string
    status: InvoiceStatus
    issuedAt: Date
    dueAt: Date
    paidAt?: Date
    lineItems: InvoiceLineItemDto[]
    subtotal: number
    tax: number
    total: number
    notes?: string
}

