import { Controller, Get, Query, Param, UseGuards } from '@nestjs/common'
import { AuditService } from './audit.service'
import { QueryAuditLogDto } from './dto/audit.dto'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { RolesGuard, ROLES_KEY } from '../common/guards/roles.guard'
import { UserRole } from '@prisma/client'
import { SetMetadata } from '@nestjs/common'

const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles)

@Controller('audit')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AuditController {
    constructor(private auditService: AuditService) {}

    @Get()
    @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN, UserRole.ORG_ADMIN)
    findAll(@Query() query: QueryAuditLogDto) {
        return this.auditService.findAll(query)
    }

    @Get('entity/:entityType/:entityId')
    @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN, UserRole.ORG_ADMIN)
    findByEntity(
        @Param('entityType') entityType: string,
        @Param('entityId') entityId: string,
    ) {
        return this.auditService.findByEntity(entityType, entityId)
    }

    @Get('user/:userId')
    @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN)
    findByUser(@Param('userId') userId: string) {
        return this.auditService.findByUser(userId)
    }

    @Get('summary/:tenantId')
    @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN, UserRole.ORG_ADMIN)
    getActivitySummary(
        @Param('tenantId') tenantId: string,
        @Query('days') days?: number,
    ) {
        return this.auditService.getActivitySummary(tenantId, days || 7)
    }
}

