import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../common/prisma/prisma.service'

@Injectable()
export class OrganizationsService {
    constructor(private prisma: PrismaService) { }

    async findAll(userId: string) {
        // Find organizations where the user is a member/owner
        return this.prisma.organization.findMany({
            where: {
                OR: [
                    { ownerId: userId },
                    { members: { some: { userId } } }
                ]
            },
            include: { stations: true, fleets: true }
        })
    }

    async findOne(id: string) {
        const org = await this.prisma.organization.findUnique({
            where: { id },
            include: { stations: true, fleets: true, members: true }
        })
        if (!org) throw new NotFoundException('Organization not found')
        return org
    }

    async create(ownerId: string, dto: any) {
        return this.prisma.organization.create({
            data: {
                ownerId,
                name: dto.name,
                description: dto.description
            }
        })
    }
}
