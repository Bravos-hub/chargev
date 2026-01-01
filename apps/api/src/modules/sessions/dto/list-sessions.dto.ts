import { Type } from 'class-transformer'
import { IsInt, IsOptional, IsString, Min } from 'class-validator'

export class ListSessionsDto {
  @IsOptional()
  @IsString()
  q?: string

  @IsOptional()
  @IsString()
  stationId?: string

  @IsOptional()
  @IsString()
  userId?: string

  @IsOptional()
  @IsString()
  status?: string

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
