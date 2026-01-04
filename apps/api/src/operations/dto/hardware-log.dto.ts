/**
 * DTOs for Hardware Logging.
 */
import {
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
  IsObject,
  IsNumber,
  Min,
  Max,
} from 'class-validator'

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL',
}

export enum LogCategory {
  BOOT = 'BOOT',
  HEARTBEAT = 'HEARTBEAT',
  SESSION = 'SESSION',
  ERROR = 'ERROR',
  COMMAND = 'COMMAND',
  CONFIGURATION = 'CONFIGURATION',
  METER_VALUES = 'METER_VALUES',
  STATUS_NOTIFICATION = 'STATUS_NOTIFICATION',
  OTHER = 'OTHER',
}

export class CreateHardwareLogDto {
  @IsString()
  chargerId: string

  @IsEnum(LogLevel)
  level: LogLevel

  @IsEnum(LogCategory)
  category: LogCategory

  @IsString()
  message: string

  @IsOptional()
  @IsObject()
  data?: Record<string, any>

  @IsOptional()
  @IsString()
  errorCode?: string

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>
}

export class QueryHardwareLogsDto {
  @IsOptional()
  @IsString()
  chargerId?: string

  @IsOptional()
  @IsEnum(LogLevel)
  level?: LogLevel

  @IsOptional()
  @IsEnum(LogCategory)
  category?: LogCategory

  @IsOptional()
  @IsDateString()
  startDate?: string

  @IsOptional()
  @IsDateString()
  endDate?: string

  @IsOptional()
  @IsString()
  search?: string

  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number = 1

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 50
}


