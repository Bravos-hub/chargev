import { IsDateString, IsDecimal, IsNotEmpty, IsNumber, IsString } from 'class-validator'

export class CreateMaintenanceRecordDto {
    @IsString()
    @IsNotEmpty()
    type: string // 'scheduled' | 'repair' | 'inspection'

    @IsString()
    @IsNotEmpty()
    description: string

    @IsNumber()
    cost: number

    @IsString()
    @IsNotEmpty()
    status: string // 'pending' | 'completed' | 'cancelled'

    @IsDateString()
    scheduledAt: string
}
