import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '../common/prisma/prisma.service'
import { CacheService } from '../integrations/redis/cache.service'
import { SessionManagerService } from '../sessions/session-manager.service'

@Injectable()
export class AnalyticsService {
    private readonly logger = new Logger(AnalyticsService.name)

    constructor(
        private prisma: PrismaService,
        private cache: CacheService,
        private sessionManager: SessionManagerService
    ) { }

    async getDashboardMetrics(orgId?: string) {
        const whereClause = orgId ? { station: { orgId: orgId } } : {}

        const [totalSessions, totalRevenue, totalEnergy] = await Promise.all([
            this.prisma.chargingSession.count({ where: whereClause as any }),
            this.prisma.chargingSession.aggregate({
                where: whereClause as any,
                _sum: { amount: true }
            }),
            this.prisma.chargingSession.aggregate({
                where: whereClause as any,
                _sum: { kwh: true }
            })
        ])

        const activeSessions = await this.sessionManager.getActiveSessions()
        const orgActiveSessions = orgId
            ? activeSessions.filter(s => s.stationId && s.stationId.startsWith(orgId))
            : activeSessions

        return {
            realTime: {
                activeSessions: orgActiveSessions.length,
                onlineChargers: 0,
                totalPower: 0,
                currentRevenue: 0
            },
            today: {
                sessions: totalSessions,
                revenue: Number(totalRevenue._sum?.amount || 0),
                energyDelivered: Number(totalEnergy._sum?.kwh || 0)
            },
            chargers: {
                available: 0,
                charging: orgActiveSessions.length,
                offline: 0
            }
        }
    }

    async getChargerUptime(period: string, orgId?: string) {
        return {
            overall: 98.5,
            history: [] as any[]
        }
    }

    async getUsageAnalytics(period: string, orgId?: string) {
        return {
            revenue: { total: 0, average: 0 },
            energy: { total: 0, average: 0, peak: 0 },
            trends: [] as any[]
        }
    }

    async exportData(type: string, start: Date, end: Date, orgId?: string) {
        return 'id,date,amount\n1,2024-01-01,10.0'
    }

    async getTopStations(orgId?: string, limit: number = 5) {
        const stations = await this.prisma.station.findMany({
            where: orgId ? { orgId: orgId } : {},
            include: {
                _count: {
                    select: { sessions: true }
                }
            },
            take: limit
        })

        return stations.sort((a: any, b: any) => (b._count as any).sessions - (a._count as any).sessions)
    }

    async getUserAnalytics(orgId?: string) {
        const whereClause = orgId ? { orgId: orgId } : {}
        const users = await this.prisma.user.findMany({
            where: whereClause,
            include: {
                _count: {
                    select: { sessions: true }
                }
            }
        })

        const fleetUsers = users.filter(u => u.role === 'FLEET_DRIVER').length
        const publicUsers = users.length - fleetUsers

        return {
            total: users.length,
            fleetUsers,
            publicUsers,
            activeUsers: users.filter((u: any) => (u._count as any).sessions > 0).length
        }
    }
}
