import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator'
import type { Role } from '../../../common/auth/types'

export class CreateUserDto {
  @IsEmail()
  email!: string

  @IsString()
  @IsNotEmpty()
  password!: string

  @IsString()
  @IsNotEmpty()
  name!: string

  @IsOptional()
  role?: Role

  @IsString()
  @IsNotEmpty()
  tenantId!: string

  @IsOptional()
  @IsString()
  orgId?: string
}
