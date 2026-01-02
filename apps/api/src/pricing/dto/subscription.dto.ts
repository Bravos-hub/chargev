import { IsString, IsOptional, IsNumber, IsBoolean, IsObject, IsEnum, Min, IsDateString } from 'class-validator'
import { SubscriptionStatus } from '@prisma/client'

export class CreateSubscriptionPlanDto {
    @IsString()
    name: string

    @IsOptional()
    @IsString()
    description?: string

    @IsNumber()
    @Min(0)
    price: number

    @IsOptional()
    @IsString()
    currency?: string

    @IsString()
    interval: 'monthly' | 'yearly'

    @IsObject()
    features: SubscriptionFeatures

    @IsOptional()
    @IsBoolean()
    active?: boolean
}

export class UpdateSubscriptionPlanDto {
    @IsOptional()
    @IsString()
    name?: string

    @IsOptional()
    @IsString()
    description?: string

    @IsOptional()
    @IsNumber()
    @Min(0)
    price?: number

    @IsOptional()
    @IsString()
    currency?: string

    @IsOptional()
    @IsString()
    interval?: 'monthly' | 'yearly'

    @IsOptional()
    @IsObject()
    features?: SubscriptionFeatures

    @IsOptional()
    @IsBoolean()
    active?: boolean
}

export interface SubscriptionFeatures {
    freeKwh?: number            // Free kWh per month
    discountPercent?: number    // Percentage discount on all charging
    priorityBooking?: boolean   // Priority access to chargers
    freeMinutes?: number        // Free charging minutes per month
    maxSessionsPerDay?: number  // Limit on sessions
    dedicatedSupport?: boolean  // Priority customer support
    noIdleFees?: boolean        // Waive idle fees
    customRate?: number         // Custom per-kWh rate
}

export class CreateSubscriptionDto {
    @IsString()
    planId: string

    @IsOptional()
    @IsString()
    paymentMethodId?: string
}

export class UpdateSubscriptionDto {
    @IsOptional()
    @IsEnum(SubscriptionStatus)
    status?: SubscriptionStatus

    @IsOptional()
    @IsDateString()
    cancelledAt?: string
}

export class SubscriptionPlanQueryDto {
    @IsOptional()
    @IsString()
    orgId?: string

    @IsOptional()
    @IsBoolean()
    active?: boolean

    @IsOptional()
    @IsNumber()
    @Min(1)
    limit?: number

    @IsOptional()
    @IsNumber()
    @Min(0)
    offset?: number
}

export class SubscriptionQueryDto {
    @IsOptional()
    @IsString()
    userId?: string

    @IsOptional()
    @IsString()
    planId?: string

    @IsOptional()
    @IsEnum(SubscriptionStatus)
    status?: SubscriptionStatus

    @IsOptional()
    @IsNumber()
    @Min(1)
    limit?: number

    @IsOptional()
    @IsNumber()
    @Min(0)
    offset?: number
}

