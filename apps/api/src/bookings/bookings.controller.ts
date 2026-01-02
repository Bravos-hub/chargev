import { Body, Controller, Delete, Get, Param, Patch, Post, Request, UseGuards } from '@nestjs/common'
import { BookingsService } from './bookings.service'
import { CreateBookingDto, UpdateBookingDto, UpdateBookingStatusDto, ExtendBookingDto, BookingStatus } from './dto/booking.dto'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'

@Controller('bookings')
@UseGuards(JwtAuthGuard)
export class BookingsController {
    constructor(private readonly bookingsService: BookingsService) { }

    @Post()
    create(@Request() req: any, @Body() dto: CreateBookingDto) {
        return this.bookingsService.create(req.user.id, dto)
    }

    @Get()
    findAll(@Request() req: any) {
        return this.bookingsService.findAll(req.user)
    }

    @Get(':id')
    findOne(@Request() req: any, @Param('id') id: string) {
        return this.bookingsService.findOne(id, req.user)
    }

    @Patch(':id')
    update(@Request() req: any, @Param('id') id: string, @Body() dto: UpdateBookingDto) {
        return this.bookingsService.update(id, dto, req.user)
    }

    @Delete(':id')
    remove(@Request() req: any, @Param('id') id: string) {
        return this.bookingsService.remove(id, req.user)
    }

    @Get('queue')
    getQueue(@Request() req: any, @Body('stationId') stationId: string) {
        return this.bookingsService.getQueue(stationId)
    }

    @Post(':id/checkin')
    checkIn(@Request() req: any, @Param('id') id: string) {
        return this.bookingsService.updateStatus(id, BookingStatus.CHECKED_IN, req.user)
    }

    @Patch(':id/status')
    updateStatus(@Request() req: any, @Param('id') id: string, @Body() dto: UpdateBookingStatusDto) {
        return this.bookingsService.updateStatus(id, dto.status!, req.user)
    }

    @Patch(':id/extend')
    extend(@Request() req: any, @Param('id') id: string, @Body() dto: ExtendBookingDto) {
        // Simple extend logic - should check for conflicts in service
        return this.bookingsService.update(id, { extendMinutes: dto.minutes }, req.user)
    }

    @Get('user/:userId')
    findByUser(@Param('userId') userId: string) {
        return this.bookingsService.findByUser(userId)
    }

    @Get('station/:stationId')
    findByStation(@Param('stationId') stationId: string) {
        return this.bookingsService.findByStation(stationId)
    }

    @Patch(':id/cancel')
    cancel(@Request() req: any, @Param('id') id: string) {
        return this.bookingsService.updateStatus(id, BookingStatus.CANCELLED, req.user)
    }
}
