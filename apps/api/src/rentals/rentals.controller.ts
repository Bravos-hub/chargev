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
import { RentalsService } from './rentals.service'
import {
    CreateRentalVehicleDto,
    UpdateRentalVehicleDto,
    CreateRentalBookingDto,
    UpdateRentalBookingDto,
    CheckOutDto,
    CheckInDto,
} from './dto/rental.dto'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { RolesGuard, ROLES_KEY } from '../common/guards/roles.guard'
import { UserRole } from '@prisma/client'
import { SetMetadata } from '@nestjs/common'

const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles)

@Controller('rentals')
export class RentalsController {
    constructor(private rentalsService: RentalsService) {}

    // =================== RENTAL VEHICLES ===================

    @Post('vehicles')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.FLEET_MANAGER, UserRole.ORG_ADMIN)
    createRentalVehicle(@Request() req: any, @Body() dto: CreateRentalVehicleDto) {
        return this.rentalsService.createRentalVehicle(req.user.fleetId, dto)
    }

    @Get('vehicles')
    findAllRentalVehicles(
        @Query('fleetId') fleetId?: string,
        @Query('available') available?: string,
    ) {
        return this.rentalsService.findAllRentalVehicles(fleetId, available === 'true')
    }

    @Get('vehicles/:id')
    findRentalVehicle(@Param('id') id: string) {
        return this.rentalsService.findRentalVehicle(id)
    }

    @Get('vehicles/:id/availability')
    getAvailability(
        @Param('id') id: string,
        @Query('startDate') startDate: string,
        @Query('endDate') endDate: string,
    ) {
        return this.rentalsService.getAvailability(id, startDate, endDate)
    }

    @Put('vehicles/:id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.FLEET_MANAGER, UserRole.ORG_ADMIN)
    updateRentalVehicle(@Param('id') id: string, @Body() dto: UpdateRentalVehicleDto) {
        return this.rentalsService.updateRentalVehicle(id, dto)
    }

    @Delete('vehicles/:id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.FLEET_MANAGER, UserRole.ORG_ADMIN)
    deleteRentalVehicle(@Param('id') id: string) {
        return this.rentalsService.deleteRentalVehicle(id)
    }

    // =================== BOOKINGS ===================

    @Post('bookings')
    @UseGuards(JwtAuthGuard)
    createBooking(@Request() req: any, @Body() dto: CreateRentalBookingDto) {
        return this.rentalsService.createBooking(req.user.id, dto)
    }

    @Get('bookings')
    @UseGuards(JwtAuthGuard)
    findBookings(
        @Request() req: any,
        @Query('rentalVehicleId') rentalVehicleId?: string,
        @Query('status') status?: string,
    ) {
        const isManager = ['FLEET_MANAGER', 'ORG_ADMIN'].includes(req.user.role)
        return this.rentalsService.findBookings({
            rentalVehicleId,
            status,
            fleetId: isManager ? req.user.fleetId : undefined,
        })
    }

    @Get('bookings/:id')
    @UseGuards(JwtAuthGuard)
    findBooking(@Param('id') id: string) {
        return this.rentalsService.findBooking(id)
    }

    @Put('bookings/:id')
    @UseGuards(JwtAuthGuard)
    updateBooking(@Param('id') id: string, @Body() dto: UpdateRentalBookingDto) {
        return this.rentalsService.updateBooking(id, dto)
    }

    @Post('bookings/:id/confirm')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.FLEET_MANAGER, UserRole.ORG_ADMIN)
    confirmBooking(@Param('id') id: string) {
        return this.rentalsService.confirmBooking(id)
    }

    @Post('bookings/:id/check-out')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.FLEET_MANAGER, UserRole.ORG_ADMIN, UserRole.FLEET_DRIVER)
    checkOut(@Param('id') id: string, @Body() dto: CheckOutDto) {
        return this.rentalsService.checkOut(id, dto)
    }

    @Post('bookings/:id/check-in')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.FLEET_MANAGER, UserRole.ORG_ADMIN, UserRole.FLEET_DRIVER)
    checkIn(@Param('id') id: string, @Body() dto: CheckInDto) {
        return this.rentalsService.checkIn(id, dto)
    }

    @Post('bookings/:id/cancel')
    @UseGuards(JwtAuthGuard)
    cancelBooking(@Param('id') id: string) {
        return this.rentalsService.cancelBooking(id)
    }
}

