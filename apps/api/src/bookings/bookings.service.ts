import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../common/prisma/prisma.service'
import { CreateBookingDto, UpdateBookingStatusDto } from './dto/booking.dto'
import { BookingStatus } from '@prisma/client'

@Injectable()
export class BookingsService {
    constructor(private prisma: PrismaService) { }

    async create(userId: string, dto: CreateBookingDto) {
        const start = new Date(dto.startTime)
        const end = new Date(dto.endTime)

        if (start >= end) {
            throw new BadRequestException('Start time must be before end time')
        }

        // Check availability
        const conflicting = await this.prisma.booking.findFirst({
            where: {
                stationId: dto.stationId,
                connectorId: dto.connectorId || undefined, // If null, maybe book whole station? Or check generic capacity. Assuming connector specific for now if provided.
                status: { in: ['CONFIRMED', 'CHECKED_IN', 'IN_PROGRESS'] },
                AND: [
                    { startTime: { lt: end } },
                    { endTime: { gt: start } }
                ]
            }
        })

        if (conflicting) {
            throw new ConflictException('Station/Connector is not available for this time slot')
        }

        // Create booking
        return this.prisma.booking.create({
            data: {
                userId,
                stationId: dto.stationId,
                connectorId: dto.connectorId,
                startTime: start,
                endTime: end,
                status: 'CONFIRMED', // Auto-confirm for now
                amount: 0, // Calculate price later based on rates
                mode: dto.mode,
                energyTarget: dto.energyTarget,
                location: dto.location,
            }
        })
    }

    async findAll(user: any) {
        const where: any = {}

        // Regular users see only their bookings
        if (!['SUPER_ADMIN', 'PLATFORM_ADMIN', 'ORG_ADMIN', 'STATION_ADMIN'].includes(user.role)) {
            where.userId = user.id
        }

        // Org/Station admins could see more, but let's stick to simple logic or filters:
        if (user.orgId && ['ORG_ADMIN', 'STATION_ADMIN'].includes(user.role)) {
            where.station = { orgId: user.orgId }
        }

        return this.prisma.booking.findMany({
            where,
            include: {
                station: { select: { name: true, address: true } }
            },
            orderBy: { startTime: 'desc' }
        })
    }

    async findOne(id: string, user: any) {
        const booking = await this.prisma.booking.findUnique({
            where: { id },
            include: { station: true }
        })

        if (!booking) throw new NotFoundException('Booking not found')

        // Access check
        if (booking.userId !== user.id && !['SUPER_ADMIN', 'PLATFORM_ADMIN', 'ORG_ADMIN'].includes(user.role)) {
            // Allow if user manages the station
            // Simplify for now: stricter ownership
            throw new NotFoundException('Booking not found')
        }

        return booking
    }

    async update(id: string, dto: any, user: any) {
        const booking = await this.findOne(id, user)
        if (booking.status === 'CANCELLED' || booking.status === 'COMPLETED') {
            throw new BadRequestException('Cannot update a finalized booking')
        }
        return this.prisma.booking.update({
            where: { id },
            data: dto
        })
    }

    async remove(id: string, user: any) {
        const booking = await this.findOne(id, user)
        return this.prisma.booking.delete({ where: { id } })
    }

    async updateStatus(id: string, status: BookingStatus, user: any) {
        const booking = await this.findOne(id, user)

        // Validate transitions?
        if (booking.status === 'CANCELLED' || booking.status === 'COMPLETED') {
            throw new BadRequestException('Cannot update a finalized booking')
        }

        return this.prisma.booking.update({
            where: { id },
            data: {
                status,
                cancelledAt: status === 'CANCELLED' ? new Date() : undefined,
                checkedInAt: status === 'CHECKED_IN' ? new Date() : undefined,
            }
        })
    }

    async getQueue(stationId: string) {
        return this.prisma.booking.findMany({
            where: {
                stationId,
                status: 'PENDING',
                startTime: { gt: new Date() }
            },
            orderBy: { queuePosition: 'asc' }
        })
    }

    async findByUser(userId: string) {
        return this.prisma.booking.findMany({
            where: { userId },
            include: { station: { select: { name: true, address: true } } },
            orderBy: { startTime: 'desc' }
        })
    }

    async findByStation(stationId: string) {
        return this.prisma.booking.findMany({
            where: { stationId },
            include: { User: { select: { name: true, email: true } } },
            orderBy: { startTime: 'desc' }
        })
    }
}
