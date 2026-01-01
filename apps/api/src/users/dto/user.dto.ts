import { IsEmail, IsEnum, IsOptional, IsString, IsPhoneNumber, IsBoolean, IsObject } from 'class-validator'
import { UserRole } from '@prisma/client'

export class CreateUserDto {
    @IsString()
    name: string

    @IsEmail()
    @IsOptional()
    email?: string

    @IsString()
    @IsOptional()
    @IsPhoneNumber()
    phone?: string

    @IsEnum(UserRole)
    role: UserRole

    @IsString()
    @IsOptional()
    orgId?: string

    @IsString()
    @IsOptional()
    fleetId?: string
}

export class UpdateUserDto {
    @IsString()
    @IsOptional()
    name?: string

    @IsEmail()
    @IsOptional()
    email?: string

    @IsString()
    @IsOptional()
    phone?: string

    @IsString()
    @IsOptional()
    avatarUrl?: string

    @IsBoolean()
    @IsOptional()
    twoFactorEnabled?: boolean

    @IsString()
    @IsOptional()
    fcmToken?: string // For push notifications

    @IsObject()
    @IsOptional()
    preferences?: any

    @IsString()
    @IsOptional()
    licenseNumber?: string
}
