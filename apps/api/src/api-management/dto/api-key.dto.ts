import { IsString, IsOptional, IsArray, IsNumber, IsBoolean } from 'class-validator'

export class CreateApiKeyDto {
    @IsString()
    name: string

    @IsString()
    @IsOptional()
    description?: string

    @IsArray()
    @IsOptional()
    permissions?: string[]

    @IsNumber()
    @IsOptional()
    rateLimit?: number

    @IsString()
    @IsOptional()
    expiresAt?: string
}

export class UpdateApiKeyDto {
    @IsString()
    @IsOptional()
    name?: string

    @IsString()
    @IsOptional()
    description?: string

    @IsArray()
    @IsOptional()
    permissions?: string[]

    @IsNumber()
    @IsOptional()
    rateLimit?: number

    @IsBoolean()
    @IsOptional()
    active?: boolean
}

