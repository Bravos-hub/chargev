import { IsDateString, IsEnum, IsNotEmpty, IsOptional, IsString, IsNumber, IsObject } from 'class-validator'

export enum BookingStatus {
    PENDING = 'PENDING',
    CONFIRMED = 'CONFIRMED',
    CHECKED_IN = 'CHECKED_IN',
    IN_PROGRESS = 'IN_PROGRESS',
    COMPLETED = 'COMPLETED',
    CANCELLED = 'CANCELLED',
    EXPIRED = 'EXPIRED'
}

export class CreateBookingDto {
    @IsString()
    @IsNotEmpty()
    stationId!: string

    @IsString()
    @IsOptional()
    connectorId?: string

    @IsDateString()
    startTime!: string

    @IsDateString()
    endTime!: string

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
    @IsOptional()
    status?: BookingStatus
}

export class UpdateBookingDto {
    @IsDateString()
    @IsOptional()
    startTime?: string

    @IsDateString()
    @IsOptional()
    endTime?: string

    @IsNumber()
    @IsOptional()
    energyTarget?: number
}

export class ExtendBookingDto {
    @IsNumber()
    @IsNotEmpty()
    minutes!: number
}
