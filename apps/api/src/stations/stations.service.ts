import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../common/prisma/prisma.service'
import { CreateStationDto, UpdateStationDto, StationQueryDto } from './dto/station.dto'
import { Prisma } from '@prisma/client'

@Injectable()
export class StationsService {
    constructor(private prisma: PrismaService) {}

    async create(orgId: string, dto: CreateStationDto) {
        // Check if station code already exists
        const existing = await this.prisma.station.findUnique({
            where: { code: dto.code },
        })

        if (existing) {
            throw new BadRequestException('Station with this code already exists')
        }

        return this.prisma.station.create({
            data: {
                code: dto.code,
                name: dto.name,
                region: dto.region,
                country: dto.country,
                address: dto.address,
                lat: dto.lat,
                lng: dto.lng,
                images: dto.images || [],
                amenities: dto.amenities || [],
                orgId,
                type: dto.type,
                status: dto.status || 'ONLINE',
                make: dto.make,
                model: dto.model,
                maxKw: dto.maxKw,
                connectors: dto.connectors || 0,
                swapBays: dto.swapBays || 0,
            },
            include: {
                organization: { select: { id: true, name: true } },
                chargePoints: true,
                pricing: true,
            },
        })
    }

    async findAll(query: StationQueryDto) {
        const where: Prisma.StationWhereInput = {}

        if (query.orgId) where.orgId = query.orgId
        if (query.type) where.type = query.type
        if (query.status) where.status = query.status
        if (query.region) where.region = { contains: query.region, mode: 'insensitive' }
        if (query.country) where.country = { contains: query.country, mode: 'insensitive' }
        
        if (query.search) {
            where.OR = [
                { name: { contains: query.search, mode: 'insensitive' } },
                { code: { contains: query.search, mode: 'insensitive' } },
                { address: { contains: query.search, mode: 'insensitive' } },
            ]
        }

        // Geospatial search (simple bounding box for now)
        if (query.lat && query.lng && query.radiusKm) {
            const latDelta = query.radiusKm / 111 // ~111km per degree latitude
            const lngDelta = query.radiusKm / (111 * Math.cos(query.lat * Math.PI / 180))
            
            where.lat = { gte: query.lat - latDelta, lte: query.lat + latDelta }
            where.lng = { gte: query.lng - lngDelta, lte: query.lng + lngDelta }
        }

        const [stations, total] = await Promise.all([
            this.prisma.station.findMany({
                where,
                include: {
                    organization: { select: { id: true, name: true } },
                    chargePoints: {
                        include: { connectors: true },
                    },
                    pricing: true,
                    _count: {
                        select: {
                            bookings: true,
                            sessions: true,
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
                take: query.limit || 50,
                skip: query.offset || 0,
            }),
            this.prisma.station.count({ where }),
        ])

        // Calculate distance if lat/lng provided
        let results = stations
        if (query.lat && query.lng) {
            results = stations.map(station => ({
                ...station,
                distance: station.lat && station.lng 
                    ? this.calculateDistance(query.lat!, query.lng!, station.lat, station.lng)
                    : null,
            })).sort((a, b) => (a.distance || Infinity) - (b.distance || Infinity))
        }

        return {
            stations: results,
            total,
            limit: query.limit || 50,
            offset: query.offset || 0,
        }
    }

    async findOne(id: string) {
        const station = await this.prisma.station.findUnique({
            where: { id },
            include: {
                organization: { select: { id: true, name: true } },
                chargePoints: {
                    include: { connectors: true },
                },
                swapStations: {
                    include: {
                        shelves: true,
                        packs: { where: { status: 'AVAILABLE' } },
                    },
                },
                pricing: { include: { rules: { where: { active: true } } } },
                schedules: { where: { active: true } },
                access: { take: 10, orderBy: { createdAt: 'desc' } },
                policies: { where: { active: true } },
            },
        })

        if (!station) throw new NotFoundException('Station not found')
        return station
    }

    async findByCode(code: string) {
        const station = await this.prisma.station.findUnique({
            where: { code },
            include: {
                organization: { select: { id: true, name: true } },
                chargePoints: { include: { connectors: true } },
                pricing: true,
            },
        })

        if (!station) throw new NotFoundException('Station not found')
        return station
    }

    async update(id: string, dto: UpdateStationDto) {
        await this.findOne(id)

        return this.prisma.station.update({
            where: { id },
            data: {
                name: dto.name,
                region: dto.region,
                country: dto.country,
                address: dto.address,
                lat: dto.lat,
                lng: dto.lng,
                images: dto.images,
                amenities: dto.amenities,
                type: dto.type,
                status: dto.status,
                make: dto.make,
                model: dto.model,
                maxKw: dto.maxKw,
                connectors: dto.connectors,
                swapBays: dto.swapBays,
            },
            include: {
                organization: { select: { id: true, name: true } },
                chargePoints: true,
                pricing: true,
            },
        })
    }

    async delete(id: string) {
        const station = await this.findOne(id)

        // Check for active sessions
        const activeSessions = await this.prisma.chargingSession.count({
            where: { stationId: id, status: 'ACTIVE' },
        })

        if (activeSessions > 0) {
            throw new BadRequestException('Cannot delete station with active sessions')
        }

        await this.prisma.station.delete({ where: { id } })
        return { success: true, message: 'Station deleted successfully' }
    }

    async getStats(id: string) {
        const station = await this.findOne(id)

        const now = new Date()
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)

        const [
            totalSessions,
            todaySessions,
            monthSessions,
            totalEnergy,
            totalRevenue,
            avgSessionDuration,
            connectorStats,
        ] = await Promise.all([
            // Total sessions
            this.prisma.chargingSession.count({ where: { stationId: id } }),
            // Today's sessions
            this.prisma.chargingSession.count({
                where: { stationId: id, startedAt: { gte: today } },
            }),
            // This month's sessions
            this.prisma.chargingSession.count({
                where: { stationId: id, startedAt: { gte: thisMonth } },
            }),
            // Total energy delivered
            this.prisma.chargingSession.aggregate({
                where: { stationId: id, status: 'COMPLETED' },
                _sum: { kwh: true },
            }),
            // Total revenue
            this.prisma.chargingSession.aggregate({
                where: { stationId: id, status: 'COMPLETED' },
                _sum: { amount: true },
            }),
            // Average session duration (completed sessions)
            this.prisma.$queryRaw<{ avg_duration: number }[]>`
                SELECT AVG(EXTRACT(EPOCH FROM ("endedAt" - "startedAt"))) / 60 as avg_duration
                FROM "ChargingSession"
                WHERE "stationId" = ${id} AND status = 'COMPLETED' AND "endedAt" IS NOT NULL
            `,
            // Connector stats
            this.prisma.connector.groupBy({
                by: ['status'],
                where: { chargePoint: { stationId: id } },
                _count: { status: true },
            }),
        ])

        // Calculate utilization (percentage of time connectors were in use today)
        const totalConnectors = station.connectors || 0
        const utilizationPercent = totalConnectors > 0 
            ? Math.round((todaySessions / (totalConnectors * 24)) * 100)
            : 0

        return {
            station: { id: station.id, name: station.name, code: station.code },
            sessions: {
                total: totalSessions,
                today: todaySessions,
                thisMonth: monthSessions,
            },
            energy: {
                totalKwh: totalEnergy._sum.kwh || 0,
            },
            revenue: {
                total: totalRevenue._sum.amount || 0,
                currency: 'USD',
            },
            performance: {
                avgSessionDurationMinutes: avgSessionDuration[0]?.avg_duration || 0,
                utilizationPercent,
            },
            connectors: {
                total: totalConnectors,
                byStatus: connectorStats.reduce((acc, c) => {
                    acc[c.status] = c._count.status
                    return acc
                }, {} as Record<string, number>),
            },
        }
    }

    async updateHealth(id: string) {
        const station = await this.findOne(id)

        // Calculate health score based on various factors
        const [faultedConnectors, openIncidents, recentSessions] = await Promise.all([
            this.prisma.connector.count({
                where: { chargePoint: { stationId: id }, status: 'FAULTED' },
            }),
            this.prisma.incident.count({
                where: { stationId: id, status: { in: ['OPEN', 'ACKNOWLEDGED'] } },
            }),
            this.prisma.chargingSession.count({
                where: {
                    stationId: id,
                    startedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
                },
            }),
        ])

        const totalConnectors = station.connectors || 1
        let healthScore = 100

        // Deduct for faulted connectors
        healthScore -= (faultedConnectors / totalConnectors) * 40

        // Deduct for open incidents
        healthScore -= Math.min(openIncidents * 10, 30)

        // Boost for recent activity (up to 10 points)
        healthScore += Math.min(recentSessions, 10)

        healthScore = Math.max(0, Math.min(100, Math.round(healthScore)))

        return this.prisma.station.update({
            where: { id },
            data: {
                healthScore,
                openIncidents,
                lastHeartbeat: new Date(),
            },
        })
    }

    async getNearbyStations(lat: number, lng: number, radiusKm: number = 10, limit: number = 10) {
        return this.findAll({
            lat,
            lng,
            radiusKm,
            limit,
            status: 'ONLINE',
        })
    }

    // Haversine formula for distance calculation
    private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
        const R = 6371 // Earth's radius in km
        const dLat = this.toRad(lat2 - lat1)
        const dLng = this.toRad(lng2 - lng1)
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2)
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
        return Math.round(R * c * 100) / 100 // Round to 2 decimal places
    }

    private toRad(deg: number): number {
        return deg * (Math.PI / 180)
    }
}

