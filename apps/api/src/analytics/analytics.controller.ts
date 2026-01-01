import { Controller, Get, Query, Res, HttpStatus } from '@nestjs/common'
import { Response } from 'express'
import { AnalyticsService } from './analytics.service'

@Controller('api/analytics')
export class AnalyticsController {
    constructor(private analyticsService: AnalyticsService) { }

    /**
     * Get comprehensive dashboard metrics
     * GET /api/analytics/dashboard
     */
    @Get('dashboard')
    async getDashboardMetrics() {
        return this.analyticsService.getDashboardMetrics()
    }

    /**
     * Get charger uptime statistics
     * GET /api/analytics/uptime?period=7d
     */
    @Get('uptime')
    async getChargerUptime(@Query('period') period: '24h' | '7d' | '30d' = '7d') {
        return this.analyticsService.getChargerUptime(period)
    }

    /**
     * Get usage analytics with trends
     * GET /api/analytics/usage?period=30d
     */
    @Get('usage')
    async getUsageAnalytics(@Query('period') period: '24h' | '7d' | '30d' = '7d') {
        return this.analyticsService.getUsageAnalytics(period)
    }

    /**
     * Export data as CSV
     * GET /api/analytics/export?type=sessions&start=2024-01-01&end=2024-01-31
     */
    @Get('export')
    async exportData(
        @Query('type') type: 'sessions' | 'chargers' | 'transactions',
        @Query('start') startDate: string,
        @Query('end') endDate: string,
        @Res() res: Response
    ) {
        try {
            const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
            const end = endDate ? new Date(endDate) : new Date()

            const csv = await this.analyticsService.exportData(type, start, end)

            res.setHeader('Content-Type', 'text/csv')
            res.setHeader('Content-Disposition', `attachment; filename="${type}_export_${Date.now()}.csv"`)
            res.status(HttpStatus.OK).send(csv)
        } catch (error) {
            res.status(HttpStatus.BAD_REQUEST).json({
                error: error.message
            })
        }
    }

    /**
     * Get real-time statistics
     * GET /api/analytics/realtime
     */
    @Get('realtime')
    async getRealTimeStats() {
        const metrics = await this.analyticsService.getDashboardMetrics()
        return {
            activeSessions: metrics.realTime.activeSessions,
            onlineChargers: metrics.realTime.onlineChargers,
            totalPower: metrics.realTime.totalPower,
            currentRevenue: metrics.realTime.currentRevenue,
            chargerStatus: metrics.chargers
        }
    }

    /**
     * Get revenue analytics
     * GET /api/analytics/revenue?period=7d
     */
    @Get('revenue')
    async getRevenueAnalytics(@Query('period') period: '24h' | '7d' | '30d' = '7d') {
        const usage = await this.analyticsService.getUsageAnalytics(period)
        const metrics = await this.analyticsService.getDashboardMetrics()

        return {
            period,
            total: usage.revenue.total,
            average: usage.revenue.average,
            current: metrics.realTime.currentRevenue,
            today: metrics.today.revenue,
            trends: usage.trends.map(t => ({
                date: t.date,
                revenue: t.revenue
            }))
        }
    }

    /**
     * Get energy analytics
     * GET /api/analytics/energy?period=7d
     */
    @Get('energy')
    async getEnergyAnalytics(@Query('period') period: '24h' | '7d' | '30d' = '7d') {
        const usage = await this.analyticsService.getUsageAnalytics(period)
        const metrics = await this.analyticsService.getDashboardMetrics()

        return {
            period,
            total: usage.energy.total,
            average: usage.energy.average,
            peak: usage.energy.peak,
            today: metrics.today.energyDelivered,
            trends: usage.trends.map(t => ({
                date: t.date,
                energy: t.energy
            }))
        }
    }
}
