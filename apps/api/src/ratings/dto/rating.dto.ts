import { IsString, IsOptional, IsNumber, IsArray, Min, Max } from 'class-validator'

export class CreateRatingDto {
    @IsString()
    entityType: string // 'Station', 'Driver', 'Vehicle', etc.

    @IsString()
    entityId: string

    @IsNumber()
    @Min(1)
    @Max(5)
    score: number

    @IsString()
    @IsOptional()
    review?: string

    @IsArray()
    @IsOptional()
    tags?: string[]

    @IsArray()
    @IsOptional()
    photos?: string[]

    @IsString()
    @IsOptional()
    sessionId?: string // For verified reviews
}

export class UpdateRatingDto {
    @IsNumber()
    @Min(1)
    @Max(5)
    @IsOptional()
    score?: number

    @IsString()
    @IsOptional()
    review?: string

    @IsArray()
    @IsOptional()
    tags?: string[]

    @IsArray()
    @IsOptional()
    photos?: string[]
}

export class QueryRatingsDto {
    @IsString()
    @IsOptional()
    entityType?: string

    @IsString()
    @IsOptional()
    entityId?: string

    @IsNumber()
    @IsOptional()
    minScore?: number

    @IsOptional()
    verified?: boolean

    @IsOptional()
    limit?: number

    @IsOptional()
    offset?: number
}

