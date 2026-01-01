import { Type } from 'class-transformer'
import { IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator'

export class UpdateStationDto {
  @IsOptional()
  @IsString()
  name?: string

  @IsOptional()
  @IsString()
  status?: string

  @IsOptional()
  @IsString()
  address?: string

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  lat?: number

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  lng?: number

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  maxKw?: number
}
