import { IsString, IsOptional, IsArray, IsObject, IsNumber, IsEnum } from 'class-validator'
import { WebhookStatus } from '@prisma/client'

export class CreateWebhookDto {
    @IsString()
    url: string

    @IsArray()
    events: string[]

    @IsString()
    @IsOptional()
    secret?: string

    @IsObject()
    @IsOptional()
    headers?: Record<string, string>

    @IsNumber()
    @IsOptional()
    retryCount?: number

    @IsNumber()
    @IsOptional()
    retryDelay?: number
}

export class UpdateWebhookDto {
    @IsString()
    @IsOptional()
    url?: string

    @IsArray()
    @IsOptional()
    events?: string[]

    @IsString()
    @IsOptional()
    secret?: string

    @IsObject()
    @IsOptional()
    headers?: Record<string, string>

    @IsEnum(WebhookStatus)
    @IsOptional()
    status?: WebhookStatus

    @IsNumber()
    @IsOptional()
    retryCount?: number

    @IsNumber()
    @IsOptional()
    retryDelay?: number
}

export class WebhookEventDto {
    @IsString()
    event: string

    @IsObject()
    payload: Record<string, any>
}

