import { IsString, IsOptional, IsEnum, IsDateString, IsObject, IsArray, IsNumber } from 'class-validator'
import { IncidentSeverity, IncidentStatus, JobType, JobPriority, JobStatus } from '@prisma/client'

export class CreateIncidentDto {
    @IsString()
    @IsOptional()
    stationId?: string

    @IsString()
    title: string

    @IsString()
    description: string

    @IsEnum(IncidentSeverity)
    severity: IncidentSeverity

    @IsString()
    @IsOptional()
    reportedBy?: string

    @IsArray()
    @IsOptional()
    photos?: string[]

    @IsObject()
    @IsOptional()
    metadata?: Record<string, any>
}

export class UpdateIncidentDto {
    @IsString()
    @IsOptional()
    title?: string

    @IsString()
    @IsOptional()
    description?: string

    @IsEnum(IncidentSeverity)
    @IsOptional()
    severity?: IncidentSeverity

    @IsEnum(IncidentStatus)
    @IsOptional()
    status?: IncidentStatus

    @IsString()
    @IsOptional()
    assignedTo?: string

    @IsString()
    @IsOptional()
    resolution?: string

    @IsArray()
    @IsOptional()
    photos?: string[]

    @IsObject()
    @IsOptional()
    metadata?: Record<string, any>
}

export class CreateJobDto {
    @IsString()
    @IsOptional()
    incidentId?: string

    @IsString()
    @IsOptional()
    stationId?: string

    @IsEnum(JobType)
    type: JobType

    @IsEnum(JobPriority)
    priority: JobPriority

    @IsString()
    title: string

    @IsString()
    @IsOptional()
    description?: string

    @IsString()
    @IsOptional()
    assignedTo?: string

    @IsDateString()
    @IsOptional()
    dueDate?: string

    @IsDateString()
    @IsOptional()
    slaDeadline?: string

    @IsObject()
    @IsOptional()
    metadata?: Record<string, any>
}

export class UpdateJobDto {
    @IsString()
    @IsOptional()
    title?: string

    @IsString()
    @IsOptional()
    description?: string

    @IsEnum(JobPriority)
    @IsOptional()
    priority?: JobPriority

    @IsEnum(JobStatus)
    @IsOptional()
    status?: JobStatus

    @IsString()
    @IsOptional()
    assignedTo?: string

    @IsDateString()
    @IsOptional()
    dueDate?: string

    @IsString()
    @IsOptional()
    resolution?: string

    @IsNumber()
    @IsOptional()
    timeSpent?: number

    @IsObject()
    @IsOptional()
    parts?: Record<string, any>

    @IsArray()
    @IsOptional()
    photos?: string[]

    @IsString()
    @IsOptional()
    signature?: string
}

export class QueryIncidentsDto {
    @IsString()
    @IsOptional()
    stationId?: string

    @IsEnum(IncidentStatus)
    @IsOptional()
    status?: IncidentStatus

    @IsEnum(IncidentSeverity)
    @IsOptional()
    severity?: IncidentSeverity

    @IsString()
    @IsOptional()
    assignedTo?: string

    @IsOptional()
    limit?: number

    @IsOptional()
    offset?: number
}

export class QueryJobsDto {
    @IsString()
    @IsOptional()
    stationId?: string

    @IsString()
    @IsOptional()
    incidentId?: string

    @IsEnum(JobStatus)
    @IsOptional()
    status?: JobStatus

    @IsEnum(JobType)
    @IsOptional()
    type?: JobType

    @IsEnum(JobPriority)
    @IsOptional()
    priority?: JobPriority

    @IsString()
    @IsOptional()
    assignedTo?: string

    @IsOptional()
    limit?: number

    @IsOptional()
    offset?: number
}

