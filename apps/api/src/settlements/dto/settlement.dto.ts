import { IsString, IsOptional, IsNumber, IsEnum, IsDateString, IsObject, Min, IsArray, IsBoolean } from 'class-validator'
import { SettlementType, SettlementStatus } from '@prisma/client'

export class CreateSettlementDto {
    @IsString()
    orgId: string

    @IsEnum(SettlementType)
    type: SettlementType

    @IsDateString()
    periodStart: string

    @IsDateString()
    periodEnd: string

    @IsNumber()
    @Min(0)
    grossAmount: number

    @IsNumber()
    @Min(0)
    fees: number

    @IsNumber()
    netAmount: number

    @IsOptional()
    @IsString()
    currency?: string

    @IsOptional()
    @IsEnum(SettlementStatus)
    status?: SettlementStatus

    @IsOptional()
    @IsArray()
    lineItems?: SettlementLineItem[]

    @IsOptional()
    @IsString()
    partnerId?: string

    @IsOptional()
    @IsString()
    driverId?: string
}

export class UpdateSettlementDto {
    @IsOptional()
    @IsNumber()
    @Min(0)
    grossAmount?: number

    @IsOptional()
    @IsNumber()
    @Min(0)
    fees?: number

    @IsOptional()
    @IsNumber()
    netAmount?: number

    @IsOptional()
    @IsEnum(SettlementStatus)
    status?: SettlementStatus

    @IsOptional()
    @IsDateString()
    paidAt?: string

    @IsOptional()
    @IsString()
    reference?: string
}

export interface SettlementLineItem {
    type: 'session' | 'subscription' | 'roaming' | 'fee' | 'adjustment'
    description: string
    quantity?: number
    unitAmount?: number
    totalAmount: number
    referenceId?: string
    metadata?: Record<string, any>
}

export class GenerateSettlementDto {
    @IsString()
    orgId: string

    @IsEnum(SettlementType)
    type: SettlementType

    @IsDateString()
    periodStart: string

    @IsDateString()
    periodEnd: string

    @IsOptional()
    @IsString()
    partnerId?: string

    @IsOptional()
    @IsString()
    driverId?: string
}

export class ProcessSettlementDto {
    @IsOptional()
    @IsString()
    paymentMethod?: string

    @IsOptional()
    @IsString()
    reference?: string

    @IsOptional()
    @IsObject()
    metadata?: Record<string, any>
}

export class SettlementQueryDto {
    @IsOptional()
    @IsString()
    orgId?: string

    @IsOptional()
    @IsEnum(SettlementType)
    type?: SettlementType

    @IsOptional()
    @IsEnum(SettlementStatus)
    status?: SettlementStatus

    @IsOptional()
    @IsString()
    partnerId?: string

    @IsOptional()
    @IsString()
    driverId?: string

    @IsOptional()
    @IsDateString()
    periodAfter?: string

    @IsOptional()
    @IsDateString()
    periodBefore?: string

    @IsOptional()
    @IsNumber()
    @Min(1)
    limit?: number

    @IsOptional()
    @IsNumber()
    @Min(0)
    offset?: number
}

export class ReconciliationReportDto {
    @IsString()
    orgId: string

    @IsDateString()
    periodStart: string

    @IsDateString()
    periodEnd: string

    @IsOptional()
    @IsBoolean()
    includeDetails?: boolean
}

export interface ReconciliationResult {
    period: { start: Date; end: Date }
    organization: { id: string; name: string }
    summary: {
        totalSessions: number
        totalEnergy: number
        totalRevenue: number
        platformFees: number
        netPayout: number
    }
    byType: {
        [key: string]: {
            count: number
            amount: number
        }
    }
    discrepancies?: {
        type: string
        description: string
        amount: number
    }[]
}

