import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../common/prisma/prisma.service'

@Injectable()
export class FleetsService {
    constructor(private prisma: PrismaService) { }

    async findAll(ownerId: string) {
        return this.prisma.fleet.findMany({
            where: { ownerId },
            include: { vehicles: true }
        })
    }

    async findOne(id: string) {
        const fleet = await this.prisma.fleet.findUnique({
            where: { id },
            include: { vehicles: true, members: true }
        })
        if (!fleet) throw new NotFoundException('Fleet not found')
        return fleet
    }

    async create(ownerId: string, dto: any) {
        return this.prisma.fleet.create({
            data: {
                ownerId,
                name: dto.name,
                description: dto.description
            }
        })
    }
}
