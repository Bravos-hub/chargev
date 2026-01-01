import { Injectable, NestMiddleware, HttpException, HttpStatus } from '@nestjs/common'
import { Request, Response, NextFunction } from 'express'
import { CacheService } from '../../integrations/redis/cache.service'

@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
    constructor(private cache: CacheService) { }

    async use(req: Request, res: Response, next: NextFunction) {
        const key = `ratelimit:${this.getClientIdentifier(req)}`

        // Get current request count
        const currentCount = await this.cache.get<number>(key) || 0

        // Rate limit: 100 requests per minute
        const limit = 100
        const window = 60 // seconds

        if (currentCount >= limit) {
            throw new HttpException('Rate limit exceeded. Try again later.', HttpStatus.TOO_MANY_REQUESTS)
        }

        // Increment counter
        await this.cache.increment(key)

        // Set expiry on first request
        if (currentCount === 0) {
            await this.cache.expire(key, window)
        }

        // Add rate limit headers
        res.setHeader('X-RateLimit-Limit', limit.toString())
        res.setHeader('X-RateLimit-Remaining', (limit - currentCount - 1).toString())
        res.setHeader('X-RateLimit-Reset', (Date.now() + window * 1000).toString())

        next()
    }

    private getClientIdentifier(req: Request): string {
        // Use API key if present, otherwise IP address
        const apiKey = req.headers['x-api-key']
        if (apiKey) {
            return `api:${apiKey}`
        }

        // Get IP from various headers
        const ip = req.headers['x-forwarded-for'] ||
            req.headers['x-real-ip'] ||
            req.socket.remoteAddress

        return `ip:${ip}`
    }
}
