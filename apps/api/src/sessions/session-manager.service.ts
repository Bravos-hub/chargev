import { Injectable, Logger } from '@nestjs/common'
import { CacheService } from '../integrations/redis/cache.service'
import { PubSubService } from '../integrations/redis/pubsub.service'
import { PrismaService } from '../common/prisma/prisma.service'
import { KafkaService } from '../integrations/kafka/kafka.service'

export interface ChargingSession {
    id: string
    stationId: string
    userId?: string
    connectorId: number
    status: 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'FAILED'
    startedAt: Date
    endedAt?: Date
    energyDelivered: number // kWh
    cost: number
    metadata?: Record<string, any>
}

@Injectable()
export class SessionManagerService {
    private readonly logger = new Logger(SessionManagerService.name)
    private readonly SESSION_PREFIX = 'session:'
    private readonly ACTIVE_SESSIONS = 'sessions:active'

    constructor(
        private cache: CacheService,
        private pubsub: PubSubService,
        private prisma: PrismaService,
        private kafka: KafkaService,
    ) { }

    /**
     * Start a new charging session
     */
    async startSession(data: {
        stationId: string
        userId?: string
        connectorId: number
        transactionId?: string
    }): Promise<ChargingSession> {
        const session: ChargingSession = {
            id: data.transactionId || `txn_${Date.now()}`,
            stationId: data.stationId,
            userId: data.userId,
            connectorId: data.connectorId,
            status: 'ACTIVE',
            startedAt: new Date(),
            energyDelivered: 0,
            cost: 0,
        }

        // Store in Redis cache with 24 hour TTL
        await this.cache.set(
            `${this.SESSION_PREFIX}${session.id}`,
            session,
            86400, // 24 hours
        )

        // Add to active sessions set
        await this.cache.sAdd(this.ACTIVE_SESSIONS, session.id)

        // Publish session start event
        await this.pubsub.publish('sessions:started', session)

        // Emit to Kafka for persistence
        await this.kafka.emit('session.started', session)

        this.logger.log(`Session started: ${session.id}`)
        return session
    }

    /**
     * Update session with meter values
     */
    async updateSession(
        sessionId: string,
        data: {
            energyDelivered?: number
            cost?: number
            metadata?: Record<string, any>
        },
    ): Promise<ChargingSession | null> {
        const session = await this.getSession(sessionId)
        if (!session) {
            this.logger.warn(`Session not found: ${sessionId}`)
            return null
        }

        // Update session data
        const updated: ChargingSession = {
            ...session,
            energyDelivered: data.energyDelivered ?? session.energyDelivered,
            cost: data.cost ?? session.cost,
            metadata: { ...session.metadata, ...data.metadata },
        }

        // Update cache
        await this.cache.set(`${this.SESSION_PREFIX}${sessionId}`, updated, 86400)

        // Publish update event
        await this.pubsub.publish(`sessions:${sessionId}:updated`, updated)

        // Emit to Kafka
        await this.kafka.emit('session.updated', updated)

        return updated
    }

    /**
     * End a charging session
     */
    async endSession(
        sessionId: string,
        status: 'COMPLETED' | 'FAILED' = 'COMPLETED',
    ): Promise<ChargingSession | null> {
        const session = await this.getSession(sessionId)
        if (!session) {
            this.logger.warn(`Session not found: ${sessionId}`)
            return null
        }

        // Update session
        const ended: ChargingSession = {
            ...session,
            status,
            endedAt: new Date(),
        }

        // Update cache
        await this.cache.set(`${this.SESSION_PREFIX}${sessionId}`, ended, 86400)

        // Remove from active sessions
        await this.cache.sRem(this.ACTIVE_SESSIONS, sessionId)

        // Publish end event
        await this.pubsub.publish('sessions:ended', ended)

        // Emit to Kafka for final persistence
        await this.kafka.emit('session.ended', ended)

        // Persist to database
        try {
            await this.prisma.chargingSession.create({
                data: {
                    id: ended.id,
                    stationId: ended.stationId,
                    userId: ended.userId,
                    status: ended.status,
                    startedAt: ended.startedAt,
                    endedAt: ended.endedAt,
                    energyDelivered: ended.energyDelivered,
                    cost: ended.cost,
                },
            })
            this.logger.log(`Session persisted to database: ${sessionId}`)
        } catch (error) {
            this.logger.error(`Failed to persist session ${sessionId}:`, error)
        }

        this.logger.log(`Session ended: ${sessionId}`)
        return ended
    }

    /**
     * Get session details
     */
    async getSession(sessionId: string): Promise<ChargingSession | null> {
        return await this.cache.get<ChargingSession>(
            `${this.SESSION_PREFIX}${sessionId}`,
        )
    }

    /**
     * Get all active sessions
     */
    async getActiveSessions(): Promise<ChargingSession[]> {
        const sessionIds = await this.cache.sMembers(this.ACTIVE_SESSIONS)
        const sessions: ChargingSession[] = []

        for (const id of sessionIds) {
            const session = await this.getSession(id)
            if (session) {
                sessions.push(session)
            }
        }

        return sessions
    }

    /**
     * Get active sessions for a specific station
     */
    async getStationActiveSessions(stationId: string): Promise<ChargingSession[]> {
        const all = await this.getActiveSessions()
        return all.filter((s) => s.stationId === stationId)
    }

    /**
     * Get active sessions for a user
     */
    async getUserActiveSessions(userId: string): Promise<ChargingSession[]> {
        const all = await this.getActiveSessions()
        return all.filter((s) => s.userId === userId)
    }

    /**
     * Get session statistics
     */
    async getSessionStats(): Promise<{
        activeCount: number
        totalEnergy: number
        totalCost: number
    }> {
        const sessions = await this.getActiveSessions()
        return {
            activeCount: sessions.length,
            totalEnergy: sessions.reduce((sum, s) => sum + s.energyDelivered, 0),
            totalCost: sessions.reduce((sum, s) => sum + s.cost, 0),
        }
    }
}
