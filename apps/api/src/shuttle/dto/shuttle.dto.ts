import { IsString, IsOptional, IsNumber, IsArray, IsObject, IsBoolean } from 'class-validator'

export class CreateRouteDto {
    @IsString()
    name: string

    @IsString()
    @IsOptional()
    description?: string

    @IsString()
    @IsOptional()
    schedule?: string // Cron expression or description

    @IsBoolean()
    @IsOptional()
    active?: boolean
}

export class UpdateRouteDto {
    @IsString()
    @IsOptional()
    name?: string

    @IsString()
    @IsOptional()
    description?: string

    @IsString()
    @IsOptional()
    schedule?: string

    @IsBoolean()
    @IsOptional()
    active?: boolean
}

export class CreateRouteStopDto {
    @IsString()
    routeId: string

    @IsString()
    name: string

    @IsString()
    @IsOptional()
    address?: string

    @IsNumber()
    latitude: number

    @IsNumber()
    longitude: number

    @IsNumber()
    sequence: number

    @IsString()
    @IsOptional()
    estimatedTime?: string // e.g., "07:30"
}

export class CreateStudentDto {
    @IsString()
    name: string

    @IsString()
    @IsOptional()
    grade?: string

    @IsString()
    @IsOptional()
    parentName?: string

    @IsString()
    @IsOptional()
    parentPhone?: string

    @IsString()
    @IsOptional()
    parentEmail?: string

    @IsString()
    routeId: string

    @IsString()
    pickupStopId: string

    @IsString()
    @IsOptional()
    dropoffStopId?: string

    @IsString()
    @IsOptional()
    photo?: string

    @IsObject()
    @IsOptional()
    emergencyContact?: { name: string; phone: string; relationship: string }
}

export class UpdateStudentDto {
    @IsString()
    @IsOptional()
    name?: string

    @IsString()
    @IsOptional()
    grade?: string

    @IsString()
    @IsOptional()
    parentPhone?: string

    @IsString()
    @IsOptional()
    routeId?: string

    @IsString()
    @IsOptional()
    pickupStopId?: string

    @IsString()
    @IsOptional()
    dropoffStopId?: string

    @IsBoolean()
    @IsOptional()
    active?: boolean
}

export class CreateTripDto {
    @IsString()
    routeId: string

    @IsString()
    driverId: string

    @IsString()
    vehicleId: string

    @IsString()
    type: string // 'PICKUP' | 'DROPOFF'
}

export class RecordAttendanceDto {
    @IsString()
    studentId: string

    @IsString()
    status: string // 'BOARDED' | 'DROPPED' | 'ABSENT'

    @IsString()
    @IsOptional()
    stopId?: string

    @IsString()
    @IsOptional()
    notes?: string
}

