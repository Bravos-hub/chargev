import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common'
import { PrismaService } from '../common/prisma/prisma.service'
import {
    CreateSubscriptionPlanDto,
    UpdateSubscriptionPlanDto,
    CreateSubscriptionDto,
    UpdateSubscriptionDto,
    SubscriptionPlanQueryDto,
    SubscriptionQueryDto,
    SubscriptionFeatures,
} from './dto/subscription.dto'

@Injectable()
export class SubscriptionService {
    private readonly logger = new Logger(SubscriptionService.name)

    constructor(private prisma: PrismaService) {}

    // =================== SUBSCRIPTION PLANS ===================

    async createPlan(orgId: string, dto: CreateSubscriptionPlanDto) {
        return this.prisma.subscriptionPlan.create({
            data: {
                orgId,
                name: dto.name,
                description: dto.description,
                price: dto.price,
                currency: dto.currency || 'USD',
                interval: dto.interval,
                features: dto.features as any,
                active: dto.active ?? true,
            },
            include: {
                organization: { select: { id: true, name: true } },
                _count: { select: { subscriptions: true } },
            },
        })
    }

    async findAllPlans(query: SubscriptionPlanQueryDto) {
        const where: any = {}

        if (query.orgId) where.orgId = query.orgId
        if (query.active !== undefined) where.active = query.active

        const [plans, total] = await Promise.all([
            this.prisma.subscriptionPlan.findMany({
                where,
                include: {
                    organization: { select: { id: true, name: true } },
                    _count: { select: { subscriptions: true } },
                },
                orderBy: { price: 'asc' },
                take: query.limit || 50,
                skip: query.offset || 0,
            }),
            this.prisma.subscriptionPlan.count({ where }),
        ])

        return { plans, total, limit: query.limit || 50, offset: query.offset || 0 }
    }

    async findPlan(id: string) {
        const plan = await this.prisma.subscriptionPlan.findUnique({
            where: { id },
            include: {
                organization: { select: { id: true, name: true } },
                subscriptions: {
                    take: 10,
                    orderBy: { createdAt: 'desc' },
                    include: { user: { select: { id: true, name: true, email: true } } },
                },
                _count: { select: { subscriptions: true } },
            },
        })

        if (!plan) throw new NotFoundException('Subscription plan not found')
        return plan
    }

    async updatePlan(id: string, dto: UpdateSubscriptionPlanDto) {
        await this.findPlan(id)

        return this.prisma.subscriptionPlan.update({
            where: { id },
            data: {
                name: dto.name,
                description: dto.description,
                price: dto.price,
                currency: dto.currency,
                interval: dto.interval,
                features: dto.features as any,
                active: dto.active,
            },
            include: {
                organization: { select: { id: true, name: true } },
                _count: { select: { subscriptions: true } },
            },
        })
    }

    async deletePlan(id: string) {
        const plan = await this.findPlan(id)

        // Check if there are active subscriptions
        const activeSubscriptions = await this.prisma.subscription.count({
            where: { planId: id, status: 'ACTIVE' },
        })

        if (activeSubscriptions > 0) {
            throw new BadRequestException('Cannot delete plan with active subscriptions')
        }

        await this.prisma.subscriptionPlan.delete({ where: { id } })
        return { success: true, message: 'Subscription plan deleted successfully' }
    }

    async getPublicPlans(orgId?: string) {
        const where: any = { active: true }
        if (orgId) where.orgId = orgId

        return this.prisma.subscriptionPlan.findMany({
            where,
            select: {
                id: true,
                name: true,
                description: true,
                price: true,
                currency: true,
                interval: true,
                features: true,
                organization: { select: { id: true, name: true } },
            },
            orderBy: { price: 'asc' },
        })
    }

    // =================== SUBSCRIPTIONS ===================

    async subscribe(userId: string, dto: CreateSubscriptionDto) {
        // Check if plan exists and is active
        const plan = await this.prisma.subscriptionPlan.findUnique({
            where: { id: dto.planId },
        })

        if (!plan || !plan.active) {
            throw new NotFoundException('Subscription plan not found or inactive')
        }

        // Check if user already has an active subscription to this plan
        const existingSubscription = await this.prisma.subscription.findFirst({
            where: {
                userId,
                planId: dto.planId,
                status: 'ACTIVE',
            },
        })

        if (existingSubscription) {
            throw new BadRequestException('User already has an active subscription to this plan')
        }

        // Calculate period dates
        const now = new Date()
        const periodEnd = new Date(now)
        if (plan.interval === 'monthly') {
            periodEnd.setMonth(periodEnd.getMonth() + 1)
        } else if (plan.interval === 'yearly') {
            periodEnd.setFullYear(periodEnd.getFullYear() + 1)
        }

        // TODO: Process payment with dto.paymentMethodId if provided

        return this.prisma.subscription.create({
            data: {
                userId,
                planId: dto.planId,
                status: 'ACTIVE',
                currentPeriodStart: now,
                currentPeriodEnd: periodEnd,
            },
            include: {
                user: { select: { id: true, name: true, email: true } },
                plan: true,
            },
        })
    }

    async findAllSubscriptions(query: SubscriptionQueryDto) {
        const where: any = {}

        if (query.userId) where.userId = query.userId
        if (query.planId) where.planId = query.planId
        if (query.status) where.status = query.status

        const [subscriptions, total] = await Promise.all([
            this.prisma.subscription.findMany({
                where,
                include: {
                    user: { select: { id: true, name: true, email: true } },
                    plan: {
                        select: {
                            id: true,
                            name: true,
                            price: true,
                            currency: true,
                            interval: true,
                            features: true,
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
                take: query.limit || 50,
                skip: query.offset || 0,
            }),
            this.prisma.subscription.count({ where }),
        ])

        return { subscriptions, total, limit: query.limit || 50, offset: query.offset || 0 }
    }

    async findSubscription(id: string) {
        const subscription = await this.prisma.subscription.findUnique({
            where: { id },
            include: {
                user: { select: { id: true, name: true, email: true, phone: true } },
                plan: true,
            },
        })

        if (!subscription) throw new NotFoundException('Subscription not found')
        return subscription
    }

    async getUserSubscriptions(userId: string) {
        return this.prisma.subscription.findMany({
            where: { userId },
            include: {
                plan: {
                    select: {
                        id: true,
                        name: true,
                        price: true,
                        currency: true,
                        interval: true,
                        features: true,
                        organization: { select: { id: true, name: true } },
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        })
    }

    async getActiveSubscription(userId: string) {
        const now = new Date()

        return this.prisma.subscription.findFirst({
            where: {
                userId,
                status: 'ACTIVE',
                currentPeriodEnd: { gte: now },
            },
            include: {
                plan: true,
            },
        })
    }

    async cancelSubscription(id: string, userId: string) {
        const subscription = await this.prisma.subscription.findUnique({
            where: { id },
        })

        if (!subscription) {
            throw new NotFoundException('Subscription not found')
        }

        if (subscription.userId !== userId) {
            throw new BadRequestException('Cannot cancel subscription for another user')
        }

        if (subscription.status !== 'ACTIVE') {
            throw new BadRequestException('Subscription is not active')
        }

        return this.prisma.subscription.update({
            where: { id },
            data: {
                status: 'CANCELLED',
                cancelledAt: new Date(),
            },
            include: {
                plan: true,
            },
        })
    }

    async renewSubscription(id: string) {
        const subscription = await this.findSubscription(id)

        if (subscription.status !== 'ACTIVE') {
            throw new BadRequestException('Only active subscriptions can be renewed')
        }

        // Calculate new period
        const newPeriodStart = new Date(subscription.currentPeriodEnd)
        const newPeriodEnd = new Date(newPeriodStart)

        if (subscription.plan.interval === 'monthly') {
            newPeriodEnd.setMonth(newPeriodEnd.getMonth() + 1)
        } else if (subscription.plan.interval === 'yearly') {
            newPeriodEnd.setFullYear(newPeriodEnd.getFullYear() + 1)
        }

        // TODO: Process payment for renewal

        return this.prisma.subscription.update({
            where: { id },
            data: {
                currentPeriodStart: newPeriodStart,
                currentPeriodEnd: newPeriodEnd,
            },
            include: {
                plan: true,
            },
        })
    }

    async pauseSubscription(id: string, userId: string) {
        const subscription = await this.findSubscription(id)

        if (subscription.userId !== userId) {
            throw new BadRequestException('Cannot pause subscription for another user')
        }

        if (subscription.status !== 'ACTIVE') {
            throw new BadRequestException('Only active subscriptions can be paused')
        }

        return this.prisma.subscription.update({
            where: { id },
            data: { status: 'PAUSED' },
            include: { plan: true },
        })
    }

    async resumeSubscription(id: string, userId: string) {
        const subscription = await this.findSubscription(id)

        if (subscription.userId !== userId) {
            throw new BadRequestException('Cannot resume subscription for another user')
        }

        if (subscription.status !== 'PAUSED') {
            throw new BadRequestException('Only paused subscriptions can be resumed')
        }

        return this.prisma.subscription.update({
            where: { id },
            data: { status: 'ACTIVE' },
            include: { plan: true },
        })
    }

    async checkSubscriptionBenefits(userId: string): Promise<SubscriptionFeatures | null> {
        const subscription = await this.getActiveSubscription(userId)

        if (!subscription) return null

        return subscription.plan.features as SubscriptionFeatures
    }

    // =================== ANALYTICS ===================

    async getSubscriptionStats(orgId: string) {
        const [totalPlans, activePlans, totalSubscriptions, activeSubscriptions, revenue] = await Promise.all([
            this.prisma.subscriptionPlan.count({ where: { orgId } }),
            this.prisma.subscriptionPlan.count({ where: { orgId, active: true } }),
            this.prisma.subscription.count({
                where: { plan: { orgId } },
            }),
            this.prisma.subscription.count({
                where: { plan: { orgId }, status: 'ACTIVE' },
            }),
            this.prisma.$queryRaw<{ total: number }[]>`
                SELECT COALESCE(SUM(sp.price), 0) as total
                FROM "Subscription" s
                JOIN "SubscriptionPlan" sp ON s."planId" = sp.id
                WHERE sp."orgId" = ${orgId} AND s.status = 'ACTIVE'
            `,
        ])

        return {
            plans: { total: totalPlans, active: activePlans },
            subscriptions: { total: totalSubscriptions, active: activeSubscriptions },
            monthlyRecurringRevenue: revenue[0]?.total || 0,
        }
    }
}

