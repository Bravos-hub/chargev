import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../common/prisma/prisma.service'
import { CreatePricingDto, UpdatePricingDto } from './dto/pricing.dto'
import { CreatePricingRuleDto, UpdatePricingRuleDto, PricingRuleQueryDto } from './dto/pricing-rule.dto'

@Injectable()
export class PricingService {
    constructor(private prisma: PrismaService) {}

    // =================== PRICING ===================

    async createPricing(stationId: string, dto: CreatePricingDto) {
        // Check if station exists
        const station = await this.prisma.station.findUnique({
            where: { id: stationId },
        })

        if (!station) {
            throw new NotFoundException('Station not found')
        }

        // Check if pricing already exists for this station
        const existing = await this.prisma.pricing.findUnique({
            where: { stationId },
        })

        if (existing) {
            throw new BadRequestException('Pricing already exists for this station. Use update instead.')
        }

        return this.prisma.pricing.create({
            data: {
                stationId,
                type: dto.type,
                flatRate: dto.flatRate,
                perMinute: dto.perMinute,
                perHour: dto.perHour,
                perKwh: dto.perKwh,
                touEnabled: dto.touEnabled || false,
                touRates: dto.touRates,
                currency: dto.currency || 'USD',
            },
            include: {
                station: { select: { id: true, name: true, code: true } },
                rules: { where: { active: true } },
            },
        })
    }

    async getPricing(stationId: string) {
        const pricing = await this.prisma.pricing.findUnique({
            where: { stationId },
            include: {
                station: { select: { id: true, name: true, code: true } },
                rules: { where: { active: true }, orderBy: { priority: 'desc' } },
            },
        })

        if (!pricing) {
            throw new NotFoundException('Pricing not found for this station')
        }

        return pricing
    }

    async updatePricing(stationId: string, dto: UpdatePricingDto) {
        const pricing = await this.prisma.pricing.findUnique({
            where: { stationId },
        })

        if (!pricing) {
            throw new NotFoundException('Pricing not found for this station')
        }

        return this.prisma.pricing.update({
            where: { stationId },
            data: {
                type: dto.type,
                flatRate: dto.flatRate,
                perMinute: dto.perMinute,
                perHour: dto.perHour,
                perKwh: dto.perKwh,
                touEnabled: dto.touEnabled,
                touRates: dto.touRates,
                currency: dto.currency,
            },
            include: {
                station: { select: { id: true, name: true, code: true } },
                rules: { where: { active: true } },
            },
        })
    }

    async deletePricing(stationId: string) {
        const pricing = await this.prisma.pricing.findUnique({
            where: { stationId },
        })

        if (!pricing) {
            throw new NotFoundException('Pricing not found for this station')
        }

        await this.prisma.pricing.delete({ where: { stationId } })
        return { success: true, message: 'Pricing deleted successfully' }
    }

    // =================== PRICING RULES ===================

    async createRule(pricingId: string, dto: CreatePricingRuleDto) {
        const pricing = await this.prisma.pricing.findUnique({
            where: { id: pricingId },
        })

        if (!pricing) {
            throw new NotFoundException('Pricing not found')
        }

        return this.prisma.pricingRule.create({
            data: {
                pricingId,
                name: dto.name,
                type: dto.type,
                priority: dto.priority || 0,
                conditions: dto.conditions as any,
                adjustment: dto.adjustment as any,
                active: dto.active ?? true,
                validFrom: dto.validFrom ? new Date(dto.validFrom) : null,
                validUntil: dto.validUntil ? new Date(dto.validUntil) : null,
            },
        })
    }

    async createRuleForStation(stationId: string, dto: CreatePricingRuleDto) {
        const pricing = await this.prisma.pricing.findUnique({
            where: { stationId },
        })

        if (!pricing) {
            throw new NotFoundException('Pricing not found for this station')
        }

        return this.createRule(pricing.id, dto)
    }

    async getRules(query: PricingRuleQueryDto) {
        const where: any = {}

        if (query.pricingId) where.pricingId = query.pricingId
        if (query.type) where.type = query.type
        if (query.active !== undefined) where.active = query.active

        const [rules, total] = await Promise.all([
            this.prisma.pricingRule.findMany({
                where,
                include: {
                    pricing: {
                        select: {
                            id: true,
                            stationId: true,
                            station: { select: { name: true, code: true } },
                        },
                    },
                },
                orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
                take: query.limit || 50,
                skip: query.offset || 0,
            }),
            this.prisma.pricingRule.count({ where }),
        ])

        return { rules, total, limit: query.limit || 50, offset: query.offset || 0 }
    }

    async getRulesByStation(stationId: string) {
        const pricing = await this.prisma.pricing.findUnique({
            where: { stationId },
        })

        if (!pricing) {
            throw new NotFoundException('Pricing not found for this station')
        }

        return this.prisma.pricingRule.findMany({
            where: { pricingId: pricing.id },
            orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
        })
    }

    async getRule(id: string) {
        const rule = await this.prisma.pricingRule.findUnique({
            where: { id },
            include: {
                pricing: {
                    select: {
                        id: true,
                        stationId: true,
                        station: { select: { name: true, code: true } },
                    },
                },
            },
        })

        if (!rule) throw new NotFoundException('Pricing rule not found')
        return rule
    }

    async updateRule(id: string, dto: UpdatePricingRuleDto) {
        await this.getRule(id)

        return this.prisma.pricingRule.update({
            where: { id },
            data: {
                name: dto.name,
                type: dto.type,
                priority: dto.priority,
                conditions: dto.conditions as any,
                adjustment: dto.adjustment as any,
                active: dto.active,
                validFrom: dto.validFrom ? new Date(dto.validFrom) : undefined,
                validUntil: dto.validUntil ? new Date(dto.validUntil) : undefined,
            },
        })
    }

    async deleteRule(id: string) {
        await this.getRule(id)
        await this.prisma.pricingRule.delete({ where: { id } })
        return { success: true, message: 'Pricing rule deleted successfully' }
    }

    async toggleRule(id: string) {
        const rule = await this.getRule(id)

        return this.prisma.pricingRule.update({
            where: { id },
            data: { active: !rule.active },
        })
    }
}

