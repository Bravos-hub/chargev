/**
 * DTOs for Charger Group operations.
 */
import {
  IsString,
  IsArray,
  IsOptional,
  IsObject,
  IsNumber,
  Min,
} from 'class-validator'

export class CreateChargerGroupDto {
  @IsString()
  name: string

  @IsString()
  orgId: string

  @IsArray()
  @IsString({ each: true })
  chargerIds: string[]

  @IsOptional()
  @IsString()
  description?: string

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>
}

export class UpdateChargerGroupDto {
  @IsOptional()
  @IsString()
  name?: string

  @IsOptional()
  @IsString()
  description?: string

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  chargerIds?: string[]

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>
}

export class CreateLocationGroupsDto {
  @IsString()
  orgId: string

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxDistanceKm?: number = 5
}


