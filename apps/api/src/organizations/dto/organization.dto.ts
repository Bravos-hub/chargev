import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator'
import { OrgType } from '@prisma/client'

export class CreateOrganizationDto {
    @IsString()
    @IsNotEmpty()
    name: string

    @IsString()
    @IsOptional()
    description?: string

    @IsEnum(OrgType)
    @IsOptional()
    type?: OrgType
}

export class AddMemberDto {
    @IsString()
    @IsNotEmpty()
    userId: string

    @IsString()
    @IsNotEmpty()
    role: string
}
