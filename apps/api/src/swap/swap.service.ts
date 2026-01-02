import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../common/prisma/prisma.service'

@Injectable()
export class SwapService {
    constructor(private prisma: PrismaService) { }

    async getStations() {
        return this.prisma.swapStation.findMany({
            include: {
                shelves: {
                    include: {
                        packs: true
                    }
                }
            }
        })
    }

    async getStation(id: string) {
        const station = await this.prisma.swapStation.findUnique({
            where: { id },
            include: {
                shelves: {
                    include: {
                        packs: true
                    }
                }
            }
        })
        if (!station) throw new NotFoundException('Swap station not found')
        return station
    }

    async initiateSwap(userId: string, stationId: string, vehicleId: string) {
        // Logic for initiating a swap
        const availablePack = await this.prisma.batteryPack.findFirst({
            where: { stationId, status: 'AVAILABLE', soc: { gt: 80 } }
        })

        if (!availablePack) throw new BadRequestException('No charged batteries available at this station')

        return this.prisma.swapSession.create({
            data: {
                userId,
                stationId,
                vehicleId,
                packInstalledId: availablePack.id,
                status: 'INITIATED',
                startedAt: new Date()
            }
        })
    }

    async completeSwap(id: string) {
        const session = await this.prisma.swapSession.findUnique({ where: { id } })
        if (!session) throw new NotFoundException('Swap session not found')

        return this.prisma.swapSession.update({
            where: { id },
            data: {
                status: 'COMPLETED',
                completedAt: new Date()
            }
        })
    }

    async getUserBatteries(userId: string) {
        // In the current schema, BatteryPack doesn't have a userId directly, 
        // but SwapSession tracks which user took which battery.
        // Assuming user "owns" the battery currently in their vehicle.
        return this.prisma.swapSession.findMany({
            where: { userId, status: 'COMPLETED' },
            include: { packInstalled: true },
            orderBy: { createdAt: 'desc' },
            take: 1
        })
    }

    async getSwapHistory(userId: string) {
        return this.prisma.swapSession.findMany({
            where: { userId },
            include: {
                station: { select: { stationId: true } } // SwapStation uses stationId link
            },
            orderBy: { startedAt: 'desc' }
        })
    }
}
