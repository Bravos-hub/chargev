import { IsString, IsOptional, IsEnum, IsObject, IsArray } from 'class-validator'
import { OCPIRole, OCPIStatus } from '@prisma/client'

export class CreateOCPIPartnerDto {
    @IsString()
    name: string

    @IsString()
    partyId: string

    @IsString()
    countryCode: string

    @IsEnum(OCPIRole)
    role: OCPIRole

    @IsString()
    @IsOptional()
    versionUrl?: string

    @IsString()
    @IsOptional()
    tokenA?: string

    @IsString()
    @IsOptional()
    tokenB?: string

    @IsString()
    @IsOptional()
    tokenC?: string

    @IsObject()
    @IsOptional()
    credentials?: Record<string, any>
}

export class UpdateOCPIPartnerDto {
    @IsString()
    @IsOptional()
    name?: string

    @IsEnum(OCPIStatus)
    @IsOptional()
    status?: OCPIStatus

    @IsString()
    @IsOptional()
    versionUrl?: string

    @IsString()
    @IsOptional()
    tokenA?: string

    @IsString()
    @IsOptional()
    tokenB?: string

    @IsString()
    @IsOptional()
    tokenC?: string

    @IsObject()
    @IsOptional()
    credentials?: Record<string, any>

    @IsArray()
    @IsOptional()
    modules?: string[]
}

export class OCPICDRDto {
    @IsString()
    partnerId: string

    @IsString()
    cdrId: string

    @IsString()
    sessionId: string

    @IsObject()
    cdrData: Record<string, any>
}

export class OCPILocationDto {
    @IsString()
    id: string

    @IsString()
    name: string

    @IsString()
    address: string

    @IsString()
    city: string

    @IsString()
    country: string

    @IsObject()
    coordinates: { latitude: number; longitude: number }

    @IsArray()
    evses: any[]
}

