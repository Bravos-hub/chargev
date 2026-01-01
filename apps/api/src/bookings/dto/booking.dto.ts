import { IsDateString, IsEnum, IsNotEmpty, IsOptional, IsString, IsNumber, IsObject } from 'class-validator'
import { BookingStatus } from '@prisma/client'

export class CreateBookingDto {
    @IsString()
    @IsNotEmpty()
    stationId: string

    @IsString()
    @IsOptional()
    connectorId?: string

    @IsDateString()
    startTime: string

    @IsDateString()
    endTime: string

    @IsString()
    @IsOptional()
    mode?: string = 'fixed'

    @IsNumber()
    @IsOptional()
    energyTarget?: number

    @IsObject()
    @IsOptional()
    location?: any
}

export class UpdateBookingStatusDto {
    @IsEnum(BookingStatus)
    status: BookingStatus
}
