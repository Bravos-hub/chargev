import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common'
import { NotificationsService } from './notifications.service'
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard'
import { CurrentUser } from '../../common/auth/current-user.decorator'
import type { JwtUser } from '../../common/auth/types'
import { CreateNotificationDto } from './dto/create-notification.dto'
import { Roles } from '../../common/auth/roles.decorator'
import { RolesGuard } from '../../common/auth/roles.guard'

@Controller('notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
export class NotificationsController {
  constructor(private notifications: NotificationsService) {}

  @Get()
  list(@CurrentUser() user: JwtUser) {
    return this.notifications.listForUser(user.id)
  }

  @Patch(':id/read')
  markRead(@Param('id') id: string) {
    return this.notifications.markRead(id)
  }

  @Post()
  @Roles('EVZONE_ADMIN')
  create(@Body() dto: CreateNotificationDto) {
    return this.notifications.create(dto)
  }
}
