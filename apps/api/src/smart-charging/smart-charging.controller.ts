import { Controller, Get, Post, Put, Body, Param, Query } from '@nestjs/common'
import { SmartChargingService } from './smart-charging.service'

@Controller('api/smart-charging')
export class SmartChargingController {
    constructor(private smartCharging: SmartChargingService) { }

    /**
     * Get site power limits and current allocation
     * GET /api/smart-charging/sites/:siteId/power
     */
    @Get('sites/:siteId/power')
    async getSitePower(@Param('siteId') siteId: string) {
        return this.smartCharging.getSitePowerLimit(siteId)
    }

    /**
     * Update site power limit
     * PUT /api/smart-charging/sites/:siteId/power
     */
    @Put('sites/:siteId/power')
    async updateSitePower(
        @Param('siteId') siteId: string,
        @Body() body: { maxPower: number }
    ) {
        await this.smartCharging.updateSitePowerLimit(siteId, body.maxPower)
        return {
            success: true,
            message: `Site power limit updated to ${body.maxPower}kW`,
            siteId
        }
    }

    /**
     * Trigger load rebalancing for a site
     * POST /api/smart-charging/sites/:siteId/rebalance
     */
    @Post('sites/:siteId/rebalance')
    async rebalanceSite(@Param('siteId') siteId: string) {
        await this.smartCharging.rebalanceLoadForSite(siteId)
        return {
            success: true,
            message: `Load rebalancing triggered for site ${siteId}`
        }
    }

    /**
     * Add user to charging queue
     * POST /api/smart-charging/queue
     */
    @Post('queue')
    async addToQueue(
        @Body() body: {
            userId: string
            chargerId: string
            userType: 'FLEET' | 'PUBLIC'
            requestedPower?: number
        }
    ) {
        const priority = await this.smartCharging.queueChargingSession(
            body.userId,
            body.chargerId,
            body.userType,
            body.requestedPower
        )

        return {
            success: true,
            message: 'Added to charging queue',
            priority,
            queuePosition: priority.priority
        }
    }

    /**
     * Get queue status for a charger
     * GET /api/smart-charging/chargers/:chargerId/queue
     */
    @Get('chargers/:chargerId/queue')
    async getQueue(@Param('chargerId') chargerId: string) {
        const queue = await this.smartCharging.getQueueStatus(chargerId)

        return {
            chargerId,
            queueLength: queue.length,
            queue: queue.map((item, index) => ({
                position: index + 1,
                userId: item.userId,
                userType: item.userType,
                priority: item.priority,
                requestedPower: item.requestedPower,
                waitingSince: item.timestamp
            }))
        }
    }

    /**
     * Process queue for a charger (manually trigger)
     * POST /api/smart-charging/chargers/:chargerId/process-queue
     */
    @Post('chargers/:chargerId/process-queue')
    async processQueue(@Param('chargerId') chargerId: string) {
        await this.smartCharging.processQueue(chargerId)
        return {
            success: true,
            message: `Queue processed for charger ${chargerId}`
        }
    }
}
