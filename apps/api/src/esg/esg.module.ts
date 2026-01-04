/**
 * ESG Module
 * Module for Environmental, Social, Governance reporting and carbon credit management.
 */
import { Module } from '@nestjs/common'
import { PrismaModule } from '../common/prisma/prisma.module'
import { ESGService } from './esg.service'
import { ESGController } from './esg.controller'
import { CarbonCalculatorService } from './carbon-calculator.service'
import { ReportGeneratorService } from './report-generator.service'

@Module({
  imports: [PrismaModule],
  controllers: [ESGController],
  providers: [ESGService, CarbonCalculatorService, ReportGeneratorService],
  exports: [ESGService, CarbonCalculatorService],
})
export class ESGModule {}


