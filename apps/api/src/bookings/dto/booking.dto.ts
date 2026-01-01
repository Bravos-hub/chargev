import { IsDateString, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator'
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
}

export class UpdateBookingStatusDto {
    @IsEnum(BookingStatus)
    status: BookingStatus
}
