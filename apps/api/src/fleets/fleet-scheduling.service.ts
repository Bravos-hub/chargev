/**
 * Fleet Scheduling Service
 * Enhances booking system with fleet-specific scheduling features.
 */
import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../common/prisma/prisma.service'
import { BookingsService } from '../bookings/bookings.service'

export interface FleetChargingWindow {
  fleetId: string
  startTime: string // HH:mm format
  endTime: string // HH:mm format
  daysOfWeek: number[] // 0-6 (Sunday-Saturday)
  priority: number // Higher number = higher priority
  maxConcurrentBookings?: number
}

export interface CreateFleetBookingDto {
  fleetId: string
  vehicleId: string
  stationId: string
  connectorId?: string
  preferredStartTime: Date
  preferredEndTime: Date
  energyTarget?: number
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
}

export interface FleetScheduleSlot {
  stationId: string
  connectorId?: string
  startTime: Date
  endTime: Date
  available: boolean
  priority: number
}

@Injectable()
export class FleetSchedulingService {
  private readonly logger = new Logger(FleetSchedulingService.name)

  constructor(
    private prisma: PrismaService,
    private bookingsService: BookingsService,
  ) {}

  /**
   * Create a fleet-specific booking with priority scheduling.
   */
  async createFleetBooking(orgId: string, dto: CreateFleetBookingDto) {
    // Verify fleet belongs to org
    const fleet = await this.prisma.fleet.findUnique({
      where: { id: dto.fleetId },
    })

    if (!fleet || fleet.orgId !== orgId) {
      throw new NotFoundException('Fleet not found')
    }

    // Verify vehicle belongs to fleet
    const vehicle = await this.prisma.vehicle.findFirst({
      where: {
        id: dto.vehicleId,
        fleetId: dto.fleetId,
      },
    })

    if (!vehicle) {
      throw new NotFoundException('Vehicle not found in fleet')
    }

    // Get fleet driver (if vehicle has assigned driver)
    // Note: Driver doesn't have direct vehicle relation, check via shifts
    const driver = await this.prisma.driver.findFirst({
      where: {
        fleetId: dto.fleetId,
        shifts: {
          some: {
            vehicleId: dto.vehicleId,
          },
        },
      },
    })

    const userId = driver?.userId || fleet.orgId // Fallback to org owner

    // Check if booking is within fleet charging window
    const isWithinWindow = await this.isWithinChargingWindow(dto.fleetId, dto.preferredStartTime)
    if (!isWithinWindow) {
      this.logger.warn(`Booking outside fleet charging window for fleet ${dto.fleetId}`)
      // Allow but log warning
    }

    // Calculate priority score
    const priorityScore = this.calculatePriorityScore(dto.priority || 'MEDIUM', dto.fleetId)

    // Check for conflicts and handle priority
    const conflicts = await this.findConflictingBookings(
      dto.stationId,
      dto.connectorId,
      dto.preferredStartTime,
      dto.preferredEndTime,
    )

    // If conflicts exist, check if this booking has higher priority
    if (conflicts.length > 0) {
      const canOverride = await this.canOverrideConflicts(priorityScore, conflicts)
      if (!canOverride) {
        throw new BadRequestException(
          'Time slot is booked by higher priority booking. Please choose another time.',
        )
      }
    }

    // Create booking
    const booking = await this.prisma.booking.create({
      data: {
        userId,
        stationId: dto.stationId,
        connectorId: dto.connectorId,
        startTime: dto.preferredStartTime,
        endTime: dto.preferredEndTime,
        status: 'CONFIRMED',
        amount: 0, // Calculate later
        mode: 'fixed',
        energyTarget: dto.energyTarget,
        metadata: {
          fleetId: dto.fleetId,
          vehicleId: dto.vehicleId,
          priority: dto.priority || 'MEDIUM',
          priorityScore,
          isFleetBooking: true,
        },
      },
    })

    this.logger.log(`Created fleet booking ${booking.id} for fleet ${dto.fleetId}`)

    return booking
  }

  /**
   * Set fleet charging window.
   */
  async setChargingWindow(fleetId: string, window: FleetChargingWindow) {
    const fleet = await this.prisma.fleet.findUnique({
      where: { id: fleetId },
    })

    if (!fleet) {
      throw new NotFoundException('Fleet not found')
    }

    // Store charging window in fleet metadata
    const metadata = (fleet as any).metadata || {}
    metadata.chargingWindow = window

    await this.prisma.fleet.update({
      where: { id: fleetId },
      data: {
        // Note: Prisma doesn't have metadata field in Fleet model
        // Would need to add this field or use a separate table
        // For now, this is a placeholder
      },
    })

    this.logger.log(`Set charging window for fleet ${fleetId}`)
    return { success: true, window }
  }

  /**
   * Get available time slots for fleet scheduling.
   */
  async getAvailableSlots(
    fleetId: string,
    stationId: string,
    date: Date,
    durationMinutes: number = 60,
  ): Promise<FleetScheduleSlot[]> {
    const fleet = await this.prisma.fleet.findUnique({
      where: { id: fleetId },
    })

    if (!fleet) {
      throw new NotFoundException('Fleet not found')
    }

    // Get charging window
    const window = await this.getChargingWindow(fleetId)

    // Generate time slots for the day
    const slots: FleetScheduleSlot[] = []
    const startOfDay = new Date(date)
    startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date(date)
    endOfDay.setHours(23, 59, 59, 999)

    // Get existing bookings for the day
    const existingBookings = await this.prisma.booking.findMany({
      where: {
        stationId,
        startTime: { gte: startOfDay, lte: endOfDay },
        status: { in: ['CONFIRMED', 'CHECKED_IN', 'IN_PROGRESS'] },
      },
    })

    // Generate 30-minute slots
    const slotDuration = 30 // minutes
    let currentTime = new Date(startOfDay)

    while (currentTime < endOfDay) {
      const slotEnd = new Date(currentTime.getTime() + durationMinutes * 60 * 1000)

      // Check if slot is within charging window
      const isWithinWindow = this.isTimeInWindow(currentTime, window)

      // Check if slot conflicts with existing bookings
      const hasConflict = existingBookings.some((booking) => {
        return (
          (currentTime >= booking.startTime && currentTime < booking.endTime) ||
          (slotEnd > booking.startTime && slotEnd <= booking.endTime) ||
          (currentTime <= booking.startTime && slotEnd >= booking.endTime)
        )
      })

      slots.push({
        stationId,
        startTime: new Date(currentTime),
        endTime: slotEnd,
        available: !hasConflict && isWithinWindow,
        priority: isWithinWindow ? 1 : 0,
      })

      currentTime = new Date(currentTime.getTime() + slotDuration * 60 * 1000)
    }

    return slots.filter((slot) => slot.available)
  }

  /**
   * Get fleet schedule for a date range.
   */
  async getFleetSchedule(fleetId: string, startDate: Date, endDate: Date) {
    const fleet = await this.prisma.fleet.findUnique({
      where: { id: fleetId },
      include: {
        vehicles: true,
      },
    })

    if (!fleet) {
      throw new NotFoundException('Fleet not found')
    }

    // Get all bookings for the date range
    const bookings = await this.prisma.booking.findMany({
      where: {
        startTime: { gte: startDate, lte: endDate },
      },
      include: {
        station: {
          select: {
            id: true,
            name: true,
            address: true,
          },
        },
      },
      orderBy: { startTime: 'asc' },
    })

    // Filter bookings by fleetId in metadata
    const fleetBookings = bookings.filter((booking: any) => {
      const metadata = booking.metadata as any
      return metadata && metadata.fleetId === fleetId
    })

    return {
      fleetId,
      fleetName: fleet.name,
      period: { start: startDate, end: endDate },
      bookings: fleetBookings,
      totalBookings: fleetBookings.length,
      totalVehicles: fleet.vehicles.length,
    }
  }

  /**
   * Check if time is within fleet charging window.
   */
  private async isWithinChargingWindow(fleetId: string, time: Date): Promise<boolean> {
    const window = await this.getChargingWindow(fleetId)
    if (!window) return true // No window set = always allowed

    return this.isTimeInWindow(time, window)
  }

  /**
   * Get charging window for fleet.
   */
  private async getChargingWindow(fleetId: string): Promise<FleetChargingWindow | null> {
    // Would fetch from fleet metadata or separate table
    // Placeholder for now
    return null
  }

  /**
   * Check if time is within window.
   */
  private isTimeInWindow(time: Date, window: FleetChargingWindow | null): boolean {
    if (!window) return true

    const dayOfWeek = time.getDay()
    if (!window.daysOfWeek.includes(dayOfWeek)) {
      return false
    }

    const timeStr = `${time.getHours().toString().padStart(2, '0')}:${time.getMinutes().toString().padStart(2, '0')}`
    return timeStr >= window.startTime && timeStr <= window.endTime
  }

  /**
   * Find conflicting bookings.
   */
  private async findConflictingBookings(
    stationId: string,
    connectorId: string | undefined,
    startTime: Date,
    endTime: Date,
  ) {
    return this.prisma.booking.findMany({
      where: {
        stationId,
        connectorId: connectorId || undefined,
        status: { in: ['CONFIRMED', 'CHECKED_IN', 'IN_PROGRESS'] },
        AND: [
          { startTime: { lt: endTime } },
          { endTime: { gt: startTime } },
        ],
      },
    })
  }

  /**
   * Check if booking can override conflicts based on priority.
   */
  private async canOverrideConflicts(priorityScore: number, conflicts: any[]): Promise<boolean> {
    // Check if any conflict has higher priority
    for (const conflict of conflicts) {
      const conflictPriority = (conflict.metadata as any)?.priorityScore || 0
      if (conflictPriority >= priorityScore) {
        return false
      }
    }
    return true
  }

  /**
   * Calculate priority score.
   */
  private calculatePriorityScore(priority: string, fleetId: string): number {
    const baseScores: Record<string, number> = {
      LOW: 1,
      MEDIUM: 2,
      HIGH: 3,
      URGENT: 4,
    }

    return baseScores[priority] || 2
  }
}

