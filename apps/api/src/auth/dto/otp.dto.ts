import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator'

export enum OtpType {
    PHONE = 'phone',
    EMAIL = 'email',
}

export class SendOtpDto {
    @IsString()
    @IsNotEmpty()
    identifier: string // phone (e.g. +254...) or email

    @IsEnum(OtpType)
    type: OtpType
}

export class VerifyOtpDto {
    @IsString()
    @IsNotEmpty()
    identifier: string

    @IsEnum(OtpType)
    type: OtpType

    @IsString()
    @IsNotEmpty()
    code: string
}
