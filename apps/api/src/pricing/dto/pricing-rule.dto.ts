import { IsString, IsOptional, IsNumber, IsBoolean, IsEnum, IsObject, IsDateString, Min } from 'class-validator'
import { PricingRuleType } from '@prisma/client'

export class CreatePricingRuleDto {
    @IsString()
    name: string

    @IsEnum(PricingRuleType)
    type: PricingRuleType

    @IsOptional()
    @IsNumber()
    @Min(0)
    priority?: number

    @IsObject()
    conditions: PricingRuleConditions

    @IsObject()
    adjustment: PricingRuleAdjustment

    @IsOptional()
    @IsBoolean()
    active?: boolean

    @IsOptional()
    @IsDateString()
    validFrom?: string

    @IsOptional()
    @IsDateString()
    validUntil?: string
}

export class UpdatePricingRuleDto {
    @IsOptional()
    @IsString()
    name?: string

    @IsOptional()
    @IsEnum(PricingRuleType)
    type?: PricingRuleType

    @IsOptional()
    @IsNumber()
    @Min(0)
    priority?: number

    @IsOptional()
    @IsObject()
    conditions?: PricingRuleConditions

    @IsOptional()
    @IsObject()
    adjustment?: PricingRuleAdjustment

    @IsOptional()
    @IsBoolean()
    active?: boolean

    @IsOptional()
    @IsDateString()
    validFrom?: string

    @IsOptional()
    @IsDateString()
    validUntil?: string
}

export interface PricingRuleConditions {
    // Time-of-use conditions
    startHour?: number      // 0-23
    endHour?: number        // 0-23
    daysOfWeek?: number[]   // 0=Sunday, 1=Monday, etc.

    // Demand response conditions
    minDemandKw?: number
    maxDemandKw?: number

    // Fleet discount conditions
    fleetId?: string
    fleetIds?: string[]

    // Subscription discount conditions
    subscriptionPlanId?: string
    subscriptionPlanIds?: string[]

    // Promotional conditions
    promoCode?: string
    userIds?: string[]
    minEnergyKwh?: number
    maxEnergyKwh?: number
}

export interface PricingRuleAdjustment {
    type: 'multiplier' | 'fixed' | 'discount' | 'override'
    value: number   // multiplier: 1.5 = 50% increase, discount: 0.2 = 20% off
    applyTo?: 'energy' | 'time' | 'total'
    maxDiscount?: number    // Cap the discount amount
}

export class PricingRuleQueryDto {
    @IsOptional()
    @IsString()
    pricingId?: string

    @IsOptional()
    @IsEnum(PricingRuleType)
    type?: PricingRuleType

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

