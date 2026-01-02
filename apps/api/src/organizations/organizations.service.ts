import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../common/prisma/prisma.service'

@Injectable()
export class OrganizationsService {
    constructor(private prisma: PrismaService) { }

    async findAll(userId: string) {
        // Find organizations where the user is a member
        return this.prisma.organization.findMany({
            where: {
                users: { some: { id: userId } }
            },
            include: { stations: true, fleets: true, users: true }
        })
    }

    async findOne(id: string) {
        const org = await this.prisma.organization.findUnique({
            where: { id },
            include: { stations: true, fleets: true, users: true }
        })
        if (!org) throw new NotFoundException('Organization not found')
        return org
    }

    async create(userId: string, dto: any) {
        return this.prisma.organization.create({
            data: {
                tenantId: 'tenant-1', // Default tenant
                name: dto.name,
                type: dto.type || 'CHARGING_NETWORK',
                // Link the creator as the first user
                users: {
                    connect: { id: userId }
                }
            }
        })
    }
}
