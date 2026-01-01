import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../common/prisma/prisma.service'
import { CreateUserDto, UpdateUserDto } from './dto/user.dto'
import * as bcrypt from 'bcrypt'

@Injectable()
export class UsersService {
    constructor(private prisma: PrismaService) { }

    async create(dto: CreateUserDto) {
        // Basic creation - usually auth service handles registration, 
        // but admins might create users directly
        return this.prisma.user.create({
            data: {
                ...dto,
                tenantId: 'tenant-1', // Default
                passwordHash: await bcrypt.hash('password123', 10) // Default password for admin-created users
            }
        })
    }

    async findAll(currentUser: any) {
        const where: any = {}

        // Fleet Managers see their drivers
        if (currentUser.role === 'FLEET_MANAGER' && currentUser.fleetId) {
            where.fleetId = currentUser.fleetId
            where.role = { in: ['FLEET_DRIVER'] }
        }

        // Org Admin sees org members
        if (['ORG_OWNER', 'ORG_ADMIN'].includes(currentUser.role) && currentUser.orgId) {
            where.orgId = currentUser.orgId
        }

        // Super Admin sees all (no filter)

        return this.prisma.user.findMany({
            where,
            select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                role: true,
                orgId: true,
                fleetId: true,
                verified: true,
                createdAt: true
            }
        })
    }

    async findOne(id: string) {
        const user = await this.prisma.user.findUnique({
            where: { id },
            include: {
                organization: { select: { name: true } },
                fleet: { select: { name: true } },
                wallet: { select: { balance: true, currency: true } }
            }
        })

        if (!user) throw new NotFoundException('User not found')

        const { passwordHash, ...result } = user
        return result
    }

    async update(id: string, dto: UpdateUserDto) {
        return this.prisma.user.update({
            where: { id },
            data: dto
        })
    }

    async remove(id: string) {
        return this.prisma.user.delete({ where: { id } })
    }

    // Specialized methods
    async assignToFleet(userId: string, fleetId: string) {
        return this.prisma.user.update({
            where: { id: userId },
            data: { fleetId, role: 'FLEET_DRIVER' } // Auto-assign role? Maybe checks needed.
        })
    }

    async getVehicles(userId: string) {
        return this.prisma.vehicle.findMany({
            where: { userId }
        })
    }

    async getSessions(userId: string) {
        return this.prisma.chargingSession.findMany({
            where: { userId },
            include: {
                station: { select: { name: true, address: true } }
            }
        })
    }
}
