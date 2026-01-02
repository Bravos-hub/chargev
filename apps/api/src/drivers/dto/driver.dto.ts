import { IsString, IsOptional, IsNumber, IsEnum, IsDateString, IsObject, IsArray } from 'class-validator'
import { DriverStatus, ShiftStatus, PayoutStatus } from '@prisma/client'

export class CreateDriverDto {
    @IsString()
    userId: string

    @IsString()
    licenseNumber: string

    @IsString()
    @IsOptional()
    licenseExpiry?: string

    @IsString()
    @IsOptional()
    licenseClass?: string

    @IsString()
    @IsOptional()
    bankAccount?: string

    @IsString()
    @IsOptional()
    bankName?: string

    @IsArray()
    @IsOptional()
    documents?: string[]
}

export class UpdateDriverDto {
    @IsString()
    @IsOptional()
    licenseNumber?: string

    @IsString()
    @IsOptional()
    licenseExpiry?: string

    @IsString()
    @IsOptional()
    licenseClass?: string

    @IsEnum(DriverStatus)
    @IsOptional()
    status?: DriverStatus

    @IsString()
    @IsOptional()
    bankAccount?: string

    @IsString()
    @IsOptional()
    bankName?: string

    @IsArray()
    @IsOptional()
    documents?: string[]
}

export class CreateShiftDto {
    @IsString()
    driverId: string

    @IsString()
    @IsOptional()
    vehicleId?: string

    @IsDateString()
    scheduledStart: string

    @IsDateString()
    scheduledEnd: string

    @IsObject()
    @IsOptional()
    metadata?: Record<string, any>
}

export class UpdateShiftDto {
    @IsString()
    @IsOptional()
    vehicleId?: string

    @IsDateString()
    @IsOptional()
    scheduledStart?: string

    @IsDateString()
    @IsOptional()
    scheduledEnd?: string

    @IsEnum(ShiftStatus)
    @IsOptional()
    status?: ShiftStatus

    @IsObject()
    @IsOptional()
    metadata?: Record<string, any>
}

export class CheckInDto {
    @IsString()
    @IsOptional()
    vehicleId?: string

    @IsObject()
    @IsOptional()
    location?: { lat: number; lng: number }
}

export class CheckOutDto {
    @IsObject()
    @IsOptional()
    location?: { lat: number; lng: number }

    @IsString()
    @IsOptional()
    notes?: string
}

export class CreatePayoutDto {
    @IsString()
    driverId: string

    @IsNumber()
    amount: number

    @IsString()
    @IsOptional()
    periodStart?: string

    @IsString()
    @IsOptional()
    periodEnd?: string

    @IsString()
    @IsOptional()
    description?: string
}

export class CreateDriverRatingDto {
    @IsString()
    driverId: string

    @IsNumber()
    score: number

    @IsString()
    @IsOptional()
    comment?: string

    @IsString()
    @IsOptional()
    tripId?: string
}

