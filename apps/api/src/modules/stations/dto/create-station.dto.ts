import { Type } from 'class-transformer'
import { IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator'

export class CreateStationDto {
  @IsString()
  @IsNotEmpty()
  code!: string

  @IsString()
  @IsNotEmpty()
  name!: string

  @IsString()
  @IsNotEmpty()
  region!: string

  @IsString()
  @IsNotEmpty()
  country!: string

  @IsString()
  @IsNotEmpty()
  orgId!: string

  @IsString()
  @IsNotEmpty()
  type!: string

  @IsString()
  @IsNotEmpty()
  status!: string

  @IsString()
  @IsNotEmpty()
  address!: string

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  lat?: number

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  lng?: number

  @IsOptional()
  @IsString()
  make?: string

  @IsOptional()
  @IsString()
  model?: string

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  maxKw?: number
}
