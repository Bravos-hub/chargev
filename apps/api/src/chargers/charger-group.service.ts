/**
 * Charger Group Service
 * Manages location-based charger grouping and group-level operations.
 */
import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../common/prisma/prisma.service'

export interface CreateChargerGroupDto {
  name: string
  orgId: string
  chargerIds: string[]
  description?: string
  metadata?: Record<string, any>
}

export interface UpdateChargerGroupDto {
  name?: string
  description?: string
  chargerIds?: string[]
  metadata?: Record<string, any>
}

@Injectable()
export class ChargerGroupService {
  private readonly logger = new Logger(ChargerGroupService.name)

  constructor(private prisma: PrismaService) {}

  /**
   * Create a charger group.
   */
  async createGroup(orgId: string, dto: CreateChargerGroupDto) {
    // Verify all chargers exist and belong to org
    const chargers = await this.prisma.station.findMany({
      where: {
        id: { in: dto.chargerIds },
        orgId,
      },
    })

    if (chargers.length !== dto.chargerIds.length) {
      throw new NotFoundException('One or more chargers not found or do not belong to organization')
    }

    const group = await this.prisma.chargerGroup.create({
      data: {
        name: dto.name,
        orgId,
        description: dto.description,
        metadata: dto.metadata || {},
        chargers: {
          connect: dto.chargerIds.map((id) => ({ id })),
        },
      },
      include: {
        chargers: true,
      },
    })

    this.logger.log(`Created charger group ${group.id} with ${dto.chargerIds.length} chargers`)

    return group
  }

  /**
   * Get all groups for an organization.
   */
  async getGroups(orgId: string) {
    return this.prisma.chargerGroup.findMany({
      where: { orgId },
      include: {
        chargers: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
        _count: {
          select: {
            chargers: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  /**
   * Get a specific group.
   */
  async getGroup(groupId: string, orgId: string) {
    const group = await this.prisma.chargerGroup.findUnique({
      where: { id: groupId },
      include: {
        chargers: true,
      },
    })

    if (!group || group.orgId !== orgId) {
      throw new NotFoundException('Charger group not found')
    }

    return group
  }

  /**
   * Update a charger group.
   */
  async updateGroup(groupId: string, orgId: string, dto: UpdateChargerGroupDto) {
    const group = await this.getGroup(groupId, orgId)

    const updateData: any = {
      name: dto.name,
      description: dto.description,
      metadata: dto.metadata,
    }

    if (dto.chargerIds) {
      // Verify new chargers belong to org
      const chargers = await this.prisma.station.findMany({
        where: {
          id: { in: dto.chargerIds },
          orgId,
        },
      })

      if (chargers.length !== dto.chargerIds.length) {
        throw new NotFoundException('One or more chargers not found')
      }

      updateData.chargers = {
        set: dto.chargerIds.map((id) => ({ id })),
      }
    }

    return this.prisma.chargerGroup.update({
      where: { id: groupId },
      data: updateData,
      include: {
        chargers: true,
      },
    })
  }

  /**
   * Delete a charger group.
   */
  async deleteGroup(groupId: string, orgId: string) {
    const group = await this.getGroup(groupId, orgId)

    await this.prisma.chargerGroup.delete({
      where: { id: groupId },
    })

    this.logger.log(`Deleted charger group ${groupId}`)
  }

  /**
   * Get group health summary.
   */
  async getGroupHealth(groupId: string, orgId: string) {
    const group = await this.getGroup(groupId, orgId)

    // Get charger statuses
    const chargerIds = group.chargers.map((c) => c.id)
    const chargers = await this.prisma.station.findMany({
      where: { id: { in: chargerIds } },
    })

    const online = chargers.filter((c) => c.status === 'ONLINE').length
    const offline = chargers.filter((c) => c.status === 'OFFLINE').length
    const degraded = chargers.filter((c) => c.status === 'DEGRADED').length
    const maintenance = chargers.filter((c) => c.status === 'MAINTENANCE').length

    const total = chargers.length
    const healthScore = total > 0 ? (online / total) * 100 : 0

    return {
      groupId: group.id,
      groupName: group.name,
      totalChargers: total,
      status: {
        online,
        offline,
        degraded,
        maintenance,
      },
      healthScore: Math.round(healthScore * 100) / 100,
      timestamp: new Date(),
    }
  }

  /**
   * Get group analytics.
   */
  async getGroupAnalytics(groupId: string, orgId: string, startDate?: Date, endDate?: Date) {
    const group = await this.getGroup(groupId, orgId)
    const chargerIds = group.chargers.map((c) => c.id)

    const where: any = {
      stationId: { in: chargerIds },
    }

    if (startDate || endDate) {
      where.startedAt = {}
      if (startDate) where.startedAt.gte = startDate
      if (endDate) where.startedAt.lte = endDate
    }

    const sessions = await this.prisma.chargingSession.findMany({
      where,
    })

    const totalSessions = sessions.length
    const totalEnergy = sessions.reduce((sum, s) => sum + (s.kwh || 0), 0)
    const totalRevenue = sessions.reduce((sum, s) => sum + Number(s.amount || 0), 0)

    return {
      groupId: group.id,
      groupName: group.name,
      period: {
        start: startDate || new Date(0),
        end: endDate || new Date(),
      },
      metrics: {
        totalSessions,
        totalEnergy: Math.round(totalEnergy * 100) / 100,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        averageEnergyPerSession: totalSessions > 0 ? totalEnergy / totalSessions : 0,
        averageRevenuePerSession: totalSessions > 0 ? totalRevenue / totalSessions : 0,
      },
    }
  }

  /**
   * Create location-based groups automatically.
   */
  async createLocationBasedGroups(orgId: string, maxDistanceKm = 5) {
    // Get all chargers for org
    const chargers = await this.prisma.station.findMany({
      where: { orgId },
      select: {
        id: true,
        name: true,
        lat: true,
        lng: true,
      },
    })

    // Simple clustering by proximity (can be enhanced with proper clustering algorithm)
    const groups: Array<{ name: string; chargerIds: string[] }> = []
    const processed = new Set<string>()

    for (const charger of chargers) {
      if (processed.has(charger.id) || !charger.lat || !charger.lng) continue

      const cluster: string[] = [charger.id]
      processed.add(charger.id)

      // Find nearby chargers
      for (const other of chargers) {
        if (processed.has(other.id) || !other.lat || !other.lng) continue

        const distance = this.calculateDistance(
          charger.lat,
          charger.lng,
          other.lat,
          other.lng,
        )

        if (distance <= maxDistanceKm) {
          cluster.push(other.id)
          processed.add(other.id)
        }
      }

      if (cluster.length > 1) {
        groups.push({
          name: `Location Group ${charger.name}`,
          chargerIds: cluster,
        })
      }
    }

    // Create groups
    const createdGroups = []
    for (const group of groups) {
      try {
        const created = await this.createGroup(orgId, {
          name: group.name,
          orgId,
          chargerIds: group.chargerIds,
          description: `Auto-generated location-based group with ${group.chargerIds.length} chargers`,
        })
        createdGroups.push(created)
      } catch (error) {
        this.logger.warn(`Failed to create group: ${error}`)
      }
    }

    return createdGroups
  }

  /**
   * Calculate distance between two coordinates (Haversine formula).
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371 // Earth's radius in km
    const dLat = this.toRad(lat2 - lat1)
    const dLon = this.toRad(lon2 - lon1)

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2)

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  private toRad(degrees: number): number {
    return degrees * (Math.PI / 180)
  }
}


