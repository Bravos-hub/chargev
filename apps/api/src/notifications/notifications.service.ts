import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../common/prisma/prisma.service'
import { CreateNotificationDto } from './dto/notification.dto'

@Injectable()
export class NotificationsService {
    constructor(private prisma: PrismaService) { }

    async create(dto: CreateNotificationDto) {
        // 1. Save to DB (In-App)
        const notification = await this.prisma.notification.create({
            data: {
                userId: dto.userId,
                title: dto.title,
                message: dto.message,
                type: dto.type,
                data: dto.data ?? {},
            }
        })

        // 2. Dispatch to other channels (Push, Email, SMS)
        if (dto.channel !== 'IN_APP') {
            await this.dispatchExternal(dto)
        }

        return notification
    }

    async findAll(userId: string, unreadOnly = false) {
        const where: any = { userId }
        if (unreadOnly) {
            where.read = false
        }

        return this.prisma.notification.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: 50
        })
    }

    async markAsRead(id: string, userId: string) {
        // Ensure ownership
        const exists = await this.prisma.notification.findFirst({
            where: { id, userId }
        })

        if (!exists) return null

        return this.prisma.notification.update({
            where: { id },
            data: {
                read: true,
                readAt: new Date()
            }
        })
    }

    async markAllAsRead(userId: string) {
        return this.prisma.notification.updateMany({
            where: { userId, read: false },
            data: {
                read: true,
                readAt: new Date()
            }
        })
    }

    private async dispatchExternal(dto: CreateNotificationDto) {
        // Placeholder for email/SMS/Push logic
        // e.g., using Firebase (FCM), SendGrid, Twilio
        console.log(`[Notification] Dispatching ${dto.channel} to user ${dto.userId}: ${dto.message}`)
    }
}
