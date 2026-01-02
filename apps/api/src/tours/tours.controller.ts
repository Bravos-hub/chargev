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
import { ToursService } from './tours.service'
import { CreateTourDto, UpdateTourDto, CreateTourBookingDto, UpdateTourBookingDto } from './dto/tour.dto'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { RolesGuard, ROLES_KEY } from '../common/guards/roles.guard'
import { UserRole } from '@prisma/client'
import { SetMetadata } from '@nestjs/common'

const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles)

@Controller('tours')
export class ToursController {
    constructor(private toursService: ToursService) {}

    // =================== TOURS ===================

    @Post()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.FLEET_MANAGER, UserRole.ORG_ADMIN)
    createTour(@Request() req: any, @Body() dto: CreateTourDto) {
        return this.toursService.createTour(req.user.fleetId, dto)
    }

    @Get()
    findAllTours(@Query('fleetId') fleetId?: string, @Query('active') active?: string) {
        return this.toursService.findAllTours(fleetId, active === 'true')
    }

    @Get(':id')
    findTour(@Param('id') id: string) {
        return this.toursService.findTour(id)
    }

    @Get(':id/availability')
    getAvailability(@Param('id') id: string, @Query('date') date: string) {
        return this.toursService.getAvailability(id, date)
    }

    @Put(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.FLEET_MANAGER, UserRole.ORG_ADMIN)
    updateTour(@Param('id') id: string, @Body() dto: UpdateTourDto) {
        return this.toursService.updateTour(id, dto)
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.FLEET_MANAGER, UserRole.ORG_ADMIN)
    deleteTour(@Param('id') id: string) {
        return this.toursService.deleteTour(id)
    }

    // =================== BOOKINGS ===================

    @Post('bookings')
    @UseGuards(JwtAuthGuard)
    createBooking(@Request() req: any, @Body() dto: CreateTourBookingDto) {
        return this.toursService.createBooking(req.user.id, dto)
    }

    @Get('bookings/list')
    @UseGuards(JwtAuthGuard)
    findBookings(
        @Request() req: any,
        @Query('tourId') tourId?: string,
        @Query('status') status?: string,
    ) {
        const isManager = ['FLEET_MANAGER', 'ORG_ADMIN'].includes(req.user.role)
        return this.toursService.findBookings({
            tourId,
            status,
            fleetId: isManager ? req.user.fleetId : undefined,
        })
    }

    @Get('bookings/:id')
    @UseGuards(JwtAuthGuard)
    findBooking(@Param('id') id: string) {
        return this.toursService.findBooking(id)
    }

    @Put('bookings/:id')
    @UseGuards(JwtAuthGuard)
    updateBooking(@Param('id') id: string, @Body() dto: UpdateTourBookingDto) {
        return this.toursService.updateBooking(id, dto)
    }

    @Post('bookings/:id/cancel')
    @UseGuards(JwtAuthGuard)
    cancelBooking(@Param('id') id: string) {
        return this.toursService.cancelBooking(id)
    }

    @Post('bookings/:id/confirm')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.FLEET_MANAGER, UserRole.ORG_ADMIN)
    confirmBooking(
        @Param('id') id: string,
        @Body('vehicleId') vehicleId?: string,
        @Body('driverId') driverId?: string,
    ) {
        return this.toursService.confirmBooking(id, vehicleId, driverId)
    }
}

