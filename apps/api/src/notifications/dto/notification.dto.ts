import { IsEnum, IsNotEmpty, IsOptional, IsString, IsObject } from 'class-validator'
import { NotificationType, NotificationChannel } from '@prisma/client'

export class CreateNotificationDto {
    @IsString()
    @IsNotEmpty()
    userId: string

    @IsString()
    @IsNotEmpty()
    title: string

    @IsString()
    @IsNotEmpty()
    message: string

    @IsEnum(NotificationType)
    type: NotificationType

    @IsEnum(NotificationChannel)
    @IsOptional()
    channel?: NotificationChannel = 'IN_APP'

    @IsObject()
    @IsOptional()
    data?: any
}
