import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '../../common/prisma/prisma.service'
import { CacheService } from '../../integrations/redis/cache.service'
import { SessionManagerService } from '../../sessions/session-manager.service'

export interface DashboardMetrics {
    realTime: {
        activeSessions: number
        onlineChargers: number
        totalPower: number // kW
        currentRevenue: number
    }
    today: {
        sessionsCompleted: number
        energyDelivered: number // kWh
        revenue: number
        averageSessionDuration: number // minutes
    }
    chargers: {
        total: number
        online: number
        offline: number
        charging: number
        available: number
        faulted: number
    }
}

export interface ChargerUptime {
    chargerId: string
    chargerCode: string
    uptime: number // percentage
    totalTime: number // hours
    onlineTime: number // hours
    lastSeen: string
    status: string
}

export interface UsageAnalytics {
    period: '24h' | '7d' | '30d'
    sessions: {
        total: number
        completed: number
        failed: number
    }
    energy: {
        total: number // kWh
        average: number // kWh per session
        peak: number // kWh
    }
    revenue: {
        total: number
        average: number // per session
    }
    trends: {
        date: string
        sessions: number
        energy: number
        revenue: number
    }[]
}

@Injectable()
export class AnalyticsService {
    private readonly logger = new Logger(AnalyticsService.name)

    constructor(
        private prisma: PrismaService,
        private cache: CacheService,
        private sessionManager: SessionManagerService
    ) { }

    /**
     * Get comprehensive dashboard metrics
     */
    async getDashboardMetrics(): Promise<DashboardMetrics> {
        const [realTime, today, chargers] = await Promise.all([
            this.getRealTimeMetrics(),
            this.getTodayMetrics(),
            this.getChargerMetrics()
        ])

        return {
            realTime,
            today,
            chargers
        }
    }

    /**
     * Get real-time metrics from Redis cache
     */
    private async getRealTimeMetrics() {
        const activeSessions = await this.sessionManager.getActiveSessions()
        const onlineChargerIds = await this.cache.sMembers('chargers:online')

        const totalPower = activeSessions.reduce((sum, session) => {
            // Assuming average power of 7kW per active session (can be refined)
            return sum + 7
        }, 0)

        const currentRevenue = activeSessions.reduce((sum, session) => {
            return sum + session.cost
        }, 0)

        return {
            activeSessions: activeSessions.length,
            onlineChargers: onlineChargerIds.length,
            totalPower,
            currentRevenue
        }
    }

    /**
     * Get today's completed sessions metrics
     */
    private async getTodayMetrics() {
        const startOfDay = new Date()
        startOfDay.setHours(0, 0, 0, 0)

        const sessions = await this.prisma.chargingSession.findMany({
            where: {
                startedAt: {
                    gte: startOfDay
                },
                status: 'COMPLETED'
            }
        })

        const energyDelivered = sessions.reduce((sum, s) => sum + s.energyDelivered, 0)
        const revenue = sessions.reduce((sum, s) => sum + s.cost, 0)

        const totalDuration = sessions.reduce((sum, s) => {
            if (s.endedAt) {
                return sum + (s.endedAt.getTime() - s.startedAt.getTime())
            }
            return sum
        }, 0)

        const averageSessionDuration = sessions.length > 0
            ? (totalDuration / sessions.length) / 60000 // Convert to minutes
            : 0

        return {
            sessionsCompleted: sessions.length,
            energyDelivered,
            revenue,
            averageSessionDuration
        }
    }

    /**
     * Get charger status breakdown
     */
    private async getChargerMetrics() {
        const totalChargers = await this.prisma.station.count()
        const onlineChargerIds = await this.cache.sMembers('chargers:online')

        // Get active sessions to determine which chargers are currently charging
        const activeSessions = await this.sessionManager.getActiveSessions()
        const chargingChargerIds = new Set(activeSessions.map(s => s.stationId))

        const online = onlineChargerIds.length
        const offline = totalChargers - online
        const charging = chargingChargerIds.size
        const available = online - charging

        return {
            total: totalChargers,
            online,
            offline,
            charging,
            available,
            faulted: 0 // TODO: Track faulted chargers from error codes
        }
    }

    /**
     * Get charger uptime statistics
     */
    async getChargerUptime(period: '24h' | '7d' | '30d' = '24h'): Promise<ChargerUptime[]> {
        const hours = period === '24h' ? 24 : period === '7d' ? 168 : 720
        const startTime = new Date(Date.now() - hours * 60 * 60 * 1000)

        const stations = await this.prisma.station.findMany()
        const onlineChargerIds = await this.cache.sMembers('chargers:online')
        const onlineSet = new Set(onlineChargerIds)

        return Promise.all(stations.map(async (station) => {
            // Get cached status to determine last seen
            const cachedStatus = await this.cache.get<any>(`charger:${station.id}:status`)

            // For now, simplified uptime calculation
            // In production, you'd track uptime history in a time-series DB
            const isOnline = onlineSet.has(station.id)
            const uptime = isOnline ? 100 : 0 // Simplified

            return {
                chargerId: station.id,
                chargerCode: station.code,
                uptime,
                totalTime: hours,
                onlineTime: isOnline ? hours : 0,
                lastSeen: cachedStatus?.lastConnected || station.updatedAt.toISOString(),
                status: station.status
            }
        }))
    }

    /**
     * Get usage analytics with trends
     */
    async getUsageAnalytics(period: '24h' | '7d' | '30d' = '7d'): Promise<UsageAnalytics> {
        const days = period === '24h' ? 1 : period === '7d' ? 7 : 30
        const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

        const sessions = await this.prisma.chargingSession.findMany({
            where: {
                startedAt: {
                    gte: startDate
                }
            },
            orderBy: {
                startedAt: 'asc'
            }
        })

        const completed = sessions.filter(s => s.status === 'COMPLETED')
        const failed = sessions.filter(s => s.status === 'FAILED')

        const totalEnergy = sessions.reduce((sum, s) => sum + s.energyDelivered, 0)
        const totalRevenue = sessions.reduce((sum, s) => sum + s.cost, 0)
        const maxEnergy = Math.max(...sessions.map(s => s.energyDelivered))

        // Group by date for trends
        const trendsByDate = new Map<string, { sessions: number; energy: number; revenue: number }>()

        sessions.forEach(session => {
            const dateKey = session.startedAt.toISOString().split('T')[0]
            const existing = trendsByDate.get(dateKey) || { sessions: 0, energy: 0, revenue: 0 }

            trendsByDate.set(dateKey, {
                sessions: existing.sessions + 1,
                energy: existing.energy + session.energyDelivered,
                revenue: existing.revenue + session.cost
            })
        })

        const trends = Array.from(trendsByDate.entries()).map(([date, data]) => ({
            date,
            ...data
        }))

        return {
            period,
            sessions: {
                total: sessions.length,
                completed: completed.length,
                failed: failed.length
            },
            energy: {
                total: totalEnergy,
                average: sessions.length > 0 ? totalEnergy / sessions.length : 0,
                peak: maxEnergy
            },
            revenue: {
                total: totalRevenue,
                average: sessions.length > 0 ? totalRevenue / sessions.length : 0
            },
            trends
        }
    }

    /**
     * Export analytics data as CSV
     */
    async exportData(
        type: 'sessions' | 'chargers' | 'transactions',
        startDate: Date,
        endDate: Date
    ): Promise<string> {
        switch (type) {
            case 'sessions':
                return this.exportSessions(startDate, endDate)
            case 'chargers':
                return this.exportChargers()
            case 'transactions':
                return this.exportTransactions(startDate, endDate)
            default:
                throw new Error(`Unknown export type: ${type}`)
        }
    }

    private async exportSessions(startDate: Date, endDate: Date): Promise<string> {
        const sessions = await this.prisma.chargingSession.findMany({
            where: {
                startedAt: { gte: startDate, lte: endDate }
            },
            include: {
                station: true
            }
        })

        const headers = ['Session ID', 'Station', 'Start Time', 'End Time', 'Duration (min)', 'Energy (kWh)', 'Cost', 'Status']
        const rows = sessions.map(s => {
            const duration = s.endedAt
                ? ((s.endedAt.getTime() - s.startedAt.getTime()) / 60000).toFixed(2)
                : 'Ongoing'

            return [
                s.id,
                s.station?.code || s.stationId,
                s.startedAt.toISOString(),
                s.endedAt?.toISOString() || '',
                duration,
                s.energyDelivered.toFixed(2),
                s.cost.toFixed(2),
                s.status
            ].join(',')
        })

        return [headers.join(','), ...rows].join('\n')
    }

    private async exportChargers(): Promise<string> {
        const chargers = await this.prisma.station.findMany()
        const onlineIds = await this.cache.sMembers('chargers:online')
        const onlineSet = new Set(onlineIds)

        const headers = ['Charger ID', 'Code', 'Name', 'Status', 'Online', 'Address']
        const rows = chargers.map(c => [
            c.id,
            c.code,
            c.name || '',
            c.status,
            onlineSet.has(c.id) ? 'Yes' : 'No',
            c.address || ''
        ].join(','))

        return [headers.join(','), ...rows].join('\n')
    }

    private async exportTransactions(startDate: Date, endDate: Date): Promise<string> {
        // Alias for sessions export
        return this.exportSessions(startDate, endDate)
    }
}
