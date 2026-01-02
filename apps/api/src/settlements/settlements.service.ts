import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common'
import { PrismaService } from '../common/prisma/prisma.service'
import {
    CreateSettlementDto,
    UpdateSettlementDto,
    GenerateSettlementDto,
    ProcessSettlementDto,
    SettlementQueryDto,
    SettlementLineItem,
} from './dto/settlement.dto'
import { SettlementType, SettlementStatus, Prisma } from '@prisma/client'

@Injectable()
export class SettlementsService {
    private readonly logger = new Logger(SettlementsService.name)

    constructor(private prisma: PrismaService) {}

    async create(dto: CreateSettlementDto) {
        const org = await this.prisma.organization.findUnique({
            where: { id: dto.orgId },
        })

        if (!org) {
            throw new NotFoundException('Organization not found')
        }

        return this.prisma.settlement.create({
            data: {
                orgId: dto.orgId,
                type: dto.type,
                periodStart: new Date(dto.periodStart),
                periodEnd: new Date(dto.periodEnd),
                grossAmount: dto.grossAmount,
                fees: dto.fees,
                netAmount: dto.netAmount,
                currency: dto.currency || 'USD',
                status: dto.status || 'PENDING',
                lineItems: (dto.lineItems || []) as any,
                partnerId: dto.partnerId,
                driverId: dto.driverId,
            },
            include: {
                organization: { select: { id: true, name: true } },
            },
        })
    }

    async findAll(query: SettlementQueryDto) {
        const where: Prisma.SettlementWhereInput = {}

        if (query.orgId) where.orgId = query.orgId
        if (query.type) where.type = query.type
        if (query.status) where.status = query.status
        if (query.partnerId) where.partnerId = query.partnerId
        if (query.driverId) where.driverId = query.driverId

        if (query.periodAfter || query.periodBefore) {
            where.periodStart = {}
            if (query.periodAfter) where.periodStart.gte = new Date(query.periodAfter)
            if (query.periodBefore) where.periodStart.lte = new Date(query.periodBefore)
        }

        const [settlements, total] = await Promise.all([
            this.prisma.settlement.findMany({
                where,
                include: {
                    organization: { select: { id: true, name: true } },
                },
                orderBy: { periodEnd: 'desc' },
                take: query.limit || 50,
                skip: query.offset || 0,
            }),
            this.prisma.settlement.count({ where }),
        ])

        return { settlements, total, limit: query.limit || 50, offset: query.offset || 0 }
    }

    async findOne(id: string) {
        const settlement = await this.prisma.settlement.findUnique({
            where: { id },
            include: {
                organization: { select: { id: true, name: true, type: true } },
            },
        })

        if (!settlement) throw new NotFoundException('Settlement not found')
        return settlement
    }

    async findByOrg(orgId: string) {
        return this.prisma.settlement.findMany({
            where: { orgId },
            orderBy: { periodEnd: 'desc' },
        })
    }

    async update(id: string, dto: UpdateSettlementDto) {
        await this.findOne(id)

        return this.prisma.settlement.update({
            where: { id },
            data: {
                grossAmount: dto.grossAmount,
                fees: dto.fees,
                netAmount: dto.netAmount,
                status: dto.status,
                paidAt: dto.paidAt ? new Date(dto.paidAt) : undefined,
                reference: dto.reference,
            },
            include: {
                organization: { select: { id: true, name: true } },
            },
        })
    }

    async delete(id: string) {
        const settlement = await this.findOne(id)

        if (settlement.status === 'COMPLETED') {
            throw new BadRequestException('Cannot delete a completed settlement')
        }

        await this.prisma.settlement.delete({ where: { id } })
        return { success: true, message: 'Settlement deleted successfully' }
    }

    async generateSettlement(dto: GenerateSettlementDto) {
        const org = await this.prisma.organization.findUnique({
            where: { id: dto.orgId },
        })

        if (!org) {
            throw new NotFoundException('Organization not found')
        }

        const periodStart = new Date(dto.periodStart)
        const periodEnd = new Date(dto.periodEnd)
        const lineItems: SettlementLineItem[] = []
        let grossAmount = 0

        switch (dto.type) {
            case 'CPO_PAYOUT':
                const cpoResult = await this.calculateCPOPayout(dto.orgId, periodStart, periodEnd)
                lineItems.push(...cpoResult.lineItems)
                grossAmount = cpoResult.grossAmount
                break

            case 'ROAMING_INCOMING':
            case 'ROAMING_OUTGOING':
                if (!dto.partnerId) {
                    throw new BadRequestException('Partner ID required for roaming settlements')
                }
                const roamingResult = await this.calculateRoamingSettlement(
                    dto.orgId,
                    dto.partnerId,
                    periodStart,
                    periodEnd,
                    dto.type
                )
                lineItems.push(...roamingResult.lineItems)
                grossAmount = roamingResult.grossAmount
                break

            case 'DRIVER_PAYOUT':
                if (!dto.driverId) {
                    throw new BadRequestException('Driver ID required for driver payouts')
                }
                const driverResult = await this.calculateDriverPayout(dto.driverId, periodStart, periodEnd)
                lineItems.push(...driverResult.lineItems)
                grossAmount = driverResult.grossAmount
                break

            case 'FLEET_BILLING':
                const fleetResult = await this.calculateFleetBilling(dto.orgId, periodStart, periodEnd)
                lineItems.push(...fleetResult.lineItems)
                grossAmount = fleetResult.grossAmount
                break
        }

        // Calculate fees (platform takes 3% for example)
        const feePercentage = 0.03
        const fees = grossAmount * feePercentage
        const netAmount = grossAmount - fees

        return this.prisma.settlement.create({
            data: {
                orgId: dto.orgId,
                type: dto.type,
                periodStart,
                periodEnd,
                grossAmount,
                fees,
                netAmount,
                currency: 'USD',
                status: 'PENDING',
                lineItems: lineItems as any,
                partnerId: dto.partnerId,
                driverId: dto.driverId,
            },
            include: {
                organization: { select: { id: true, name: true } },
            },
        })
    }

    async processSettlement(id: string, dto: ProcessSettlementDto) {
        const settlement = await this.findOne(id)

        if (settlement.status === 'COMPLETED') {
            throw new BadRequestException('Settlement is already completed')
        }

        if (settlement.status === 'FAILED') {
            throw new BadRequestException('Cannot process a failed settlement')
        }

        // Update status to processing
        await this.prisma.settlement.update({
            where: { id },
            data: { status: 'PROCESSING' },
        })

        try {
            // Here you would integrate with payment gateway
            // For now, we'll simulate a successful payment
            this.logger.log(`Processing settlement ${id} for ${settlement.netAmount} ${settlement.currency}`)

            // Simulate payment processing delay
            await new Promise(resolve => setTimeout(resolve, 100))

            // Mark as completed
            return this.prisma.settlement.update({
                where: { id },
                data: {
                    status: 'COMPLETED',
                    paidAt: new Date(),
                    reference: dto.reference || `PAY-${Date.now()}`,
                },
                include: {
                    organization: { select: { id: true, name: true } },
                },
            })
        } catch (error: any) {
            // Mark as failed on error
            await this.prisma.settlement.update({
                where: { id },
                data: { status: 'FAILED' },
            })

            throw new BadRequestException(`Payment processing failed: ${error.message}`)
        }
    }

    async disputeSettlement(id: string, reason: string) {
        const settlement = await this.findOne(id)

        if (settlement.status === 'COMPLETED') {
            throw new BadRequestException('Cannot dispute a completed settlement')
        }

        return this.prisma.settlement.update({
            where: { id },
            data: { status: 'DISPUTED' },
        })
    }

    // =================== CALCULATION METHODS ===================

    private async calculateCPOPayout(
        orgId: string,
        periodStart: Date,
        periodEnd: Date
    ): Promise<{ lineItems: SettlementLineItem[]; grossAmount: number }> {
        const lineItems: SettlementLineItem[] = []
        let grossAmount = 0

        // Get all completed sessions for this org's stations
        const sessions = await this.prisma.chargingSession.findMany({
            where: {
                station: { orgId },
                status: 'COMPLETED',
                endedAt: { gte: periodStart, lte: periodEnd },
            },
            select: {
                id: true,
                kwh: true,
                amount: true,
                station: { select: { id: true, name: true } },
            },
        })

        if (sessions.length > 0) {
            const totalAmount = sessions.reduce((sum, s) => sum + Number(s.amount || 0), 0)
            const totalKwh = sessions.reduce((sum, s) => sum + Number(s.kwh || 0), 0)

            lineItems.push({
                type: 'session',
                description: `Charging Sessions (${sessions.length} sessions)`,
                quantity: sessions.length,
                unitAmount: totalAmount / sessions.length,
                totalAmount,
                metadata: { totalKwh, sessionCount: sessions.length },
            })

            grossAmount += totalAmount
        }

        // Get subscription revenue
        const subscriptions = await this.prisma.subscription.findMany({
            where: {
                plan: { orgId },
                status: 'ACTIVE',
                currentPeriodStart: { lte: periodEnd },
                currentPeriodEnd: { gte: periodStart },
            },
            include: { plan: true },
        })

        for (const sub of subscriptions) {
            const amount = Number(sub.plan.price)
            lineItems.push({
                type: 'subscription',
                description: `Subscription: ${sub.plan.name}`,
                quantity: 1,
                unitAmount: amount,
                totalAmount: amount,
                referenceId: sub.id,
            })
            grossAmount += amount
        }

        return { lineItems, grossAmount }
    }

    private async calculateRoamingSettlement(
        orgId: string,
        partnerId: string,
        periodStart: Date,
        periodEnd: Date,
        type: SettlementType
    ): Promise<{ lineItems: SettlementLineItem[]; grossAmount: number }> {
        const lineItems: SettlementLineItem[] = []
        let grossAmount = 0

        // Get OCPI CDRs for this partner
        const cdrs = await this.prisma.oCPICDR.findMany({
            where: {
                partnerId,
                startDateTime: { gte: periodStart },
                endDateTime: { lte: periodEnd },
            },
        })

        if (cdrs.length > 0) {
            const totalCost = cdrs.reduce((sum, cdr) => sum + Number(cdr.totalCost), 0)
            const totalEnergy = cdrs.reduce((sum, cdr) => sum + Number(cdr.energyKwh), 0)

            lineItems.push({
                type: 'roaming',
                description: `Roaming CDRs (${cdrs.length} records)`,
                quantity: cdrs.length,
                unitAmount: totalCost / cdrs.length,
                totalAmount: totalCost,
                metadata: { totalEnergyKwh: totalEnergy, cdrCount: cdrs.length },
            })

            grossAmount = totalCost
        }

        return { lineItems, grossAmount }
    }

    private async calculateDriverPayout(
        driverId: string,
        periodStart: Date,
        periodEnd: Date
    ): Promise<{ lineItems: SettlementLineItem[]; grossAmount: number }> {
        const lineItems: SettlementLineItem[] = []
        let grossAmount = 0

        const driver = await this.prisma.driver.findUnique({
            where: { id: driverId },
            include: {
                shifts: {
                    where: {
                        status: 'COMPLETED',
                        checkOutAt: { gte: periodStart, lte: periodEnd },
                    },
                },
                ratings: {
                    where: { createdAt: { gte: periodStart, lte: periodEnd } },
                },
            },
        })

        if (!driver) {
            throw new NotFoundException('Driver not found')
        }

        // Calculate earnings from completed shifts
        const completedShifts = driver.shifts.length
        const baseEarnings = completedShifts * 50 // Example: $50 per completed shift

        if (completedShifts > 0) {
            lineItems.push({
                type: 'session',
                description: `Completed Shifts (${completedShifts})`,
                quantity: completedShifts,
                unitAmount: 50,
                totalAmount: baseEarnings,
            })
            grossAmount += baseEarnings
        }

        // Calculate rating bonus
        const avgRating = driver.ratings.length > 0
            ? driver.ratings.reduce((sum, r) => sum + r.score, 0) / driver.ratings.length
            : 0

        if (avgRating >= 4.5 && driver.ratings.length >= 5) {
            const ratingBonus = 25 // $25 bonus for high rating
            lineItems.push({
                type: 'adjustment',
                description: `High Rating Bonus (${avgRating.toFixed(1)} avg)`,
                totalAmount: ratingBonus,
            })
            grossAmount += ratingBonus
        }

        return { lineItems, grossAmount }
    }

    private async calculateFleetBilling(
        orgId: string,
        periodStart: Date,
        periodEnd: Date
    ): Promise<{ lineItems: SettlementLineItem[]; grossAmount: number }> {
        const lineItems: SettlementLineItem[] = []
        let grossAmount = 0

        // Get all charging sessions from fleet vehicles
        const sessions = await this.prisma.chargingSession.findMany({
            where: {
                vehicle: { orgId },
                status: 'COMPLETED',
                endedAt: { gte: periodStart, lte: periodEnd },
            },
            include: {
                vehicle: { select: { make: true, model: true, plate: true } },
                station: { select: { name: true } },
            },
        })

        if (sessions.length > 0) {
            const totalAmount = sessions.reduce((sum, s) => sum + Number(s.amount || 0), 0)
            const totalKwh = sessions.reduce((sum, s) => sum + Number(s.kwh || 0), 0)

            lineItems.push({
                type: 'session',
                description: `Fleet Charging Sessions (${sessions.length} sessions)`,
                quantity: sessions.length,
                unitAmount: totalAmount / sessions.length,
                totalAmount,
                metadata: {
                    totalKwh,
                    vehicleCount: new Set(sessions.map(s => s.vehicleId)).size,
                },
            })

            grossAmount = totalAmount
        }

        return { lineItems, grossAmount }
    }

    // =================== ANALYTICS ===================

    async getSettlementStats(orgId?: string) {
        const where: Prisma.SettlementWhereInput = orgId ? { orgId } : {}

        const [total, pending, completed, failed, totalAmount, paidAmount] = await Promise.all([
            this.prisma.settlement.count({ where }),
            this.prisma.settlement.count({ where: { ...where, status: 'PENDING' } }),
            this.prisma.settlement.count({ where: { ...where, status: 'COMPLETED' } }),
            this.prisma.settlement.count({ where: { ...where, status: 'FAILED' } }),
            this.prisma.settlement.aggregate({
                where,
                _sum: { netAmount: true },
            }),
            this.prisma.settlement.aggregate({
                where: { ...where, status: 'COMPLETED' },
                _sum: { netAmount: true },
            }),
        ])

        const totalAmt = Number(totalAmount._sum.netAmount || 0)
        const paidAmt = Number(paidAmount._sum.netAmount || 0)

        return {
            count: { total, pending, completed, failed },
            amount: {
                total: totalAmt,
                paid: paidAmt,
                pending: totalAmt - paidAmt,
            },
        }
    }
}

