/**
 * ESG Controller
 * REST API endpoints for ESG reporting and carbon credit management.
 */
import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
  Res,
  UseGuards,
  HttpStatus,
} from '@nestjs/common'
import { Response } from 'express'
import { ESGService } from './esg.service'
import {
  CreateESGRecordDto,
  CreateCarbonCreditDto,
  GenerateReportDto,
  ESGQueryDto,
  CalculateEmissionsDto,
  ReportFormat,
} from './dto/esg.dto'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { RolesGuard } from '../common/guards/roles.guard'
import { Roles } from '../common/auth/roles.decorator'

@Controller('api/esg')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ESGController {
  constructor(private readonly esgService: ESGService) {}

  /**
   * Calculate emissions for a given energy amount.
   * Public endpoint for calculations.
   */
  @Post('calculate')
  async calculateEmissions(@Body() dto: CalculateEmissionsDto) {
    return this.esgService.calculateEmissions(
      dto.energyKwh,
      dto.region,
      dto.scope,
    )
  }

  /**
   * Get ESG dashboard metrics.
   */
  @Get('dashboard')
  @Roles('ORG_OWNER', 'ORG_ADMIN', 'PLATFORM_ADMIN', 'SUPER_ADMIN')
  async getDashboard(
    @Query('orgId') orgId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.esgService.getDashboard(
      orgId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    )
  }

  /**
   * Get ESG records with filtering.
   */
  @Get('records')
  @Roles('ORG_OWNER', 'ORG_ADMIN', 'PLATFORM_ADMIN', 'SUPER_ADMIN')
  async getESGRecords(@Query() query: ESGQueryDto) {
    return this.esgService.getESGRecords(query)
  }

  /**
   * Create ESG record.
   */
  @Post('records')
  @Roles('ORG_OWNER', 'ORG_ADMIN', 'PLATFORM_ADMIN', 'SUPER_ADMIN')
  async createESGRecord(@Body() dto: CreateESGRecordDto) {
    return this.esgService.createESGRecord(dto)
  }

  /**
   * Create ESG record from charging session.
   */
  @Post('records/session/:sessionId')
  @Roles('ORG_OWNER', 'ORG_ADMIN', 'PLATFORM_ADMIN', 'SUPER_ADMIN')
  async createESGRecordFromSession(
    @Param('sessionId') sessionId: string,
    @Query('orgId') orgId: string,
  ) {
    return this.esgService.createESGRecordFromSession(sessionId, orgId)
  }

  /**
   * Get carbon credits.
   */
  @Get('carbon-credits')
  @Roles('ORG_OWNER', 'ORG_ADMIN', 'PLATFORM_ADMIN', 'SUPER_ADMIN')
  async getCarbonCredits(
    @Query('orgId') orgId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.esgService.getCarbonCredits(
      orgId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    )
  }

  /**
   * Create carbon credit.
   */
  @Post('carbon-credits')
  @Roles('ORG_OWNER', 'ORG_ADMIN', 'PLATFORM_ADMIN', 'SUPER_ADMIN')
  async createCarbonCredit(@Body() dto: CreateCarbonCreditDto) {
    return this.esgService.createCarbonCredit(dto)
  }

  /**
   * Generate and download ESG report.
   */
  @Post('reports/generate')
  @Roles('ORG_OWNER', 'ORG_ADMIN', 'PLATFORM_ADMIN', 'SUPER_ADMIN')
  async generateReport(@Body() dto: GenerateReportDto, @Res() res: Response) {
    const report = await this.esgService.generateReport(dto)

    // Set appropriate headers based on format
    const contentType =
      dto.format === ReportFormat.PDF
        ? 'application/pdf'
        : dto.format === ReportFormat.CSV
          ? 'text/csv'
          : 'application/json'

    const extension = dto.format.toLowerCase()
    const filename = `esg-report-${dto.orgId}-${new Date().toISOString().split('T')[0]}.${extension}`

    res.setHeader('Content-Type', contentType)
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)

    if (typeof report === 'string') {
      res.send(report)
    } else {
      res.send(report)
    }
  }

  /**
   * Get supported regions and emission factors.
   */
  @Get('regions')
  async getSupportedRegions() {
    return this.esgService['carbonCalculator'].getSupportedRegions()
  }
}


