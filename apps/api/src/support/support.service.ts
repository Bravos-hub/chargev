import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../common/prisma/prisma.service'

@Injectable()
export class SupportService {
    constructor(private prisma: PrismaService) { }

    async getTickets(userId: string) {
        return this.prisma.supportTicket.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' }
        })
    }

    async createTicket(userId: string, dto: any) {
        return this.prisma.supportTicket.create({
            data: {
                userId,
                subject: dto.subject,
                description: dto.description,
                status: 'OPEN',
                priority: dto.priority || 'LOW'
            }
        })
    }

    async getTicket(id: string) {
        const ticket = await this.prisma.supportTicket.findUnique({
            where: { id },
            include: { messages: { orderBy: { createdAt: 'asc' } } }
        })
        if (!ticket) throw new NotFoundException('Ticket not found')
        return ticket
    }

    async addMessage(ticketId: string, userId: string, content: string) {
        return this.prisma.supportMessage.create({
            data: {
                ticketId,
                userId,
                content,
                isAdmin: false
            }
        })
    }

    async getFaqs() {
        return this.prisma.fAQ.findMany({
            where: { active: true },
            orderBy: { order: 'asc' }
        })
    }
}
