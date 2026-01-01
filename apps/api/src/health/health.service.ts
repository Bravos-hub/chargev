import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../common/prisma/prisma.service'

@Injectable()
export class HealthService {
    constructor(private prisma: PrismaService) { }

    async check() {
        try {
            // Simple DB check
            await this.prisma.$queryRaw`SELECT 1`
            return {
                status: 'ok',
                timestamp: new Date().toISOString(),
                database: 'connected',
                version: '1.0.0'
            }
        } catch (error) {
            return {
                status: 'error',
                timestamp: new Date().toISOString(),
                database: 'disconnected',
                error: error.message
            }
        }
    }
}
