import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '../common/prisma/prisma.service'
import { CreateAuditLogDto, QueryAuditLogDto } from './dto/audit.dto'

@Injectable()
export class AuditService {
    private readonly logger = new Logger(AuditService.name)

    constructor(private prisma: PrismaService) {}

    async log(dto: CreateAuditLogDto) {
        try {
            return await this.prisma.auditLog.create({
                data: {
                    tenantId: dto.tenantId,
                    userId: dto.userId,
                    entityType: dto.entityType,
                    entityId: dto.entityId,
                    action: dto.action,
                    changes: dto.changes,
                    ipAddress: dto.ipAddress,
                    userAgent: dto.userAgent,
                    metadata: dto.metadata,
                },
            })
        } catch (error: any) {
            this.logger.error(`Failed to create audit log: ${error?.message || 'Unknown error'}`)
            // Don't throw - audit logging should not break the main operation
        }
    }

    async findAll(query: QueryAuditLogDto) {
        const where: any = {}

        if (query.tenantId) where.tenantId = query.tenantId
        if (query.userId) where.userId = query.userId
        if (query.entityType) where.entityType = query.entityType
        if (query.entityId) where.entityId = query.entityId
        if (query.action) where.action = query.action

        if (query.startDate || query.endDate) {
            where.createdAt = {}
            if (query.startDate) where.createdAt.gte = new Date(query.startDate)
            if (query.endDate) where.createdAt.lte = new Date(query.endDate)
        }

        const [logs, total] = await Promise.all([
            this.prisma.auditLog.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                take: query.limit || 50,
                skip: query.offset || 0,
            }),
            this.prisma.auditLog.count({ where }),
        ])

        return { logs, total, limit: query.limit || 50, offset: query.offset || 0 }
    }

    async findByEntity(entityType: string, entityId: string) {
        return this.prisma.auditLog.findMany({
            where: { entityType, entityId },
            orderBy: { createdAt: 'desc' },
        })
    }

    async findByUser(userId: string, limit = 50) {
        return this.prisma.auditLog.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: limit,
        })
    }

    async getActivitySummary(tenantId: string, days = 7) {
        const startDate = new Date()
        startDate.setDate(startDate.getDate() - days)

        const logs = await this.prisma.auditLog.groupBy({
            by: ['action'],
            where: {
                tenantId,
                createdAt: { gte: startDate },
            },
            _count: { action: true },
        })

        return logs.map(l => ({ action: l.action, count: l._count.action }))
    }
}
