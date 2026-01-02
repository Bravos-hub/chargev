import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../common/prisma/prisma.service'
import { CreateChargePointDto, UpdateChargePointDto, CreateConnectorDto, ChargePointQueryDto } from './dto/charge-point.dto'
import { Prisma } from '@prisma/client'

@Injectable()
export class ChargePointsService {
    constructor(private prisma: PrismaService) {}

    async create(stationId: string, dto: CreateChargePointDto) {
        // Verify station exists
        const station = await this.prisma.station.findUnique({
            where: { id: stationId },
        })

        if (!station) {
            throw new NotFoundException('Station not found')
        }

        const chargePoint = await this.prisma.chargePoint.create({
            data: {
                stationId,
                vendor: dto.vendor,
                model: dto.model,
                serialNumber: dto.serialNumber,
                firmwareVersion: dto.firmwareVersion,
                status: dto.status || 'ONLINE',
                maxKw: dto.maxKw,
                connectorCount: dto.connectorCount || 1,
            },
            include: {
                station: { select: { id: true, name: true, code: true } },
                connectors: true,
            },
        })

        // Update station connector count
        await this.updateStationConnectorCount(stationId)

        return chargePoint
    }

    async findAll(query: ChargePointQueryDto) {
        const where: Prisma.ChargePointWhereInput = {}

        if (query.stationId) where.stationId = query.stationId
        if (query.status) where.status = query.status
        if (query.vendor) where.vendor = { contains: query.vendor, mode: 'insensitive' }

        const [chargePoints, total] = await Promise.all([
            this.prisma.chargePoint.findMany({
                where,
                include: {
                    station: { select: { id: true, name: true, code: true } },
                    connectors: true,
                    _count: { select: { sessions: true } },
                },
                orderBy: { createdAt: 'desc' },
                take: query.limit || 50,
                skip: query.offset || 0,
            }),
            this.prisma.chargePoint.count({ where }),
        ])

        return { chargePoints, total, limit: query.limit || 50, offset: query.offset || 0 }
    }

    async findByStation(stationId: string) {
        return this.prisma.chargePoint.findMany({
            where: { stationId },
            include: {
                connectors: true,
                _count: { select: { sessions: true } },
            },
            orderBy: { createdAt: 'asc' },
        })
    }

    async findOne(id: string) {
        const chargePoint = await this.prisma.chargePoint.findUnique({
            where: { id },
            include: {
                station: { select: { id: true, name: true, code: true, orgId: true } },
                connectors: true,
                sessions: {
                    take: 10,
                    orderBy: { startedAt: 'desc' },
                    select: {
                        id: true,
                        status: true,
                        startedAt: true,
                        endedAt: true,
                        kwh: true,
                        amount: true,
                    },
                },
            },
        })

        if (!chargePoint) throw new NotFoundException('Charge point not found')
        return chargePoint
    }

    async update(id: string, dto: UpdateChargePointDto) {
        await this.findOne(id)

        return this.prisma.chargePoint.update({
            where: { id },
            data: {
                vendor: dto.vendor,
                model: dto.model,
                serialNumber: dto.serialNumber,
                firmwareVersion: dto.firmwareVersion,
                status: dto.status,
                maxKw: dto.maxKw,
                connectorCount: dto.connectorCount,
            },
            include: {
                station: { select: { id: true, name: true, code: true } },
                connectors: true,
            },
        })
    }

    async delete(id: string) {
        const chargePoint = await this.findOne(id)

        // Check for active sessions
        const activeSessions = await this.prisma.chargingSession.count({
            where: { chargePointId: id, status: 'ACTIVE' },
        })

        if (activeSessions > 0) {
            throw new BadRequestException('Cannot delete charge point with active sessions')
        }

        await this.prisma.chargePoint.delete({ where: { id } })

        // Update station connector count
        await this.updateStationConnectorCount(chargePoint.stationId)

        return { success: true, message: 'Charge point deleted successfully' }
    }

    async updateStatus(id: string, status: 'ONLINE' | 'OFFLINE' | 'DEGRADED' | 'MAINTENANCE') {
        await this.findOne(id)

        return this.prisma.chargePoint.update({
            where: { id },
            data: {
                status,
                lastHeartbeat: new Date(),
            },
        })
    }

    async updateHeartbeat(id: string) {
        return this.prisma.chargePoint.update({
            where: { id },
            data: { lastHeartbeat: new Date() },
        })
    }

    // =================== CONNECTORS ===================

    async addConnector(chargePointId: string, dto: CreateConnectorDto) {
        const chargePoint = await this.findOne(chargePointId)

        // Check if connector ID already exists on this charge point
        const existing = await this.prisma.connector.findFirst({
            where: { chargePointId, connectorId: dto.connectorId },
        })

        if (existing) {
            throw new BadRequestException('Connector with this ID already exists on this charge point')
        }

        const connector = await this.prisma.connector.create({
            data: {
                chargePointId,
                connectorId: dto.connectorId,
                type: dto.type,
                powerType: dto.powerType,
                maxPowerKw: dto.maxPowerKw,
                voltage: dto.voltage,
                amperage: dto.amperage,
            },
        })

        // Update charge point connector count
        await this.prisma.chargePoint.update({
            where: { id: chargePointId },
            data: { connectorCount: { increment: 1 } },
        })

        // Update station connector count
        await this.updateStationConnectorCount(chargePoint.stationId)

        return connector
    }

    async getConnectors(chargePointId: string) {
        return this.prisma.connector.findMany({
            where: { chargePointId },
            orderBy: { connectorId: 'asc' },
        })
    }

    async removeConnector(chargePointId: string, connectorId: number) {
        const chargePoint = await this.findOne(chargePointId)

        const connector = await this.prisma.connector.findFirst({
            where: { chargePointId, connectorId },
        })

        if (!connector) {
            throw new NotFoundException('Connector not found')
        }

        if (connector.currentSessionId) {
            throw new BadRequestException('Cannot delete connector with active session')
        }

        await this.prisma.connector.delete({ where: { id: connector.id } })

        // Update charge point connector count
        await this.prisma.chargePoint.update({
            where: { id: chargePointId },
            data: { connectorCount: { decrement: 1 } },
        })

        // Update station connector count
        await this.updateStationConnectorCount(chargePoint.stationId)

        return { success: true, message: 'Connector removed successfully' }
    }

    async getChargePointStats(id: string) {
        const chargePoint = await this.findOne(id)

        const now = new Date()
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

        const [totalSessions, todaySessions, totalEnergy, connectorStats] = await Promise.all([
            this.prisma.chargingSession.count({ where: { chargePointId: id } }),
            this.prisma.chargingSession.count({
                where: { chargePointId: id, startedAt: { gte: today } },
            }),
            this.prisma.chargingSession.aggregate({
                where: { chargePointId: id, status: 'COMPLETED' },
                _sum: { kwh: true },
            }),
            this.prisma.connector.groupBy({
                by: ['status'],
                where: { chargePointId: id },
                _count: { status: true },
            }),
        ])

        return {
            chargePoint: {
                id: chargePoint.id,
                vendor: chargePoint.vendor,
                model: chargePoint.model,
                status: chargePoint.status,
            },
            sessions: {
                total: totalSessions,
                today: todaySessions,
            },
            energy: {
                totalKwh: totalEnergy._sum.kwh || 0,
            },
            connectors: {
                total: chargePoint.connectorCount,
                byStatus: connectorStats.reduce((acc, c) => {
                    acc[c.status] = c._count.status
                    return acc
                }, {} as Record<string, number>),
            },
        }
    }

    private async updateStationConnectorCount(stationId: string) {
        const totalConnectors = await this.prisma.connector.count({
            where: { chargePoint: { stationId } },
        })

        await this.prisma.station.update({
            where: { id: stationId },
            data: { connectors: totalConnectors },
        })
    }
}

