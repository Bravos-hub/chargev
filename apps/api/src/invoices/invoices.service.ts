import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common'
import { PrismaService } from '../common/prisma/prisma.service'
import {
    CreateInvoiceDto,
    UpdateInvoiceDto,
    GenerateInvoiceDto,
    InvoiceQueryDto,
    InvoiceLineItemDto,
} from './dto/invoice.dto'
import { InvoiceStatus, Prisma } from '@prisma/client'

@Injectable()
export class InvoicesService {
    private readonly logger = new Logger(InvoicesService.name)
    private invoiceCounter = 0

    constructor(private prisma: PrismaService) {}

    async create(dto: CreateInvoiceDto) {
        // Verify organization exists
        const org = await this.prisma.organization.findUnique({
            where: { id: dto.orgId },
        })

        if (!org) {
            throw new NotFoundException('Organization not found')
        }

        return this.prisma.invoice.create({
            data: {
                orgId: dto.orgId,
                amount: dto.amount,
                currency: dto.currency || 'USD',
                status: dto.status || 'PENDING',
                issuedAt: new Date(dto.issuedAt),
                dueAt: new Date(dto.dueAt),
            },
            include: {
                organization: { select: { id: true, name: true } },
            },
        })
    }

    async findAll(query: InvoiceQueryDto) {
        const where: Prisma.InvoiceWhereInput = {}

        if (query.orgId) where.orgId = query.orgId
        if (query.status) where.status = query.status

        if (query.issuedAfter || query.issuedBefore) {
            where.issuedAt = {}
            if (query.issuedAfter) where.issuedAt.gte = new Date(query.issuedAfter)
            if (query.issuedBefore) where.issuedAt.lte = new Date(query.issuedBefore)
        }

        if (query.dueAfter || query.dueBefore) {
            where.dueAt = {}
            if (query.dueAfter) where.dueAt.gte = new Date(query.dueAfter)
            if (query.dueBefore) where.dueAt.lte = new Date(query.dueBefore)
        }

        const [invoices, total] = await Promise.all([
            this.prisma.invoice.findMany({
                where,
                include: {
                    organization: { select: { id: true, name: true } },
                },
                orderBy: { issuedAt: 'desc' },
                take: query.limit || 50,
                skip: query.offset || 0,
            }),
            this.prisma.invoice.count({ where }),
        ])

        return { invoices, total, limit: query.limit || 50, offset: query.offset || 0 }
    }

    async findOne(id: string) {
        const invoice = await this.prisma.invoice.findUnique({
            where: { id },
            include: {
                organization: { select: { id: true, name: true, type: true } },
            },
        })

        if (!invoice) throw new NotFoundException('Invoice not found')
        return invoice
    }

    async findByOrg(orgId: string) {
        return this.prisma.invoice.findMany({
            where: { orgId },
            orderBy: { issuedAt: 'desc' },
        })
    }

    async update(id: string, dto: UpdateInvoiceDto) {
        await this.findOne(id)

        return this.prisma.invoice.update({
            where: { id },
            data: {
                amount: dto.amount,
                status: dto.status,
                dueAt: dto.dueAt ? new Date(dto.dueAt) : undefined,
                paidAt: dto.paidAt ? new Date(dto.paidAt) : undefined,
            },
            include: {
                organization: { select: { id: true, name: true } },
            },
        })
    }

    async delete(id: string) {
        const invoice = await this.findOne(id)

        if (invoice.status === 'PAID') {
            throw new BadRequestException('Cannot delete a paid invoice')
        }

        await this.prisma.invoice.delete({ where: { id } })
        return { success: true, message: 'Invoice deleted successfully' }
    }

    async markAsPaid(id: string) {
        const invoice = await this.findOne(id)

        if (invoice.status === 'PAID') {
            throw new BadRequestException('Invoice is already marked as paid')
        }

        return this.prisma.invoice.update({
            where: { id },
            data: {
                status: 'PAID',
                paidAt: new Date(),
            },
            include: {
                organization: { select: { id: true, name: true } },
            },
        })
    }

    async markAsOverdue(id: string) {
        const invoice = await this.findOne(id)

        if (invoice.status === 'PAID') {
            throw new BadRequestException('Cannot mark a paid invoice as overdue')
        }

        return this.prisma.invoice.update({
            where: { id },
            data: { status: 'OVERDUE' },
        })
    }

    async generateInvoice(dto: GenerateInvoiceDto) {
        const org = await this.prisma.organization.findUnique({
            where: { id: dto.orgId },
        })

        if (!org) {
            throw new NotFoundException('Organization not found')
        }

        const periodStart = new Date(dto.periodStart)
        const periodEnd = new Date(dto.periodEnd)

        const lineItems: InvoiceLineItemDto[] = []
        let subtotal = 0

        // Get charging sessions for the period
        if (dto.includeSessions !== false) {
            const sessions = await this.prisma.chargingSession.findMany({
                where: {
                    station: { orgId: dto.orgId },
                    status: 'COMPLETED',
                    startedAt: { gte: periodStart },
                    endedAt: { lte: periodEnd },
                },
                select: {
                    id: true,
                    kwh: true,
                    amount: true,
                    startedAt: true,
                    station: { select: { name: true } },
                },
            })

            if (sessions.length > 0) {
                const sessionTotal = sessions.reduce((sum, s) => sum + Number(s.amount || 0), 0)
                const totalKwh = sessions.reduce((sum, s) => sum + Number(s.kwh || 0), 0)

                lineItems.push({
                    description: `Charging Sessions (${sessions.length} sessions, ${totalKwh.toFixed(2)} kWh)`,
                    quantity: sessions.length,
                    unitPrice: sessionTotal / sessions.length,
                    total: sessionTotal,
                    type: 'session',
                })
                subtotal += sessionTotal
            }
        }

        // Get subscriptions for the period
        if (dto.includeSubscriptions !== false) {
            const subscriptions = await this.prisma.subscription.findMany({
                where: {
                    plan: { orgId: dto.orgId },
                    status: 'ACTIVE',
                    currentPeriodStart: { lte: periodEnd },
                    currentPeriodEnd: { gte: periodStart },
                },
                include: {
                    plan: { select: { name: true, price: true } },
                },
            })

            for (const sub of subscriptions) {
                const price = Number(sub.plan.price)
                lineItems.push({
                    description: `Subscription: ${sub.plan.name}`,
                    quantity: 1,
                    unitPrice: price,
                    total: price,
                    type: 'subscription',
                    referenceId: sub.id,
                })
                subtotal += price
            }
        }

        // Calculate due date (30 days from now)
        const issuedAt = new Date()
        const dueAt = new Date(issuedAt)
        dueAt.setDate(dueAt.getDate() + 30)

        // Create the invoice
        const invoice = await this.prisma.invoice.create({
            data: {
                orgId: dto.orgId,
                amount: subtotal,
                currency: 'USD',
                status: 'PENDING',
                issuedAt,
                dueAt,
            },
            include: {
                organization: { select: { id: true, name: true } },
            },
        })

        this.logger.log(`Generated invoice ${invoice.id} for org ${dto.orgId}: $${subtotal}`)

        return {
            ...invoice,
            lineItems,
            subtotal,
            tax: 0, // Tax calculation would go here
            total: subtotal,
            periodStart,
            periodEnd,
        }
    }

    async getInvoiceStats(orgId?: string) {
        const where: Prisma.InvoiceWhereInput = orgId ? { orgId } : {}

        const [total, pending, paid, overdue, totalAmount, paidAmount] = await Promise.all([
            this.prisma.invoice.count({ where }),
            this.prisma.invoice.count({ where: { ...where, status: 'PENDING' } }),
            this.prisma.invoice.count({ where: { ...where, status: 'PAID' } }),
            this.prisma.invoice.count({ where: { ...where, status: 'OVERDUE' } }),
            this.prisma.invoice.aggregate({
                where,
                _sum: { amount: true },
            }),
            this.prisma.invoice.aggregate({
                where: { ...where, status: 'PAID' },
                _sum: { amount: true },
            }),
        ])

        const totalAmt = Number(totalAmount._sum.amount || 0)
        const paidAmt = Number(paidAmount._sum.amount || 0)

        return {
            count: { total, pending, paid, overdue },
            amount: {
                total: totalAmt,
                paid: paidAmt,
                outstanding: totalAmt - paidAmt,
            },
        }
    }

    async checkOverdueInvoices() {
        const now = new Date()

        const overdueInvoices = await this.prisma.invoice.findMany({
            where: {
                status: 'PENDING',
                dueAt: { lt: now },
            },
        })

        for (const invoice of overdueInvoices) {
            await this.prisma.invoice.update({
                where: { id: invoice.id },
                data: { status: 'OVERDUE' },
            })
        }

        this.logger.log(`Marked ${overdueInvoices.length} invoices as overdue`)
        return { updated: overdueInvoices.length }
    }
}

