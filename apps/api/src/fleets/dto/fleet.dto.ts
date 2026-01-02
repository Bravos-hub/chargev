import { IsNotEmpty, IsOptional, IsString } from 'class-validator'

export class CreateFleetDto {
    @IsString()
    @IsNotEmpty()
    name: string

    @IsString()
    @IsOptional()
    description?: string
}

export class UpdateFleetDto {
    @IsString()
    @IsOptional()
    name?: string

    @IsString()
    @IsOptional()
    description?: string
}

export class AddVehicleToFleetDto {
    @IsString()
    @IsNotEmpty()
    vehicleId: string
}
