/**
 * Report Export Service
 * Handles export of analytics data in various formats (CSV, PDF, JSON).
 */
import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '../common/prisma/prisma.service'

export enum ReportType {
  SESSIONS = 'sessions',
  REVENUE = 'revenue',
  ENERGY = 'energy',
  ESG = 'esg',
  CHARGERS = 'chargers',
  USERS = 'users',
}

export enum ExportFormat {
  CSV = 'CSV',
  PDF = 'PDF',
  JSON = 'JSON',
}

@Injectable()
export class ReportExportService {
  private readonly logger = new Logger(ReportExportService.name)

  constructor(private prisma: PrismaService) {}

  /**
   * Export data based on type and format.
   */
  async exportReport(
    type: ReportType,
    format: ExportFormat,
    startDate: Date,
    endDate: Date,
    orgId?: string,
  ): Promise<string | Buffer> {
    this.logger.log(`Exporting ${type} report as ${format} from ${startDate} to ${endDate}`)

    switch (type) {
      case ReportType.SESSIONS:
        return this.exportSessions(format, startDate, endDate, orgId)
      case ReportType.REVENUE:
        return this.exportRevenue(format, startDate, endDate, orgId)
      case ReportType.ENERGY:
        return this.exportEnergy(format, startDate, endDate, orgId)
      case ReportType.ESG:
        return this.exportESG(format, startDate, endDate, orgId)
      case ReportType.CHARGERS:
        return this.exportChargers(format, startDate, endDate, orgId)
      case ReportType.USERS:
        return this.exportUsers(format, startDate, endDate, orgId)
      default:
        throw new Error(`Unsupported report type: ${type}`)
    }
  }

  /**
   * Export charging sessions.
   */
  private async exportSessions(
    format: ExportFormat,
    startDate: Date,
    endDate: Date,
    orgId?: string,
  ): Promise<string | Buffer> {
    const where: any = {
      startedAt: {
        gte: startDate,
        lte: endDate,
      },
    }

    if (orgId) {
      where.station = { orgId }
    }

    const sessions = await this.prisma.chargingSession.findMany({
      where,
      include: {
        station: { select: { name: true, address: true } },
        user: { select: { email: true, phone: true } },
      },
      orderBy: { startedAt: 'desc' },
    })

    switch (format) {
      case ExportFormat.CSV:
        return this.sessionsToCSV(sessions)
      case ExportFormat.JSON:
        return JSON.stringify(sessions, null, 2)
      case ExportFormat.PDF:
        // TODO: Implement PDF generation
        return Buffer.from(this.sessionsToCSV(sessions), 'utf-8')
      default:
        throw new Error(`Unsupported format: ${format}`)
    }
  }

  /**
   * Export revenue data.
   */
  private async exportRevenue(
    format: ExportFormat,
    startDate: Date,
    endDate: Date,
    orgId?: string,
  ): Promise<string | Buffer> {
    const where: any = {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
      status: 'COMPLETED',
    }

    if (orgId) {
      where.session = { station: { orgId } }
    }

    const payments = await this.prisma.payment.findMany({
      where,
      include: {
        session: {
          include: {
            station: { select: { name: true } },
          },
        },
        user: { select: { email: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    switch (format) {
      case ExportFormat.CSV:
        return this.revenueToCSV(payments)
      case ExportFormat.JSON:
        return JSON.stringify(
          {
            total: payments.reduce((sum, p) => sum + Number(p.amount), 0),
            count: payments.length,
            payments: payments.map((p) => ({
              id: p.id,
              amount: Number(p.amount),
              currency: p.currency,
              method: p.method,
              date: p.createdAt,
              station: p.session?.station?.name,
            })),
          },
          null,
          2,
        )
      case ExportFormat.PDF:
        return Buffer.from(this.revenueToCSV(payments), 'utf-8')
      default:
        throw new Error(`Unsupported format: ${format}`)
    }
  }

  /**
   * Export energy data.
   */
  private async exportEnergy(
    format: ExportFormat,
    startDate: Date,
    endDate: Date,
    orgId?: string,
  ): Promise<string | Buffer> {
    const where: any = {
      startedAt: {
        gte: startDate,
        lte: endDate,
      },
      status: 'COMPLETED',
    }

    if (orgId) {
      where.station = { orgId }
    }

    const sessions = await this.prisma.chargingSession.findMany({
      where,
      include: {
        station: { select: { name: true, address: true } },
      },
      orderBy: { startedAt: 'desc' },
    })

    const totalEnergy = sessions.reduce((sum, s) => sum + (s.kwh || 0), 0)

    switch (format) {
      case ExportFormat.CSV:
        return this.energyToCSV(sessions, totalEnergy)
      case ExportFormat.JSON:
        return JSON.stringify(
          {
            totalEnergy,
            sessionCount: sessions.length,
            averageEnergy: totalEnergy / sessions.length || 0,
            sessions: sessions.map((s) => ({
              id: s.id,
              energy: s.kwh,
              station: s.station.name,
              date: s.startedAt,
            })),
          },
          null,
          2,
        )
      case ExportFormat.PDF:
        return Buffer.from(this.energyToCSV(sessions, totalEnergy), 'utf-8')
      default:
        throw new Error(`Unsupported format: ${format}`)
    }
  }

  /**
   * Export ESG data.
   */
  private async exportESG(
    format: ExportFormat,
    startDate: Date,
    endDate: Date,
    orgId?: string,
  ): Promise<string | Buffer> {
    const where: any = {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    }

    if (orgId) {
      where.orgId = orgId
    }

    const esgRecords = await this.prisma.eSGRecord.findMany({
      where,
      include: {
        session: {
          include: {
            station: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    switch (format) {
      case ExportFormat.CSV:
        return this.esgToCSV(esgRecords)
      case ExportFormat.JSON:
        return JSON.stringify(esgRecords, null, 2)
      case ExportFormat.PDF:
        return Buffer.from(this.esgToCSV(esgRecords), 'utf-8')
      default:
        throw new Error(`Unsupported format: ${format}`)
    }
  }

  /**
   * Export charger data.
   */
  private async exportChargers(
    format: ExportFormat,
    startDate: Date,
    endDate: Date,
    orgId?: string,
  ): Promise<string | Buffer> {
    const where: any = {}

    if (orgId) {
      where.orgId = orgId
    }

    const stations = await this.prisma.station.findMany({
      where,
      include: {
        _count: {
          select: {
            sessions: true,
          },
        },
      },
    })

    switch (format) {
      case ExportFormat.CSV:
        return this.chargersToCSV(stations)
      case ExportFormat.JSON:
        return JSON.stringify(stations, null, 2)
      case ExportFormat.PDF:
        return Buffer.from(this.chargersToCSV(stations), 'utf-8')
      default:
        throw new Error(`Unsupported format: ${format}`)
    }
  }

  /**
   * Export user data.
   */
  private async exportUsers(
    format: ExportFormat,
    startDate: Date,
    endDate: Date,
    orgId?: string,
  ): Promise<string | Buffer> {
    const where: any = {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    }

    if (orgId) {
      where.orgId = orgId
    }

    const users = await this.prisma.user.findMany({
      where,
      include: {
        _count: {
          select: {
            sessions: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    switch (format) {
      case ExportFormat.CSV:
        return this.usersToCSV(users)
      case ExportFormat.JSON:
        return JSON.stringify(users, null, 2)
      case ExportFormat.PDF:
        return Buffer.from(this.usersToCSV(users), 'utf-8')
      default:
        throw new Error(`Unsupported format: ${format}`)
    }
  }

  // CSV conversion methods

  private sessionsToCSV(sessions: any[]): string {
    const lines = ['Session ID,Station,User,Energy (kWh),Amount,Currency,Start Time,End Time,Status']

    for (const session of sessions) {
      lines.push(
        [
          session.id,
          session.station?.name || 'N/A',
          session.user?.email || session.user?.phone || 'N/A',
          session.kwh || 0,
          session.amount || 0,
          session.currency || 'USD',
          session.startedAt.toISOString(),
          session.endedAt?.toISOString() || 'N/A',
          session.status,
        ].join(','),
      )
    }

    return lines.join('\n')
  }

  private revenueToCSV(payments: any[]): string {
    const lines = ['Payment ID,Amount,Currency,Method,Station,User,Date,Status']

    for (const payment of payments) {
      lines.push(
        [
          payment.id,
          payment.amount,
          payment.currency,
          payment.method,
          payment.session?.station?.name || 'N/A',
          payment.user?.email || 'N/A',
          payment.createdAt.toISOString(),
          payment.status,
        ].join(','),
      )
    }

    return lines.join('\n')
  }

  private energyToCSV(sessions: any[], totalEnergy: number): string {
    const lines = [
      'Summary',
      `Total Energy (kWh),${totalEnergy}`,
      `Session Count,${sessions.length}`,
      `Average Energy (kWh),${totalEnergy / sessions.length || 0}`,
      '',
      'Session ID,Station,Energy (kWh),Start Time,End Time',
    ]

    for (const session of sessions) {
      lines.push(
        [
          session.id,
          session.station?.name || 'N/A',
          session.kwh || 0,
          session.startedAt.toISOString(),
          session.endedAt?.toISOString() || 'N/A',
        ].join(','),
      )
    }

    return lines.join('\n')
  }

  private esgToCSV(records: any[]): string {
    const lines = ['Record ID,Session ID,Station,Energy (kWh),CO2 Saved (kg),Scope,Region,Date']

    for (const record of records) {
      lines.push(
        [
          record.id,
          record.sessionId || 'N/A',
          record.session?.station?.name || 'N/A',
          record.energyKwh,
          record.co2Saved,
          record.scope,
          record.region || 'GLOBAL',
          record.createdAt.toISOString(),
        ].join(','),
      )
    }

    return lines.join('\n')
  }

  private chargersToCSV(stations: any[]): string {
    const lines = ['Station ID,Name,Address,Status,Total Sessions,Latitude,Longitude']

    for (const station of stations) {
      lines.push(
        [
          station.id,
          station.name,
          station.address || 'N/A',
          station.status,
          (station._count as any)?.sessions || 0,
          station.lat || 'N/A',
          station.lng || 'N/A',
        ].join(','),
      )
    }

    return lines.join('\n')
  }

  private usersToCSV(users: any[]): string {
    const lines = ['User ID,Email,Phone,Role,Created At,Total Sessions']

    for (const user of users) {
      lines.push(
        [
          user.id,
          user.email || 'N/A',
          user.phone || 'N/A',
          user.role,
          user.createdAt.toISOString(),
          (user._count as any)?.sessions || 0,
        ].join(','),
      )
    }

    return lines.join('\n')
  }
}



