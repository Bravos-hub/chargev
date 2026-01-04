import { Injectable, Logger } from '@nestjs/common'
import { RedisService } from './redis.service'

@Injectable()
export class CacheService {
    private readonly logger = new Logger(CacheService.name)

    constructor(private redis: RedisService) { }

    /**
     * Get value from cache
     */
    async get<T>(key: string): Promise<T | null> {
        const client = this.redis.getClient()
        if (!client) return null

        try {
            const value = await client.get(key)
            if (!value) return null
            return JSON.parse(value) as T
        } catch (error) {
            this.logger.error(`Error getting cache key ${key}:`, error)
            return null
        }
    }

    /**
     * Set value in cache with optional TTL (seconds)
     */
    async set(key: string, value: any, ttl?: number): Promise<boolean> {
        const client = this.redis.getClient()
        if (!client) return false

        try {
            const serialized = JSON.stringify(value)
            if (ttl) {
                await client.setex(key, ttl, serialized)
            } else {
                await client.set(key, serialized)
            }
            return true
        } catch (error) {
            this.logger.error(`Error setting cache key ${key}:`, error)
            return false
        }
    }

    /**
     * Delete one or more keys from cache
     */
    async delete(...keys: string[]): Promise<number> {
        const client = this.redis.getClient()
        if (!client) return 0

        try {
            return await client.del(...keys)
        } catch (error) {
            this.logger.error(`Error deleting cache keys:`, error)
            return 0
        }
    }

    /**
     * Alias for delete (for compatibility)
     */
    async del(...keys: string[]): Promise<number> {
        return this.delete(...keys)
    }

    /**
     * Check if key exists
     */
    async exists(key: string): Promise<boolean> {
        const client = this.redis.getClient()
        if (!client) return false

        try {
            const result = await client.exists(key)
            return result === 1
        } catch (error) {
            this.logger.error(`Error checking existence of key ${key}:`, error)
            return false
        }
    }

    /**
     * Get all keys matching pattern
     */
    async keys(pattern: string): Promise<string[]> {
        const client = this.redis.getClient()
        if (!client) return []

        try {
            return await client.keys(pattern)
        } catch (error) {
            this.logger.error(`Error getting keys with pattern ${pattern}:`, error)
            return []
        }
    }

    /**
     * Set expiration on existing key
     */
    async expire(key: string, seconds: number): Promise<boolean> {
        const client = this.redis.getClient()
        if (!client) return false

        try {
            const result = await client.expire(key, seconds)
            return result === 1
        } catch (error) {
            this.logger.error(`Error setting expiration on key ${key}:`, error)
            return false
        }
    }

    /**
     * Increment counter
     */
    async increment(key: string, by: number = 1): Promise<number | null> {
        const client = this.redis.getClient()
        if (!client) return null

        try {
            return await client.incrby(key, by)
        } catch (error) {
            this.logger.error(`Error incrementing key ${key}:`, error)
            return null
        }
    }

    /**
     * Decrement counter
     */
    async decrement(key: string, by: number = 1): Promise<number | null> {
        const client = this.redis.getClient()
        if (!client) return null

        try {
            return await client.decrby(key, by)
        } catch (error) {
            this.logger.error(`Error decrementing key ${key}:`, error)
            return null
        }
    }

    /**
     * Add item to set
     */
    async sAdd(key: string, ...members: string[]): Promise<number> {
        const client = this.redis.getClient()
        if (!client) return 0

        try {
            return await client.sadd(key, ...members)
        } catch (error) {
            this.logger.error(`Error adding to set ${key}:`, error)
            return 0
        }
    }

    /**
     * Get all members of set
     */
    async sMembers(key: string): Promise<string[]> {
        const client = this.redis.getClient()
        if (!client) return []

        try {
            return await client.smembers(key)
        } catch (error) {
            this.logger.error(`Error getting members of set ${key}:`, error)
            return []
        }
    }

    /**
     * Remove item from set
     */
    async sRem(key: string, ...members: string[]): Promise<number> {
        const client = this.redis.getClient()
        if (!client) return 0

        try {
            return await client.srem(key, ...members)
        } catch (error) {
            this.logger.error(`Error removing from set ${key}:`, error)
            return 0
        }
    }

    /**
     * Set hash field
     */
    async hSet(key: string, field: string, value: any): Promise<number> {
        const client = this.redis.getClient()
        if (!client) return 0

        try {
            return await client.hset(key, field, JSON.stringify(value))
        } catch (error) {
            this.logger.error(`Error setting hash field ${field} on ${key}:`, error)
            return 0
        }
    }

    /**
     * Get hash field
     */
    async hGet<T>(key: string, field: string): Promise<T | null> {
        const client = this.redis.getClient()
        if (!client) return null

        try {
            const value = await client.hget(key, field)
            if (!value) return null
            return JSON.parse(value) as T
        } catch (error) {
            this.logger.error(`Error getting hash field ${field} from ${key}:`, error)
            return null
        }
    }

    /**
     * Get all hash fields
     */
    async hGetAll<T>(key: string): Promise<T | null> {
        const client = this.redis.getClient()
        if (!client) return null

        try {
            const data = await client.hgetall(key)
            if (!data || Object.keys(data).length === 0) return null

            // Parse JSON values
            const parsed: any = {}
            for (const [field, value] of Object.entries(data)) {
                try {
                    parsed[field] = JSON.parse(value)
                } catch {
                    parsed[field] = value
                }
            }
            return parsed as T
        } catch (error) {
            this.logger.error(`Error getting all hash fields from ${key}:`, error)
            return null
        }
    }
}
