import { Controller, Get, Post, Query, Body, Res, HttpStatus, UseGuards, Request } from '@nestjs/common'
import { Response } from 'express'
import { AnalyticsService } from './analytics.service'
import { ReportExportService, ReportType, ExportFormat } from './report-export.service'
import { OperatorDashboardService } from './operator-dashboard.service'
import { ResellerDashboardService } from './reseller-dashboard.service'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { RolesGuard } from '../common/guards/roles.guard'
import { Roles } from '../common/auth/roles.decorator'

@Controller('api/analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AnalyticsController {
    constructor(
        private analyticsService: AnalyticsService,
        private reportExportService: ReportExportService,
        private operatorDashboard: OperatorDashboardService,
        private resellerDashboard: ResellerDashboardService,
    ) { }

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
     * Export data in various formats
     * GET /api/analytics/export?type=sessions&format=CSV&start=2024-01-01&end=2024-01-31
     */
    @Get('export')
    @Roles('ORG_OWNER', 'ORG_ADMIN', 'PLATFORM_ADMIN', 'SUPER_ADMIN')
    async exportData(
        @Query('type') type: ReportType,
        @Query('format') format: ExportFormat = ExportFormat.CSV,
        @Query('start') startDate: string,
        @Query('end') endDate: string,
        @Res() res: Response,
        @Query('orgId') orgId?: string
    ) {
        try {
            const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
            const end = endDate ? new Date(endDate) : new Date()

            const report = await this.reportExportService.exportReport(type, format, start, end, orgId)

            // Set appropriate content type and filename
            const contentType =
                format === ExportFormat.PDF
                    ? 'application/pdf'
                    : format === ExportFormat.CSV
                        ? 'text/csv'
                        : 'application/json'

            const extension = format.toLowerCase()
            const filename = `${type}_export_${new Date().toISOString().split('T')[0]}.${extension}`

            res.setHeader('Content-Type', contentType)
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
            res.status(HttpStatus.OK).send(report)
        } catch (error) {
            res.status(HttpStatus.BAD_REQUEST).json({
                error: (error as any).message
            })
        }
    }

    /**
     * Generate comprehensive report (POST for complex queries)
     * POST /api/analytics/reports/generate
     */
    @Post('reports/generate')
    @Roles('ORG_OWNER', 'ORG_ADMIN', 'PLATFORM_ADMIN', 'SUPER_ADMIN')
    async generateReport(
        @Body() body: {
            type: ReportType
            format: ExportFormat
            startDate: string
            endDate: string
            orgId?: string
        },
        @Res() res: Response
    ) {
        try {
            const report = await this.reportExportService.exportReport(
                body.type,
                body.format,
                new Date(body.startDate),
                new Date(body.endDate),
                body.orgId,
            )

            const contentType =
                body.format === ExportFormat.PDF
                    ? 'application/pdf'
                    : body.format === ExportFormat.CSV
                        ? 'text/csv'
                        : 'application/json'

            const extension = body.format.toLowerCase()
            const filename = `${body.type}_report_${new Date().toISOString().split('T')[0]}.${extension}`

            res.setHeader('Content-Type', contentType)
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
            res.status(HttpStatus.OK).send(report)
        } catch (error) {
            res.status(HttpStatus.BAD_REQUEST).json({
                error: (error as any).message
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

    /**
     * Get operator dashboard metrics
     * GET /api/analytics/operator/dashboard
     */
    @Get('operator/dashboard')
    @Roles('ORG_ADMIN', 'ORG_OWNER', 'PLATFORM_ADMIN', 'SUPER_ADMIN')
    async getOperatorDashboard(
        @Request() req: any,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
    ) {
        const orgId = req.user.orgId
        if (!orgId) {
            throw new Error('Organization ID required')
        }
        return this.operatorDashboard.getDashboardMetrics(
            orgId,
            startDate ? new Date(startDate) : undefined,
            endDate ? new Date(endDate) : undefined,
        )
    }

    /**
     * Get reseller dashboard metrics
     * GET /api/analytics/reseller/dashboard
     */
    @Get('reseller/dashboard')
    @Roles('ORG_ADMIN', 'ORG_OWNER', 'PLATFORM_ADMIN', 'SUPER_ADMIN')
    async getResellerDashboard(
        @Request() req: any,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
    ) {
        const orgId = req.user.orgId
        if (!orgId) {
            throw new Error('Organization ID required')
        }
        return this.resellerDashboard.getDashboardMetrics(
            orgId,
            startDate ? new Date(startDate) : undefined,
            endDate ? new Date(endDate) : undefined,
        )
    }

    /**
     * Get reseller commission breakdown
     * GET /api/analytics/reseller/commission
     */
    @Get('reseller/commission')
    @Roles('ORG_ADMIN', 'ORG_OWNER', 'PLATFORM_ADMIN', 'SUPER_ADMIN')
    async getResellerCommission(
        @Request() req: any,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
    ) {
        const orgId = req.user.orgId
        if (!orgId) {
            throw new Error('Organization ID required')
        }
        return this.resellerDashboard.getCommissionBreakdown(
            orgId,
            startDate ? new Date(startDate) : undefined,
            endDate ? new Date(endDate) : undefined,
        )
    }
}
