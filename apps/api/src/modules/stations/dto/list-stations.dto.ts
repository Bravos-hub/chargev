import { Type } from 'class-transformer'
import { IsInt, IsOptional, IsString, Min } from 'class-validator'

export class ListStationsDto {
  @IsOptional()
  @IsString()
  q?: string

  @IsOptional()
  @IsString()
  region?: string

  @IsOptional()
  @IsString()
  type?: string

  @IsOptional()
  @IsString()
  status?: string

  @IsOptional()
  @IsString()
  orgId?: string

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  pageSize?: number
}
