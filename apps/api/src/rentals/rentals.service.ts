import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../common/prisma/prisma.service'
import {
    CreateRentalVehicleDto,
    UpdateRentalVehicleDto,
    CreateRentalBookingDto,
    UpdateRentalBookingDto,
    CheckOutDto,
    CheckInDto,
} from './dto/rental.dto'

@Injectable()
export class RentalsService {
    constructor(private prisma: PrismaService) {}

    // =================== RENTAL VEHICLES ===================

    async createRentalVehicle(fleetId: string, dto: CreateRentalVehicleDto) {
        // Verify vehicle exists and belongs to fleet
        const vehicle = await this.prisma.vehicle.findFirst({
            where: { id: dto.vehicleId, fleetId },
        })

        if (!vehicle) {
            throw new NotFoundException('Vehicle not found in your fleet')
        }

        return this.prisma.rentalVehicle.create({
            data: {
                fleetId,
                vehicleId: dto.vehicleId,
                dailyRate: dto.dailyRate,
                weeklyRate: dto.weeklyRate,
                deposit: dto.deposit || 0,
                minAge: dto.minAge || 21,
                currency: dto.currency || 'USD',
                available: dto.available ?? true,
            },
            include: { vehicle: true },
        })
    }

    async findAllRentalVehicles(fleetId?: string, availableOnly = false) {
        const where: any = {}
        if (fleetId) where.fleetId = fleetId
        if (availableOnly) where.available = true

        return this.prisma.rentalVehicle.findMany({
            where,
            include: {
                vehicle: {
                    select: {
                        id: true,
                        make: true,
                        model: true,
                        year: true,
                        plate: true,
                        vin: true,
                    },
                },
                fleet: { select: { id: true, name: true } },
            },
        })
    }

    async findRentalVehicle(id: string) {
        const rental = await this.prisma.rentalVehicle.findUnique({
            where: { id },
            include: {
                vehicle: true,
                fleet: { select: { id: true, name: true } },
                bookings: {
                    where: { status: { not: 'CANCELLED' } },
                    orderBy: { startDate: 'asc' },
                    take: 10,
                },
            },
        })

        if (!rental) throw new NotFoundException('Rental vehicle not found')
        return rental
    }

    async updateRentalVehicle(id: string, dto: UpdateRentalVehicleDto) {
        await this.findRentalVehicle(id)
        return this.prisma.rentalVehicle.update({
            where: { id },
            data: {
                dailyRate: dto.dailyRate,
                weeklyRate: dto.weeklyRate,
                deposit: dto.deposit,
                minAge: dto.minAge,
                currency: dto.currency,
                available: dto.available,
            },
        })
    }

    async deleteRentalVehicle(id: string) {
        await this.findRentalVehicle(id)
        await this.prisma.rentalVehicle.delete({ where: { id } })
        return { success: true }
    }

    // =================== BOOKINGS ===================

    async createBooking(userId: string, dto: CreateRentalBookingDto) {
        const rental = await this.findRentalVehicle(dto.rentalVehicleId)

        if (!rental.available) {
            throw new BadRequestException('Vehicle is not available for rental')
        }

        // Check for conflicting bookings
        const startDate = new Date(dto.startDate)
        const endDate = new Date(dto.endDate)

        const conflict = await this.prisma.rentalBooking.findFirst({
            where: {
                rentalVehicleId: dto.rentalVehicleId,
                status: { notIn: ['CANCELLED', 'COMPLETED'] },
                OR: [
                    { startDate: { lte: endDate }, endDate: { gte: startDate } },
                ],
            },
        })

        if (conflict) {
            throw new BadRequestException('Vehicle is not available for the selected dates')
        }

        // Calculate total price
        const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
        const totalPrice = Number(rental.dailyRate) * days

        // Get customer info from dto
        const customerName = dto.driverDetails?.name || 'Guest'
        const customerPhone = dto.driverDetails?.phone || ''
        const licenseNumber = dto.driverDetails?.licenseNumber || ''

        return this.prisma.rentalBooking.create({
            data: {
                rentalVehicleId: dto.rentalVehicleId,
                startDate,
                endDate,
                totalAmount: totalPrice,
                customerName,
                customerEmail: '', // Add email to DTO if needed
                customerPhone,
                licenseNumber,
                pickupLocation: dto.pickupLocation,
                returnLocation: dto.returnLocation || dto.pickupLocation,
            },
            include: { rentalVehicle: { include: { vehicle: true } } },
        })
    }

    async findBookings(filters: { rentalVehicleId?: string; fleetId?: string; status?: string }) {
        const where: any = {}
        if (filters.rentalVehicleId) where.rentalVehicleId = filters.rentalVehicleId
        if (filters.fleetId) where.rentalVehicle = { fleetId: filters.fleetId }
        if (filters.status) where.status = filters.status

        return this.prisma.rentalBooking.findMany({
            where,
            include: {
                rentalVehicle: {
                    include: { vehicle: { select: { make: true, model: true, plate: true } } },
                },
            },
            orderBy: { startDate: 'desc' },
        })
    }

    async findBooking(id: string) {
        const booking = await this.prisma.rentalBooking.findUnique({
            where: { id },
            include: {
                rentalVehicle: { include: { vehicle: true } },
            },
        })

        if (!booking) throw new NotFoundException('Booking not found')
        return booking
    }

    async updateBooking(id: string, dto: UpdateRentalBookingDto) {
        await this.findBooking(id)
        return this.prisma.rentalBooking.update({
            where: { id },
            data: {
                startDate: dto.startDate ? new Date(dto.startDate) : undefined,
                endDate: dto.endDate ? new Date(dto.endDate) : undefined,
                status: dto.status,
                pickupLocation: dto.pickupLocation,
                returnLocation: dto.returnLocation,
            },
        })
    }

    async confirmBooking(id: string) {
        return this.prisma.rentalBooking.update({
            where: { id },
            data: { status: 'CONFIRMED' },
        })
    }

    async checkOut(id: string, dto: CheckOutDto) {
        const booking = await this.findBooking(id)

        if (booking.status !== 'CONFIRMED') {
            throw new BadRequestException('Booking must be confirmed before check-out')
        }

        return this.prisma.rentalBooking.update({
            where: { id },
            data: {
                status: 'IN_PROGRESS',
                mileageStart: dto.odometerReading,
                fuelStart: dto.fuelLevel,
            },
        })
    }

    async checkIn(id: string, dto: CheckInDto) {
        const booking = await this.findBooking(id)

        if (booking.status !== 'IN_PROGRESS') {
            throw new BadRequestException('Booking must be in progress for check-in')
        }

        const finalPrice = Number(booking.totalAmount) + (dto.additionalCharges || 0)

        return this.prisma.rentalBooking.update({
            where: { id },
            data: {
                status: 'COMPLETED',
                totalAmount: finalPrice,
                mileageEnd: dto.odometerReading,
                fuelEnd: dto.fuelLevel,
                damages: dto.condition ? { condition: dto.condition, notes: dto.notes } : undefined,
            },
        })
    }

    async cancelBooking(id: string) {
        const booking = await this.findBooking(id)

        if (['IN_PROGRESS', 'COMPLETED'].includes(booking.status)) {
            throw new BadRequestException('Cannot cancel booking in progress or completed')
        }

        return this.prisma.rentalBooking.update({
            where: { id },
            data: { status: 'CANCELLED' },
        })
    }

    async getAvailability(rentalVehicleId: string, startDate: string, endDate: string) {
        const rental = await this.findRentalVehicle(rentalVehicleId)

        const conflict = await this.prisma.rentalBooking.findFirst({
            where: {
                rentalVehicleId,
                status: { notIn: ['CANCELLED', 'COMPLETED'] },
                OR: [
                    {
                        startDate: { lte: new Date(endDate) },
                        endDate: { gte: new Date(startDate) },
                    },
                ],
            },
        })

        const days = Math.ceil(
            (new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)
        )

        return {
            rentalVehicleId,
            startDate,
            endDate,
            days,
            available: !conflict && rental.available,
            estimatedPrice: Number(rental.dailyRate) * days,
            deposit: rental.deposit,
        }
    }
}
