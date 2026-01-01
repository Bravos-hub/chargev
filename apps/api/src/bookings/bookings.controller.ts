import { Body, Controller, Get, Param, Patch, Post, Request, UseGuards } from '@nestjs/common'
import { BookingsService } from './bookings.service'
import { CreateBookingDto, UpdateBookingStatusDto } from './dto/booking.dto'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'

@Controller('bookings')
@UseGuards(JwtAuthGuard)
export class BookingsController {
    constructor(private readonly bookingsService: BookingsService) { }

    @Post()
    create(@Request() req, @Body() dto: CreateBookingDto) {
        return this.bookingsService.create(req.user.id, dto)
    }

    @Get()
    findAll(@Request() req) {
        return this.bookingsService.findAll(req.user)
    }

    @Get(':id')
    findOne(@Request() req, @Param('id') id: string) {
        return this.bookingsService.findOne(id, req.user)
    }

    @Patch(':id/status')
    updateStatus(@Request() req, @Param('id') id: string, @Body() dto: UpdateBookingStatusDto) {
        return this.bookingsService.updateStatus(id, dto.status, req.user)
    }

    @Patch(':id/cancel')
    cancel(@Request() req, @Param('id') id: string) {
        return this.bookingsService.updateStatus(id, 'CANCELLED', req.user)
    }
}
