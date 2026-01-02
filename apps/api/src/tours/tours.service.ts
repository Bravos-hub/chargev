import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../common/prisma/prisma.service'
import { CreateTourDto, UpdateTourDto, CreateTourBookingDto, UpdateTourBookingDto } from './dto/tour.dto'

@Injectable()
export class ToursService {
    constructor(private prisma: PrismaService) {}

    // =================== TOURS ===================

    async createTour(fleetId: string, dto: CreateTourDto) {
        return this.prisma.tour.create({
            data: {
                fleetId,
                name: dto.name,
                description: dto.description,
                duration: dto.duration,
                price: dto.price,
                currency: dto.currency || 'USD',
                capacity: dto.maxParticipants || 10,
                inclusions: dto.inclusions || [],
                itinerary: dto.itinerary || [],
                images: dto.photos || [],
                status: dto.active === false ? 'INACTIVE' : 'ACTIVE',
            },
        })
    }

    async findAllTours(fleetId?: string, activeOnly = false) {
        const where: any = {}
        if (fleetId) where.fleetId = fleetId
        if (activeOnly) where.status = 'ACTIVE'

        return this.prisma.tour.findMany({
            where,
            include: {
                fleet: { select: { id: true, name: true } },
                _count: { select: { bookings: true } },
            },
        })
    }

    async findTour(id: string) {
        const tour = await this.prisma.tour.findUnique({
            where: { id },
            include: {
                fleet: { select: { id: true, name: true } },
                bookings: {
                    where: { status: { not: 'CANCELLED' } },
                    orderBy: { date: 'asc' },
                    take: 20,
                },
            },
        })

        if (!tour) throw new NotFoundException('Tour not found')
        return tour
    }

    async updateTour(id: string, dto: UpdateTourDto) {
        await this.findTour(id)
        return this.prisma.tour.update({
            where: { id },
            data: {
                name: dto.name,
                description: dto.description,
                duration: dto.duration,
                price: dto.price,
                currency: dto.currency,
                capacity: dto.maxParticipants,
                inclusions: dto.inclusions,
                itinerary: dto.itinerary,
                images: dto.photos,
                status: dto.active === false ? 'INACTIVE' : dto.active === true ? 'ACTIVE' : undefined,
            },
        })
    }

    async deleteTour(id: string) {
        await this.findTour(id)
        await this.prisma.tour.delete({ where: { id } })
        return { success: true }
    }

    // =================== BOOKINGS ===================

    async createBooking(userId: string, dto: CreateTourBookingDto) {
        const tour = await this.findTour(dto.tourId)

        // Check availability
        const existingBookings = await this.prisma.tourBooking.aggregate({
            where: {
                tourId: dto.tourId,
                date: new Date(dto.date),
                status: { not: 'CANCELLED' },
            },
            _sum: { participants: true },
        })

        const currentParticipants = existingBookings._sum.participants || 0
        if (tour.capacity && currentParticipants + dto.participants > tour.capacity) {
            throw new BadRequestException('Tour is fully booked for this date')
        }

        const totalPrice = Number(tour.price) * dto.participants

        // Get customer info (in a real app, fetch from user profile)
        const customerName = dto.contactInfo?.name || 'Guest'
        const customerEmail = dto.contactInfo?.email || ''
        const customerPhone = dto.contactInfo?.phone || ''

        return this.prisma.tourBooking.create({
            data: {
                tourId: dto.tourId,
                date: new Date(dto.date),
                participants: dto.participants,
                totalAmount: totalPrice,
                customerName,
                customerEmail,
                customerPhone,
                notes: dto.specialRequests,
            },
            include: { tour: true },
        })
    }

    async findBookings(filters: { tourId?: string; fleetId?: string; status?: string }) {
        const where: any = {}
        if (filters.tourId) where.tourId = filters.tourId
        if (filters.fleetId) where.tour = { fleetId: filters.fleetId }
        if (filters.status) where.status = filters.status

        return this.prisma.tourBooking.findMany({
            where,
            include: {
                tour: { select: { id: true, name: true, duration: true } },
            },
            orderBy: { date: 'asc' },
        })
    }

    async findBooking(id: string) {
        const booking = await this.prisma.tourBooking.findUnique({
            where: { id },
            include: {
                tour: true,
            },
        })

        if (!booking) throw new NotFoundException('Booking not found')
        return booking
    }

    async updateBooking(id: string, dto: UpdateTourBookingDto) {
        await this.findBooking(id)
        return this.prisma.tourBooking.update({
            where: { id },
            data: {
                date: dto.date ? new Date(dto.date) : undefined,
                participants: dto.participants,
                status: dto.status,
                notes: dto.specialRequests,
            },
        })
    }

    async cancelBooking(id: string) {
        const booking = await this.findBooking(id)

        if (booking.status === 'CANCELLED') {
            throw new BadRequestException('Booking is already cancelled')
        }

        return this.prisma.tourBooking.update({
            where: { id },
            data: { status: 'CANCELLED' },
        })
    }

    async confirmBooking(id: string, vehicleId?: string, driverId?: string) {
        return this.prisma.tourBooking.update({
            where: { id },
            data: {
                status: 'CONFIRMED',
                vehicleId,
                driverId,
            },
        })
    }

    async getAvailability(tourId: string, date: string) {
        const tour = await this.findTour(tourId)

        const bookings = await this.prisma.tourBooking.aggregate({
            where: {
                tourId,
                date: new Date(date),
                status: { not: 'CANCELLED' },
            },
            _sum: { participants: true },
        })

        const booked = bookings._sum.participants || 0
        const available = tour.capacity ? tour.capacity - booked : null

        return {
            tourId,
            date,
            capacity: tour.capacity,
            booked,
            available,
            isAvailable: available === null || available > 0,
        }
    }
}
