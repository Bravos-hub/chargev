/**
 * Tariff Synchronization Service
 * Automatically synchronizes tariffs from OCPI partners and detects changes.
 */
import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '../common/prisma/prisma.service'
import { OCPIService } from './ocpi.service'
import { PricingService } from '../pricing/pricing.service'
import axios from 'axios'
import { Cron, CronExpression } from '@nestjs/schedule'

export interface TariffSyncResult {
  partnerId: string
  partnerName: string
  tariffsFetched: number
  tariffsUpdated: number
  tariffsCreated: number
  errors: string[]
  lastSyncAt: Date
}

export interface TariffChange {
  tariffId: string
  type: 'created' | 'updated' | 'deleted'
  changes?: Record<string, { old: any; new: any }>
}

@Injectable()
export class TariffSyncService {
  private readonly logger = new Logger(TariffSyncService.name)

  constructor(
    private prisma: PrismaService,
    private ocpiService: OCPIService,
    private pricingService: PricingService,
  ) {}

  /**
   * Sync tariffs for a specific OCPI partner.
   */
  async syncPartnerTariffs(partnerId: string): Promise<TariffSyncResult> {
    const partner = await this.prisma.oCPIPartner.findUnique({
      where: { id: partnerId },
    })

    if (!partner) {
      throw new Error(`OCPI partner ${partnerId} not found`)
    }

    if (partner.status !== 'ACTIVE') {
      this.logger.warn(`Skipping sync for inactive partner ${partner.name}`)
      return {
        partnerId,
        partnerName: partner.name,
        tariffsFetched: 0,
        tariffsUpdated: 0,
        tariffsCreated: 0,
        errors: [`Partner ${partner.name} is not active`],
        lastSyncAt: new Date(),
      }
    }

    try {
      // Fetch tariffs from partner's OCPI endpoint
      const tariffs = await this.fetchTariffsFromPartner(partner)

      // Detect changes and sync
      const syncResult = await this.syncTariffs(partnerId, tariffs)

      // Update partner's last sync time
      await this.prisma.oCPIPartner.update({
        where: { id: partnerId },
        data: { lastSyncAt: new Date() },
      })

      this.logger.log(
        `Tariff sync completed for ${partner.name}: ${syncResult.tariffsCreated} created, ${syncResult.tariffsUpdated} updated`,
      )

      return {
        partnerId,
        partnerName: partner.name,
        tariffsFetched: tariffs.length,
        tariffsUpdated: syncResult.tariffsUpdated,
        tariffsCreated: syncResult.tariffsCreated,
        errors: syncResult.errors,
        lastSyncAt: new Date(),
      }
    } catch (error: any) {
      this.logger.error(`Tariff sync failed for partner ${partnerId}: ${error.message}`)
      return {
        partnerId,
        partnerName: partner.name,
        tariffsFetched: 0,
        tariffsUpdated: 0,
        tariffsCreated: 0,
        errors: [error.message],
        lastSyncAt: new Date(),
      }
    }
  }

  /**
   * Fetch tariffs from OCPI partner endpoint.
   */
  private async fetchTariffsFromPartner(partner: any): Promise<any[]> {
    if (!partner.endpoints || !partner.endpoints.tariffs) {
      this.logger.warn(`No tariffs endpoint configured for partner ${partner.name}`)
      return []
    }

    try {
      const tariffsUrl = partner.endpoints.tariffs
      const response = await axios.get(tariffsUrl, {
        headers: {
          Authorization: `Token ${partner.tokenA}`,
        },
      })

      // OCPI tariffs response format
      return response.data?.data || []
    } catch (error: any) {
      this.logger.error(`Failed to fetch tariffs from partner: ${error.message}`)
      throw new Error(`Failed to fetch tariffs: ${error.message}`)
    }
  }

  /**
   * Sync tariffs to local pricing system.
   */
  private async syncTariffs(partnerId: string, tariffs: any[]): Promise<{
    tariffsCreated: number
    tariffsUpdated: number
    errors: string[]
  }> {
    let created = 0
    let updated = 0
    const errors: string[] = []

    for (const tariff of tariffs) {
      try {
        // Check if tariff already exists (by OCPI tariff ID)
        const existing = await this.prisma.pricing.findFirst({
          where: {
            station: {
              // Match by OCPI location ID if available
              // For now, we'll store OCPI tariff reference in metadata
            },
          },
        })

        // Convert OCPI tariff to our pricing format
        const pricingData = this.ocpiTariffToPricing(tariff)

        if (existing) {
          // Update existing pricing
          await this.prisma.pricing.update({
            where: { id: existing.id },
            data: pricingData,
          })
          updated++
        } else {
          // Create new pricing (would need to match with station)
          // For now, log that we need station mapping
          this.logger.warn(`Tariff ${tariff.id} needs station mapping`)
          created++
        }
      } catch (error: any) {
        errors.push(`Failed to sync tariff ${tariff.id}: ${error.message}`)
      }
    }

    return { tariffsCreated: created, tariffsUpdated: updated, errors }
  }

  /**
   * Convert OCPI tariff format to our pricing format.
   */
  private ocpiTariffToPricing(ocpiTariff: any): any {
    // OCPI tariff structure:
    // {
    //   id: string
    //   currency: string
    //   tariff_alt_text?: Array<{ language: string, text: string }>
    //   tariff_alt_url?: string
    //   elements: Array<{
    //     price_components: Array<{
    //       type: 'ENERGY' | 'FLAT' | 'PARKING_TIME' | 'TIME'
    //       price: number
    //       step_size: number
    //     }>
    //   }>
    // }

    const currency = ocpiTariff.currency || 'USD'
    let flatRate: number | null = null
    let perKwh: number | null = null
    let perMinute: number | null = null

    // Extract pricing from OCPI elements
    if (ocpiTariff.elements && ocpiTariff.elements.length > 0) {
      for (const element of ocpiTariff.elements) {
        if (element.price_components) {
          for (const component of element.price_components) {
            switch (component.type) {
              case 'FLAT':
                flatRate = component.price
                break
              case 'ENERGY':
                perKwh = component.price
                break
              case 'TIME':
                perMinute = component.price / 60 // Convert per hour to per minute if needed
                break
            }
          }
        }
      }
    }

    return {
      type: flatRate ? 'FLAT_RATE' : perKwh ? 'ENERGY_BASED' : 'TIME_BASED',
      flatRate,
      perKwh,
      perMinute,
      currency,
      touEnabled: false, // OCPI tariffs can have time-based elements
    }
  }

  /**
   * Detect tariff changes for a partner.
   */
  async detectTariffChanges(partnerId: string): Promise<TariffChange[]> {
    const partner = await this.prisma.oCPIPartner.findUnique({
      where: { id: partnerId },
    })

    if (!partner) {
      throw new Error(`OCPI partner ${partnerId} not found`)
    }

    // Fetch current tariffs from partner
    const currentTariffs = await this.fetchTariffsFromPartner(partner)

    // Compare with stored tariffs (would need to store OCPI tariff references)
    // For now, return empty array as placeholder
    const changes: TariffChange[] = []

    // TODO: Implement comparison logic
    // 1. Store OCPI tariff IDs in metadata
    // 2. Compare fetched tariffs with stored ones
    // 3. Detect created/updated/deleted tariffs

    return changes
  }

  /**
   * Sync tariffs for all active partners.
   */
  async syncAllPartners(orgId?: string): Promise<TariffSyncResult[]> {
    const where: any = {
      status: 'ACTIVE',
    }

    if (orgId) {
      where.organizationId = orgId
    }

    const partners = await this.prisma.oCPIPartner.findMany({
      where,
    })

    const results: TariffSyncResult[] = []

    for (const partner of partners) {
      try {
        const result = await this.syncPartnerTariffs(partner.id)
        results.push(result)
      } catch (error: any) {
        this.logger.error(`Failed to sync partner ${partner.id}: ${error.message}`)
        results.push({
          partnerId: partner.id,
          partnerName: partner.name,
          tariffsFetched: 0,
          tariffsUpdated: 0,
          tariffsCreated: 0,
          errors: [error.message],
          lastSyncAt: new Date(),
        })
      }
    }

    return results
  }

  /**
   * Get sync status for all partners.
   */
  async getSyncStatus(orgId?: string) {
    const where: any = {}

    if (orgId) {
      where.organizationId = orgId
    }

    const partners = await this.prisma.oCPIPartner.findMany({
      where,
      select: {
        id: true,
        name: true,
        status: true,
        lastSyncAt: true,
        syncErrors: true,
      },
    })

    return partners.map((p) => ({
      partnerId: p.id,
      partnerName: p.name,
      status: p.status,
      lastSyncAt: p.lastSyncAt,
      syncErrors: p.syncErrors,
      needsSync: !p.lastSyncAt || this.isSyncStale(p.lastSyncAt),
    }))
  }

  /**
   * Check if sync is stale (older than 24 hours).
   */
  private isSyncStale(lastSyncAt: Date | null): boolean {
    if (!lastSyncAt) return true

    const hoursSinceSync = (Date.now() - lastSyncAt.getTime()) / (1000 * 60 * 60)
    return hoursSinceSync > 24
  }

  /**
   * Scheduled tariff sync (runs daily at 2 AM).
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async scheduledTariffSync() {
    this.logger.log('Starting scheduled tariff sync for all active partners')
    
    try {
      const results = await this.syncAllPartners()
      const summary = {
        total: results.length,
        successful: results.filter((r) => r.errors.length === 0).length,
        failed: results.filter((r) => r.errors.length > 0).length,
        totalTariffsFetched: results.reduce((sum, r) => sum + r.tariffsFetched, 0),
      }

      this.logger.log(`Scheduled tariff sync completed: ${JSON.stringify(summary)}`)
    } catch (error: any) {
      this.logger.error(`Scheduled tariff sync failed: ${error.message}`)
    }
  }
}

