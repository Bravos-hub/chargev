import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, IsPhoneNumber, MinLength } from 'class-validator'
import { UserRole } from '@prisma/client'

export class RegisterDto {
    @IsString()
    @IsNotEmpty()
    name: string

    @IsEmail()
    @IsOptional()
    email?: string

    @IsString()
    @IsOptional()
    @IsPhoneNumber()
    phone?: string

    @IsString()
    @MinLength(6)
    password: string

    @IsEnum(UserRole)
    role: UserRole

    @IsString()
    @IsOptional()
    tenantId?: string

    @IsString()
    @IsOptional()
    orgId?: string

    @IsString()
    @IsOptional()
    fleetId?: string
}
