/**
 * ESG Service
 * Main service for ESG (Environmental, Social, Governance) reporting and carbon credit management.
 */
import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../common/prisma/prisma.service'
import { CarbonCalculatorService } from './carbon-calculator.service'
import { ReportGeneratorService } from './report-generator.service'
import {
  CreateESGRecordDto,
  CreateCarbonCreditDto,
  GenerateReportDto,
  ESGQueryDto,
  EmissionsCalculationResult,
  ESGRecordResponse,
  CarbonCreditResponse,
  ESGDashboardResponse,
  EmissionScope,
} from './dto/esg.dto'

@Injectable()
export class ESGService {
  private readonly logger = new Logger(ESGService.name)

  constructor(
    private prisma: PrismaService,
    private carbonCalculator: CarbonCalculatorService,
    private reportGenerator: ReportGeneratorService,
  ) {}

  /**
   * Calculate emissions for a given energy amount.
   */
  calculateEmissions(
    energyKwh: number,
    region?: string,
    scope: EmissionScope = EmissionScope.SCOPE_2,
  ): EmissionsCalculationResult {
    return this.carbonCalculator.calculateEmissions(energyKwh, region, scope)
  }

  /**
   * Create an ESG record from a charging session.
   */
  async createESGRecord(dto: CreateESGRecordDto): Promise<ESGRecordResponse> {
    // Verify session exists if provided
    if (dto.sessionId) {
      const session = await this.prisma.chargingSession.findUnique({
        where: { id: dto.sessionId },
      })
      if (!session) {
        throw new NotFoundException(`Session ${dto.sessionId} not found`)
      }
    }

    const record = await this.prisma.eSGRecord.create({
      data: {
        orgId: dto.orgId,
        sessionId: dto.sessionId,
        energyKwh: dto.energyKwh,
        co2Saved: dto.co2Saved,
        scope: dto.scope,
        region: dto.region,
        metadata: dto.metadata || {},
      },
    })

    this.logger.log(`Created ESG record ${record.id} for org ${dto.orgId}`)

    return {
      id: record.id,
      orgId: record.orgId,
      sessionId: record.sessionId || undefined,
      energyKwh: record.energyKwh,
      co2Saved: record.co2Saved,
      scope: record.scope as EmissionScope,
      region: record.region || undefined,
      createdAt: record.createdAt,
      metadata: record.metadata as Record<string, any> | undefined,
    }
  }

  /**
   * Automatically create ESG record from a charging session.
   */
  async createESGRecordFromSession(sessionId: string, orgId: string): Promise<ESGRecordResponse> {
    const session = await this.prisma.chargingSession.findUnique({
      where: { id: sessionId },
      include: {
        station: {
          select: {
            address: true,
            country: true,
          },
        },
      },
    })

    if (!session) {
      throw new NotFoundException(`Session ${sessionId} not found`)
    }

    if (!session.kwh || session.kwh <= 0) {
      this.logger.warn(`Session ${sessionId} has no energy delivered, skipping ESG record`)
      return null as any
    }

    // Determine region from station location
    const region = session.station?.country || undefined

    // Calculate emissions (default to SCOPE_2 for charging sessions)
    const calculation = this.carbonCalculator.calculateEmissions(
      session.kwh,
      region,
      EmissionScope.SCOPE_2,
    )

    return this.createESGRecord({
      orgId,
      sessionId,
      energyKwh: session.kwh,
      co2Saved: calculation.co2Saved,
      scope: EmissionScope.SCOPE_2,
      region,
    })
  }

  /**
   * Get ESG records with filtering.
   */
  async getESGRecords(query: ESGQueryDto) {
    const where: any = {}

    if (query.orgId) where.orgId = query.orgId
    if (query.scope) where.scope = query.scope
    if (query.startDate || query.endDate) {
      where.createdAt = {}
      if (query.startDate) where.createdAt.gte = new Date(query.startDate)
      if (query.endDate) where.createdAt.lte = new Date(query.endDate)
    }

    const page = query.page || 1
    const limit = query.limit || 20
    const skip = (page - 1) * limit

    const [records, total] = await Promise.all([
      this.prisma.eSGRecord.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          session: {
            select: {
              id: true,
              stationId: true,
              startedAt: true,
            },
          },
        },
      }),
      this.prisma.eSGRecord.count({ where }),
    ])

    return {
      records: records.map((r) => ({
        id: r.id,
        orgId: r.orgId,
        sessionId: r.sessionId || undefined,
        energyKwh: r.energyKwh,
        co2Saved: r.co2Saved,
        scope: r.scope,
        region: r.region || undefined,
        createdAt: r.createdAt,
        metadata: r.metadata as Record<string, any> | undefined,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }
  }

  /**
   * Get ESG dashboard metrics.
   */
  async getDashboard(orgId: string, startDate?: Date, endDate?: Date): Promise<ESGDashboardResponse> {
    const dateFilter: any = {}
    if (startDate) dateFilter.gte = startDate
    if (endDate) dateFilter.lte = endDate

    const where = {
      orgId,
      ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
    }

    const [records, credits] = await Promise.all([
      this.prisma.eSGRecord.findMany({ where }),
      this.prisma.carbonCredit.findMany({
        where: { orgId },
      }),
    ])

    // Calculate totals
    const totalEnergy = records.reduce((sum, r) => sum + r.energyKwh, 0)
    const totalCo2 = records.reduce((sum, r) => sum + r.co2Saved, 0)
    const totalCo2e = totalCo2 * 1.05 // Include other GHGs

    // Calculate by scope
    const byScope = {
      scope1: {
        energy: records.filter((r: any) => r.scope === 'SCOPE_1').reduce((sum: number, r: any) => sum + r.energyKwh, 0),
        co2: records.filter((r: any) => r.scope === 'SCOPE_1').reduce((sum: number, r: any) => sum + r.co2Saved, 0),
      },
      scope2: {
        energy: records.filter((r: any) => r.scope === 'SCOPE_2').reduce((sum: number, r: any) => sum + r.energyKwh, 0),
        co2: records.filter((r: any) => r.scope === 'SCOPE_2').reduce((sum: number, r: any) => sum + r.co2Saved, 0),
      },
      scope3: {
        energy: records.filter((r: any) => r.scope === 'SCOPE_3').reduce((sum: number, r: any) => sum + r.energyKwh, 0),
        co2: records.filter((r: any) => r.scope === 'SCOPE_3').reduce((sum: number, r: any) => sum + r.co2Saved, 0),
      },
    }

    // Carbon credits summary
    const verifiedCredits = credits.filter((c: any) => c.verifiedAt !== null)
    const carbonCredits = {
      total: credits.reduce((sum: number, c: any) => sum + c.co2Amount, 0),
      verified: verifiedCredits.reduce((sum: number, c: any) => sum + c.co2Amount, 0),
      pending: credits.filter((c: any) => !c.verifiedAt).reduce((sum: number, c: any) => sum + c.co2Amount, 0),
    }

    return {
      totalEnergyKwh: Math.round(totalEnergy * 100) / 100,
      totalCo2Saved: Math.round(totalCo2 * 100) / 100,
      totalCo2Equivalent: Math.round(totalCo2e * 100) / 100,
      byScope,
      carbonCredits,
      period: {
        start: startDate || new Date(0),
        end: endDate || new Date(),
      },
    }
  }

  /**
   * Create carbon credit record.
   */
  async createCarbonCredit(dto: CreateCarbonCreditDto): Promise<CarbonCreditResponse> {
    const credit = await this.prisma.carbonCredit.create({
      data: {
        orgId: dto.orgId,
        co2Amount: dto.co2Amount,
        periodStart: new Date(dto.periodStart),
        periodEnd: new Date(dto.periodEnd),
        registry: dto.registry,
        certificateNumber: dto.certificateNumber,
        verificationBody: dto.verificationBody,
        verifiedAt: dto.verifiedAt ? new Date(dto.verifiedAt) : null,
        metadata: dto.metadata || {},
      },
    })

    this.logger.log(`Created carbon credit ${credit.id} for org ${dto.orgId}`)

    return {
      id: credit.id,
      orgId: credit.orgId,
      co2Amount: credit.co2Amount,
      periodStart: credit.periodStart,
      periodEnd: credit.periodEnd,
      registry: credit.registry as any,
      certificateNumber: credit.certificateNumber || undefined,
      verificationBody: credit.verificationBody || undefined,
      verifiedAt: credit.verifiedAt || undefined,
      createdAt: credit.createdAt,
      metadata: credit.metadata as Record<string, any> | undefined,
    }
  }

  /**
   * Get carbon credits.
   */
  async getCarbonCredits(orgId: string, startDate?: Date, endDate?: Date) {
    const where: any = { orgId }

    if (startDate || endDate) {
      where.OR = [
        {
          periodStart: { lte: endDate || new Date() },
          periodEnd: { gte: startDate || new Date(0) },
        },
      ]
    }

    return this.prisma.carbonCredit.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })
  }

  /**
   * Generate ESG report.
   */
  async generateReport(dto: GenerateReportDto): Promise<string | Buffer> {
    return this.reportGenerator.generateReport(
      dto.orgId,
      new Date(dto.startDate),
      new Date(dto.endDate),
      dto.format,
      dto.scopes,
      dto.includeCarbonCredits,
    )
  }
}


