import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../common/prisma/prisma.service'
import { CreateNotificationDto } from './dto/create-notification.dto'

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  listForUser(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })
  }

  markRead(id: string) {
    return this.prisma.notification.update({
      where: { id },
      data: { status: 'READ' },
    })
  }

  create(dto: CreateNotificationDto) {
    return this.prisma.notification.create({
      data: {
        userId: dto.userId,
        title: dto.title,
        body: dto.body,
        channel: (dto.channel as any) || 'IN_APP',
      },
    })
  }
}
