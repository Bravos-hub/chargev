import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../common/prisma/prisma.service'
import {
    CreateRouteDto,
    UpdateRouteDto,
    CreateRouteStopDto,
    CreateStudentDto,
    UpdateStudentDto,
    CreateTripDto,
    RecordAttendanceDto,
} from './dto/shuttle.dto'

@Injectable()
export class ShuttleService {
    constructor(private prisma: PrismaService) {}

    // =================== ROUTES ===================

    async createRoute(fleetId: string, dto: CreateRouteDto) {
        return this.prisma.shuttleRoute.create({
            data: {
                fleetId,
                name: dto.name,
                description: dto.description,
                schedule: dto.schedule ? { raw: dto.schedule } : undefined,
                status: dto.active === false ? 'INACTIVE' : 'ACTIVE',
            },
        })
    }

    async findAllRoutes(fleetId: string) {
        return this.prisma.shuttleRoute.findMany({
            where: { fleetId },
            include: {
                stops: { orderBy: { sequence: 'asc' } },
                _count: { select: { students: true, trips: true } },
            },
        })
    }

    async findRoute(id: string) {
        const route = await this.prisma.shuttleRoute.findUnique({
            where: { id },
            include: {
                stops: { orderBy: { sequence: 'asc' } },
                students: { where: { status: 'ACTIVE' } },
            },
        })

        if (!route) throw new NotFoundException('Route not found')
        return route
    }

    async updateRoute(id: string, dto: UpdateRouteDto) {
        await this.findRoute(id)
        return this.prisma.shuttleRoute.update({
            where: { id },
            data: {
                name: dto.name,
                description: dto.description,
                schedule: dto.schedule ? { raw: dto.schedule } : undefined,
                status: dto.active === false ? 'INACTIVE' : dto.active === true ? 'ACTIVE' : undefined,
            },
        })
    }

    async deleteRoute(id: string) {
        await this.findRoute(id)
        await this.prisma.shuttleRoute.delete({ where: { id } })
        return { success: true }
    }

    // =================== STOPS ===================

    async addStop(dto: CreateRouteStopDto) {
        return this.prisma.routeStop.create({
            data: {
                routeId: dto.routeId,
                name: dto.name,
                address: dto.address || '',
                lat: dto.latitude,
                lng: dto.longitude,
                sequence: dto.sequence,
                arrivalTime: dto.estimatedTime,
            },
        })
    }

    async updateStop(id: string, dto: Partial<CreateRouteStopDto>) {
        return this.prisma.routeStop.update({
            where: { id },
            data: {
                name: dto.name,
                address: dto.address,
                lat: dto.latitude,
                lng: dto.longitude,
                sequence: dto.sequence,
                arrivalTime: dto.estimatedTime,
            },
        })
    }

    async deleteStop(id: string) {
        await this.prisma.routeStop.delete({ where: { id } })
        return { success: true }
    }

    async reorderStops(routeId: string, stopIds: string[]) {
        const updates = stopIds.map((id, index) =>
            this.prisma.routeStop.update({
                where: { id },
                data: { sequence: index + 1 },
            })
        )
        await this.prisma.$transaction(updates)
        return this.findRoute(routeId)
    }

    // =================== STUDENTS ===================

    async createStudent(fleetId: string, dto: CreateStudentDto) {
        return this.prisma.student.create({
            data: {
                fleetId,
                routeId: dto.routeId,
                name: dto.name,
                school: dto.grade || 'Unknown School',
                grade: dto.grade,
                parentName: dto.parentName || 'Unknown',
                parentPhone: dto.parentPhone || '',
                parentEmail: dto.parentEmail,
                pickupStopId: dto.pickupStopId,
                dropoffStopId: dto.dropoffStopId,
                photo: dto.photo,
                notes: dto.emergencyContact ? JSON.stringify(dto.emergencyContact) : undefined,
            },
            include: { route: true },
        })
    }

    async findAllStudents(fleetId: string, routeId?: string) {
        const where: any = { fleetId }
        if (routeId) where.routeId = routeId

        return this.prisma.student.findMany({
            where,
            include: { route: true },
        })
    }

    async findStudent(id: string) {
        const student = await this.prisma.student.findUnique({
            where: { id },
            include: { route: true },
        })

        if (!student) throw new NotFoundException('Student not found')
        return student
    }

    async updateStudent(id: string, dto: UpdateStudentDto) {
        await this.findStudent(id)
        return this.prisma.student.update({
            where: { id },
            data: {
                name: dto.name,
                grade: dto.grade,
                parentPhone: dto.parentPhone,
                routeId: dto.routeId,
                pickupStopId: dto.pickupStopId,
                dropoffStopId: dto.dropoffStopId,
                status: dto.active === false ? 'INACTIVE' : dto.active === true ? 'ACTIVE' : undefined,
            },
        })
    }

    async deleteStudent(id: string) {
        await this.findStudent(id)
        await this.prisma.student.delete({ where: { id } })
        return { success: true }
    }

    // =================== TRIPS ===================

    async startTrip(dto: CreateTripDto) {
        return this.prisma.shuttleTrip.create({
            data: {
                routeId: dto.routeId,
                driverId: dto.driverId,
                vehicleId: dto.vehicleId,
                direction: dto.type, // PICKUP or DROPOFF
                date: new Date(),
                startedAt: new Date(),
                status: 'IN_PROGRESS',
            },
            include: {
                route: { include: { stops: { orderBy: { sequence: 'asc' } } } },
            },
        })
    }

    async findTrips(fleetId: string, filters?: { routeId?: string; date?: string; status?: string }) {
        const where: any = { route: { fleetId } }

        if (filters?.routeId) where.routeId = filters.routeId
        if (filters?.status) where.status = filters.status
        if (filters?.date) {
            const date = new Date(filters.date)
            where.date = {
                gte: new Date(date.setHours(0, 0, 0, 0)),
                lt: new Date(date.setHours(23, 59, 59, 999)),
            }
        }

        return this.prisma.shuttleTrip.findMany({
            where,
            include: {
                route: true,
            },
            orderBy: { startedAt: 'desc' },
        })
    }

    async findTrip(id: string) {
        const trip = await this.prisma.shuttleTrip.findUnique({
            where: { id },
            include: {
                route: { include: { stops: { orderBy: { sequence: 'asc' } }, students: true } },
            },
        })

        if (!trip) throw new NotFoundException('Trip not found')
        return trip
    }

    async recordAttendance(tripId: string, dto: RecordAttendanceDto) {
        const trip = await this.findTrip(tripId)

        // Store attendance in trip metadata
        const attendance = (trip.attendance as any[]) || []
        attendance.push({
            studentId: dto.studentId,
            status: dto.status,
            stopId: dto.stopId,
            timestamp: new Date().toISOString(),
            notes: dto.notes,
        })

        return this.prisma.shuttleTrip.update({
            where: { id: tripId },
            data: { attendance },
        })
    }

    async endTrip(id: string) {
        const trip = await this.findTrip(id)

        if (trip.status !== 'IN_PROGRESS') {
            throw new BadRequestException('Trip is not in progress')
        }

        return this.prisma.shuttleTrip.update({
            where: { id },
            data: {
                status: 'COMPLETED',
                completedAt: new Date(),
            },
        })
    }

    async getRouteStats(routeId: string) {
        const [totalStudents, activeStudents, recentTrips] = await Promise.all([
            this.prisma.student.count({ where: { routeId } }),
            this.prisma.student.count({ where: { routeId, status: 'ACTIVE' } }),
            this.prisma.shuttleTrip.findMany({
                where: { routeId },
                orderBy: { startedAt: 'desc' },
                take: 10,
            }),
        ])

        return {
            totalStudents,
            activeStudents,
            recentTrips: recentTrips.length,
            completedToday: recentTrips.filter(
                t => t.status === 'COMPLETED' && t.startedAt && t.startedAt.toDateString() === new Date().toDateString()
            ).length,
        }
    }
}
