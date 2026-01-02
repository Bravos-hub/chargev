import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../common/prisma/prisma.service'
import {
    CreateIncidentDto,
    UpdateIncidentDto,
    CreateJobDto,
    UpdateJobDto,
    QueryIncidentsDto,
    QueryJobsDto,
} from './dto/operations.dto'

@Injectable()
export class OperationsService {
    constructor(private prisma: PrismaService) {}

    // =================== INCIDENTS ===================

    async createIncident(tenantId: string, dto: CreateIncidentDto, userId?: string) {
        // Calculate SLA based on severity
        const slaHours = { CRITICAL: 4, HIGH: 8, MEDIUM: 24, LOW: 72 }
        const slaDeadline = new Date()
        slaDeadline.setHours(slaDeadline.getHours() + slaHours[dto.severity])

        return this.prisma.incident.create({
            data: {
                tenantId,
                stationId: dto.stationId,
                title: dto.title,
                description: dto.description,
                severity: dto.severity,
                reportedBy: dto.reportedBy || userId || 'system',
                slaDeadline,
                photos: dto.photos || [],
                metadata: dto.metadata,
            },
            include: { station: { select: { id: true, name: true, address: true } } },
        })
    }

    async findAllIncidents(tenantId: string, query: QueryIncidentsDto) {
        const where: any = { tenantId }

        if (query.stationId) where.stationId = query.stationId
        if (query.status) where.status = query.status
        if (query.severity) where.severity = query.severity
        if (query.assignedTo) where.assignedTo = query.assignedTo

        const [incidents, total] = await Promise.all([
            this.prisma.incident.findMany({
                where,
                include: {
                    station: { select: { id: true, name: true } },
                    _count: { select: { jobs: true } },
                },
                orderBy: [{ severity: 'desc' }, { createdAt: 'desc' }],
                take: query.limit || 50,
                skip: query.offset || 0,
            }),
            this.prisma.incident.count({ where }),
        ])

        return { incidents, total }
    }

    async findIncident(id: string) {
        const incident = await this.prisma.incident.findUnique({
            where: { id },
            include: {
                station: true,
                jobs: { orderBy: { createdAt: 'desc' } },
            },
        })

        if (!incident) throw new NotFoundException('Incident not found')
        return incident
    }

    async updateIncident(id: string, dto: UpdateIncidentDto) {
        const incident = await this.findIncident(id)

        const updateData: any = {
            title: dto.title,
            description: dto.description,
            severity: dto.severity,
            status: dto.status,
            assignedTo: dto.assignedTo,
            photos: dto.photos,
            metadata: dto.metadata,
        }

        // Set timestamps based on status changes
        if (dto.status === 'ACKNOWLEDGED' && incident.status === 'OPEN') {
            updateData.acknowledgedAt = new Date()
        }
        if (dto.status === 'RESOLVED' && incident.status !== 'RESOLVED') {
            updateData.resolvedAt = new Date()
            updateData.resolution = dto.resolution
        }

        return this.prisma.incident.update({
            where: { id },
            data: updateData,
        })
    }

    async acknowledgeIncident(id: string, userId: string) {
        return this.updateIncident(id, {
            status: 'ACKNOWLEDGED',
            assignedTo: userId,
        } as UpdateIncidentDto)
    }

    async resolveIncident(id: string, resolution: string) {
        return this.updateIncident(id, {
            status: 'RESOLVED',
            resolution,
        } as UpdateIncidentDto)
    }

    async closeIncident(id: string) {
        return this.prisma.incident.update({
            where: { id },
            data: { status: 'CLOSED' },
        })
    }

    // =================== JOBS ===================

    async createJob(tenantId: string, dto: CreateJobDto) {
        return this.prisma.job.create({
            data: {
                tenantId,
                incidentId: dto.incidentId,
                stationId: dto.stationId,
                type: dto.type,
                priority: dto.priority,
                title: dto.title,
                description: dto.description,
                assignedTo: dto.assignedTo,
                dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
                slaDeadline: dto.slaDeadline ? new Date(dto.slaDeadline) : null,
                metadata: dto.metadata,
            },
            include: {
                incident: { select: { id: true, title: true } },
                station: { select: { id: true, name: true } },
            },
        })
    }

    async findAllJobs(tenantId: string, query: QueryJobsDto) {
        const where: any = { tenantId }

        if (query.stationId) where.stationId = query.stationId
        if (query.incidentId) where.incidentId = query.incidentId
        if (query.status) where.status = query.status
        if (query.type) where.type = query.type
        if (query.priority) where.priority = query.priority
        if (query.assignedTo) where.assignedTo = query.assignedTo

        const [jobs, total] = await Promise.all([
            this.prisma.job.findMany({
                where,
                include: {
                    incident: { select: { id: true, title: true, severity: true } },
                    station: { select: { id: true, name: true } },
                },
                orderBy: [{ priority: 'asc' }, { dueDate: 'asc' }],
                take: query.limit || 50,
                skip: query.offset || 0,
            }),
            this.prisma.job.count({ where }),
        ])

        return { jobs, total }
    }

    async findJob(id: string) {
        const job = await this.prisma.job.findUnique({
            where: { id },
            include: {
                incident: true,
                station: true,
            },
        })

        if (!job) throw new NotFoundException('Job not found')
        return job
    }

    async updateJob(id: string, dto: UpdateJobDto) {
        const job = await this.findJob(id)

        const updateData: any = {
            title: dto.title,
            description: dto.description,
            priority: dto.priority,
            status: dto.status,
            assignedTo: dto.assignedTo,
            dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
            resolution: dto.resolution,
            timeSpent: dto.timeSpent,
            parts: dto.parts,
            photos: dto.photos,
            signature: dto.signature,
        }

        // Set timestamps based on status changes
        if (dto.status === 'IN_PROGRESS' && job.status === 'OPEN') {
            updateData.startedAt = new Date()
        }
        if (dto.status === 'COMPLETED' && job.status !== 'COMPLETED') {
            updateData.completedAt = new Date()
        }

        return this.prisma.job.update({
            where: { id },
            data: updateData,
        })
    }

    async assignJob(id: string, userId: string) {
        return this.prisma.job.update({
            where: { id },
            data: {
                assignedTo: userId,
                status: 'ASSIGNED',
            },
        })
    }

    async startJob(id: string) {
        return this.prisma.job.update({
            where: { id },
            data: {
                status: 'IN_PROGRESS',
                startedAt: new Date(),
            },
        })
    }

    async completeJob(id: string, dto: { resolution: string; timeSpent?: number; signature?: string }) {
        return this.prisma.job.update({
            where: { id },
            data: {
                status: 'COMPLETED',
                completedAt: new Date(),
                resolution: dto.resolution,
                timeSpent: dto.timeSpent,
                signature: dto.signature,
            },
        })
    }

    async cancelJob(id: string) {
        return this.prisma.job.update({
            where: { id },
            data: { status: 'CANCELLED' },
        })
    }

    // =================== ANALYTICS ===================

    async getOperationsStats(tenantId: string) {
        const [
            openIncidents,
            criticalIncidents,
            openJobs,
            overdueJobs,
            completedJobsToday,
        ] = await Promise.all([
            this.prisma.incident.count({
                where: { tenantId, status: { in: ['OPEN', 'ACKNOWLEDGED', 'IN_PROGRESS'] } },
            }),
            this.prisma.incident.count({
                where: { tenantId, severity: 'CRITICAL', status: { not: 'CLOSED' } },
            }),
            this.prisma.job.count({
                where: { tenantId, status: { in: ['OPEN', 'ASSIGNED', 'IN_PROGRESS'] } },
            }),
            this.prisma.job.count({
                where: {
                    tenantId,
                    status: { in: ['OPEN', 'ASSIGNED', 'IN_PROGRESS'] },
                    dueDate: { lt: new Date() },
                },
            }),
            this.prisma.job.count({
                where: {
                    tenantId,
                    status: 'COMPLETED',
                    completedAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
                },
            }),
        ])

        return {
            incidents: { open: openIncidents, critical: criticalIncidents },
            jobs: { open: openJobs, overdue: overdueJobs, completedToday: completedJobsToday },
        }
    }

    async getSLAMetrics(tenantId: string, days = 30) {
        const startDate = new Date()
        startDate.setDate(startDate.getDate() - days)

        const incidents = await this.prisma.incident.findMany({
            where: {
                tenantId,
                createdAt: { gte: startDate },
                status: { in: ['RESOLVED', 'CLOSED'] },
            },
            select: {
                slaDeadline: true,
                resolvedAt: true,
            },
        })

        const withinSLA = incidents.filter(
            i => i.resolvedAt && i.slaDeadline && i.resolvedAt <= i.slaDeadline
        ).length

        return {
            total: incidents.length,
            withinSLA,
            breached: incidents.length - withinSLA,
            complianceRate: incidents.length > 0 ? (withinSLA / incidents.length) * 100 : 100,
        }
    }
}
