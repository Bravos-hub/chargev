import { IsString, IsOptional, IsObject, IsBoolean, IsArray } from 'class-validator'

export class CreateVendorConfigDto {
  @IsString()
  vendor: string

  @IsString()
  @IsOptional()
  model?: string

  @IsString()
  name: string

  @IsString()
  @IsOptional()
  description?: string

  @IsObject()
  config: Record<string, any>

  @IsString()
  @IsOptional()
  ocppVersion?: string

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>
}

export class UpdateVendorConfigDto {
  @IsString()
  @IsOptional()
  name?: string

  @IsString()
  @IsOptional()
  description?: string

  @IsObject()
  @IsOptional()
  config?: Record<string, any>

  @IsString()
  @IsOptional()
  ocppVersion?: string

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean

  @IsBoolean()
  @IsOptional()
  isActive?: boolean

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>
}

export class ApplyConfigDto {
  @IsArray()
  @IsString({ each: true })
  chargePointIds: string[]

  @IsBoolean()
  @IsOptional()
  mergeWithExisting?: boolean
}

