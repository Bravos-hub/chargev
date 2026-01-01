import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator'

export class LoginDto {
    @IsString()
    @IsOptional()
    @IsEmail()
    email?: string

    @IsString()
    @IsOptional()
    phone?: string

    @IsString()
    @IsNotEmpty()
    password: string
}
