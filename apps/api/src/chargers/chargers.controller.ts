import { Controller, Get, Post, Body, Param, Query, UseGuards, Delete, Put, Request } from '@nestjs/common'
import { ChargersService } from './chargers.service'
import { ChargerGroupService } from './charger-group.service'
import { VendorConfigService } from './vendor-config.service'
import { ChargerQueryDto, SendCommandDto } from './dto/charger.dto'
import { CreateChargerGroupDto, UpdateChargerGroupDto, CreateLocationGroupsDto } from './dto/charger-group.dto'
import { CreateVendorConfigDto, UpdateVendorConfigDto, ApplyConfigDto } from './dto/vendor-config.dto'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { RolesGuard } from '../common/guards/roles.guard'
import { Roles } from '../common/auth/roles.decorator'

@Controller('api/chargers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ChargersController {
    constructor(
        private chargersService: ChargersService,
        private chargerGroupService: ChargerGroupService,
        private vendorConfigService: VendorConfigService,
    ) {}

    /**
     * Get all chargers with real-time status
     * GET /api/chargers
     */
    @Get()
    async getAllChargers(@Query() query: ChargerQueryDto) {
        return await this.chargersService.getAllChargers(query.status)
    }

    /**
     * Get charger status summary
     * GET /api/chargers/:id/status
     */
    @Get(':id/status')
    async getChargerStatus(@Param('id') id: string) {
        return await this.chargersService.getChargerStatus(id)
    }

    /**
     * Get charger statistics
     * GET /api/chargers/:id/stats
     */
    @Get(':id/stats')
    async getChargerStats(@Param('id') id: string) {
        return await this.chargersService.getChargerStats(id)
    }

    /**
     * Calculate and get charger health score
     * GET /api/chargers/:id/health
     */
    @Get(':id/health')
    @Roles('ORG_ADMIN', 'ORG_OWNER', 'PLATFORM_ADMIN', 'SUPER_ADMIN', 'STATION_ADMIN')
    async getChargerHealth(@Param('id') id: string) {
        const score = await this.chargersService.calculateHealthScore(id)
        const trend = await this.chargersService.getHealthTrend(id)
        return {
            chargerId: id,
            healthScore: score,
            trend: trend.trend,
            incidentCount: trend.incidentCount,
        }
    }

    /**
     * Get charger health trend
     * GET /api/chargers/:id/health/trend
     */
    @Get(':id/health/trend')
    @Roles('ORG_ADMIN', 'ORG_OWNER', 'PLATFORM_ADMIN', 'SUPER_ADMIN', 'STATION_ADMIN')
    async getHealthTrend(@Param('id') id: string, @Query('days') days?: number) {
        return this.chargersService.getHealthTrend(id, days ? parseInt(days.toString()) : 30)
    }

    /**
     * Get single charger with detailed status
     * GET /api/chargers/:id
     */
    @Get(':id')
    async getCharger(@Param('id') id: string) {
        return await this.chargersService.getChargerById(id)
    }

    /**
     * Send remote command to charger
     * POST /api/chargers/:id/command
     */
    @Post(':id/command')
    @Roles('STATION_ADMIN', 'ORG_ADMIN', 'ORG_OWNER', 'PLATFORM_ADMIN', 'SUPER_ADMIN')
    async sendCommand(@Param('id') id: string, @Body() commandDto: SendCommandDto) {
        return await this.chargersService.sendCommand(id, commandDto)
    }

    // =================== CHARGER GROUPS ===================

    /**
     * Create a charger group.
     */
    @Post('groups')
    @Roles('ORG_ADMIN', 'ORG_OWNER', 'PLATFORM_ADMIN', 'SUPER_ADMIN')
    async createGroup(@Body() dto: CreateChargerGroupDto) {
        return this.chargerGroupService.createGroup(dto.orgId, dto)
    }

    /**
     * Get all charger groups for an organization.
     */
    @Get('groups')
    @Roles('ORG_ADMIN', 'ORG_OWNER', 'PLATFORM_ADMIN', 'SUPER_ADMIN')
    async getGroups(@Query('orgId') orgId: string) {
        return this.chargerGroupService.getGroups(orgId)
    }

    /**
     * Get a specific charger group.
     */
    @Get('groups/:id')
    @Roles('ORG_ADMIN', 'ORG_OWNER', 'PLATFORM_ADMIN', 'SUPER_ADMIN')
    async getGroup(@Param('id') id: string, @Query('orgId') orgId: string) {
        return this.chargerGroupService.getGroup(id, orgId)
    }

    /**
     * Update a charger group.
     */
    @Post('groups/:id')
    @Roles('ORG_ADMIN', 'ORG_OWNER', 'PLATFORM_ADMIN', 'SUPER_ADMIN')
    async updateGroup(
        @Param('id') id: string,
        @Query('orgId') orgId: string,
        @Body() dto: UpdateChargerGroupDto,
    ) {
        return this.chargerGroupService.updateGroup(id, orgId, dto)
    }

    /**
     * Delete a charger group.
     */
    @Post('groups/:id/delete')
    @Roles('ORG_ADMIN', 'ORG_OWNER', 'PLATFORM_ADMIN', 'SUPER_ADMIN')
    async deleteGroup(@Param('id') id: string, @Query('orgId') orgId: string) {
        await this.chargerGroupService.deleteGroup(id, orgId)
        return { message: 'Group deleted successfully' }
    }

    /**
     * Get group health summary.
     */
    @Get('groups/:id/health')
    @Roles('ORG_ADMIN', 'ORG_OWNER', 'PLATFORM_ADMIN', 'SUPER_ADMIN')
    async getGroupHealth(@Param('id') id: string, @Query('orgId') orgId: string) {
        return this.chargerGroupService.getGroupHealth(id, orgId)
    }

    /**
     * Get group analytics.
     */
    @Get('groups/:id/analytics')
    @Roles('ORG_ADMIN', 'ORG_OWNER', 'PLATFORM_ADMIN', 'SUPER_ADMIN')
    async getGroupAnalytics(
        @Param('id') id: string,
        @Query('orgId') orgId: string,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
    ) {
        return this.chargerGroupService.getGroupAnalytics(
            id,
            orgId,
            startDate ? new Date(startDate) : undefined,
            endDate ? new Date(endDate) : undefined,
        )
    }

    /**
     * Create location-based groups automatically.
     */
    @Post('groups/location-based')
    @Roles('ORG_ADMIN', 'ORG_OWNER', 'PLATFORM_ADMIN', 'SUPER_ADMIN')
    async createLocationGroups(@Body() dto: CreateLocationGroupsDto) {
        return this.chargerGroupService.createLocationBasedGroups(
            dto.orgId,
            dto.maxDistanceKm,
        )
    }

    // =================== VENDOR CONFIGURATION TEMPLATES ===================

    /**
     * Create a vendor configuration template.
     */
    @Post('vendor-configs')
    @Roles('ORG_ADMIN', 'ORG_OWNER', 'PLATFORM_ADMIN', 'SUPER_ADMIN')
    async createVendorConfig(@Request() req: any, @Body() dto: CreateVendorConfigDto) {
        const orgId = req.user?.orgId || null
        return this.vendorConfigService.createTemplate(orgId, dto)
    }

    /**
     * Get all vendor configuration templates.
     */
    @Get('vendor-configs')
    @Roles('ORG_ADMIN', 'ORG_OWNER', 'PLATFORM_ADMIN', 'SUPER_ADMIN', 'STATION_ADMIN')
    async getVendorConfigs(
        @Request() req: any,
        @Query('vendor') vendor?: string,
        @Query('model') model?: string,
    ) {
        const orgId = req.user?.orgId
        return this.vendorConfigService.getTemplates(orgId, vendor, model)
    }

    /**
     * Get a specific vendor configuration template.
     */
    @Get('vendor-configs/:id')
    @Roles('ORG_ADMIN', 'ORG_OWNER', 'PLATFORM_ADMIN', 'SUPER_ADMIN', 'STATION_ADMIN')
    async getVendorConfig(@Param('id') id: string) {
        return this.vendorConfigService.getTemplate(id)
    }

    /**
     * Update a vendor configuration template.
     */
    @Put('vendor-configs/:id')
    @Roles('ORG_ADMIN', 'ORG_OWNER', 'PLATFORM_ADMIN', 'SUPER_ADMIN')
    async updateVendorConfig(
        @Request() req: any,
        @Param('id') id: string,
        @Body() dto: UpdateVendorConfigDto,
    ) {
        const orgId = req.user?.orgId || null
        return this.vendorConfigService.updateTemplate(id, orgId, dto)
    }

    /**
     * Delete a vendor configuration template.
     */
    @Delete('vendor-configs/:id')
    @Roles('ORG_ADMIN', 'ORG_OWNER', 'PLATFORM_ADMIN', 'SUPER_ADMIN')
    async deleteVendorConfig(@Request() req: any, @Param('id') id: string) {
        const orgId = req.user?.orgId || null
        await this.vendorConfigService.deleteTemplate(id, orgId)
        return { message: 'Template deleted successfully' }
    }

    /**
     * Apply a vendor configuration template to charge points.
     */
    @Post('vendor-configs/:id/apply')
    @Roles('ORG_ADMIN', 'ORG_OWNER', 'PLATFORM_ADMIN', 'SUPER_ADMIN')
    async applyVendorConfig(
        @Request() req: any,
        @Param('id') id: string,
        @Body() dto: ApplyConfigDto,
    ) {
        const orgId = req.user?.orgId
        if (!orgId) {
            throw new Error('Organization ID required')
        }
        return this.vendorConfigService.applyTemplate(id, orgId, dto)
    }

    /**
     * Remove vendor configuration from charge points.
     */
    @Post('vendor-configs/remove')
    @Roles('ORG_ADMIN', 'ORG_OWNER', 'PLATFORM_ADMIN', 'SUPER_ADMIN')
    async removeVendorConfig(@Request() req: any, @Body() dto: { chargePointIds: string[] }) {
        const orgId = req.user?.orgId
        if (!orgId) {
            throw new Error('Organization ID required')
        }
        return this.vendorConfigService.removeTemplate(dto.chargePointIds, orgId)
    }

    /**
     * Get default template for a vendor/model.
     */
    @Get('vendor-configs/default/:vendor')
    @Roles('ORG_ADMIN', 'ORG_OWNER', 'PLATFORM_ADMIN', 'SUPER_ADMIN', 'STATION_ADMIN')
    async getDefaultTemplate(
        @Request() req: any,
        @Param('vendor') vendor: string,
        @Query('model') model?: string,
    ) {
        const orgId = req.user?.orgId
        return this.vendorConfigService.getDefaultTemplate(vendor, model, orgId)
    }

    /**
     * Clone a vendor configuration template.
     */
    @Post('vendor-configs/:id/clone')
    @Roles('ORG_ADMIN', 'ORG_OWNER', 'PLATFORM_ADMIN', 'SUPER_ADMIN')
    async cloneVendorConfig(
        @Request() req: any,
        @Param('id') id: string,
        @Body() dto: { name: string },
    ) {
        const orgId = req.user?.orgId || null
        return this.vendorConfigService.cloneTemplate(id, orgId, dto.name)
    }
}

