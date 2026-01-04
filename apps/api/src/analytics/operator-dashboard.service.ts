/**
 * Operator Dashboard Service
 * Provides operator-specific metrics and analytics.
 */
import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '../common/prisma/prisma.service'

export interface OperatorDashboardMetrics {
  orgId: string
  period: { start: Date; end: Date }
  stations: {
    total: number
    online: number
    offline: number
    degraded: number
    maintenance: number
  }
  sessions: {
    total: number
    active: number
    completed: number
    failed: number
    totalEnergy: number // kWh
    totalRevenue: number
  }
  utilization: {
    averageUtilization: number // percentage
    peakUtilization: number
    peakTime: Date | null
  }
  revenue: {
    total: number
    byPaymentMethod: Record<string, number>
    trend: Array<{ date: string; amount: number }>
  }
  users: {
    total: number
    active: number
    new: number
  }
}

@Injectable()
export class OperatorDashboardService {
  private readonly logger = new Logger(OperatorDashboardService.name)

  constructor(private prisma: PrismaService) {}

  /**
   * Get operator dashboard metrics.
   */
  async getDashboardMetrics(
    orgId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<OperatorDashboardMetrics> {
    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Default: last 30 days
    const end = endDate || new Date()

    // Get stations
    const stations = await this.prisma.station.findMany({
      where: { orgId },
    })

    const stationStats = {
      total: stations.length,
      online: stations.filter((s) => s.status === 'ONLINE').length,
      offline: stations.filter((s) => s.status === 'OFFLINE').length,
      degraded: stations.filter((s) => s.status === 'DEGRADED').length,
      maintenance: stations.filter((s) => s.status === 'MAINTENANCE').length,
    }

    // Get sessions
    const sessions = await this.prisma.chargingSession.findMany({
      where: {
        station: { orgId },
        startedAt: { gte: start, lte: end },
      },
      include: {
        payments: true,
      },
    })

    const sessionStats = {
      total: sessions.length,
      active: sessions.filter((s) => s.status === 'ACTIVE').length,
      completed: sessions.filter((s) => s.status === 'COMPLETED').length,
      failed: sessions.filter((s) => s.status === 'FAILED').length,
      totalEnergy: sessions.reduce((sum, s) => sum + (s.kwh || 0), 0),
      totalRevenue: sessions.reduce((sum, s) => sum + Number(s.amount || 0), 0),
    }

    // Calculate utilization
    const utilization = this.calculateUtilization(stations, sessions, start, end)

    // Get revenue breakdown
    const payments = await this.prisma.payment.findMany({
      where: {
        session: {
          station: { orgId },
        },
        createdAt: { gte: start, lte: end },
        status: 'SUCCEEDED',
      },
    })

    const revenueByMethod: Record<string, number> = {}
    payments.forEach((p) => {
      revenueByMethod[p.method] = (revenueByMethod[p.method] || 0) + Number(p.amount)
    })

    // Revenue trend (daily)
    const revenueTrend = this.calculateRevenueTrend(payments, start, end)

    // Get users
    const users = await this.prisma.user.findMany({
      where: {
        organization: { id: orgId },
        createdAt: { lte: end },
      },
    })

    const activeUsers = await this.prisma.user.count({
      where: {
        organization: { id: orgId },
        sessions: {
          some: {
            startedAt: { gte: start },
          },
        },
      },
    })

    const newUsers = users.filter((u) => u.createdAt >= start).length

    return {
      orgId,
      period: { start, end },
      stations: stationStats,
      sessions: sessionStats,
      utilization,
      revenue: {
        total: sessionStats.totalRevenue,
        byPaymentMethod: revenueByMethod,
        trend: revenueTrend,
      },
      users: {
        total: users.length,
        active: activeUsers,
        new: newUsers,
      },
    }
  }

  /**
   * Calculate station utilization.
   */
  private calculateUtilization(
    stations: any[],
    sessions: any[],
    start: Date,
    end: Date,
  ): { averageUtilization: number; peakUtilization: number; peakTime: Date | null } {
    if (stations.length === 0) {
      return { averageUtilization: 0, peakUtilization: 0, peakTime: null }
    }

    const totalHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60)
    const totalStationHours = stations.length * totalHours

    // Calculate total charging hours
    const chargingHours = sessions.reduce((sum, s) => {
      if (s.endedAt && s.startedAt) {
        const duration = (s.endedAt.getTime() - s.startedAt.getTime()) / (1000 * 60 * 60)
        return sum + duration
      }
      return sum
    }, 0)

    const averageUtilization = totalStationHours > 0 ? (chargingHours / totalStationHours) * 100 : 0

    // Find peak utilization (simplified - would need hourly breakdown)
    const peakUtilization = averageUtilization * 1.5 // Placeholder
    const peakTime = sessions.length > 0 ? sessions[0].startedAt : null

    return {
      averageUtilization: Math.round(averageUtilization * 100) / 100,
      peakUtilization: Math.round(peakUtilization * 100) / 100,
      peakTime,
    }
  }

  /**
   * Calculate revenue trend.
   */
  private calculateRevenueTrend(payments: any[], start: Date, end: Date): Array<{ date: string; amount: number }> {
    const trend: Record<string, number> = {}
    const currentDate = new Date(start)

    while (currentDate <= end) {
      const dateKey = currentDate.toISOString().split('T')[0]
      trend[dateKey] = 0
      currentDate.setDate(currentDate.getDate() + 1)
    }

    payments.forEach((p) => {
      const dateKey = p.createdAt.toISOString().split('T')[0]
      if (trend[dateKey] !== undefined) {
        trend[dateKey] += Number(p.amount)
      }
    })

    return Object.entries(trend).map(([date, amount]) => ({
      date,
      amount: Math.round(amount * 100) / 100,
    }))
  }
}

