/**
 * DTOs for ML service requests and responses.
 */
import {
  IsString,
  IsNumber,
  IsOptional,
  IsArray,
  IsEnum,
  IsObject,
  Min,
  Max,
  ValidateNested,
} from 'class-validator'
import { Type } from 'class-transformer'

export class ChargerMetricsDto {
  @IsString()
  charger_id: string

  @IsString()
  connector_status: string

  @IsNumber()
  energy_delivered: number

  @IsNumber()
  power: number

  @IsOptional()
  @IsNumber()
  temperature?: number

  @IsArray()
  @IsString({ each: true })
  error_codes: string[]

  @IsNumber()
  uptime_hours: number

  @IsNumber()
  total_sessions: number

  @IsOptional()
  last_maintenance?: Date | string

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>
}

export class FailurePredictionRequestDto {
  @IsString()
  charger_id: string

  @ValidateNested()
  @Type(() => ChargerMetricsDto)
  metrics: ChargerMetricsDto
}

export class MaintenanceScheduleRequestDto {
  @IsString()
  charger_id: string

  @ValidateNested()
  @Type(() => ChargerMetricsDto)
  metrics: ChargerMetricsDto
}

export class BatchPredictionRequestDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChargerMetricsDto)
  chargers: ChargerMetricsDto[]
}

export class FailurePredictionResponseDto {
  @IsString()
  charger_id: string

  @IsNumber()
  @Min(0)
  @Max(1)
  failure_probability: number

  @IsOptional()
  predicted_failure_date?: Date | string

  @IsNumber()
  @Min(0)
  @Max(1)
  confidence: number

  @IsString()
  recommended_action: string

  @IsString()
  model_version: string

  timestamp: Date | string
}

export class MaintenanceScheduleResponseDto {
  @IsString()
  charger_id: string

  recommended_date: Date | string

  @IsEnum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])
  urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

  @IsNumber()
  @Min(0)
  estimated_downtime_hours: number

  @IsString()
  model_version: string

  timestamp: Date | string
}

