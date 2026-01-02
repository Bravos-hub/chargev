import { IsString, IsOptional, IsNumber, IsEnum, Min, Max } from 'class-validator'
import { StationStatus, ConnectorType, PowerType } from '@prisma/client'

export class CreateChargePointDto {
    @IsOptional()
    @IsString()
    vendor?: string

    @IsOptional()
    @IsString()
    model?: string

    @IsOptional()
    @IsString()
    serialNumber?: string

    @IsOptional()
    @IsString()
    firmwareVersion?: string

    @IsOptional()
    @IsEnum(StationStatus)
    status?: StationStatus

    @IsOptional()
    @IsNumber()
    @Min(0)
    maxKw?: number

    @IsOptional()
    @IsNumber()
    @Min(1)
    @Max(10)
    connectorCount?: number
}

export class UpdateChargePointDto {
    @IsOptional()
    @IsString()
    vendor?: string

    @IsOptional()
    @IsString()
    model?: string

    @IsOptional()
    @IsString()
    serialNumber?: string

    @IsOptional()
    @IsString()
    firmwareVersion?: string

    @IsOptional()
    @IsEnum(StationStatus)
    status?: StationStatus

    @IsOptional()
    @IsNumber()
    @Min(0)
    maxKw?: number

    @IsOptional()
    @IsNumber()
    @Min(1)
    @Max(10)
    connectorCount?: number
}

export class CreateConnectorDto {
    @IsNumber()
    @Min(1)
    connectorId: number

    @IsEnum(ConnectorType)
    type: ConnectorType

    @IsEnum(PowerType)
    powerType: PowerType

    @IsNumber()
    @Min(0)
    maxPowerKw: number

    @IsOptional()
    @IsNumber()
    voltage?: number

    @IsOptional()
    @IsNumber()
    amperage?: number
}

export class ChargePointQueryDto {
    @IsOptional()
    @IsString()
    stationId?: string

    @IsOptional()
    @IsEnum(StationStatus)
    status?: StationStatus

    @IsOptional()
    @IsString()
    vendor?: string

    @IsOptional()
    @IsNumber()
    @Min(1)
    limit?: number

    @IsOptional()
    @IsNumber()
    @Min(0)
    offset?: number
}

