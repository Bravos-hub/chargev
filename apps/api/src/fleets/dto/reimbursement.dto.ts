/**
 * DTOs for Home Charging Reimbursement.
 */
import {
  IsString,
  IsNumber,
  IsOptional,
  IsEnum,
  IsDateString,
  IsArray,
  Min,
} from 'class-validator'

export enum ReimbursementStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  PAID = 'PAID',
}

export class CreateReimbursementDto {
  @IsString()
  fleetId: string

  @IsString()
  driverId: string

  @IsDateString()
  periodStart: string

  @IsDateString()
  periodEnd: string

  @IsNumber()
  @Min(0)
  energyKwh: number

  @IsNumber()
  @Min(0)
  ratePerKwh: number

  @IsOptional()
  @IsString()
  description?: string

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  receipts?: string[]
}

export class UpdateReimbursementDto {
  @IsOptional()
  @IsEnum(ReimbursementStatus)
  status?: ReimbursementStatus

  @IsOptional()
  @IsNumber()
  @Min(0)
  approvedAmount?: number

  @IsOptional()
  @IsString()
  rejectionReason?: string

  @IsOptional()
  @IsString()
  notes?: string
}

export class MarkPaidDto {
  @IsOptional()
  @IsString()
  paymentReference?: string
}


