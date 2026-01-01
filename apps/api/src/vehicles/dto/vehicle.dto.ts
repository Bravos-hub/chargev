import { IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator'

export class CreateVehicleDto {
    @IsString()
    @IsNotEmpty()
    vin!: string

    @IsString()
    @IsNotEmpty()
    make!: string

    @IsString()
    @IsNotEmpty()
    model!: string

    @IsInt()
    @Min(1900)
    year!: number

    @IsNumber()
    @Min(0)
    batteryCapacity!: number

    @IsString()
    @IsOptional()
    plate?: string

    @IsString()
    @IsOptional()
    color?: string

    @IsNumber()
    @IsOptional()
    odometer?: number

    @IsString()
    @IsOptional()
    userId?: string

    @IsString()
    @IsOptional()
    orgId?: string

    @IsString()
    @IsOptional()
    fleetId?: string
}

export class UpdateVehicleDto {
    @IsString()
    @IsOptional()
    make?: string

    @IsString()
    @IsOptional()
    model?: string

    @IsInt()
    @Min(1900)
    @IsOptional()
    year?: number

    @IsNumber()
    @Min(0)
    @IsOptional()
    batteryCapacity?: number

    @IsString()
    @IsOptional()
    fleetId?: string
}
