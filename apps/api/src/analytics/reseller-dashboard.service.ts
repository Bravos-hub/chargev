/**
 * Reseller Dashboard Service
 * Provides reseller-specific metrics, performance tracking, and commission management.
 */
import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '../common/prisma/prisma.service'

export interface ResellerDashboardMetrics {
  resellerId: string
  resellerName: string
  period: { start: Date; end: Date }
  performance: {
    totalCustomers: number
    activeCustomers: number
    totalRevenue: number
    commissionEarned: number
    commissionRate: number // percentage
    pendingCommission: number
  }
  customers: {
    total: number
    active: number
    new: number
    byTier: Record<string, number>
  }
  revenue: {
    total: number
    commission: number
    trend: Array<{ date: string; revenue: number; commission: number }>
  }
  stations: {
    total: number
    active: number
    totalSessions: number
    totalEnergy: number
  }
}

@Injectable()
export class ResellerDashboardService {
  private readonly logger = new Logger(ResellerDashboardService.name)

  constructor(private prisma: PrismaService) {}

  /**
   * Get reseller dashboard metrics.
   */
  async getDashboardMetrics(
    resellerOrgId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<ResellerDashboardMetrics> {
    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const end = endDate || new Date()

    // Get reseller organization
    const reseller = await this.prisma.organization.findUnique({
      where: { id: resellerOrgId },
    })

    if (!reseller) {
      throw new Error(`Reseller organization ${resellerOrgId} not found`)
    }

    // Get reseller's customers (organizations that were onboarded by this reseller)
    // This would need a reseller relationship in the Organization model
    // For now, using a placeholder approach
    const customers = await this.getResellerCustomers(resellerOrgId)

    // Get commission rate (would be stored in organization metadata or separate table)
    const commissionRate = await this.getCommissionRate(resellerOrgId)

    // Get revenue from customer organizations
    const revenueData = await this.getResellerRevenue(resellerOrgId, start, end)

    // Calculate commissions
    const commissionEarned = revenueData.totalRevenue * (commissionRate / 100)
    const pendingCommission = revenueData.pendingRevenue * (commissionRate / 100)

    // Get customer stats
    const customerStats = await this.getCustomerStats(customers, start, end)

    // Get station stats
    const stationStats = await this.getStationStats(resellerOrgId, start, end)

    return {
      resellerId: resellerOrgId,
      resellerName: reseller.name,
      period: { start, end },
      performance: {
        totalCustomers: customers.length,
        activeCustomers: customerStats.active,
        totalRevenue: revenueData.totalRevenue,
        commissionEarned: Math.round(commissionEarned * 100) / 100,
        commissionRate,
        pendingCommission: Math.round(pendingCommission * 100) / 100,
      },
      customers: customerStats,
      revenue: {
        total: revenueData.totalRevenue,
        commission: Math.round(commissionEarned * 100) / 100,
        trend: revenueData.trend,
      },
      stations: stationStats,
    }
  }

  /**
   * Get reseller's customers.
   */
  private async getResellerCustomers(resellerOrgId: string): Promise<any[]> {
    // Placeholder: Would need reseller relationship in Organization model
    // For now, return empty array
    return []
  }

  /**
   * Get commission rate for reseller.
   */
  private async getCommissionRate(resellerOrgId: string): Promise<number> {
    // Placeholder: Would fetch from organization metadata or commission table
    // Default: 10%
    return 10
  }

  /**
   * Get revenue from reseller's customers.
   */
  private async getResellerRevenue(
    resellerOrgId: string,
    start: Date,
    end: Date,
  ): Promise<{
    totalRevenue: number
    pendingRevenue: number
    trend: Array<{ date: string; revenue: number; commission: number }>
  }> {
    // Placeholder: Would aggregate revenue from customer organizations
    return {
      totalRevenue: 0,
      pendingRevenue: 0,
      trend: [],
    }
  }

  /**
   * Get customer statistics.
   */
  private async getCustomerStats(
    customers: any[],
    start: Date,
    end: Date,
  ): Promise<{
    total: number
    active: number
    new: number
    byTier: Record<string, number>
  }> {
    const active = customers.filter((c) => {
      // Check if customer has activity in period
      return true // Placeholder
    }).length

    const newCustomers = customers.filter((c) => {
      return c.createdAt >= start
    }).length

    return {
      total: customers.length,
      active,
      new: newCustomers,
      byTier: {}, // Would categorize by subscription tier
    }
  }

  /**
   * Get station statistics for reseller.
   */
  private async getStationStats(
    resellerOrgId: string,
    start: Date,
    end: Date,
  ): Promise<{
    total: number
    active: number
    totalSessions: number
    totalEnergy: number
  }> {
    // Get stations owned by reseller's customers
    // Placeholder implementation
    return {
      total: 0,
      active: 0,
      totalSessions: 0,
      totalEnergy: 0,
    }
  }

  /**
   * Get commission breakdown.
   */
  async getCommissionBreakdown(resellerOrgId: string, startDate?: Date, endDate?: Date) {
    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const end = endDate || new Date()

    // Placeholder: Would calculate detailed commission breakdown
    return {
      period: { start, end },
      totalCommission: 0,
      paidCommission: 0,
      pendingCommission: 0,
      breakdown: [],
    }
  }
}

