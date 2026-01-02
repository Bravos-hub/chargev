import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common'
import { PrismaService } from '../common/prisma/prisma.service'
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

@Injectable()
export class DriversService {
    constructor(private prisma: PrismaService) {}

    // =================== DRIVER PROFILES ===================

    async createDriver(fleetId: string, dto: CreateDriverDto) {
        // Check if user already has a driver profile
        const existing = await this.prisma.driver.findUnique({
            where: { userId: dto.userId },
        })
        if (existing) {
            throw new BadRequestException('User already has a driver profile')
        }

        return this.prisma.driver.create({
            data: {
                userId: dto.userId,
                fleetId,
                licenseNumber: dto.licenseNumber,
                licenseExpiry: dto.licenseExpiry ? new Date(dto.licenseExpiry) : new Date(),
                licenseClass: dto.licenseClass,
                bankAccount: dto.bankAccount ? { account: dto.bankAccount, bank: dto.bankName } : undefined,
                documents: dto.documents || [],
            },
            include: { user: { select: { id: true, name: true, email: true, phone: true } } },
        })
    }

    async findAllDrivers(fleetId: string) {
        return this.prisma.driver.findMany({
            where: { fleetId },
            include: {
                user: { select: { id: true, name: true, email: true, phone: true } },
                _count: { select: { shifts: true, ratings: true } },
            },
        })
    }

    async findDriver(id: string) {
        const driver = await this.prisma.driver.findUnique({
            where: { id },
            include: {
                user: { select: { id: true, name: true, email: true, phone: true } },
                fleet: { select: { id: true, name: true } },
                shifts: { take: 10, orderBy: { createdAt: 'desc' } },
                ratings: { take: 10, orderBy: { createdAt: 'desc' } },
            },
        })

        if (!driver) throw new NotFoundException('Driver not found')
        return driver
    }

    async updateDriver(id: string, dto: UpdateDriverDto) {
        await this.findDriver(id)

        return this.prisma.driver.update({
            where: { id },
            data: {
                licenseNumber: dto.licenseNumber,
                licenseExpiry: dto.licenseExpiry ? new Date(dto.licenseExpiry) : undefined,
                licenseClass: dto.licenseClass,
                status: dto.status,
                bankAccount: dto.bankAccount ? { account: dto.bankAccount, bank: dto.bankName } : undefined,
                documents: dto.documents,
            },
        })
    }

    async deleteDriver(id: string) {
        await this.findDriver(id)
        await this.prisma.driver.delete({ where: { id } })
        return { success: true }
    }

    async getDriverStats(id: string) {
        const driver = await this.findDriver(id)

        const [totalShifts, completedShifts, totalEarnings, avgRating] = await Promise.all([
            this.prisma.driverShift.count({ where: { driverId: id } }),
            this.prisma.driverShift.count({ where: { driverId: id, status: 'COMPLETED' } }),
            this.prisma.driverPayout.aggregate({
                where: { driverId: id, status: 'COMPLETED' },
                _sum: { netAmount: true },
            }),
            this.prisma.driverRating.aggregate({
                where: { driverId: id },
                _avg: { score: true },
            }),
        ])

        return {
            totalShifts,
            completedShifts,
            totalEarnings: totalEarnings._sum.netAmount || 0,
            averageRating: avgRating._avg.score || 0,
            currentRating: driver.rating,
        }
    }

    // =================== SHIFTS ===================

    async createShift(dto: CreateShiftDto) {
        return this.prisma.driverShift.create({
            data: {
                driverId: dto.driverId,
                vehicleId: dto.vehicleId,
                startTime: new Date(dto.scheduledStart),
                endTime: new Date(dto.scheduledEnd),
            },
            include: { driver: true, vehicle: true },
        })
    }

    async findShifts(fleetId: string, filters?: { driverId?: string; status?: string; date?: string }) {
        const where: any = { driver: { fleetId } }

        if (filters?.driverId) where.driverId = filters.driverId
        if (filters?.status) where.status = filters.status
        if (filters?.date) {
            const date = new Date(filters.date)
            where.startTime = {
                gte: new Date(date.setHours(0, 0, 0, 0)),
                lt: new Date(date.setHours(23, 59, 59, 999)),
            }
        }

        return this.prisma.driverShift.findMany({
            where,
            include: {
                driver: { include: { user: { select: { name: true } } } },
                vehicle: { select: { id: true, make: true, model: true, plate: true } },
            },
            orderBy: { startTime: 'desc' },
        })
    }

    async findShift(id: string) {
        const shift = await this.prisma.driverShift.findUnique({
            where: { id },
            include: {
                driver: { include: { user: { select: { name: true, phone: true } } } },
                vehicle: true,
            },
        })

        if (!shift) throw new NotFoundException('Shift not found')
        return shift
    }

    async updateShift(id: string, dto: UpdateShiftDto) {
        await this.findShift(id)

        return this.prisma.driverShift.update({
            where: { id },
            data: {
                vehicleId: dto.vehicleId,
                startTime: dto.scheduledStart ? new Date(dto.scheduledStart) : undefined,
                endTime: dto.scheduledEnd ? new Date(dto.scheduledEnd) : undefined,
                status: dto.status,
            },
        })
    }

    async checkIn(shiftId: string, driverId: string, dto: CheckInDto) {
        const shift = await this.findShift(shiftId)

        if (shift.driverId !== driverId) {
            throw new ForbiddenException('This is not your shift')
        }

        if (shift.status !== 'SCHEDULED') {
            throw new BadRequestException('Cannot check in - shift is not scheduled')
        }

        return this.prisma.driverShift.update({
            where: { id: shiftId },
            data: {
                status: 'ACTIVE',
                checkInAt: new Date(),
                vehicleId: dto.vehicleId || shift.vehicleId,
                checkInLocation: dto.location,
            },
        })
    }

    async checkOut(shiftId: string, driverId: string, dto: CheckOutDto) {
        const shift = await this.findShift(shiftId)

        if (shift.driverId !== driverId) {
            throw new ForbiddenException('This is not your shift')
        }

        if (shift.status !== 'ACTIVE') {
            throw new BadRequestException('Cannot check out - shift is not active')
        }

        return this.prisma.driverShift.update({
            where: { id: shiftId },
            data: {
                status: 'COMPLETED',
                checkOutAt: new Date(),
                notes: dto.notes,
            },
        })
    }

    async cancelShift(shiftId: string) {
        const shift = await this.findShift(shiftId)

        if (shift.status === 'COMPLETED') {
            throw new BadRequestException('Cannot cancel completed shift')
        }

        return this.prisma.driverShift.update({
            where: { id: shiftId },
            data: { status: 'CANCELLED' },
        })
    }

    // =================== PAYOUTS ===================

    async createPayout(fleetId: string, dto: CreatePayoutDto) {
        const driver = await this.findDriver(dto.driverId)

        if (driver.fleetId !== fleetId) {
            throw new ForbiddenException('Driver does not belong to your fleet')
        }

        const periodStart = dto.periodStart ? new Date(dto.periodStart) : new Date()
        const periodEnd = dto.periodEnd ? new Date(dto.periodEnd) : new Date()

        const payout = await this.prisma.driverPayout.create({
            data: {
                driverId: dto.driverId,
                grossAmount: dto.amount,
                netAmount: dto.amount,
                periodStart,
                periodEnd,
                breakdown: dto.description ? { notes: dto.description } : undefined,
            },
        })

        // Update driver's total earnings
        await this.prisma.driver.update({
            where: { id: dto.driverId },
            data: { totalEarnings: { increment: dto.amount } },
        })

        return payout
    }

    async findPayouts(driverId: string) {
        return this.prisma.driverPayout.findMany({
            where: { driverId },
            orderBy: { createdAt: 'desc' },
        })
    }

    async processPayout(payoutId: string, reference: string) {
        return this.prisma.driverPayout.update({
            where: { id: payoutId },
            data: {
                status: 'COMPLETED',
                paidAt: new Date(),
                reference,
            },
        })
    }

    // =================== RATINGS ===================

    async rateDriver(userId: string, dto: CreateDriverRatingDto) {
        return this.prisma.driverRating.create({
            data: {
                driverId: dto.driverId,
                userId,
                score: dto.score,
                comment: dto.comment,
                tripId: dto.tripId,
            },
        })
    }

    async getDriverRatings(driverId: string) {
        const [ratings, stats] = await Promise.all([
            this.prisma.driverRating.findMany({
                where: { driverId },
                orderBy: { createdAt: 'desc' },
                take: 50,
            }),
            this.prisma.driverRating.aggregate({
                where: { driverId },
                _avg: { score: true },
                _count: { score: true },
            }),
        ])

        return {
            ratings,
            averageScore: stats._avg.score || 0,
            totalRatings: stats._count.score,
        }
    }

    async updateDriverRating(driverId: string) {
        const stats = await this.prisma.driverRating.aggregate({
            where: { driverId },
            _avg: { score: true },
        })

        await this.prisma.driver.update({
            where: { id: driverId },
            data: { rating: stats._avg.score || 0 },
        })
    }
}
