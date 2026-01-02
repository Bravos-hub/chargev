import { IsString, IsOptional, IsNumber, IsBoolean, IsEnum, IsObject, Min } from 'class-validator'
import { PricingType } from '@prisma/client'

export class CreatePricingDto {
    @IsEnum(PricingType)
    type: PricingType

    @IsOptional()
    @IsNumber()
    @Min(0)
    flatRate?: number

    @IsOptional()
    @IsNumber()
    @Min(0)
    perMinute?: number

    @IsOptional()
    @IsNumber()
    @Min(0)
    perHour?: number

    @IsOptional()
    @IsNumber()
    @Min(0)
    perKwh?: number

    @IsOptional()
    @IsBoolean()
    touEnabled?: boolean

    @IsOptional()
    @IsObject()
    touRates?: Record<string, any>

    @IsOptional()
    @IsString()
    currency?: string
}

export class UpdatePricingDto {
    @IsOptional()
    @IsEnum(PricingType)
    type?: PricingType

    @IsOptional()
    @IsNumber()
    @Min(0)
    flatRate?: number

    @IsOptional()
    @IsNumber()
    @Min(0)
    perMinute?: number

    @IsOptional()
    @IsNumber()
    @Min(0)
    perHour?: number

    @IsOptional()
    @IsNumber()
    @Min(0)
    perKwh?: number

    @IsOptional()
    @IsBoolean()
    touEnabled?: boolean

    @IsOptional()
    @IsObject()
    touRates?: Record<string, any>

    @IsOptional()
    @IsString()
    currency?: string
}

export class CalculatePriceDto {
    @IsString()
    stationId: string

    @IsNumber()
    @Min(0)
    energyKwh: number

    @IsOptional()
    @IsNumber()
    @Min(0)
    durationMinutes?: number

    @IsOptional()
    @IsString()
    userId?: string

    @IsOptional()
    @IsString()
    fleetId?: string

    @IsOptional()
    @IsString()
    subscriptionId?: string
}

export class PriceBreakdown {
    baseRate: number
    energyCost: number
    timeCost: number
    adjustments: { name: string; type: string; value: number }[]
    subtotal: number
    discount: number
    total: number
    currency: string
}

