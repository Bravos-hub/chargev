/**
 * Home Charging Reimbursement Service
 * Manages reimbursement for fleet drivers who charge at home.
 */
import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../common/prisma/prisma.service'

export enum ReimbursementStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  PAID = 'PAID',
}

export interface CreateReimbursementDto {
  fleetId: string
  driverId: string
  periodStart: Date
  periodEnd: Date
  energyKwh: number
  ratePerKwh: number
  description?: string
  receipts?: string[] // Receipt file URLs
}

export interface UpdateReimbursementDto {
  status?: ReimbursementStatus
  approvedAmount?: number
  rejectionReason?: string
  notes?: string
}

@Injectable()
export class ReimbursementService {
  private readonly logger = new Logger(ReimbursementService.name)

  constructor(private prisma: PrismaService) {}

  /**
   * Create a home charging reimbursement request.
   */
  async createReimbursement(orgId: string, dto: CreateReimbursementDto) {
    // Verify fleet and driver exist
    const fleet = await this.prisma.fleet.findUnique({
      where: { id: dto.fleetId },
    })

    if (!fleet || fleet.orgId !== orgId) {
      throw new NotFoundException('Fleet not found')
    }

    // Verify driver belongs to fleet
    const driver = await this.prisma.user.findFirst({
      where: {
        id: dto.driverId,
        role: 'FLEET_DRIVER',
        fleetId: dto.fleetId,
      },
    })

    if (!driver) {
      throw new NotFoundException('Driver not found in fleet')
    }

    // Calculate total amount
    const totalAmount = dto.energyKwh * dto.ratePerKwh

    const reimbursement = await this.prisma.homeChargingReimbursement.create({
      data: {
        orgId,
        fleetId: dto.fleetId,
        driverId: dto.driverId,
        periodStart: dto.periodStart,
        periodEnd: dto.periodEnd,
        energyKwh: dto.energyKwh,
        ratePerKwh: dto.ratePerKwh,
        requestedAmount: totalAmount,
        status: ReimbursementStatus.PENDING,
        description: dto.description,
        receipts: dto.receipts || [],
      },
    })

    this.logger.log(
      `Created reimbursement ${reimbursement.id} for driver ${dto.driverId}: ${totalAmount}`,
    )

    return reimbursement
  }

  /**
   * Get reimbursements for a fleet.
   */
  async getFleetReimbursements(fleetId: string, status?: ReimbursementStatus) {
    const where: any = { fleetId }
    if (status) {
      where.status = status
    }

    return this.prisma.homeChargingReimbursement.findMany({
      where,
      include: {
        driver: {
          select: {
            id: true,
            email: true,
            phone: true,
            name: true,
          },
        },
        fleet: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  /**
   * Get reimbursements for a driver.
   */
  async getDriverReimbursements(driverId: string, status?: ReimbursementStatus) {
    const where: any = { driverId }
    if (status) {
      where.status = status
    }

    return this.prisma.homeChargingReimbursement.findMany({
      where,
      include: {
        fleet: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  /**
   * Update reimbursement status (approve/reject).
   */
  async updateReimbursement(
    reimbursementId: string,
    orgId: string,
    dto: UpdateReimbursementDto,
  ) {
    const reimbursement = await this.prisma.homeChargingReimbursement.findUnique({
      where: { id: reimbursementId },
    })

    if (!reimbursement || reimbursement.orgId !== orgId) {
      throw new NotFoundException('Reimbursement not found')
    }

    if (reimbursement.status !== ReimbursementStatus.PENDING) {
      throw new BadRequestException('Only pending reimbursements can be updated')
    }

    const updateData: any = {
      status: dto.status,
      notes: dto.notes,
    }

    if (dto.status === ReimbursementStatus.APPROVED) {
      updateData.approvedAmount = dto.approvedAmount || reimbursement.requestedAmount
      updateData.approvedAt = new Date()
      updateData.approvedBy = orgId // In real implementation, use actual user ID
    } else if (dto.status === ReimbursementStatus.REJECTED) {
      if (!dto.rejectionReason) {
        throw new BadRequestException('Rejection reason is required')
      }
      updateData.rejectionReason = dto.rejectionReason
      updateData.rejectedAt = new Date()
    }

    return this.prisma.homeChargingReimbursement.update({
      where: { id: reimbursementId },
      data: updateData,
    })
  }

  /**
   * Mark reimbursement as paid.
   */
  async markAsPaid(reimbursementId: string, orgId: string, paymentReference?: string) {
    const reimbursement = await this.prisma.homeChargingReimbursement.findUnique({
      where: { id: reimbursementId },
    })

    if (!reimbursement || reimbursement.orgId !== orgId) {
      throw new NotFoundException('Reimbursement not found')
    }

    if (reimbursement.status !== ReimbursementStatus.APPROVED) {
      throw new BadRequestException('Only approved reimbursements can be marked as paid')
    }

    return this.prisma.homeChargingReimbursement.update({
      where: { id: reimbursementId },
      data: {
        status: ReimbursementStatus.PAID,
        paidAt: new Date(),
        paymentReference,
      },
    })
  }

  /**
   * Get reimbursement statistics for a fleet.
   */
  async getReimbursementStats(fleetId: string, startDate?: Date, endDate?: Date) {
    const where: any = { fleetId }

    if (startDate || endDate) {
      where.createdAt = {}
      if (startDate) where.createdAt.gte = startDate
      if (endDate) where.createdAt.lte = endDate
    }

    const reimbursements = await this.prisma.homeChargingReimbursement.findMany({
      where,
    })

    const total = reimbursements.length
    const pending = reimbursements.filter((r: any) => r.status === ReimbursementStatus.PENDING).length
    const approved = reimbursements.filter((r: any) => r.status === ReimbursementStatus.APPROVED).length
    const paid = reimbursements.filter((r: any) => r.status === ReimbursementStatus.PAID).length
    const rejected = reimbursements.filter((r: any) => r.status === ReimbursementStatus.REJECTED).length

    const totalRequested = reimbursements.reduce((sum: number, r: any) => sum + r.requestedAmount, 0)
    const totalApproved = reimbursements
      .filter((r: any) => r.approvedAmount)
      .reduce((sum: number, r: any) => sum + (r.approvedAmount || 0), 0)
    const totalPaid = reimbursements
      .filter((r: any) => r.status === ReimbursementStatus.PAID)
      .reduce((sum: number, r: any) => sum + (r.approvedAmount || r.requestedAmount), 0)

    const totalEnergy = reimbursements.reduce((sum: number, r: any) => sum + r.energyKwh, 0)

    return {
      total,
      byStatus: {
        pending,
        approved,
        paid,
        rejected,
      },
      amounts: {
        totalRequested,
        totalApproved,
        totalPaid,
      },
      energy: {
        totalKwh: totalEnergy,
        averagePerRequest: total > 0 ? totalEnergy / total : 0,
      },
    }
  }
}


