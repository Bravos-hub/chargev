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
import { DriversService } from './drivers.service'
import {
    CreateDriverDto,
    UpdateDriverDto,
    CreateShiftDto,
    UpdateShiftDto,
    CheckInDto,
    CheckOutDto,
    CreatePayoutDto,
    CreateDriverRatingDto,
} from './dto/driver.dto'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { RolesGuard, ROLES_KEY } from '../common/guards/roles.guard'
import { UserRole } from '@prisma/client'
import { SetMetadata } from '@nestjs/common'

const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles)

@Controller('drivers')
@UseGuards(JwtAuthGuard)
export class DriversController {
    constructor(private driversService: DriversService) {}

    // =================== DRIVER PROFILES ===================

    @Post()
    @UseGuards(RolesGuard)
    @Roles(UserRole.FLEET_MANAGER, UserRole.ORG_ADMIN)
    createDriver(@Request() req: any, @Body() dto: CreateDriverDto) {
        return this.driversService.createDriver(req.user.fleetId, dto)
    }

    @Get()
    @UseGuards(RolesGuard)
    @Roles(UserRole.FLEET_MANAGER, UserRole.ORG_ADMIN)
    findAllDrivers(@Request() req: any) {
        return this.driversService.findAllDrivers(req.user.fleetId)
    }

    @Get(':id')
    findDriver(@Param('id') id: string) {
        return this.driversService.findDriver(id)
    }

    @Get(':id/stats')
    getDriverStats(@Param('id') id: string) {
        return this.driversService.getDriverStats(id)
    }

    @Put(':id')
    @UseGuards(RolesGuard)
    @Roles(UserRole.FLEET_MANAGER, UserRole.ORG_ADMIN)
    updateDriver(@Param('id') id: string, @Body() dto: UpdateDriverDto) {
        return this.driversService.updateDriver(id, dto)
    }

    @Delete(':id')
    @UseGuards(RolesGuard)
    @Roles(UserRole.FLEET_MANAGER, UserRole.ORG_ADMIN)
    deleteDriver(@Param('id') id: string) {
        return this.driversService.deleteDriver(id)
    }

    // =================== SHIFTS ===================

    @Post('shifts')
    @UseGuards(RolesGuard)
    @Roles(UserRole.FLEET_MANAGER, UserRole.ORG_ADMIN)
    createShift(@Body() dto: CreateShiftDto) {
        return this.driversService.createShift(dto)
    }

    @Get('shifts/list')
    @UseGuards(RolesGuard)
    @Roles(UserRole.FLEET_MANAGER, UserRole.ORG_ADMIN, UserRole.FLEET_DRIVER)
    findShifts(
        @Request() req: any,
        @Query('driverId') driverId?: string,
        @Query('status') status?: string,
        @Query('date') date?: string,
    ) {
        return this.driversService.findShifts(req.user.fleetId, { driverId, status, date })
    }

    @Get('shifts/:id')
    findShift(@Param('id') id: string) {
        return this.driversService.findShift(id)
    }

    @Put('shifts/:id')
    @UseGuards(RolesGuard)
    @Roles(UserRole.FLEET_MANAGER, UserRole.ORG_ADMIN)
    updateShift(@Param('id') id: string, @Body() dto: UpdateShiftDto) {
        return this.driversService.updateShift(id, dto)
    }

    @Post('shifts/:id/check-in')
    checkIn(@Request() req: any, @Param('id') id: string, @Body() dto: CheckInDto) {
        return this.driversService.checkIn(id, req.user.driverProfile?.id, dto)
    }

    @Post('shifts/:id/check-out')
    checkOut(@Request() req: any, @Param('id') id: string, @Body() dto: CheckOutDto) {
        return this.driversService.checkOut(id, req.user.driverProfile?.id, dto)
    }

    @Post('shifts/:id/cancel')
    @UseGuards(RolesGuard)
    @Roles(UserRole.FLEET_MANAGER, UserRole.ORG_ADMIN)
    cancelShift(@Param('id') id: string) {
        return this.driversService.cancelShift(id)
    }

    // =================== PAYOUTS ===================

    @Post('payouts')
    @UseGuards(RolesGuard)
    @Roles(UserRole.FLEET_MANAGER, UserRole.ORG_ADMIN)
    createPayout(@Request() req: any, @Body() dto: CreatePayoutDto) {
        return this.driversService.createPayout(req.user.fleetId, dto)
    }

    @Get(':id/payouts')
    findPayouts(@Param('id') id: string) {
        return this.driversService.findPayouts(id)
    }

    @Post('payouts/:id/process')
    @UseGuards(RolesGuard)
    @Roles(UserRole.FLEET_MANAGER, UserRole.ORG_ADMIN)
    processPayout(@Param('id') id: string, @Body('reference') reference: string) {
        return this.driversService.processPayout(id, reference)
    }

    // =================== RATINGS ===================

    @Post(':id/rate')
    rateDriver(@Request() req: any, @Param('id') id: string, @Body() dto: CreateDriverRatingDto) {
        return this.driversService.rateDriver(req.user.id, { ...dto, driverId: id })
    }

    @Get(':id/ratings')
    getDriverRatings(@Param('id') id: string) {
        return this.driversService.getDriverRatings(id)
    }
}

