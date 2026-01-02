import { IsString, IsOptional, IsNumber, IsArray, IsBoolean, IsDateString, IsObject } from 'class-validator'

export class CreateTourDto {
    @IsString()
    name: string

    @IsString()
    @IsOptional()
    description?: string

    @IsNumber()
    duration: number // hours

    @IsNumber()
    price: number

    @IsString()
    @IsOptional()
    currency?: string

    @IsNumber()
    @IsOptional()
    maxParticipants?: number

    @IsArray()
    @IsOptional()
    inclusions?: string[]

    @IsArray()
    @IsOptional()
    exclusions?: string[]

    @IsArray()
    @IsOptional()
    itinerary?: { time: string; activity: string; location?: string }[]

    @IsArray()
    @IsOptional()
    photos?: string[]

    @IsBoolean()
    @IsOptional()
    active?: boolean
}

export class UpdateTourDto extends CreateTourDto {}

export class CreateTourBookingDto {
    @IsString()
    tourId: string

    @IsDateString()
    date: string

    @IsNumber()
    participants: number

    @IsString()
    @IsOptional()
    pickupLocation?: string

    @IsObject()
    @IsOptional()
    contactInfo?: { name: string; phone: string; email?: string }

    @IsString()
    @IsOptional()
    specialRequests?: string
}

export class UpdateTourBookingDto {
    @IsDateString()
    @IsOptional()
    date?: string

    @IsNumber()
    @IsOptional()
    participants?: number

    @IsString()
    @IsOptional()
    status?: string

    @IsString()
    @IsOptional()
    pickupLocation?: string

    @IsString()
    @IsOptional()
    specialRequests?: string
}

