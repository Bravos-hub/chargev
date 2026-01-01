import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../common/prisma/prisma.service'

@Injectable()
export class PrivateChargersService {
    constructor(private prisma: PrismaService) { }

    async getChargers(userId: string) {
        // Find stations where the user is an owner/admin and type is relatable to private
        return this.prisma.station.findMany({
            where: {
                orgId: userId // Placeholder: in real app, might be a more complex check
            }
        })
    }

    async getCharger(id: string) {
        const station = await this.prisma.station.findUnique({
            where: { id },
            include: {
                access: true,
                schedules: true,
                pricing: true
            }
        })
        if (!station) throw new NotFoundException('Station not found')
        return station
    }

    async updateAccess(id: string, userId: string, canAccess: boolean) {
        if (canAccess) {
            return this.prisma.chargerAccess.create({
                data: {
                    stationId: id,
                    userId,
                    type: 'PERMANENT', // Default type
                    validFrom: new Date(),
                    active: true
                }
            })
        } else {
            return this.prisma.chargerAccess.updateMany({
                where: { stationId: id, userId },
                data: { active: false }
            })
        }
    }

    async getSchedule(id: string) {
        return this.prisma.schedule.findMany({
            where: { stationId: id }
        })
    }

    async updateSchedule(id: string, schedule: any) {
        return this.prisma.schedule.create({
            data: {
                stationId: id,
                name: schedule.name || 'Default Schedule',
                type: 'AVAILABILITY', // Default type
                daysOfWeek: schedule.daysOfWeek || [1, 2, 3, 4, 5],
                startTime: schedule.startTime || '08:00',
                endTime: schedule.endTime || '18:00',
                validFrom: new Date(),
                active: true
            }
        })
    }

    async getPricing(id: string) {
        return this.prisma.pricing.findUnique({
            where: { stationId: id }
        })
    }

    async updatePricing(id: string, pricing: any) {
        return this.prisma.pricing.upsert({
            where: { stationId: id },
            update: pricing,
            create: { stationId: id, ...pricing }
        })
    }
}
