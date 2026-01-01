import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '../common/prisma/prisma.service'
import { CreateNotificationDto } from './dto/notification.dto'

@Injectable()
export class NotificationsService {
    private readonly logger = new Logger(NotificationsService.name)

    constructor(private prisma: PrismaService) { }

    async create(dto: CreateNotificationDto) {
        return this.prisma.notification.create({
            data: {
                userId: dto.userId,
                title: dto.title,
                body: dto.message,
                type: dto.type,
                channel: dto.channel || 'IN_APP',
                data: dto.data || {},
                status: 'UNREAD'
            },
        })
    }

    async findAll(userId: string, unreadOnly?: boolean) {
        return this.prisma.notification.findMany({
            where: {
                userId,
                ...(unreadOnly ? { status: 'UNREAD' } : {})
            },
            orderBy: { createdAt: 'desc' }
        })
    }

    async markAsRead(id: string, userId: string) {
        return this.prisma.notification.updateMany({
            where: { id, userId },
            data: {
                status: 'READ',
                read: true,
                readAt: new Date()
            }
        })
    }

    async markAllAsRead(userId: string) {
        return this.prisma.notification.updateMany({
            where: { userId, status: 'UNREAD' },
            data: {
                status: 'READ',
                read: true,
                readAt: new Date()
            }
        })
    }

    async clearAll(userId: string) {
        return this.prisma.notification.deleteMany({
            where: { userId }
        })
    }

    async remove(id: string, userId: string) {
        return this.prisma.notification.delete({
            where: { id, userId },
        })
    }
}
