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
import { ChargePointsService } from './charge-points.service'
import { CreateChargePointDto, UpdateChargePointDto, CreateConnectorDto, ChargePointQueryDto } from './dto/charge-point.dto'
import { JwtAuthGuard } from '../common/auth/jwt-auth.guard'
import { RolesGuard } from '../common/auth/roles.guard'
import { Roles } from '../common/auth/roles.decorator'
import { UserRole, StationStatus } from '@prisma/client'

@ApiTags('charge-points')
@ApiBearerAuth('JWT-auth')
@Controller('charge-points')
@UseGuards(JwtAuthGuard)
export class ChargePointsController {
    constructor(private readonly chargePointsService: ChargePointsService) {}

    @Get()
    findAll(@Query() query: ChargePointQueryDto) {
        return this.chargePointsService.findAll(query)
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.chargePointsService.findOne(id)
    }

    @Get(':id/stats')
    getStats(@Param('id') id: string) {
        return this.chargePointsService.getChargePointStats(id)
    }

    @Patch(':id')
    @UseGuards(RolesGuard)
    @Roles(
        UserRole.SUPER_ADMIN,
        UserRole.PLATFORM_ADMIN,
        UserRole.ORG_OWNER,
        UserRole.ORG_ADMIN,
        UserRole.STATION_ADMIN
    )
    update(@Param('id') id: string, @Body() dto: UpdateChargePointDto) {
        return this.chargePointsService.update(id, dto)
    }

    @Delete(':id')
    @UseGuards(RolesGuard)
    @Roles(
        UserRole.SUPER_ADMIN,
        UserRole.PLATFORM_ADMIN,
        UserRole.ORG_OWNER,
        UserRole.STATION_ADMIN
    )
    delete(@Param('id') id: string) {
        return this.chargePointsService.delete(id)
    }

    @Patch(':id/status')
    @UseGuards(RolesGuard)
    @Roles(
        UserRole.SUPER_ADMIN,
        UserRole.PLATFORM_ADMIN,
        UserRole.ORG_ADMIN,
        UserRole.STATION_ADMIN,
        UserRole.TECHNICIAN_ORG,
        UserRole.TECHNICIAN_PUBLIC
    )
    updateStatus(
        @Param('id') id: string,
        @Body('status') status: StationStatus
    ) {
        return this.chargePointsService.updateStatus(id, status)
    }

    @Post(':id/heartbeat')
    updateHeartbeat(@Param('id') id: string) {
        return this.chargePointsService.updateHeartbeat(id)
    }

    // =================== CONNECTORS ===================

    @Get(':id/connectors')
    getConnectors(@Param('id') id: string) {
        return this.chargePointsService.getConnectors(id)
    }

    @Post(':id/connectors')
    @UseGuards(RolesGuard)
    @Roles(
        UserRole.SUPER_ADMIN,
        UserRole.PLATFORM_ADMIN,
        UserRole.ORG_ADMIN,
        UserRole.STATION_ADMIN,
        UserRole.TECHNICIAN_ORG
    )
    addConnector(
        @Param('id') chargePointId: string,
        @Body() dto: CreateConnectorDto
    ) {
        return this.chargePointsService.addConnector(chargePointId, dto)
    }

    @Delete(':id/connectors/:connectorId')
    @UseGuards(RolesGuard)
    @Roles(
        UserRole.SUPER_ADMIN,
        UserRole.PLATFORM_ADMIN,
        UserRole.ORG_ADMIN,
        UserRole.STATION_ADMIN
    )
    removeConnector(
        @Param('id') chargePointId: string,
        @Param('connectorId') connectorId: string
    ) {
        return this.chargePointsService.removeConnector(chargePointId, parseInt(connectorId))
    }
}

// Station-scoped charge points controller
@Controller('stations/:stationId/charge-points')
@UseGuards(JwtAuthGuard)
export class StationChargePointsController {
    constructor(private readonly chargePointsService: ChargePointsService) {}

    @Get()
    findByStation(@Param('stationId') stationId: string) {
        return this.chargePointsService.findByStation(stationId)
    }

    @Post()
    @UseGuards(RolesGuard)
    @Roles(
        UserRole.SUPER_ADMIN,
        UserRole.PLATFORM_ADMIN,
        UserRole.ORG_OWNER,
        UserRole.ORG_ADMIN,
        UserRole.STATION_ADMIN
    )
    create(
        @Param('stationId') stationId: string,
        @Body() dto: CreateChargePointDto
    ) {
        return this.chargePointsService.create(stationId, dto)
    }
}

