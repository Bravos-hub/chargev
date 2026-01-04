/**
 * DTOs for Group Wallet operations.
 */
import {
  IsString,
  IsNumber,
  IsOptional,
  IsEnum,
  IsObject,
  Min,
} from 'class-validator'

export enum GroupWalletType {
  FAMILY = 'FAMILY',
  FLEET = 'FLEET',
  ORGANIZATION = 'ORGANIZATION',
}

export enum GroupWalletMemberRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER',
}

export class CreateGroupWalletDto {
  @IsString()
  name: string

  @IsEnum(GroupWalletType)
  type: GroupWalletType

  @IsOptional()
  @IsString()
  orgId?: string

  @IsOptional()
  @IsNumber()
  @Min(0)
  spendingLimit?: number

  @IsOptional()
  @IsEnum(['DAILY', 'WEEKLY', 'MONTHLY'])
  spendingPeriod?: 'DAILY' | 'WEEKLY' | 'MONTHLY'

  @IsOptional()
  @IsString()
  currency?: string
}

export class AddMemberDto {
  @IsString()
  userId: string

  @IsOptional()
  @IsEnum(GroupWalletMemberRole)
  role?: GroupWalletMemberRole

  @IsOptional()
  @IsNumber()
  @Min(0)
  spendingLimit?: number

  @IsOptional()
  @IsObject()
  permissions?: Record<string, any>
}

export class UpdateMemberDto {
  @IsOptional()
  @IsEnum(GroupWalletMemberRole)
  role?: GroupWalletMemberRole

  @IsOptional()
  @IsNumber()
  @Min(0)
  spendingLimit?: number

  @IsOptional()
  @IsObject()
  permissions?: Record<string, any>
}

export class CreditGroupWalletDto {
  @IsNumber()
  @Min(0)
  amount: number

  @IsString()
  description: string

  @IsOptional()
  @IsString()
  reference?: string
}

export class DebitGroupWalletDto {
  @IsNumber()
  @Min(0)
  amount: number

  @IsString()
  description: string

  @IsOptional()
  @IsString()
  reference?: string
}


