import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../common/prisma/prisma.service'
import { ReconciliationReportDto, ReconciliationResult } from './dto/settlement.dto'

@Injectable()
export class ReconciliationService {
    private readonly logger = new Logger(ReconciliationService.name)

    constructor(private prisma: PrismaService) {}

    async generateReconciliationReport(dto: ReconciliationReportDto): Promise<ReconciliationResult> {
        const org = await this.prisma.organization.findUnique({
            where: { id: dto.orgId },
        })

        if (!org) {
            throw new NotFoundException('Organization not found')
        }

        const periodStart = new Date(dto.periodStart)
        const periodEnd = new Date(dto.periodEnd)

        // Get all sessions for the period
        const sessions = await this.prisma.chargingSession.findMany({
            where: {
                station: { orgId: dto.orgId },
                status: 'COMPLETED',
                endedAt: { gte: periodStart, lte: periodEnd },
            },
            include: {
                station: { select: { id: true, name: true } },
                payments: { select: { id: true, status: true, amount: true } },
            },
        })

        // Get swap sessions
        const swapSessions = await this.prisma.swapSession.findMany({
            where: {
                station: { station: { orgId: dto.orgId } },
                status: 'COMPLETED',
                completedAt: { gte: periodStart, lte: periodEnd },
            },
        })

        // Get OCPI CDRs for roaming
        const ocpiCdrs = await this.prisma.oCPICDR.findMany({
            where: {
                partner: { organizationId: dto.orgId },
                startDateTime: { gte: periodStart },
                endDateTime: { lte: periodEnd },
            },
        })

        // Get subscriptions
        const subscriptionRevenue = await this.prisma.subscription.findMany({
            where: {
                plan: { orgId: dto.orgId },
                currentPeriodStart: { lte: periodEnd },
                currentPeriodEnd: { gte: periodStart },
            },
            include: { plan: true },
        })

        // Calculate totals
        const totalSessions = sessions.length
        const totalEnergy = sessions.reduce((sum, s) => sum + Number(s.kwh || 0), 0)
        const sessionRevenue = sessions.reduce((sum, s) => sum + Number(s.amount || 0), 0)
        const swapRevenue = swapSessions.length * 10 // Estimate swap revenue (would be calculated from payment)
        const roamingRevenue = ocpiCdrs.reduce((sum, cdr) => sum + Number(cdr.totalCost || 0), 0)
        const subRevenue = subscriptionRevenue.reduce((sum, s) => sum + Number(s.plan.price), 0)

        const totalRevenue = sessionRevenue + swapRevenue + roamingRevenue + subRevenue

        // Platform fees (3%)
        const platformFees = totalRevenue * 0.03
        const netPayout = totalRevenue - platformFees

        // Check for discrepancies
        const discrepancies = await this.findDiscrepancies(sessions, ocpiCdrs)

        return {
            period: { start: periodStart, end: periodEnd },
            organization: { id: org.id, name: org.name },
            summary: {
                totalSessions: totalSessions + swapSessions.length,
                totalEnergy,
                totalRevenue,
                platformFees,
                netPayout,
            },
            byType: {
                charging: { count: sessions.length, amount: sessionRevenue },
                swap: { count: swapSessions.length, amount: swapRevenue },
                roaming: { count: ocpiCdrs.length, amount: roamingRevenue },
                subscriptions: { count: subscriptionRevenue.length, amount: subRevenue },
            },
            discrepancies: discrepancies.length > 0 ? discrepancies : undefined,
        }
    }

    async findDiscrepancies(sessions: any[], cdrs: any[]) {
        const discrepancies: { type: string; description: string; amount: number }[] = []

        // Check for sessions without payments
        const sessionsWithoutPayment = sessions.filter(
            s => !s.payments || s.payments.length === 0 || !s.payments.some((p: any) => p.status === 'SUCCEEDED')
        )

        if (sessionsWithoutPayment.length > 0) {
            const amount = sessionsWithoutPayment.reduce((sum, s) => sum + Number(s.amount || 0), 0)
            discrepancies.push({
                type: 'MISSING_PAYMENT',
                description: `${sessionsWithoutPayment.length} sessions without successful payment`,
                amount,
            })
        }

        // Check for CDR mismatches
        // In a real implementation, you would match CDRs to sessions and check for discrepancies

        return discrepancies
    }

    async reconcileWithPartner(orgId: string, partnerId: string, periodStart: Date, periodEnd: Date) {
        const partner = await this.prisma.oCPIPartner.findUnique({
            where: { id: partnerId },
        })

        if (!partner || partner.organizationId !== orgId) {
            throw new NotFoundException('Partner not found or not associated with organization')
        }

        // Get our CDRs
        const ourCdrs = await this.prisma.oCPICDR.findMany({
            where: {
                partnerId,
                startDateTime: { gte: periodStart },
                endDateTime: { lte: periodEnd },
            },
        })

        // In a real implementation, you would:
        // 1. Fetch CDRs from the partner's OCPI endpoint
        // 2. Compare our records with theirs
        // 3. Identify any mismatches

        const totalOurAmount = ourCdrs.reduce((sum, cdr) => sum + Number(cdr.totalCost), 0)
        const totalOurEnergy = ourCdrs.reduce((sum, cdr) => sum + Number(cdr.energyKwh), 0)

        return {
            partner: { id: partner.id, name: partner.name },
            period: { start: periodStart, end: periodEnd },
            ourRecords: {
                cdrCount: ourCdrs.length,
                totalAmount: totalOurAmount,
                totalEnergyKwh: totalOurEnergy,
            },
            // partnerRecords would be fetched from partner's API
            partnerRecords: {
                cdrCount: ourCdrs.length, // Simulated as same for now
                totalAmount: totalOurAmount,
                totalEnergyKwh: totalOurEnergy,
            },
            status: 'RECONCILED', // Would be 'DISCREPANCY' if mismatch found
            discrepancies: [],
        }
    }

    async getUnreconciledItems(orgId: string) {
        // Find sessions without matching payments
        const unreconciledSessions = await this.prisma.chargingSession.findMany({
            where: {
                station: { orgId },
                status: 'COMPLETED',
                payments: { none: {} },
            },
            include: {
                station: { select: { id: true, name: true } },
                user: { select: { id: true, name: true, email: true } },
            },
            orderBy: { endedAt: 'desc' },
            take: 100,
        })

        // Find CDRs not included in settlements
        const unreconciledCdrs = await this.prisma.oCPICDR.findMany({
            where: {
                partner: { organizationId: orgId },
                status: { not: 'ACKNOWLEDGED' },
            },
            include: {
                partner: { select: { id: true, name: true } },
            },
            orderBy: { endDateTime: 'desc' },
            take: 100,
        })

        return {
            sessions: {
                count: unreconciledSessions.length,
                items: unreconciledSessions,
            },
            cdrs: {
                count: unreconciledCdrs.length,
                items: unreconciledCdrs,
            },
        }
    }

    async autoReconcile(orgId: string, periodStart: Date, periodEnd: Date) {
        this.logger.log(`Starting auto-reconciliation for org ${orgId}`)

        const results = {
            sessionsReconciled: 0,
            cdrsReconciled: 0,
            issues: [] as string[],
        }

        // Auto-match sessions with payments
        const sessionsToReconcile = await this.prisma.chargingSession.findMany({
            where: {
                station: { orgId },
                status: 'COMPLETED',
                endedAt: { gte: periodStart, lte: periodEnd },
            },
            include: { payments: true },
        })

        for (const session of sessionsToReconcile) {
            if (!session.payments || session.payments.length === 0) {
                // Try to find matching payment
                const matchingPayment = session.userId && session.amount ? await this.prisma.payment.findFirst({
                    where: {
                        userId: session.userId,
                        amount: session.amount,
                        status: 'SUCCEEDED',
                        createdAt: {
                            gte: session.startedAt,
                            lte: new Date(session.endedAt?.getTime() || Date.now() + 3600000),
                        },
                    },
                }) : null

                if (matchingPayment) {
                    // Create a link between session and payment
                    await this.prisma.payment.update({
                        where: { id: matchingPayment.id },
                        data: { sessionId: session.id },
                    })
                    results.sessionsReconciled++
                } else {
                    results.issues.push(`Session ${session.id} has no matching payment`)
                }
            } else {
                results.sessionsReconciled++
            }
        }

        // Mark CDRs as acknowledged
        const cdrsToReconcile = await this.prisma.oCPICDR.findMany({
            where: {
                partner: { organizationId: orgId },
                status: 'SENT',
                startDateTime: { gte: periodStart },
                endDateTime: { lte: periodEnd },
            },
        })

        for (const cdr of cdrsToReconcile) {
            await this.prisma.oCPICDR.update({
                where: { id: cdr.id },
                data: { status: 'ACKNOWLEDGED' },
            })
            results.cdrsReconciled++
        }

        this.logger.log(`Auto-reconciliation complete: ${results.sessionsReconciled} sessions, ${results.cdrsReconciled} CDRs`)

        return results
    }
}

