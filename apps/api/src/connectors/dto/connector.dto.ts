import { IsString, IsOptional, IsNumber, IsEnum, IsBoolean } from 'class-validator'
import { ConnectorType, PowerType, ConnectorStatus } from '@prisma/client'

export class CreateConnectorDto {
    @IsString()
    chargePointId: string

    @IsNumber()
    ocppConnectorId: number

    @IsEnum(ConnectorType)
    type: ConnectorType

    @IsEnum(PowerType)
    powerType: PowerType

    @IsNumber()
    @IsOptional()
    maxPower?: number

    @IsNumber()
    @IsOptional()
    maxVoltage?: number

    @IsNumber()
    @IsOptional()
    maxAmperage?: number

    @IsString()
    @IsOptional()
    format?: string // CABLE, SOCKET
}

export class UpdateConnectorDto {
    @IsEnum(ConnectorType)
    @IsOptional()
    type?: ConnectorType

    @IsEnum(PowerType)
    @IsOptional()
    powerType?: PowerType

    @IsEnum(ConnectorStatus)
    @IsOptional()
    status?: ConnectorStatus

    @IsNumber()
    @IsOptional()
    maxPower?: number

    @IsNumber()
    @IsOptional()
    maxVoltage?: number

    @IsNumber()
    @IsOptional()
    maxAmperage?: number

    @IsString()
    @IsOptional()
    format?: string

    @IsBoolean()
    @IsOptional()
    available?: boolean
}

export class ConnectorStatusDto {
    @IsEnum(ConnectorStatus)
    status: ConnectorStatus

    @IsString()
    @IsOptional()
    errorCode?: string

    @IsString()
    @IsOptional()
    info?: string
}

