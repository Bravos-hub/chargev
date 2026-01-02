import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../common/prisma/prisma.service'
import { CreateConnectorDto, UpdateConnectorDto, ConnectorStatusDto } from './dto/connector.dto'
import { ConnectorStatus } from '@prisma/client'

@Injectable()
export class ConnectorsService {
    constructor(private prisma: PrismaService) {}

    async create(dto: CreateConnectorDto) {
        // Check if charge point exists
        const chargePoint = await this.prisma.chargePoint.findUnique({
            where: { id: dto.chargePointId },
        })

        if (!chargePoint) {
            throw new NotFoundException('Charge point not found')
        }

        // Check for duplicate connector ID
        const existing = await this.prisma.connector.findFirst({
            where: {
                chargePointId: dto.chargePointId,
                connectorId: dto.ocppConnectorId,
            },
        })

        if (existing) {
            throw new BadRequestException('Connector with this OCPP ID already exists for this charge point')
        }

        return this.prisma.connector.create({
            data: {
                chargePointId: dto.chargePointId,
                connectorId: dto.ocppConnectorId,
                type: dto.type,
                powerType: dto.powerType,
                maxPowerKw: dto.maxPower || 0,
                voltage: dto.maxVoltage,
                amperage: dto.maxAmperage,
            },
            include: { chargePoint: { select: { id: true, vendor: true, model: true } } },
        })
    }

    async findAll(chargePointId?: string, stationId?: string) {
        const where: any = {}
        
        if (chargePointId) {
            where.chargePointId = chargePointId
        }
        
        if (stationId) {
            where.chargePoint = { stationId }
        }

        return this.prisma.connector.findMany({
            where,
            include: {
                chargePoint: {
                    select: {
                        id: true,
                        vendor: true,
                        model: true,
                        station: { select: { id: true, name: true } },
                    },
                },
            },
        })
    }

    async findOne(id: string) {
        const connector = await this.prisma.connector.findUnique({
            where: { id },
            include: {
                chargePoint: {
                    include: { station: true },
                },
            },
        })

        if (!connector) throw new NotFoundException('Connector not found')
        return connector
    }

    async findByChargePointAndOcppId(chargePointId: string, ocppConnectorId: number) {
        const connector = await this.prisma.connector.findFirst({
            where: { chargePointId, connectorId: ocppConnectorId },
            include: { chargePoint: true },
        })

        if (!connector) throw new NotFoundException('Connector not found')
        return connector
    }

    async update(id: string, dto: UpdateConnectorDto) {
        await this.findOne(id)

        return this.prisma.connector.update({
            where: { id },
            data: {
                type: dto.type,
                powerType: dto.powerType,
                status: dto.status,
                maxPowerKw: dto.maxPower,
                voltage: dto.maxVoltage,
                amperage: dto.maxAmperage,
            },
        })
    }

    async updateStatus(id: string, dto: ConnectorStatusDto) {
        await this.findOne(id)

        return this.prisma.connector.update({
            where: { id },
            data: {
                status: dto.status,
                lastStatusAt: new Date(),
            },
        })
    }

    async updateStatusByOcpp(chargePointId: string, ocppConnectorId: number, status: ConnectorStatus) {
        const connector = await this.findByChargePointAndOcppId(chargePointId, ocppConnectorId)

        return this.prisma.connector.update({
            where: { id: connector.id },
            data: {
                status,
                lastStatusAt: new Date(),
            },
        })
    }

    async delete(id: string) {
        const connector = await this.findOne(id)

        if (connector.currentSessionId) {
            throw new BadRequestException('Cannot delete connector with active session')
        }

        await this.prisma.connector.delete({ where: { id } })
        return { success: true }
    }

    async getAvailableConnectors(stationId: string) {
        return this.prisma.connector.findMany({
            where: {
                chargePoint: { stationId },
                status: 'AVAILABLE',
            },
            include: {
                chargePoint: { select: { id: true, vendor: true, model: true } },
            },
        })
    }

    async getConnectorStats(stationId?: string) {
        const where: any = {}
        if (stationId) where.chargePoint = { stationId }

        const connectors = await this.prisma.connector.groupBy({
            by: ['status'],
            where,
            _count: { status: true },
        })

        const stats: Record<string, number> = {}
        connectors.forEach(c => {
            stats[c.status] = c._count.status
        })

        return {
            total: Object.values(stats).reduce((a, b) => a + b, 0),
            byStatus: stats,
        }
    }

    async reserveConnector(id: string, userId: string) {
        const connector = await this.findOne(id)

        if (connector.status !== 'AVAILABLE') {
            throw new BadRequestException('Connector is not available')
        }

        return this.prisma.connector.update({
            where: { id },
            data: { status: 'RESERVED' },
        })
    }

    async releaseReservation(id: string) {
        const connector = await this.findOne(id)

        if (connector.status !== 'RESERVED') {
            throw new BadRequestException('Connector is not reserved')
        }

        return this.prisma.connector.update({
            where: { id },
            data: { status: 'AVAILABLE' },
        })
    }
}
