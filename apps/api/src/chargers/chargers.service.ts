import { Injectable, Logger, Inject, forwardRef, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../common/prisma/prisma.service'
import { CacheService } from '../integrations/redis/cache.service'
import { KafkaService } from '../integrations/kafka/kafka.service'
import { PubSubService } from '../integrations/redis/pubsub.service'
import {
    ChargerStatusFilter,
    SendCommandDto,
    EnrichedCharger,
    ChargerDetails,
    ChargerStatusResponse,
    CommandResponse,
    ChargerStatsResponse,
    OCPPAction,
} from './dto/charger.dto'

@Injectable()
export class ChargersService {
    private readonly logger = new Logger(ChargersService.name)
    private readonly ONLINE_CHARGERS_KEY = 'chargers:online'

    constructor(
        private prisma: PrismaService,
        private cache: CacheService,
        private pubsub: PubSubService,
        @Inject(forwardRef(() => KafkaService))
        private kafka: KafkaService,
    ) {}

    /**
     * Get all chargers with real-time status enrichment
     */
    async getAllChargers(statusFilter?: ChargerStatusFilter): Promise<EnrichedCharger[]> {
        const chargers = await this.prisma.station.findMany({
            orderBy: { createdAt: 'desc' },
        })

        const onlineChargerIds = await this.cache.sMembers(this.ONLINE_CHARGERS_KEY)
        const onlineSet = new Set(onlineChargerIds)

        // Enrich with real-time status from Redis
        const enrichedChargers = await Promise.all(
            chargers.map(async (charger) => {
                const isOnline = onlineSet.has(charger.id)
                const cachedStatus = await this.cache.get<any>(`charger:${charger.id}:status`)

                return {
                    id: charger.id,
                    code: charger.code,
                    name: charger.name,
                    address: charger.address,
                    lat: charger.lat,
                    lng: charger.lng,
                    status: charger.status,
                    isOnline,
                    lastSeen: cachedStatus?.lastConnected || charger.updatedAt.toISOString(),
                    createdAt: charger.createdAt,
                    updatedAt: charger.updatedAt,
                }
            }),
        )

        // Apply status filter if provided
        if (statusFilter) {
            if (statusFilter === ChargerStatusFilter.ONLINE) {
                return enrichedChargers.filter((c) => c.isOnline)
            } else if (statusFilter === ChargerStatusFilter.OFFLINE) {
                return enrichedChargers.filter((c) => !c.isOnline)
            }
        }

        return enrichedChargers
    }

    /**
     * Get single charger with detailed status
     */
    async getChargerById(id: string): Promise<ChargerDetails> {
        const charger = await this.prisma.station.findUnique({
            where: { id },
        })

        if (!charger) {
            throw new NotFoundException('Charger not found')
        }

        const onlineChargerIds = await this.cache.sMembers(this.ONLINE_CHARGERS_KEY)
        const isOnline = onlineChargerIds.includes(id)

        // Get cached status and boot info
        const cachedStatus = await this.cache.get<any>(`charger:${id}:status`)
        const bootInfo = await this.cache.hGetAll(`charger:${id}:info`) as any

        // Get connector statuses (assuming 2 connectors for now)
        const connectors = await Promise.all(
            [1, 2].map(async (connectorId) => {
                const connectorStatus = await this.cache.get<any>(`connector:${id}:${connectorId}`)
                return {
                    id: connectorId,
                    status: connectorStatus?.status || 'Unknown',
                    errorCode: connectorStatus?.errorCode || 'NoError',
                    lastUpdate: connectorStatus?.timestamp,
                }
            }),
        )

        return {
            ...charger,
            isOnline,
            lastSeen: cachedStatus?.lastConnected || charger.updatedAt.toISOString(),
            bootInfo: bootInfo && bootInfo.bootInfo ? JSON.parse(bootInfo.bootInfo) : null,
            lastBoot: bootInfo ? bootInfo.lastBoot : null,
            connectors,
        }
    }

    /**
     * Get charger status summary
     */
    async getChargerStatus(id: string): Promise<ChargerStatusResponse> {
        const onlineChargerIds = await this.cache.sMembers(this.ONLINE_CHARGERS_KEY)
        const isOnline = onlineChargerIds.includes(id)
        const cachedStatus = await this.cache.get<any>(`charger:${id}:status`)

        if (!isOnline && !cachedStatus) {
            throw new NotFoundException('Charger not found or offline')
        }

        return {
            chargerId: id,
            isOnline,
            status: cachedStatus?.status || 'UNKNOWN',
            lastSeen: cachedStatus?.lastConnected || new Date().toISOString(),
        }
    }

    /**
     * Send remote command to charger
     */
    async sendCommand(id: string, dto: SendCommandDto): Promise<CommandResponse> {
        // Check if charger is online
        const onlineChargerIds = await this.cache.sMembers(this.ONLINE_CHARGERS_KEY)
        if (!onlineChargerIds.includes(id)) {
            throw new BadRequestException('Charger is offline')
        }

        // Validate action (DTO validation should handle this, but double-check)
        const validActions = Object.values(OCPPAction)
        if (!validActions.includes(dto.action)) {
            throw new BadRequestException('Invalid command action')
        }

        // Publish command to Kafka for CSMS to execute
        const responseKey = `cmd_${Date.now()}_${id}`

        await this.kafka.emit('ocpp.command.request', {
            chargerId: id,
            action: dto.action,
            params: dto.params || {},
            responseKey,
        })

        this.logger.log(`Command ${dto.action} sent to charger ${id}`)

        return {
            success: true,
            message: `Command ${dto.action} sent to charger ${id}`,
            responseKey,
            note: 'Monitor ocpp.command.response topic for result',
        }
    }

    /**
     * Get charger statistics
     */
    async getChargerStats(id: string): Promise<ChargerStatsResponse> {
        // Verify charger exists
        const charger = await this.prisma.station.findUnique({
            where: { id },
        })

        if (!charger) {
            throw new NotFoundException('Charger not found')
        }

        const sessions = await this.prisma.chargingSession.findMany({
            where: { stationId: id },
            orderBy: { startedAt: 'desc' },
            take: 100,
        })

        const totalSessions = sessions.length
        const completedSessions = sessions.filter((s) => s.status === 'COMPLETED').length
        const totalEnergy = sessions.reduce((sum, s) => sum + (s.kwh || 0), 0)
        const totalRevenue = sessions.reduce((sum, s) => sum + (Number(s.amount) || 0), 0)

        return {
            chargerId: id,
            totalSessions,
            completedSessions,
            totalEnergy,
            totalRevenue,
            averageEnergy: totalSessions > 0 ? totalEnergy / totalSessions : 0,
            averageRevenue: totalSessions > 0 ? totalRevenue / totalSessions : 0,
        }
    }

    /**
     * Calculate comprehensive health score for a charger.
     * Multi-factor health calculation based on:
     * - Uptime/availability
     * - Session success rate
     * - Error frequency
     * - Recent incidents
     * - Last maintenance
     */
    async calculateHealthScore(chargerId: string): Promise<number> {
        const charger = await this.prisma.station.findUnique({
            where: { id: chargerId },
            include: {
                _count: {
                    select: {
                        sessions: true,
                        incidents: true,
                    },
                },
            },
        })

        if (!charger) {
            throw new NotFoundException('Charger not found')
        }

        // Factor 1: Status (40% weight)
        const statusScore = charger.status === 'ONLINE' ? 100 : charger.status === 'DEGRADED' ? 60 : 0

        // Factor 2: Session success rate (30% weight)
        const recentSessions = await this.prisma.chargingSession.findMany({
            where: {
                stationId: chargerId,
            },
            take: 50,
            orderBy: { startedAt: 'desc' },
        })

        const successRate =
            recentSessions.length > 0
                ? (recentSessions.filter((s) => s.status === 'COMPLETED').length / recentSessions.length) * 100
                : 100

        // Factor 3: Recent incidents (20% weight)
        const recentIncidents = await this.prisma.incident.findMany({
            where: {
                stationId: chargerId,
                createdAt: {
                    gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
                },
            },
        })

        const incidentScore = Math.max(0, 100 - recentIncidents.length * 10) // -10 points per incident

        // Factor 4: Last maintenance (10% weight)
        const lastMaintenance = await this.prisma.job.findFirst({
            where: {
                stationId: chargerId,
                type: 'MAINTENANCE',
                status: 'COMPLETED',
            },
            orderBy: { completedAt: 'desc' },
        })

        let maintenanceScore = 100
        if (lastMaintenance?.completedAt) {
            const daysSinceMaintenance = (Date.now() - lastMaintenance.completedAt.getTime()) / (1000 * 60 * 60 * 24)
            // Reduce score if maintenance was more than 90 days ago
            if (daysSinceMaintenance > 90) {
                maintenanceScore = Math.max(0, 100 - (daysSinceMaintenance - 90) * 2)
            }
        } else {
            // No maintenance record - assume it's new or never maintained
            maintenanceScore = 80
        }

        // Calculate weighted health score
        const healthScore =
            statusScore * 0.4 +
            successRate * 0.3 +
            incidentScore * 0.2 +
            maintenanceScore * 0.1

        // Update charger health score
        await this.prisma.station.update({
            where: { id: chargerId },
            data: { healthScore: Math.round(healthScore) },
        })

        return Math.round(healthScore)
    }

    /**
     * Get health trend for a charger.
     */
    async getHealthTrend(chargerId: string, days = 30) {
        const startDate = new Date()
        startDate.setDate(startDate.getDate() - days)

        // Get historical health scores (would need a health score history table in production)
        // For now, calculate current and return trend indicators
        const currentScore = await this.calculateHealthScore(chargerId)

        // Get recent incidents to determine trend
        const recentIncidents = await this.prisma.incident.findMany({
            where: {
                stationId: chargerId,
                createdAt: { gte: startDate },
            },
            orderBy: { createdAt: 'desc' },
        })

        // Simple trend: compare first half vs second half of period
        const midpoint = new Date(startDate.getTime() + (Date.now() - startDate.getTime()) / 2)
        const firstHalf = recentIncidents.filter((i) => i.createdAt < midpoint).length
        const secondHalf = recentIncidents.filter((i) => i.createdAt >= midpoint).length

        let trend: 'IMPROVING' | 'STABLE' | 'DEGRADING' = 'STABLE'
        if (secondHalf < firstHalf) {
            trend = 'IMPROVING'
        } else if (secondHalf > firstHalf) {
            trend = 'DEGRADING'
        }

        return {
            currentScore,
            trend,
            incidentCount: recentIncidents.length,
            period: {
                start: startDate,
                end: new Date(),
            },
        }
    }
}

