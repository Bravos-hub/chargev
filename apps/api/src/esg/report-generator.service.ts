/**
 * Report Generator Service
 * Generates ESG reports in various formats (CSV, PDF, JSON).
 */
import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '../common/prisma/prisma.service'
import { CarbonCalculatorService } from './carbon-calculator.service'
import { ReportFormat, EmissionScope } from './dto/esg.dto'

@Injectable()
export class ReportGeneratorService {
  private readonly logger = new Logger(ReportGeneratorService.name)

  constructor(
    private prisma: PrismaService,
    private carbonCalculator: CarbonCalculatorService,
  ) {}

  /**
   * Generate ESG report in specified format.
   */
  async generateReport(
    orgId: string,
    startDate: Date,
    endDate: Date,
    format: ReportFormat,
    scopes?: EmissionScope[],
    includeCarbonCredits = false,
  ): Promise<string | Buffer> {
    this.logger.log(
      `Generating ${format} report for org ${orgId} from ${startDate} to ${endDate}`,
    )

    // Fetch ESG records
    const where: any = {
      orgId,
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    }

    if (scopes && scopes.length > 0) {
      where.scope = { in: scopes }
    }

    const [esgRecords, carbonCredits] = await Promise.all([
      this.prisma.eSGRecord.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          session: {
            select: {
              id: true,
              stationId: true,
              startedAt: true,
              endedAt: true,
            },
          },
        },
      }),
      includeCarbonCredits
        ? this.prisma.carbonCredit.findMany({
            where: {
              orgId,
              periodStart: { lte: endDate },
              periodEnd: { gte: startDate },
            },
            orderBy: { createdAt: 'desc' },
          })
        : Promise.resolve([]),
    ])

    // Generate report based on format
    switch (format) {
      case ReportFormat.CSV:
        return this.generateCSV(esgRecords, carbonCredits)
      case ReportFormat.PDF:
        return this.generatePDF(esgRecords, carbonCredits, orgId, startDate, endDate)
      case ReportFormat.JSON:
        return this.generateJSON(esgRecords, carbonCredits)
      default:
        throw new Error(`Unsupported report format: ${format}`)
    }
  }

  /**
   * Generate CSV report.
   */
  private generateCSV(esgRecords: any[], carbonCredits: any[]): string {
    const lines: string[] = []

    // Header
    lines.push(
      'Date,Session ID,Energy (kWh),CO2 Saved (kg),Scope,Region,Certificate Number',
    )

    // ESG Records
    for (const record of esgRecords) {
      lines.push(
        [
          record.createdAt.toISOString().split('T')[0],
          record.sessionId || 'N/A',
          record.energyKwh,
          record.co2Saved,
          record.scope,
          record.region || 'GLOBAL',
          '',
        ].join(','),
      )
    }

    // Carbon Credits
    if (carbonCredits.length > 0) {
      lines.push('') // Empty line separator
      lines.push('Carbon Credits')
      lines.push('Period Start,Period End,CO2 Amount (kg),Registry,Certificate Number,Verified')

      for (const credit of carbonCredits) {
        lines.push(
          [
            credit.periodStart.toISOString().split('T')[0],
            credit.periodEnd.toISOString().split('T')[0],
            credit.co2Amount,
            credit.registry,
            credit.certificateNumber || '',
            credit.verifiedAt ? 'Yes' : 'No',
          ].join(','),
        )
      }
    }

    return lines.join('\n')
  }

  /**
   * Generate PDF report.
   * Note: Requires pdfkit or similar library. For now, returns a simple text representation.
   */
  private async generatePDF(
    esgRecords: any[],
    carbonCredits: any[],
    orgId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<Buffer> {
    // TODO: Implement PDF generation using pdfkit or similar
    // For now, return CSV as buffer (can be enhanced later)
    const csv = this.generateCSV(esgRecords, carbonCredits)
    return Buffer.from(csv, 'utf-8')
  }

  /**
   * Generate JSON report.
   */
  private generateJSON(esgRecords: any[], carbonCredits: any[]): string {
    return JSON.stringify(
      {
        esgRecords: esgRecords.map((r) => ({
          id: r.id,
          sessionId: r.sessionId,
          energyKwh: r.energyKwh,
          co2Saved: r.co2Saved,
          scope: r.scope,
          region: r.region,
          createdAt: r.createdAt,
        })),
        carbonCredits: carbonCredits.map((c) => ({
          id: c.id,
          co2Amount: c.co2Amount,
          periodStart: c.periodStart,
          periodEnd: c.periodEnd,
          registry: c.registry,
          certificateNumber: c.certificateNumber,
          verifiedAt: c.verifiedAt,
        })),
        summary: {
          totalRecords: esgRecords.length,
          totalEnergy: esgRecords.reduce((sum, r) => sum + r.energyKwh, 0),
          totalCo2Saved: esgRecords.reduce((sum, r) => sum + r.co2Saved, 0),
          totalCarbonCredits: carbonCredits.length,
          totalCreditsCo2: carbonCredits.reduce((sum, c) => sum + c.co2Amount, 0),
        },
      },
      null,
      2,
    )
  }
}



