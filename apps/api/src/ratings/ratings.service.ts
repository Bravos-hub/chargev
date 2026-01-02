import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common'
import { PrismaService } from '../common/prisma/prisma.service'
import { CreateRatingDto, UpdateRatingDto, QueryRatingsDto } from './dto/rating.dto'

@Injectable()
export class RatingsService {
    constructor(private prisma: PrismaService) {}

    async create(userId: string, dto: CreateRatingDto) {
        // Check if user already rated this entity
        const existing = await this.prisma.rating.findFirst({
            where: {
                userId,
                entityType: dto.entityType,
                entityId: dto.entityId,
            },
        })

        if (existing) {
            throw new BadRequestException('You have already rated this item')
        }

        // Verify session if provided
        let verified = false
        if (dto.sessionId) {
            const session = await this.prisma.chargingSession.findFirst({
                where: {
                    id: dto.sessionId,
                    userId,
                    status: 'COMPLETED',
                },
            })
            verified = !!session
        }

        return this.prisma.rating.create({
            data: {
                userId,
                entityType: dto.entityType,
                entityId: dto.entityId,
                score: dto.score,
                review: dto.review,
                tags: dto.tags || [],
                photos: dto.photos || [],
                sessionId: dto.sessionId,
                verified,
            },
        })
    }

    async findAll(query: QueryRatingsDto) {
        const where: any = {}

        if (query.entityType) where.entityType = query.entityType
        if (query.entityId) where.entityId = query.entityId
        if (query.minScore) where.score = { gte: query.minScore }
        if (query.verified !== undefined) where.verified = query.verified

        const [ratings, total] = await Promise.all([
            this.prisma.rating.findMany({
                where,
                include: {
                    user: {
                        select: { id: true, name: true, avatarUrl: true },
                    },
                },
                orderBy: { createdAt: 'desc' },
                take: query.limit || 20,
                skip: query.offset || 0,
            }),
            this.prisma.rating.count({ where }),
        ])

        return { ratings, total }
    }

    async findByEntity(entityType: string, entityId: string) {
        const ratings = await this.prisma.rating.findMany({
            where: { entityType, entityId },
            include: {
                user: {
                    select: { id: true, name: true, avatarUrl: true },
                },
            },
            orderBy: { createdAt: 'desc' },
        })

        const stats = await this.getEntityStats(entityType, entityId)

        return { ratings, stats }
    }

    async getEntityStats(entityType: string, entityId: string) {
        const result = await this.prisma.rating.aggregate({
            where: { entityType, entityId },
            _avg: { score: true },
            _count: { score: true },
        })

        // Get distribution
        const distribution = await this.prisma.rating.groupBy({
            by: ['score'],
            where: { entityType, entityId },
            _count: { score: true },
        })

        const distributionMap: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
        distribution.forEach(d => {
            distributionMap[d.score] = d._count.score
        })

        return {
            averageScore: result._avg.score || 0,
            totalRatings: result._count.score,
            distribution: distributionMap,
        }
    }

    async findOne(id: string) {
        const rating = await this.prisma.rating.findUnique({
            where: { id },
            include: {
                user: {
                    select: { id: true, name: true, avatarUrl: true },
                },
            },
        })

        if (!rating) throw new NotFoundException('Rating not found')
        return rating
    }

    async update(id: string, userId: string, dto: UpdateRatingDto) {
        const rating = await this.findOne(id)

        if (rating.userId !== userId) {
            throw new ForbiddenException('You can only edit your own ratings')
        }

        return this.prisma.rating.update({
            where: { id },
            data: {
                score: dto.score,
                review: dto.review,
                tags: dto.tags,
                photos: dto.photos,
            },
        })
    }

    async delete(id: string, userId: string, isAdmin = false) {
        const rating = await this.findOne(id)

        if (!isAdmin && rating.userId !== userId) {
            throw new ForbiddenException('You can only delete your own ratings')
        }

        await this.prisma.rating.delete({ where: { id } })
        return { success: true }
    }

    async getUserRatings(userId: string) {
        return this.prisma.rating.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
        })
    }

    async getTopRated(entityType: string, limit = 10) {
        const topEntities = await this.prisma.rating.groupBy({
            by: ['entityId'],
            where: { entityType },
            _avg: { score: true },
            _count: { score: true },
            having: {
                score: { _count: { gte: 3 } }, // Minimum 3 ratings
            },
            orderBy: { _avg: { score: 'desc' } },
            take: limit,
        })

        return topEntities.map(e => ({
            entityId: e.entityId,
            averageScore: e._avg.score,
            totalRatings: e._count.score,
        }))
    }
}

