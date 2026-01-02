import { Injectable, NotFoundException, Logger } from '@nestjs/common'
import { PrismaService } from '../common/prisma/prisma.service'
import { CreateWebhookDto, UpdateWebhookDto } from './dto/webhook.dto'
import * as crypto from 'crypto'
import axios from 'axios'

@Injectable()
export class WebhookService {
    private readonly logger = new Logger(WebhookService.name)

    constructor(private prisma: PrismaService) {}

    private generateSecret(): string {
        return crypto.randomBytes(32).toString('hex')
    }

    private signPayload(payload: string, secret: string): string {
        return crypto.createHmac('sha256', secret).update(payload).digest('hex')
    }

    async create(orgId: string, dto: CreateWebhookDto) {
        return this.prisma.webhook.create({
            data: {
                organizationId: orgId,
                name: dto.url,
                url: dto.url,
                events: dto.events,
                secret: dto.secret || this.generateSecret(),
                headers: dto.headers || {},
                retryPolicy: { maxRetries: dto.retryCount || 3, backoffMs: (dto.retryDelay || 60) * 1000 },
            },
        })
    }

    async findAll(orgId: string) {
        return this.prisma.webhook.findMany({
            where: { organizationId: orgId },
            include: {
                _count: { select: { logs: true } },
            },
        })
    }

    async findOne(id: string, orgId: string) {
        const webhook = await this.prisma.webhook.findFirst({
            where: { id, organizationId: orgId },
        })

        if (!webhook) throw new NotFoundException('Webhook not found')
        return webhook
    }

    async update(id: string, orgId: string, dto: UpdateWebhookDto) {
        await this.findOne(id, orgId)

        return this.prisma.webhook.update({
            where: { id },
            data: {
                url: dto.url,
                events: dto.events,
                secret: dto.secret,
                headers: dto.headers,
                status: dto.status,
                retryPolicy: dto.retryCount ? { maxRetries: dto.retryCount, backoffMs: (dto.retryDelay || 60) * 1000 } : undefined,
            },
        })
    }

    async delete(id: string, orgId: string) {
        await this.findOne(id, orgId)
        await this.prisma.webhook.delete({ where: { id } })
        return { success: true }
    }

    async getLogs(webhookId: string, orgId: string, limit = 50) {
        await this.findOne(webhookId, orgId)

        return this.prisma.webhookLog.findMany({
            where: { webhookId },
            orderBy: { createdAt: 'desc' },
            take: limit,
        })
    }

    async trigger(event: string, payload: Record<string, any>, orgId?: string) {
        const where: any = {
            status: 'ACTIVE',
            events: { has: event },
        }
        if (orgId) where.organizationId = orgId

        const webhooks = await this.prisma.webhook.findMany({ where })

        const results = await Promise.allSettled(
            webhooks.map(webhook => this.deliverWebhook(webhook, event, payload))
        )

        return {
            triggered: webhooks.length,
            successful: results.filter(r => r.status === 'fulfilled').length,
            failed: results.filter(r => r.status === 'rejected').length,
        }
    }

    private async deliverWebhook(
        webhook: any,
        event: string,
        payload: Record<string, any>,
        attempt = 1
    ): Promise<void> {
        const body = JSON.stringify({
            event,
            timestamp: new Date().toISOString(),
            data: payload,
        })

        const signature = this.signPayload(body, webhook.secret)
        const startTime = Date.now()
        const retryPolicy = webhook.retryPolicy as { maxRetries?: number; backoffMs?: number } | null

        try {
            const response = await axios.post(webhook.url, body, {
                headers: {
                    'Content-Type': 'application/json',
                    'X-Webhook-Signature': signature,
                    'X-Webhook-Event': event,
                    ...webhook.headers,
                },
                timeout: 30000,
            })

            await this.prisma.webhookLog.create({
                data: {
                    webhookId: webhook.id,
                    event,
                    payload: payload as any,
                    statusCode: response.status,
                    response: response.data as any,
                    duration: Date.now() - startTime,
                    success: true,
                },
            })

            this.logger.log(`Webhook delivered successfully: ${webhook.url} (${event})`)
        } catch (error: any) {
            const statusCode = error?.response?.status || 0

            await this.prisma.webhookLog.create({
                data: {
                    webhookId: webhook.id,
                    event,
                    payload: payload as any,
                    statusCode,
                    response: { error: error?.message || 'Unknown error' } as any,
                    duration: Date.now() - startTime,
                    success: false,
                },
            })

            this.logger.error(`Webhook delivery failed: ${webhook.url} (${event}) - ${error?.message || 'Unknown error'}`)

            // Retry logic
            const maxRetries = retryPolicy?.maxRetries || 3
            const backoffMs = retryPolicy?.backoffMs || 60000
            if (attempt < maxRetries) {
                setTimeout(
                    () => this.deliverWebhook(webhook, event, payload, attempt + 1),
                    backoffMs * attempt
                )
            } else {
                // Mark webhook as failed after max retries
                await this.prisma.webhook.update({
                    where: { id: webhook.id },
                    data: { status: 'FAILED' },
                })
            }
        }
    }

    async testWebhook(id: string, orgId: string) {
        const webhook = await this.findOne(id, orgId)

        await this.deliverWebhook(webhook, 'test', {
            message: 'This is a test webhook delivery',
            timestamp: new Date().toISOString(),
        })

        return { success: true, message: 'Test webhook sent' }
    }
}
