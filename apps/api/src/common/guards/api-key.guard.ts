import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common'
import { CacheService } from '../../integrations/redis/cache.service'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class ApiKeyGuard implements CanActivate {
    constructor(
        private cache: CacheService,
        private prisma: PrismaService
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest()
        const apiKey = request.headers['x-api-key']

        if (!apiKey) {
            throw new UnauthorizedException('API key required')
        }

        // Check cache first
        const cachedKey = await this.cache.get(`apikey:${apiKey}`)
        if (cachedKey) {
            request.apiKeyData = JSON.parse(cachedKey as string)
            return true
        }

        // Validate API key from database
        // Note: You'll need to create an ApiKey model in Prisma
        const validKey = await this.validateApiKey(apiKey)

        if (!validKey) {
            throw new UnauthorizedException('Invalid API key')
        }

        // Cache for 1 hour
        await this.cache.set(`apikey:${apiKey}`, JSON.stringify(validKey), 3600)
        request.apiKeyData = validKey

        return true
    }

    private async validateApiKey(key: string): Promise<any> {
        // Simplified validation - in production, query your API keys table
        // For now, check against a hash
        const hash = this.hashApiKey(key)

        // Example: Check if it matches a station code (temporary solution)
        const station = await this.prisma.station.findFirst({
            where: { code: key }
        })

        if (station) {
            return {
                id: station.id,
                type: 'STATION',
                permissions: ['ocpp']
            }
        }

        return null
    }

    private hashApiKey(key: string): string {
        // Simple hash for demo - use crypto.createHash in production
        return Buffer.from(key).toString('base64')
    }
}
