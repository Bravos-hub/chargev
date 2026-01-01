import { Body, Controller, Get, Param, Patch, Post, Query, Request, UseGuards } from '@nestjs/common'
import { NotificationsService } from './notifications.service'
import { CreateNotificationDto } from './dto/notification.dto'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { RolesGuard } from '../../common/guards/roles.guard'
import { Roles } from '../../common/decorators/auth.decorators'
import { UserRole } from '@prisma/client'

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
    findAll(@Request() req, @Query('unread') unread?: string) {
        return this.notificationsService.findAll(req.user.id, unread === 'true')
    }

    @Patch('read-all')
    markAllAsRead(@Request() req) {
        return this.notificationsService.markAllAsRead(req.user.id)
    }

    @Patch(':id/read')
    markAsRead(@Request() req, @Param('id') id: string) {
        return this.notificationsService.markAsRead(id, req.user.id)
    }
}
