import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../common/prisma/prisma.service'
import { CreateApiKeyDto, UpdateApiKeyDto } from './dto/api-key.dto'
import * as crypto from 'crypto'

@Injectable()
export class ApiKeyService {
    constructor(private prisma: PrismaService) {}

    private generateApiKey(): string {
        return `evz_${crypto.randomBytes(32).toString('hex')}`
    }

    private hashApiKey(key: string): string {
        return crypto.createHash('sha256').update(key).digest('hex')
    }

    async create(orgId: string, dto: CreateApiKeyDto) {
        const rawKey = this.generateApiKey()
        const hashedKey = this.hashApiKey(rawKey)

        const apiKey = await this.prisma.aPIKey.create({
            data: {
                organizationId: orgId,
                name: dto.name,
                keyHash: hashedKey,
                keyPrefix: rawKey.substring(0, 12),
                permissions: dto.permissions || [],
                rateLimit: dto.rateLimit || 1000,
                expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
            },
        })

        // Return the raw key only once - it cannot be retrieved again
        return {
            ...apiKey,
            key: rawKey, // Only returned on creation
        }
    }

    async findAll(orgId: string) {
        return this.prisma.aPIKey.findMany({
            where: { organizationId: orgId },
            select: {
                id: true,
                name: true,
                keyPrefix: true,
                permissions: true,
                rateLimit: true,
                active: true,
                lastUsedAt: true,
                expiresAt: true,
                createdAt: true,
            },
        })
    }

    async findOne(id: string, orgId: string) {
        const apiKey = await this.prisma.aPIKey.findFirst({
            where: { id, organizationId: orgId },
            select: {
                id: true,
                name: true,
                keyPrefix: true,
                permissions: true,
                rateLimit: true,
                active: true,
                lastUsedAt: true,
                expiresAt: true,
                createdAt: true,
            },
        })

        if (!apiKey) throw new NotFoundException('API key not found')
        return apiKey
    }

    async update(id: string, orgId: string, dto: UpdateApiKeyDto) {
        await this.findOne(id, orgId)

        return this.prisma.aPIKey.update({
            where: { id },
            data: {
                name: dto.name,
                permissions: dto.permissions,
                rateLimit: dto.rateLimit,
                active: dto.active,
            },
            select: {
                id: true,
                name: true,
                keyPrefix: true,
                permissions: true,
                rateLimit: true,
                active: true,
                lastUsedAt: true,
                expiresAt: true,
                createdAt: true,
            },
        })
    }

    async delete(id: string, orgId: string) {
        await this.findOne(id, orgId)
        await this.prisma.aPIKey.delete({ where: { id } })
        return { success: true }
    }

    async validateKey(rawKey: string): Promise<{ valid: boolean; orgId?: string; permissions?: string[] }> {
        const hashedKey = this.hashApiKey(rawKey)

        const apiKey = await this.prisma.aPIKey.findFirst({
            where: {
                keyHash: hashedKey,
                active: true,
            },
        })

        if (!apiKey) {
            return { valid: false }
        }

        // Check expiration
        if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
            return { valid: false }
        }

        // Update last used
        await this.prisma.aPIKey.update({
            where: { id: apiKey.id },
            data: { lastUsedAt: new Date() },
        })

        return {
            valid: true,
            orgId: apiKey.organizationId,
            permissions: apiKey.permissions as string[],
        }
    }

    async regenerateKey(id: string, orgId: string) {
        await this.findOne(id, orgId)

        const rawKey = this.generateApiKey()
        const hashedKey = this.hashApiKey(rawKey)

        await this.prisma.aPIKey.update({
            where: { id },
            data: {
                keyHash: hashedKey,
                keyPrefix: rawKey.substring(0, 12),
            },
        })

        return { key: rawKey }
    }
}
