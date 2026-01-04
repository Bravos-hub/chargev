import { Body, Controller, Get, Param, Post, Patch, Query, Request, UseGuards } from '@nestjs/common'
import { FleetsService } from './fleets.service'
import { ReimbursementService } from './reimbursement.service'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { RolesGuard } from '../common/guards/roles.guard'
import { Roles } from '../common/auth/roles.decorator'
import { CreateFleetDto } from './dto/fleet.dto'
import { CreateReimbursementDto, UpdateReimbursementDto, MarkPaidDto } from './dto/reimbursement.dto'

@Controller('api/fleets')
@UseGuards(JwtAuthGuard, RolesGuard)
export class FleetsController {
    constructor(
        private readonly fleetsService: FleetsService,
        private readonly reimbursementService: ReimbursementService,
    ) { }

    @Get()
    @Roles('FLEET_MANAGER', 'ORG_ADMIN', 'ORG_OWNER', 'PLATFORM_ADMIN', 'SUPER_ADMIN')
    findAll(@Request() req: any) {
        return this.fleetsService.findAll(req.user.orgId || req.user.id)
    }

    @Get(':id')
    @Roles('FLEET_MANAGER', 'ORG_ADMIN', 'ORG_OWNER', 'PLATFORM_ADMIN', 'SUPER_ADMIN')
    findOne(@Param('id') id: string) {
        return this.fleetsService.findOne(id)
    }

    @Post()
    @Roles('ORG_ADMIN', 'ORG_OWNER', 'PLATFORM_ADMIN', 'SUPER_ADMIN')
    create(@Request() req: any, @Body() dto: CreateFleetDto) {
        return this.fleetsService.create(req.user.orgId || req.user.id, dto)
    }

    /**
     * Get reimbursement statistics for a fleet.
     */
    @Get(':id/reimbursements/stats')
    @Roles('FLEET_MANAGER', 'ORG_ADMIN', 'ORG_OWNER', 'PLATFORM_ADMIN', 'SUPER_ADMIN')
    async getReimbursementStats(
        @Param('id') fleetId: string,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
    ) {
        return this.fleetsService.getReimbursementStats(
            fleetId,
            startDate ? new Date(startDate) : undefined,
            endDate ? new Date(endDate) : undefined,
        )
    }

    /**
     * Get reimbursements for a fleet.
     */
    @Get(':id/reimbursements')
    @Roles('FLEET_MANAGER', 'ORG_ADMIN', 'ORG_OWNER', 'PLATFORM_ADMIN', 'SUPER_ADMIN')
    async getFleetReimbursements(
        @Param('id') fleetId: string,
        @Query('status') status?: string,
    ) {
        return this.reimbursementService.getFleetReimbursements(fleetId, status as any)
    }

    /**
     * Create reimbursement request.
     */
    @Post(':id/reimbursements')
    @Roles('FLEET_DRIVER', 'FLEET_MANAGER', 'ORG_ADMIN', 'ORG_OWNER')
    async createReimbursement(
        @Param('id') fleetId: string,
        @Request() req: any,
        @Body() dto: CreateReimbursementDto,
    ) {
        return this.reimbursementService.createReimbursement(
            req.user.orgId || req.user.id,
            { ...dto, fleetId, periodStart: new Date(dto.periodStart), periodEnd: new Date(dto.periodEnd) },
        )
    }

    /**
     * Get driver's reimbursements.
     */
    @Get('reimbursements/driver/:driverId')
    @Roles('FLEET_DRIVER', 'FLEET_MANAGER', 'ORG_ADMIN', 'ORG_OWNER')
    async getDriverReimbursements(
        @Param('driverId') driverId: string,
        @Query('status') status?: string,
    ) {
        return this.reimbursementService.getDriverReimbursements(driverId, status as any)
    }

    /**
     * Update reimbursement (approve/reject).
     */
    @Patch('reimbursements/:id')
    @Roles('FLEET_MANAGER', 'ORG_ADMIN', 'ORG_OWNER', 'PLATFORM_ADMIN', 'SUPER_ADMIN')
    async updateReimbursement(
        @Param('id') reimbursementId: string,
        @Request() req: any,
        @Body() dto: UpdateReimbursementDto,
    ) {
        return this.reimbursementService.updateReimbursement(
            reimbursementId,
            req.user.orgId || req.user.id,
            dto,
        )
    }

    /**
     * Mark reimbursement as paid.
     */
    @Patch('reimbursements/:id/pay')
    @Roles('ORG_ADMIN', 'ORG_OWNER', 'PLATFORM_ADMIN', 'SUPER_ADMIN')
    async markAsPaid(
        @Param('id') reimbursementId: string,
        @Request() req: any,
        @Body() dto: MarkPaidDto,
    ) {
        return this.reimbursementService.markAsPaid(
            reimbursementId,
            req.user.orgId || req.user.id,
            dto.paymentReference,
        )
    }
}
