import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../common/prisma/prisma.service'
import { CreateVehicleDto, UpdateVehicleDto } from './dto/vehicle.dto'
import { CreateMaintenanceRecordDto } from './dto/maintenance.dto'

@Injectable()
export class VehiclesService {
    constructor(private prisma: PrismaService) { }

    async create(createVehicleDto: CreateVehicleDto) {
        return this.prisma.vehicle.create({
            data: {
                ...createVehicleDto,
            },
        })
    }

    async findAll(user: any) {
        // If admin, return all
        if (['SUPER_ADMIN', 'PLATFORM_ADMIN'].includes(user.role)) {
            return this.prisma.vehicle.findMany({
                include: { user: true, org: true, fleet: true }
            })
        }

        // Role based filtering
        const where: any = { OR: [] }

        // If individual owner
        if (user.id) {
            where.OR.push({ userId: user.id })
        }

        // If fleet manager/driver
        if (user.fleetId) {
            where.OR.push({ fleetId: user.fleetId })
        }

        // If org admin
        if (user.orgId && ['ORG_OWNER', 'ORG_ADMIN'].includes(user.role)) {
            where.OR.push({ orgId: user.orgId })
        }

        if (where.OR.length === 0) return []

        return this.prisma.vehicle.findMany({
            where,
            include: {
                diagnostics: {
                    orderBy: { timestamp: 'desc' },
                    take: 1
                }
            }
        })
    }

    async findOne(id: string) {
        const vehicle = await this.prisma.vehicle.findUnique({
            where: { id },
            include: {
                diagnostics: { orderBy: { timestamp: 'desc' }, take: 1 },
                trips: { orderBy: { startedAt: 'desc' }, take: 5 },
                maintenance: { orderBy: { scheduledAt: 'desc' }, take: 5 },
                faults: { where: { resolved: false } }
            }
        })

        if (!vehicle) throw new NotFoundException('Vehicle not found')
        return vehicle
    }

    async update(id: string, updateVehicleDto: UpdateVehicleDto) {
        return this.prisma.vehicle.update({
            where: { id },
            data: updateVehicleDto,
        })
    }

    async remove(id: string) {
        return this.prisma.vehicle.delete({
            where: { id },
        })
    }

    // Sub-resources
    async getDiagnostics(id: string) {
        return this.prisma.vehicleDiagnostic.findMany({
            where: { vehicleId: id },
            orderBy: { timestamp: 'desc' },
            take: 50
        })
    }

    async getBatteryHealth(id: string) {
        // Get latest diagnostic for SOH
        const diag = await this.prisma.vehicleDiagnostic.findFirst({
            where: { vehicleId: id },
            orderBy: { timestamp: 'desc' }
        })

        // Calculate degradation trend based on historical diagnostics
        // (Simplified placeholder logic)
        return {
            healthPercentage: diag ? 95 : 100, // Replace with actual SOH if available in diagnostic
            estimatedRange: diag?.range || 0,
            cycles: 150, // This would come from BMS data integration
            status: 'Good'
        }
    }

    async addMaintenanceRecord(id: string, dto: CreateMaintenanceRecordDto) {
        return this.prisma.maintenanceRecord.create({
            data: {
                vehicleId: id,
                ...dto
            }
        })
    }

    async getTrips(id: string) {
        return this.prisma.trip.findMany({
            where: { vehicleId: id },
            orderBy: { startedAt: 'desc' }
        })
    }

    async getSessions(id: string) {
        return this.prisma.chargingSession.findMany({
            where: { vehicleId: id },
            orderBy: { startedAt: 'desc' }
        })
    }

    async getFaults(id: string) {
        return this.prisma.faultCode.findMany({
            where: { vehicleId: id },
            orderBy: { detectedAt: 'desc' }
        })
    }

    async getMaintenanceRecords(id: string) {
        return this.prisma.maintenanceRecord.findMany({
            where: { vehicleId: id },
            orderBy: { scheduledAt: 'desc' }
        })
    }
}
