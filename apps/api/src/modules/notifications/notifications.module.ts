import { Module } from '@nestjs/common'
import { RolesGuard } from '../../common/auth/roles.guard'
import { NotificationsController } from './notifications.controller'
import { NotificationsService } from './notifications.service'

@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService, RolesGuard],
})
export class NotificationsModule {}
