import { Body, Controller, Get, Param, Patch, Post, Query, Request, UseGuards, Delete } from '@nestjs/common'
import { NotificationsService } from './notifications.service'
import { CreateNotificationDto } from './dto/notification.dto'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { RolesGuard } from '../common/guards/roles.guard'
import { Roles } from '../common/decorators/auth.decorators'

export enum UserRole {
    SUPER_ADMIN = 'SUPER_ADMIN',
    PLATFORM_ADMIN = 'PLATFORM_ADMIN',
    ORG_OWNER = 'ORG_OWNER',
    ORG_ADMIN = 'ORG_ADMIN',
    STATION_OWNER_INDIVIDUAL = 'STATION_OWNER_INDIVIDUAL',
    STATION_OWNER_ORG = 'STATION_OWNER_ORG',
    STATION_ADMIN = 'STATION_ADMIN',
    STATION_ATTENDANT = 'STATION_ATTENDANT',
    TECHNICIAN_PUBLIC = 'TECHNICIAN_PUBLIC',
    TECHNICIAN_ORG = 'TECHNICIAN_ORG',
    FLEET_MANAGER = 'FLEET_MANAGER',
    FLEET_DRIVER = 'FLEET_DRIVER',
    RIDER_PREMIUM = 'RIDER_PREMIUM',
    RIDER_STANDARD = 'RIDER_STANDARD',
    GUEST = 'GUEST'
}

@Controller('notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
export class NotificationsController {
    constructor(private readonly notificationsService: NotificationsService) { }

    // Admin sending system alerts
    @Post()
    @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN)
    create(@Body() dto: CreateNotificationDto) {
        return this.notificationsService.create(dto)
    }

    @Get()
    findAll(@Request() req: any, @Query('unread') unread?: string) {
        return this.notificationsService.findAll(req.user.id, unread === 'true')
    }

    @Patch('read-all')
    markAllAsRead(@Request() req: any) {
        return this.notificationsService.markAllAsRead(req.user.id)
    }

    @Patch(':id/read')
    markAsRead(@Request() req: any, @Param('id') id: string) {
        return this.notificationsService.markAsRead(id, req.user.id)
    }

    @Delete()
    clearAll(@Request() req: any) {
        return this.notificationsService.clearAll(req.user.id)
    }

    @Delete(':id')
    remove(@Request() req: any, @Param('id') id: string) {
        return this.notificationsService.remove(id, req.user.id)
    }
}
