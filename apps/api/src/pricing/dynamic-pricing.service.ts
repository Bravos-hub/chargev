import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../common/prisma/prisma.service'
import { CalculatePriceDto, PriceBreakdown } from './dto/pricing.dto'
import { PricingRuleConditions, PricingRuleAdjustment } from './dto/pricing-rule.dto'
import { Decimal } from '@prisma/client/runtime/library'

interface PriceContext {
    stationId: string
    energyKwh: number
    durationMinutes: number
    userId?: string
    fleetId?: string
    subscriptionId?: string
    timestamp: Date
}

interface AppliedRule {
    name: string
    type: string
    adjustment: number
}

@Injectable()
export class DynamicPricingService {
    private readonly logger = new Logger(DynamicPricingService.name)

    constructor(private prisma: PrismaService) {}

    async calculatePrice(dto: CalculatePriceDto): Promise<PriceBreakdown> {
        const context: PriceContext = {
            stationId: dto.stationId,
            energyKwh: dto.energyKwh,
            durationMinutes: dto.durationMinutes || 0,
            userId: dto.userId,
            fleetId: dto.fleetId,
            subscriptionId: dto.subscriptionId,
            timestamp: new Date(),
        }

        // Get base pricing for station
        const pricing = await this.prisma.pricing.findUnique({
            where: { stationId: dto.stationId },
            include: {
                rules: {
                    where: {
                        active: true,
                        OR: [
                            { validFrom: null },
                            { validFrom: { lte: context.timestamp } },
                        ],
                        AND: [
                            {
                                OR: [
                                    { validUntil: null },
                                    { validUntil: { gte: context.timestamp } },
                                ],
                            },
                        ],
                    },
                    orderBy: { priority: 'desc' },
                },
            },
        })

        if (!pricing) {
            throw new NotFoundException('Pricing not found for this station')
        }

        // Get user subscription if applicable
        let subscription = null
        if (context.userId) {
            subscription = await this.prisma.subscription.findFirst({
                where: {
                    userId: context.userId,
                    status: 'ACTIVE',
                    currentPeriodEnd: { gte: context.timestamp },
                },
                include: { plan: true },
            })
        }

        // Calculate base costs
        const basePerKwh = pricing.perKwh ? Number(pricing.perKwh) : 0
        const basePerMinute = pricing.perMinute ? Number(pricing.perMinute) : 0
        const flatRate = pricing.flatRate ? Number(pricing.flatRate) : 0

        let energyCost = context.energyKwh * basePerKwh
        let timeCost = context.durationMinutes * basePerMinute
        const appliedAdjustments: AppliedRule[] = []

        // Apply pricing rules
        for (const rule of pricing.rules) {
            const conditions = rule.conditions as PricingRuleConditions
            const adjustment = rule.adjustment as unknown as PricingRuleAdjustment

            if (this.evaluateConditions(conditions, context, subscription)) {
                const { newEnergyCost, newTimeCost, adjustmentValue } = this.applyAdjustment(
                    energyCost,
                    timeCost,
                    adjustment
                )

                energyCost = newEnergyCost
                timeCost = newTimeCost

                appliedAdjustments.push({
                    name: rule.name,
                    type: adjustment.type,
                    adjustment: adjustmentValue,
                })

                this.logger.debug(`Applied rule: ${rule.name}, adjustment: ${adjustmentValue}`)
            }
        }

        // Apply subscription benefits
        let subscriptionDiscount = 0
        if (subscription?.plan) {
            const features = subscription.plan.features as any
            
            // Apply free kWh
            if (features.freeKwh && context.energyKwh <= features.freeKwh) {
                subscriptionDiscount += energyCost
                appliedAdjustments.push({
                    name: `${subscription.plan.name} - Free kWh`,
                    type: 'subscription',
                    adjustment: -energyCost,
                })
            }

            // Apply percentage discount
            if (features.discountPercent) {
                const discount = (energyCost + timeCost) * (features.discountPercent / 100)
                subscriptionDiscount += discount
                appliedAdjustments.push({
                    name: `${subscription.plan.name} - ${features.discountPercent}% discount`,
                    type: 'subscription',
                    adjustment: -discount,
                })
            }
        }

        const subtotal = flatRate + energyCost + timeCost
        const discount = subscriptionDiscount
        const total = Math.max(0, subtotal - discount)

        return {
            baseRate: basePerKwh,
            energyCost: Math.round(energyCost * 100) / 100,
            timeCost: Math.round(timeCost * 100) / 100,
            adjustments: appliedAdjustments.map(a => ({
                name: a.name,
                type: a.type,
                value: Math.round(a.adjustment * 100) / 100,
            })),
            subtotal: Math.round(subtotal * 100) / 100,
            discount: Math.round(discount * 100) / 100,
            total: Math.round(total * 100) / 100,
            currency: pricing.currency,
        }
    }

    async estimateSessionCost(
        stationId: string,
        estimatedKwh: number,
        estimatedMinutes: number,
        userId?: string
    ): Promise<{ low: number; high: number; estimated: number; currency: string }> {
        const basePrice = await this.calculatePrice({
            stationId,
            energyKwh: estimatedKwh,
            durationMinutes: estimatedMinutes,
            userId,
        })

        // Calculate range based on potential TOU variations
        const pricing = await this.prisma.pricing.findUnique({
            where: { stationId },
            include: { rules: { where: { active: true, type: 'TIME_OF_USE' } } },
        })

        let multiplierRange = { low: 1, high: 1 }
        if (pricing?.rules) {
            for (const rule of pricing.rules) {
                const adjustment = rule.adjustment as unknown as PricingRuleAdjustment
                if (adjustment.type === 'multiplier') {
                    multiplierRange.low = Math.min(multiplierRange.low, adjustment.value)
                    multiplierRange.high = Math.max(multiplierRange.high, adjustment.value)
                }
            }
        }

        return {
            low: Math.round(basePrice.total * multiplierRange.low * 100) / 100,
            high: Math.round(basePrice.total * multiplierRange.high * 100) / 100,
            estimated: basePrice.total,
            currency: basePrice.currency,
        }
    }

    async getCurrentRate(stationId: string): Promise<{
        perKwh: number
        perMinute: number
        currency: string
        activeRules: string[]
    }> {
        const context: PriceContext = {
            stationId,
            energyKwh: 1,
            durationMinutes: 1,
            timestamp: new Date(),
        }

        const pricing = await this.prisma.pricing.findUnique({
            where: { stationId },
            include: {
                rules: {
                    where: {
                        active: true,
                        OR: [
                            { validFrom: null },
                            { validFrom: { lte: context.timestamp } },
                        ],
                    },
                },
            },
        })

        if (!pricing) {
            throw new NotFoundException('Pricing not found for this station')
        }

        let perKwh = pricing.perKwh ? Number(pricing.perKwh) : 0
        let perMinute = pricing.perMinute ? Number(pricing.perMinute) : 0
        const activeRules: string[] = []

        for (const rule of pricing.rules) {
            const conditions = rule.conditions as PricingRuleConditions
            const adjustment = rule.adjustment as unknown as PricingRuleAdjustment

            // Only evaluate time-based rules for current rate
            if (rule.type === 'TIME_OF_USE' && this.evaluateTimeConditions(conditions, context.timestamp)) {
                if (adjustment.type === 'multiplier') {
                    perKwh *= adjustment.value
                    perMinute *= adjustment.value
                } else if (adjustment.type === 'override') {
                    perKwh = adjustment.value
                }
                activeRules.push(rule.name)
            }
        }

        return {
            perKwh: Math.round(perKwh * 100) / 100,
            perMinute: Math.round(perMinute * 100) / 100,
            currency: pricing.currency,
            activeRules,
        }
    }

    private evaluateConditions(
        conditions: PricingRuleConditions,
        context: PriceContext,
        subscription: any
    ): boolean {
        // Time-of-use conditions
        if (conditions.startHour !== undefined || conditions.endHour !== undefined) {
            if (!this.evaluateTimeConditions(conditions, context.timestamp)) {
                return false
            }
        }

        // Fleet discount conditions
        if (conditions.fleetId && context.fleetId !== conditions.fleetId) {
            return false
        }

        if (conditions.fleetIds && conditions.fleetIds.length > 0) {
            if (!context.fleetId || !conditions.fleetIds.includes(context.fleetId)) {
                return false
            }
        }

        // Subscription conditions
        if (conditions.subscriptionPlanId && subscription?.planId !== conditions.subscriptionPlanId) {
            return false
        }

        if (conditions.subscriptionPlanIds && conditions.subscriptionPlanIds.length > 0) {
            if (!subscription?.planId || !conditions.subscriptionPlanIds.includes(subscription.planId)) {
                return false
            }
        }

        // Energy amount conditions
        if (conditions.minEnergyKwh && context.energyKwh < conditions.minEnergyKwh) {
            return false
        }

        if (conditions.maxEnergyKwh && context.energyKwh > conditions.maxEnergyKwh) {
            return false
        }

        // User-specific conditions
        if (conditions.userIds && conditions.userIds.length > 0) {
            if (!context.userId || !conditions.userIds.includes(context.userId)) {
                return false
            }
        }

        return true
    }

    private evaluateTimeConditions(conditions: PricingRuleConditions, timestamp: Date): boolean {
        const hour = timestamp.getHours()
        const dayOfWeek = timestamp.getDay()

        // Check day of week
        if (conditions.daysOfWeek && conditions.daysOfWeek.length > 0) {
            if (!conditions.daysOfWeek.includes(dayOfWeek)) {
                return false
            }
        }

        // Check hour range
        if (conditions.startHour !== undefined && conditions.endHour !== undefined) {
            if (conditions.startHour <= conditions.endHour) {
                // Normal range (e.g., 9-17)
                if (hour < conditions.startHour || hour >= conditions.endHour) {
                    return false
                }
            } else {
                // Overnight range (e.g., 23-6)
                if (hour < conditions.startHour && hour >= conditions.endHour) {
                    return false
                }
            }
        }

        return true
    }

    private applyAdjustment(
        energyCost: number,
        timeCost: number,
        adjustment: PricingRuleAdjustment
    ): { newEnergyCost: number; newTimeCost: number; adjustmentValue: number } {
        let newEnergyCost = energyCost
        let newTimeCost = timeCost
        let adjustmentValue = 0

        const applyTo = adjustment.applyTo || 'total'

        switch (adjustment.type) {
            case 'multiplier':
                if (applyTo === 'energy' || applyTo === 'total') {
                    const energyDiff = energyCost * (adjustment.value - 1)
                    newEnergyCost = energyCost * adjustment.value
                    adjustmentValue += energyDiff
                }
                if (applyTo === 'time' || applyTo === 'total') {
                    const timeDiff = timeCost * (adjustment.value - 1)
                    newTimeCost = timeCost * adjustment.value
                    adjustmentValue += timeDiff
                }
                break

            case 'fixed':
                adjustmentValue = adjustment.value
                newEnergyCost = energyCost + adjustment.value
                break

            case 'discount':
                let discount = 0
                if (applyTo === 'energy' || applyTo === 'total') {
                    discount += energyCost * adjustment.value
                    newEnergyCost = energyCost * (1 - adjustment.value)
                }
                if (applyTo === 'time' || applyTo === 'total') {
                    discount += timeCost * adjustment.value
                    newTimeCost = timeCost * (1 - adjustment.value)
                }
                
                // Apply max discount cap if specified
                if (adjustment.maxDiscount && discount > adjustment.maxDiscount) {
                    const ratio = adjustment.maxDiscount / discount
                    newEnergyCost = energyCost - (energyCost - newEnergyCost) * ratio
                    newTimeCost = timeCost - (timeCost - newTimeCost) * ratio
                    discount = adjustment.maxDiscount
                }
                
                adjustmentValue = -discount
                break

            case 'override':
                if (applyTo === 'energy' || applyTo === 'total') {
                    adjustmentValue = adjustment.value - energyCost
                    newEnergyCost = adjustment.value
                }
                break
        }

        return { newEnergyCost, newTimeCost, adjustmentValue }
    }
}

