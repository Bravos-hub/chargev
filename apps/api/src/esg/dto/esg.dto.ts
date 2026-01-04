/**
 * DTOs for ESG (Environmental, Social, Governance) and Carbon Credit reporting.
 */
import {
  IsString,
  IsNumber,
  IsOptional,
  IsEnum,
  IsDateString,
  IsArray,
  IsObject,
  IsBoolean,
  Min,
  Max,
  ValidateNested,
} from 'class-validator'
import { Type } from 'class-transformer'

export enum EmissionScope {
  SCOPE_1 = 'SCOPE_1', // Direct emissions from owned/controlled sources
  SCOPE_2 = 'SCOPE_2', // Indirect emissions from purchased energy
  SCOPE_3 = 'SCOPE_3', // All other indirect emissions in value chain
}

export enum CarbonRegistry {
  GOLD_STANDARD = 'GOLD_STANDARD',
  VCS = 'VCS', // Verified Carbon Standard
  CARBON_REGISTRY = 'CARBON_REGISTRY',
  OTHER = 'OTHER',
}

export enum ReportFormat {
  CSV = 'CSV',
  PDF = 'PDF',
  JSON = 'JSON',
}

export class CalculateEmissionsDto {
  @IsNumber()
  @Min(0)
  energyKwh: number

  @IsOptional()
  @IsString()
  region?: string // For region-specific emission factors

  @IsOptional()
  @IsEnum(EmissionScope)
  scope?: EmissionScope
}

export class CreateESGRecordDto {
  @IsString()
  orgId: string

  @IsOptional()
  @IsString()
  sessionId?: string

  @IsNumber()
  @Min(0)
  energyKwh: number

  @IsNumber()
  @Min(0)
  co2Saved: number // kg CO2

  @IsEnum(EmissionScope)
  scope: EmissionScope

  @IsOptional()
  @IsString()
  region?: string

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>
}

export class CreateCarbonCreditDto {
  @IsString()
  orgId: string

  @IsNumber()
  @Min(0)
  co2Amount: number // kg CO2

  @IsDateString()
  periodStart: string

  @IsDateString()
  periodEnd: string

  @IsEnum(CarbonRegistry)
  registry: CarbonRegistry

  @IsOptional()
  @IsString()
  certificateNumber?: string

  @IsOptional()
  @IsString()
  verificationBody?: string

  @IsOptional()
  @IsDateString()
  verifiedAt?: string

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>
}

export class GenerateReportDto {
  @IsString()
  orgId: string

  @IsDateString()
  startDate: string

  @IsDateString()
  endDate: string

  @IsEnum(ReportFormat)
  format: ReportFormat

  @IsOptional()
  @IsArray()
  @IsEnum(EmissionScope, { each: true })
  scopes?: EmissionScope[]

  @IsOptional()
  @IsBoolean()
  includeCarbonCredits?: boolean
}

export class ESGQueryDto {
  @IsOptional()
  @IsString()
  orgId?: string

  @IsOptional()
  @IsDateString()
  startDate?: string

  @IsOptional()
  @IsDateString()
  endDate?: string

  @IsOptional()
  @IsEnum(EmissionScope)
  scope?: EmissionScope

  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number = 1

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20
}

export interface EmissionsCalculationResult {
  energyKwh: number
  co2Saved: number // kg CO2
  co2Equivalent: number // kg CO2e (includes other GHGs)
  emissionFactor: number // kg CO2 per kWh
  scope: EmissionScope
  region?: string
}

export interface ESGRecordResponse {
  id: string
  orgId: string
  sessionId?: string
  energyKwh: number
  co2Saved: number
  scope: EmissionScope
  region?: string
  createdAt: Date
  metadata?: Record<string, any>
}

export interface CarbonCreditResponse {
  id: string
  orgId: string
  co2Amount: number
  periodStart: Date
  periodEnd: Date
  registry: CarbonRegistry
  certificateNumber?: string
  verificationBody?: string
  verifiedAt?: Date
  createdAt: Date
  metadata?: Record<string, any>
}

export interface ESGDashboardResponse {
  totalEnergyKwh: number
  totalCo2Saved: number // kg CO2
  totalCo2Equivalent: number // kg CO2e
  byScope: {
    scope1: { energy: number; co2: number }
    scope2: { energy: number; co2: number }
    scope3: { energy: number; co2: number }
  }
  carbonCredits: {
    total: number
    verified: number
    pending: number
  }
  period: {
    start: Date
    end: Date
  }
}

