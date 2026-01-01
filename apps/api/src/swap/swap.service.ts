import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../common/prisma/prisma.service'

@Injectable()
export class SwapService {
    constructor(private prisma: PrismaService) { }

    async getStations() {
        return this.prisma.swapStation.findMany({
            include: {
                cabinets: {
                    include: {
                        slots: {
                            include: { battery: true }
                        }
                    }
                }
            }
        })
    }

    async getStation(id: string) {
        const station = await this.prisma.swapStation.findUnique({
            where: { id },
            include: {
                cabinets: {
                    include: {
                        slots: {
                            include: { battery: true }
                        }
                    }
                }
            }
        })
        if (!station) throw new NotFoundException('Swap station not found')
        return station
    }

    async initiateSwap(userId: string, stationId: string, vehicleId: string) {
        // Placeholder logic for initiating a swap
        // 1. Check if user has an active battery
        // 2. Check if station has available charged batteries
        // 3. Create a pending swap transaction

        return this.prisma.swapTransaction.create({
            data: {
                userId,
                stationId,
                vehicleId,
                status: 'INITIATED',
                startTime: new Date()
            }
        })
    }

    async completeSwap(id: string) {
        const tx = await this.prisma.swapTransaction.findUnique({ where: { id } })
        if (!tx) throw new NotFoundException('Swap transaction not found')

        return this.prisma.swapTransaction.update({
            where: { id },
            data: {
                status: 'COMPLETED',
                endTime: new Date()
            }
        })
    }

    async getUserBatteries(userId: string) {
        return this.prisma.battery.findMany({
            where: { userId }
        })
    }

    async getSwapHistory(userId: string) {
        return this.prisma.swapTransaction.findMany({
            where: { userId },
            include: {
                station: { select: { name: true, location: true } }
            },
            orderBy: { startTime: 'desc' }
        })
    }
}
