import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../common/prisma/prisma.service'

@Injectable()
export class FleetsService {
    constructor(private prisma: PrismaService) { }

    async findAll(orgId: string) {
        return this.prisma.fleet.findMany({
            where: { orgId },
            include: { vehicles: true }
        })
    }

    async findOne(id: string) {
        const fleet = await this.prisma.fleet.findUnique({
            where: { id },
            include: { vehicles: true, drivers: true }
        })
        if (!fleet) throw new NotFoundException('Fleet not found')
        return fleet
    }

    async create(orgId: string, dto: any) {
        return this.prisma.fleet.create({
            data: {
                orgId,
                name: dto.name,
            }
        })
    }
}
