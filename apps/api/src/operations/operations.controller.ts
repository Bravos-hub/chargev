import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Body,
    Param,
    Query,
    UseGuards,
    Request,
} from '@nestjs/common'
import { OperationsService } from './operations.service'
import { PredictiveMaintenanceService } from './predictive-maintenance.service'
import {
    CreateIncidentDto,
    UpdateIncidentDto,
    CreateJobDto,
    UpdateJobDto,
    QueryIncidentsDto,
    QueryJobsDto,
} from './dto/operations.dto'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { RolesGuard, ROLES_KEY } from '../common/guards/roles.guard'
import { UserRole } from '@prisma/client'
import { SetMetadata } from '@nestjs/common'

const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles)

@Controller('operations')
@UseGuards(JwtAuthGuard)
export class OperationsController {
    constructor(
        private operationsService: OperationsService,
        private predictiveMaintenance: PredictiveMaintenanceService,
    ) {}

    // =================== INCIDENTS ===================

    @Post('incidents')
    createIncident(@Request() req: any, @Body() dto: CreateIncidentDto) {
        return this.operationsService.createIncident(req.user.tenantId, dto, req.user.id)
    }

    @Get('incidents')
    findAllIncidents(@Request() req: any, @Query() query: QueryIncidentsDto) {
        return this.operationsService.findAllIncidents(req.user.tenantId, query)
    }

    @Get('incidents/:id')
    findIncident(@Param('id') id: string) {
        return this.operationsService.findIncident(id)
    }

    @Put('incidents/:id')
    @UseGuards(RolesGuard)
    @Roles(UserRole.STATION_ADMIN, UserRole.TECHNICIAN_PUBLIC, UserRole.TECHNICIAN_ORG, UserRole.ORG_ADMIN)
    updateIncident(@Param('id') id: string, @Body() dto: UpdateIncidentDto) {
        return this.operationsService.updateIncident(id, dto)
    }

    @Post('incidents/:id/acknowledge')
    @UseGuards(RolesGuard)
    @Roles(UserRole.STATION_ADMIN, UserRole.TECHNICIAN_PUBLIC, UserRole.TECHNICIAN_ORG, UserRole.ORG_ADMIN)
    acknowledgeIncident(@Request() req: any, @Param('id') id: string) {
        return this.operationsService.acknowledgeIncident(id, req.user.id)
    }

    @Post('incidents/:id/resolve')
    @UseGuards(RolesGuard)
    @Roles(UserRole.STATION_ADMIN, UserRole.TECHNICIAN_PUBLIC, UserRole.TECHNICIAN_ORG, UserRole.ORG_ADMIN)
    resolveIncident(@Param('id') id: string, @Body('resolution') resolution: string) {
        return this.operationsService.resolveIncident(id, resolution)
    }

    @Post('incidents/:id/close')
    @UseGuards(RolesGuard)
    @Roles(UserRole.STATION_ADMIN, UserRole.ORG_ADMIN)
    closeIncident(@Param('id') id: string) {
        return this.operationsService.closeIncident(id)
    }

    // =================== JOBS ===================

    @Post('jobs')
    @UseGuards(RolesGuard)
    @Roles(UserRole.STATION_ADMIN, UserRole.ORG_ADMIN)
    createJob(@Request() req: any, @Body() dto: CreateJobDto) {
        return this.operationsService.createJob(req.user.tenantId, dto)
    }

    @Get('jobs')
    findAllJobs(@Request() req: any, @Query() query: QueryJobsDto) {
        return this.operationsService.findAllJobs(req.user.tenantId, query)
    }

    @Get('jobs/:id')
    findJob(@Param('id') id: string) {
        return this.operationsService.findJob(id)
    }

    @Put('jobs/:id')
    @UseGuards(RolesGuard)
    @Roles(UserRole.STATION_ADMIN, UserRole.TECHNICIAN_PUBLIC, UserRole.TECHNICIAN_ORG, UserRole.ORG_ADMIN)
    updateJob(@Param('id') id: string, @Body() dto: UpdateJobDto) {
        return this.operationsService.updateJob(id, dto)
    }

    @Post('jobs/:id/assign')
    @UseGuards(RolesGuard)
    @Roles(UserRole.STATION_ADMIN, UserRole.ORG_ADMIN)
    assignJob(@Param('id') id: string, @Body('userId') userId: string) {
        return this.operationsService.assignJob(id, userId)
    }

    @Post('jobs/:id/start')
    @UseGuards(RolesGuard)
    @Roles(UserRole.TECHNICIAN_PUBLIC, UserRole.TECHNICIAN_ORG)
    startJob(@Param('id') id: string) {
        return this.operationsService.startJob(id)
    }

    @Post('jobs/:id/complete')
    @UseGuards(RolesGuard)
    @Roles(UserRole.TECHNICIAN_PUBLIC, UserRole.TECHNICIAN_ORG)
    completeJob(
        @Param('id') id: string,
        @Body() dto: { resolution: string; timeSpent?: number; signature?: string },
    ) {
        return this.operationsService.completeJob(id, dto)
    }

    @Post('jobs/:id/cancel')
    @UseGuards(RolesGuard)
    @Roles(UserRole.STATION_ADMIN, UserRole.ORG_ADMIN)
    cancelJob(@Param('id') id: string) {
        return this.operationsService.cancelJob(id)
    }

    // =================== ANALYTICS ===================

    @Get('stats')
    @UseGuards(RolesGuard)
    @Roles(UserRole.STATION_ADMIN, UserRole.ORG_ADMIN, UserRole.PLATFORM_ADMIN)
    getOperationsStats(@Request() req: any) {
        return this.operationsService.getOperationsStats(req.user.tenantId)
    }

    @Get('sla-metrics')
    @UseGuards(RolesGuard)
    @Roles(UserRole.STATION_ADMIN, UserRole.ORG_ADMIN, UserRole.PLATFORM_ADMIN)
    getSLAMetrics(@Request() req: any, @Query('days') days?: number) {
        return this.operationsService.getSLAMetrics(req.user.tenantId, days)
    }

    // =================== RECOVERY TIME TRACKING ===================

    @Get('recovery-time/analytics')
    @UseGuards(RolesGuard)
    @Roles(UserRole.STATION_ADMIN, UserRole.ORG_ADMIN, UserRole.PLATFORM_ADMIN)
    getRecoveryTimeAnalytics(@Request() req: any, @Query('days') days?: number) {
        return this.operationsService.getRecoveryTimeAnalytics(req.user.tenantId, days)
    }

    @Post('incidents/:id/calculate-recovery')
    @UseGuards(RolesGuard)
    @Roles(UserRole.STATION_ADMIN, UserRole.ORG_ADMIN, UserRole.PLATFORM_ADMIN)
    calculateRecoveryTime(@Param('id') id: string) {
        return this.operationsService.calculateRecoveryTime(id)
    }

    @Post('incidents/:id/detect-recovery')
    @UseGuards(RolesGuard)
    @Roles(UserRole.STATION_ADMIN, UserRole.ORG_ADMIN, UserRole.PLATFORM_ADMIN)
    detectRecovery(@Param('id') id: string) {
        return this.operationsService.detectRecovery(id)
    }

    // =================== PREDICTIVE MAINTENANCE ===================

    @Get('predictions/:chargerId')
    @UseGuards(RolesGuard)
    @Roles(UserRole.STATION_ADMIN, UserRole.ORG_ADMIN, UserRole.TECHNICIAN_PUBLIC, UserRole.TECHNICIAN_ORG)
    async getFailurePrediction(@Param('chargerId') chargerId: string) {
        return this.predictiveMaintenance.predictFailure(chargerId)
    }

    @Get('predictions/:chargerId/maintenance')
    @UseGuards(RolesGuard)
    @Roles(UserRole.STATION_ADMIN, UserRole.ORG_ADMIN, UserRole.TECHNICIAN_PUBLIC, UserRole.TECHNICIAN_ORG)
    async getMaintenanceSchedule(@Param('chargerId') chargerId: string) {
        return this.predictiveMaintenance.getMaintenanceSchedule(chargerId)
    }

    @Post('predictions/batch')
    @UseGuards(RolesGuard)
    @Roles(UserRole.STATION_ADMIN, UserRole.ORG_ADMIN, UserRole.PLATFORM_ADMIN)
    async batchPredictions(@Body() body: { chargerIds: string[] }) {
        return this.predictiveMaintenance.batchPredictions(body.chargerIds)
    }
}

