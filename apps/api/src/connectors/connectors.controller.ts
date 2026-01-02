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
import { ConnectorsService } from './connectors.service'
import { CreateConnectorDto, UpdateConnectorDto, ConnectorStatusDto } from './dto/connector.dto'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { RolesGuard, ROLES_KEY } from '../common/guards/roles.guard'
import { UserRole } from '@prisma/client'
import { SetMetadata } from '@nestjs/common'

const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles)

@Controller('connectors')
export class ConnectorsController {
    constructor(private connectorsService: ConnectorsService) {}

    @Post()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.STATION_ADMIN, UserRole.ORG_ADMIN, UserRole.PLATFORM_ADMIN)
    create(@Body() dto: CreateConnectorDto) {
        return this.connectorsService.create(dto)
    }

    @Get()
    findAll(
        @Query('chargePointId') chargePointId?: string,
        @Query('stationId') stationId?: string,
    ) {
        return this.connectorsService.findAll(chargePointId, stationId)
    }

    @Get('available/:stationId')
    getAvailableConnectors(@Param('stationId') stationId: string) {
        return this.connectorsService.getAvailableConnectors(stationId)
    }

    @Get('stats')
    getConnectorStats(@Query('stationId') stationId?: string) {
        return this.connectorsService.getConnectorStats(stationId)
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.connectorsService.findOne(id)
    }

    @Put(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.STATION_ADMIN, UserRole.ORG_ADMIN, UserRole.PLATFORM_ADMIN)
    update(@Param('id') id: string, @Body() dto: UpdateConnectorDto) {
        return this.connectorsService.update(id, dto)
    }

    @Put(':id/status')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.STATION_ADMIN, UserRole.ORG_ADMIN, UserRole.PLATFORM_ADMIN, UserRole.TECHNICIAN_PUBLIC)
    updateStatus(@Param('id') id: string, @Body() dto: ConnectorStatusDto) {
        return this.connectorsService.updateStatus(id, dto)
    }

    @Post(':id/reserve')
    @UseGuards(JwtAuthGuard)
    reserveConnector(@Param('id') id: string, @Request() req: any) {
        return this.connectorsService.reserveConnector(id, req.user.id)
    }

    @Post(':id/release')
    @UseGuards(JwtAuthGuard)
    releaseReservation(@Param('id') id: string) {
        return this.connectorsService.releaseReservation(id)
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.STATION_ADMIN, UserRole.ORG_ADMIN, UserRole.PLATFORM_ADMIN)
    delete(@Param('id') id: string) {
        return this.connectorsService.delete(id)
    }
}

