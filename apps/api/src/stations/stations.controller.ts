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
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery, ApiParam } from '@nestjs/swagger'
import { StationsService } from './stations.service'
import { CreateStationDto, UpdateStationDto, StationQueryDto } from './dto/station.dto'
import { JwtAuthGuard } from '../common/auth/jwt-auth.guard'
import { RolesGuard } from '../common/auth/roles.guard'
import { Roles } from '../common/auth/roles.decorator'
import { CurrentUser } from '../common/auth/current-user.decorator'
import { UserRole } from '@prisma/client'

@ApiTags('stations')
@ApiBearerAuth('JWT-auth')
@Controller('stations')
@UseGuards(JwtAuthGuard)
export class StationsController {
    constructor(private readonly stationsService: StationsService) {}

    @Post()
    @UseGuards(RolesGuard)
    @Roles(
        UserRole.SUPER_ADMIN,
        UserRole.PLATFORM_ADMIN,
        UserRole.ORG_OWNER,
        UserRole.ORG_ADMIN,
        UserRole.STATION_OWNER_ORG
    )
    @ApiOperation({ summary: 'Create a new station', description: 'Creates a new charging or swap station' })
    @ApiResponse({ status: 201, description: 'Station created successfully' })
    @ApiResponse({ status: 400, description: 'Bad request - validation error' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
    create(
        @CurrentUser() user: { orgId: string },
        @Body() dto: CreateStationDto
    ) {
        return this.stationsService.create(user.orgId, dto)
    }

    @Get()
    @ApiOperation({ summary: 'List all stations', description: 'Get a paginated list of stations with optional filters' })
    @ApiResponse({ status: 200, description: 'List of stations' })
    findAll(@Query() query: StationQueryDto) {
        return this.stationsService.findAll(query)
    }

    @Get('nearby')
    @ApiOperation({ summary: 'Find nearby stations', description: 'Find stations within a specified radius of coordinates' })
    @ApiQuery({ name: 'lat', type: Number, description: 'Latitude coordinate' })
    @ApiQuery({ name: 'lng', type: Number, description: 'Longitude coordinate' })
    @ApiQuery({ name: 'radius', type: Number, required: false, description: 'Search radius in km (default: 10)' })
    @ApiQuery({ name: 'limit', type: Number, required: false, description: 'Max results (default: 10)' })
    @ApiResponse({ status: 200, description: 'List of nearby stations with distance' })
    getNearby(
        @Query('lat') lat: string,
        @Query('lng') lng: string,
        @Query('radius') radius?: string,
        @Query('limit') limit?: string
    ) {
        return this.stationsService.getNearbyStations(
            parseFloat(lat),
            parseFloat(lng),
            radius ? parseFloat(radius) : 10,
            limit ? parseInt(limit) : 10
        )
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get station by ID', description: 'Get detailed information about a specific station' })
    @ApiParam({ name: 'id', description: 'Station ID' })
    @ApiResponse({ status: 200, description: 'Station details' })
    @ApiResponse({ status: 404, description: 'Station not found' })
    findOne(@Param('id') id: string) {
        return this.stationsService.findOne(id)
    }

    @Get('code/:code')
    @ApiOperation({ summary: 'Get station by code', description: 'Find a station by its unique code' })
    @ApiParam({ name: 'code', description: 'Station code' })
    @ApiResponse({ status: 200, description: 'Station details' })
    @ApiResponse({ status: 404, description: 'Station not found' })
    findByCode(@Param('code') code: string) {
        return this.stationsService.findByCode(code)
    }

    @Get(':id/stats')
    @ApiOperation({ summary: 'Get station statistics', description: 'Get usage statistics and analytics for a station' })
    @ApiParam({ name: 'id', description: 'Station ID' })
    @ApiResponse({ status: 200, description: 'Station statistics' })
    getStats(@Param('id') id: string) {
        return this.stationsService.getStats(id)
    }

    @Patch(':id')
    @UseGuards(RolesGuard)
    @Roles(
        UserRole.SUPER_ADMIN,
        UserRole.PLATFORM_ADMIN,
        UserRole.ORG_OWNER,
        UserRole.ORG_ADMIN,
        UserRole.STATION_OWNER_ORG,
        UserRole.STATION_ADMIN
    )
    @ApiOperation({ summary: 'Update station', description: 'Update station details' })
    @ApiParam({ name: 'id', description: 'Station ID' })
    @ApiResponse({ status: 200, description: 'Station updated successfully' })
    @ApiResponse({ status: 404, description: 'Station not found' })
    update(@Param('id') id: string, @Body() dto: UpdateStationDto) {
        return this.stationsService.update(id, dto)
    }

    @Delete(':id')
    @UseGuards(RolesGuard)
    @Roles(
        UserRole.SUPER_ADMIN,
        UserRole.PLATFORM_ADMIN,
        UserRole.ORG_OWNER,
        UserRole.STATION_OWNER_ORG
    )
    @ApiOperation({ summary: 'Delete station', description: 'Delete a station (cannot delete stations with active sessions)' })
    @ApiParam({ name: 'id', description: 'Station ID' })
    @ApiResponse({ status: 200, description: 'Station deleted successfully' })
    @ApiResponse({ status: 400, description: 'Cannot delete station with active sessions' })
    @ApiResponse({ status: 404, description: 'Station not found' })
    delete(@Param('id') id: string) {
        return this.stationsService.delete(id)
    }

    @Post(':id/health')
    @UseGuards(RolesGuard)
    @Roles(
        UserRole.SUPER_ADMIN,
        UserRole.PLATFORM_ADMIN,
        UserRole.ORG_ADMIN,
        UserRole.STATION_ADMIN
    )
    @ApiOperation({ summary: 'Update station health', description: 'Recalculate and update station health score' })
    @ApiParam({ name: 'id', description: 'Station ID' })
    @ApiResponse({ status: 200, description: 'Health score updated' })
    updateHealth(@Param('id') id: string) {
        return this.stationsService.updateHealth(id)
    }
}

