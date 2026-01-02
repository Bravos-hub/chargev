import {
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Body,
    Param,
    Query,
    UseGuards,
} from '@nestjs/common'
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger'
import { SettlementsService } from './settlements.service'
import { ReconciliationService } from './reconciliation.service'
import {
    CreateSettlementDto,
    UpdateSettlementDto,
    GenerateSettlementDto,
    ProcessSettlementDto,
    SettlementQueryDto,
    ReconciliationReportDto,
} from './dto/settlement.dto'
import { JwtAuthGuard } from '../common/auth/jwt-auth.guard'
import { RolesGuard } from '../common/auth/roles.guard'
import { Roles } from '../common/auth/roles.decorator'
import { CurrentUser } from '../common/auth/current-user.decorator'
import { UserRole } from '@prisma/client'

@ApiTags('settlements')
@ApiBearerAuth('JWT-auth')
@Controller('settlements')
@UseGuards(JwtAuthGuard)
export class SettlementsController {
    constructor(
        private readonly settlementsService: SettlementsService,
        private readonly reconciliationService: ReconciliationService
    ) {}

    // =================== SETTLEMENTS ===================

    @Get()
    @UseGuards(RolesGuard)
    @Roles(
        UserRole.SUPER_ADMIN,
        UserRole.PLATFORM_ADMIN,
        UserRole.ORG_OWNER,
        UserRole.ORG_ADMIN
    )
    findAll(@Query() query: SettlementQueryDto) {
        return this.settlementsService.findAll(query)
    }

    @Get('stats')
    @UseGuards(RolesGuard)
    @Roles(
        UserRole.SUPER_ADMIN,
        UserRole.PLATFORM_ADMIN,
        UserRole.ORG_OWNER,
        UserRole.ORG_ADMIN
    )
    getStats(@CurrentUser() user: { orgId: string }, @Query('orgId') orgId?: string) {
        return this.settlementsService.getSettlementStats(orgId || user.orgId)
    }

    @Get('my')
    getMySettlements(@CurrentUser() user: { orgId: string }) {
        return this.settlementsService.findByOrg(user.orgId)
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.settlementsService.findOne(id)
    }

    @Post()
    @UseGuards(RolesGuard)
    @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN)
    create(@Body() dto: CreateSettlementDto) {
        return this.settlementsService.create(dto)
    }

    @Post('generate')
    @UseGuards(RolesGuard)
    @Roles(
        UserRole.SUPER_ADMIN,
        UserRole.PLATFORM_ADMIN,
        UserRole.ORG_ADMIN
    )
    generateSettlement(@Body() dto: GenerateSettlementDto) {
        return this.settlementsService.generateSettlement(dto)
    }

    @Post(':id/process')
    @UseGuards(RolesGuard)
    @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN)
    processSettlement(@Param('id') id: string, @Body() dto: ProcessSettlementDto) {
        return this.settlementsService.processSettlement(id, dto)
    }

    @Post(':id/dispute')
    @UseGuards(RolesGuard)
    @Roles(
        UserRole.SUPER_ADMIN,
        UserRole.PLATFORM_ADMIN,
        UserRole.ORG_OWNER
    )
    disputeSettlement(@Param('id') id: string, @Body('reason') reason: string) {
        return this.settlementsService.disputeSettlement(id, reason)
    }

    @Patch(':id')
    @UseGuards(RolesGuard)
    @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN)
    update(@Param('id') id: string, @Body() dto: UpdateSettlementDto) {
        return this.settlementsService.update(id, dto)
    }

    @Delete(':id')
    @UseGuards(RolesGuard)
    @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN)
    delete(@Param('id') id: string) {
        return this.settlementsService.delete(id)
    }

    // =================== RECONCILIATION ===================

    @Post('reconciliation/report')
    @UseGuards(RolesGuard)
    @Roles(
        UserRole.SUPER_ADMIN,
        UserRole.PLATFORM_ADMIN,
        UserRole.ORG_OWNER,
        UserRole.ORG_ADMIN
    )
    generateReconciliationReport(@Body() dto: ReconciliationReportDto) {
        return this.reconciliationService.generateReconciliationReport(dto)
    }

    @Get('reconciliation/unreconciled')
    @UseGuards(RolesGuard)
    @Roles(
        UserRole.SUPER_ADMIN,
        UserRole.PLATFORM_ADMIN,
        UserRole.ORG_ADMIN
    )
    getUnreconciledItems(@CurrentUser() user: { orgId: string }) {
        return this.reconciliationService.getUnreconciledItems(user.orgId)
    }

    @Post('reconciliation/partner/:partnerId')
    @UseGuards(RolesGuard)
    @Roles(
        UserRole.SUPER_ADMIN,
        UserRole.PLATFORM_ADMIN,
        UserRole.ORG_ADMIN
    )
    reconcileWithPartner(
        @CurrentUser() user: { orgId: string },
        @Param('partnerId') partnerId: string,
        @Body('periodStart') periodStart: string,
        @Body('periodEnd') periodEnd: string
    ) {
        return this.reconciliationService.reconcileWithPartner(
            user.orgId,
            partnerId,
            new Date(periodStart),
            new Date(periodEnd)
        )
    }

    @Post('reconciliation/auto')
    @UseGuards(RolesGuard)
    @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN)
    autoReconcile(
        @CurrentUser() user: { orgId: string },
        @Body('orgId') orgId: string,
        @Body('periodStart') periodStart: string,
        @Body('periodEnd') periodEnd: string
    ) {
        return this.reconciliationService.autoReconcile(
            orgId || user.orgId,
            new Date(periodStart),
            new Date(periodEnd)
        )
    }
}

