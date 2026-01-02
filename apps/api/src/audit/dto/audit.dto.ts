import { IsString, IsOptional, IsObject, IsDateString } from 'class-validator'

export class CreateAuditLogDto {
    @IsString()
    tenantId: string

    @IsString()
    @IsOptional()
    userId?: string

    @IsString()
    entityType: string

    @IsString()
    entityId: string

    @IsString()
    action: string

    @IsObject()
    @IsOptional()
    changes?: Record<string, { old: any; new: any }>

    @IsString()
    @IsOptional()
    ipAddress?: string

    @IsString()
    @IsOptional()
    userAgent?: string

    @IsObject()
    @IsOptional()
    metadata?: Record<string, any>
}

export class QueryAuditLogDto {
    @IsString()
    @IsOptional()
    tenantId?: string

    @IsString()
    @IsOptional()
    userId?: string

    @IsString()
    @IsOptional()
    entityType?: string

    @IsString()
    @IsOptional()
    entityId?: string

    @IsString()
    @IsOptional()
    action?: string

    @IsDateString()
    @IsOptional()
    startDate?: string

    @IsDateString()
    @IsOptional()
    endDate?: string

    @IsOptional()
    limit?: number

    @IsOptional()
    offset?: number
}

