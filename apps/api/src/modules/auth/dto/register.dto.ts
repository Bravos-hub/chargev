import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator'
import type { Role } from '../../../common/auth/types'

export class RegisterDto {
  @IsEmail()
  email!: string

  @IsString()
  @IsNotEmpty()
  password!: string

  @IsString()
  @IsNotEmpty()
  name!: string

  @IsOptional()
  @IsString()
  tenantName?: string

  @IsOptional()
  @IsString()
  orgName?: string

  @IsOptional()
  role?: Role
}
