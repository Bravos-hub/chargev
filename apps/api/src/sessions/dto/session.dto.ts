import { IsOptional, IsEnum, IsBoolean, IsNumber, Min, Max } from 'class-validator'
import { Transform } from 'class-transformer'
import { SessionStatus } from '@prisma/client'

export class ActiveOnlyQueryDto {
    @IsOptional()
    @Transform(({ value }) => value === 'true' || value === true)
    @IsBoolean()
    active?: boolean
}

export class SessionHistoryQueryDto {
    @IsOptional()
    @Transform(({ value }) => parseInt(value))
    @IsNumber()
    @Min(1)
    page?: number = 1

    @IsOptional()
    @Transform(({ value }) => parseInt(value))
    @IsNumber()
    @Min(1)
    @Max(100)
    limit?: number = 20

    @IsOptional()
    @IsEnum(SessionStatus)
    status?: SessionStatus
}

export interface EnrichedSession {
    id: string
    stationId: string
    userId?: string
    connectorId: number
    status: 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'FAILED'
    startedAt: Date
    endedAt?: Date
    energyDelivered: number
    cost: number
    metadata?: Record<string, any>
    station?: {
        id: string
        code: string
        name: string
        address: string
    } | null
}

export interface SessionStatsResponse {
    activeCount: number
    totalEnergy: number
    totalCost: number
}

export interface SessionHistoryResponse {
    sessions: any[]
    pagination: {
        page: number
        limit: number
        total: number
        totalPages: number
    }
}

export interface StationSessionsResponse {
    active: EnrichedSession[]
    recent: any[]
}

export interface UserSessionsResponse {
    active: EnrichedSession[]
    recent: any[]
}

