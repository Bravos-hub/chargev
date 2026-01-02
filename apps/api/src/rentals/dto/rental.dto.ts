import { IsString, IsOptional, IsNumber, IsBoolean, IsDateString, IsObject } from 'class-validator'

export class CreateRentalVehicleDto {
    @IsString()
    vehicleId: string

    @IsNumber()
    dailyRate: number

    @IsNumber()
    @IsOptional()
    hourlyRate?: number

    @IsNumber()
    @IsOptional()
    weeklyRate?: number

    @IsNumber()
    @IsOptional()
    deposit?: number

    @IsNumber()
    @IsOptional()
    minAge?: number

    @IsBoolean()
    @IsOptional()
    requiresLicense?: boolean

    @IsString()
    @IsOptional()
    currency?: string

    @IsBoolean()
    @IsOptional()
    available?: boolean
}

export class UpdateRentalVehicleDto extends CreateRentalVehicleDto {}

export class CreateRentalBookingDto {
    @IsString()
    rentalVehicleId: string

    @IsDateString()
    startDate: string

    @IsDateString()
    endDate: string

    @IsString()
    @IsOptional()
    pickupLocation?: string

    @IsString()
    @IsOptional()
    returnLocation?: string

    @IsObject()
    @IsOptional()
    driverDetails?: {
        name: string
        licenseNumber: string
        licenseExpiry: string
        phone: string
    }

    @IsString()
    @IsOptional()
    notes?: string
}

export class UpdateRentalBookingDto {
    @IsDateString()
    @IsOptional()
    startDate?: string

    @IsDateString()
    @IsOptional()
    endDate?: string

    @IsString()
    @IsOptional()
    status?: string

    @IsString()
    @IsOptional()
    pickupLocation?: string

    @IsString()
    @IsOptional()
    returnLocation?: string

    @IsString()
    @IsOptional()
    notes?: string
}

export class CheckOutDto {
    @IsNumber()
    @IsOptional()
    odometerReading?: number

    @IsNumber()
    @IsOptional()
    fuelLevel?: number

    @IsString()
    @IsOptional()
    condition?: string

    @IsString()
    @IsOptional()
    notes?: string
}

export class CheckInDto {
    @IsNumber()
    @IsOptional()
    odometerReading?: number

    @IsNumber()
    @IsOptional()
    fuelLevel?: number

    @IsString()
    @IsOptional()
    condition?: string

    @IsNumber()
    @IsOptional()
    additionalCharges?: number

    @IsString()
    @IsOptional()
    notes?: string
}

