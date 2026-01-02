import { IsString, IsOptional, IsNumber, IsArray, IsEnum, IsLatitude, IsLongitude, Min, Max } from 'class-validator'
import { StationType, StationStatus } from '@prisma/client'

export class CreateStationDto {
    @IsString()
    code: string

    @IsString()
    name: string

    @IsString()
    region: string

    @IsString()
    country: string

    @IsString()
    address: string

    @IsOptional()
    @IsNumber()
    @IsLatitude()
    lat?: number

    @IsOptional()
    @IsNumber()
    @IsLongitude()
    lng?: number

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    images?: string[]

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    amenities?: string[]

    @IsEnum(StationType)
    type: StationType

    @IsOptional()
    @IsEnum(StationStatus)
    status?: StationStatus

    @IsOptional()
    @IsString()
    make?: string

    @IsOptional()
    @IsString()
    model?: string

    @IsOptional()
    @IsNumber()
    @Min(0)
    maxKw?: number

    @IsOptional()
    @IsNumber()
    @Min(0)
    connectors?: number

    @IsOptional()
    @IsNumber()
    @Min(0)
    swapBays?: number
}

export class UpdateStationDto {
    @IsOptional()
    @IsString()
    name?: string

    @IsOptional()
    @IsString()
    region?: string

    @IsOptional()
    @IsString()
    country?: string

    @IsOptional()
    @IsString()
    address?: string

    @IsOptional()
    @IsNumber()
    @IsLatitude()
    lat?: number

    @IsOptional()
    @IsNumber()
    @IsLongitude()
    lng?: number

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    images?: string[]

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    amenities?: string[]

    @IsOptional()
    @IsEnum(StationType)
    type?: StationType

    @IsOptional()
    @IsEnum(StationStatus)
    status?: StationStatus

    @IsOptional()
    @IsString()
    make?: string

    @IsOptional()
    @IsString()
    model?: string

    @IsOptional()
    @IsNumber()
    @Min(0)
    maxKw?: number

    @IsOptional()
    @IsNumber()
    @Min(0)
    connectors?: number

    @IsOptional()
    @IsNumber()
    @Min(0)
    swapBays?: number
}

export class StationQueryDto {
    @IsOptional()
    @IsString()
    orgId?: string

    @IsOptional()
    @IsEnum(StationType)
    type?: StationType

    @IsOptional()
    @IsEnum(StationStatus)
    status?: StationStatus

    @IsOptional()
    @IsString()
    region?: string

    @IsOptional()
    @IsString()
    country?: string

    @IsOptional()
    @IsNumber()
    lat?: number

    @IsOptional()
    @IsNumber()
    lng?: number

    @IsOptional()
    @IsNumber()
    @Min(1)
    @Max(100)
    radiusKm?: number

    @IsOptional()
    @IsNumber()
    @Min(1)
    limit?: number

    @IsOptional()
    @IsNumber()
    @Min(0)
    offset?: number

    @IsOptional()
    @IsString()
    search?: string
}

