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
import { OCPIService } from './ocpi.service'
import { CreateOCPIPartnerDto, UpdateOCPIPartnerDto, OCPICDRDto } from './dto/ocpi.dto'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { RolesGuard, ROLES_KEY } from '../common/guards/roles.guard'
import { UserRole } from '@prisma/client'
import { SetMetadata } from '@nestjs/common'

const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles)

@Controller('ocpi')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OCPIController {
    constructor(private ocpiService: OCPIService) {}

    // =================== PARTNERS ===================

    @Post('partners')
    @Roles(UserRole.ORG_OWNER, UserRole.ORG_ADMIN, UserRole.PLATFORM_ADMIN)
    createPartner(@Request() req: any, @Body() dto: CreateOCPIPartnerDto) {
        return this.ocpiService.createPartner(req.user.orgId, dto)
    }

    @Get('partners')
    @Roles(UserRole.ORG_OWNER, UserRole.ORG_ADMIN, UserRole.PLATFORM_ADMIN)
    findAllPartners(@Request() req: any) {
        return this.ocpiService.findAllPartners(req.user.orgId)
    }

    @Get('partners/:id')
    @Roles(UserRole.ORG_OWNER, UserRole.ORG_ADMIN, UserRole.PLATFORM_ADMIN)
    findPartner(@Param('id') id: string) {
        return this.ocpiService.findPartner(id)
    }

    @Put('partners/:id')
    @Roles(UserRole.ORG_OWNER, UserRole.ORG_ADMIN, UserRole.PLATFORM_ADMIN)
    updatePartner(@Param('id') id: string, @Body() dto: UpdateOCPIPartnerDto) {
        return this.ocpiService.updatePartner(id, dto)
    }

    @Delete('partners/:id')
    @Roles(UserRole.ORG_OWNER, UserRole.ORG_ADMIN, UserRole.PLATFORM_ADMIN)
    deletePartner(@Param('id') id: string) {
        return this.ocpiService.deletePartner(id)
    }

    @Post('partners/:id/activate')
    @Roles(UserRole.ORG_OWNER, UserRole.ORG_ADMIN, UserRole.PLATFORM_ADMIN)
    activatePartner(@Param('id') id: string) {
        return this.ocpiService.activatePartner(id)
    }

    @Post('partners/:id/suspend')
    @Roles(UserRole.ORG_OWNER, UserRole.ORG_ADMIN, UserRole.PLATFORM_ADMIN)
    suspendPartner(@Param('id') id: string) {
        return this.ocpiService.suspendPartner(id)
    }

    @Post('partners/:id/credentials')
    @Roles(UserRole.ORG_OWNER, UserRole.ORG_ADMIN, UserRole.PLATFORM_ADMIN)
    initiateCredentialsExchange(@Param('id') id: string) {
        return this.ocpiService.initiateCredentialsExchange(id)
    }

    // =================== CDRs ===================

    @Post('cdrs')
    @Roles(UserRole.ORG_OWNER, UserRole.ORG_ADMIN, UserRole.PLATFORM_ADMIN)
    createCDR(@Body() dto: OCPICDRDto) {
        return this.ocpiService.createCDR(dto)
    }

    @Get('cdrs')
    @Roles(UserRole.ORG_OWNER, UserRole.ORG_ADMIN, UserRole.PLATFORM_ADMIN)
    findCDRs(
        @Query('partnerId') partnerId?: string,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
    ) {
        return this.ocpiService.findCDRs(partnerId, startDate, endDate)
    }

    @Get('cdrs/:id')
    @Roles(UserRole.ORG_OWNER, UserRole.ORG_ADMIN, UserRole.PLATFORM_ADMIN)
    findCDR(@Param('id') id: string) {
        return this.ocpiService.findCDR(id)
    }

    @Post('partners/:id/sync-cdrs')
    @Roles(UserRole.ORG_OWNER, UserRole.ORG_ADMIN, UserRole.PLATFORM_ADMIN)
    syncCDRs(@Param('id') id: string) {
        return this.ocpiService.syncCDRs(id)
    }

    // =================== LOCATIONS ===================

    @Get('locations')
    @Roles(UserRole.ORG_OWNER, UserRole.ORG_ADMIN, UserRole.PLATFORM_ADMIN)
    getLocations(@Request() req: any) {
        return this.ocpiService.getLocations(req.user.orgId)
    }

    @Post('partners/:id/push-locations')
    @Roles(UserRole.ORG_OWNER, UserRole.ORG_ADMIN, UserRole.PLATFORM_ADMIN)
    pushLocations(@Param('id') id: string) {
        return this.ocpiService.pushLocations(id)
    }
}

