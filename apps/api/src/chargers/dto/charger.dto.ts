import { IsString, IsOptional, IsEnum, IsObject } from 'class-validator'

export enum OCPPAction {
    RemoteStartTransaction = 'RemoteStartTransaction',
    RemoteStopTransaction = 'RemoteStopTransaction',
    Reset = 'Reset',
    UnlockConnector = 'UnlockConnector',
    ChangeConfiguration = 'ChangeConfiguration',
    GetConfiguration = 'GetConfiguration',
}

export enum ChargerStatusFilter {
    ONLINE = 'ONLINE',
    OFFLINE = 'OFFLINE',
}

export class ChargerQueryDto {
    @IsOptional()
    @IsEnum(ChargerStatusFilter)
    status?: ChargerStatusFilter
}

export class SendCommandDto {
    @IsEnum(OCPPAction)
    action: OCPPAction

    @IsOptional()
    @IsObject()
    params?: Record<string, any>
}

export interface EnrichedCharger {
    id: string
    code: string
    name: string
    address: string
    lat: number | null
    lng: number | null
    status: string
    isOnline: boolean
    lastSeen: string
    createdAt: Date
    updatedAt: Date
}

export interface ConnectorStatus {
    id: number
    status: string
    errorCode: string
    lastUpdate?: string
}

export interface ChargerDetails {
    id: string
    code: string
    name: string
    address: string
    lat: number | null
    lng: number | null
    status: string
    isOnline: boolean
    lastSeen: string
    bootInfo: any | null
    lastBoot: string | null
    connectors: ConnectorStatus[]
    createdAt: Date
    updatedAt: Date
    [key: string]: any
}

export interface ChargerStatusResponse {
    chargerId: string
    isOnline: boolean
    status: string
    lastSeen: string
}

export interface CommandResponse {
    success: boolean
    message: string
    responseKey: string
    note: string
}

export interface ChargerStatsResponse {
    chargerId: string
    totalSessions: number
    completedSessions: number
    totalEnergy: number
    totalRevenue: number
    averageEnergy: number
    averageRevenue: number
}

