import { Controller, Get, Param, Query, HttpException, HttpStatus } from '@nestjs/common'
import { SessionManagerService } from './session-manager.service'
import { PrismaService } from '../common/prisma/prisma.service'
import { ActiveOnlyQueryDto, SessionHistoryQueryDto } from './dto/session.dto'

@Controller('api/sessions')
export class SessionsController {
    constructor(
        private sessionManager: SessionManagerService,
        private prisma: PrismaService
    ) { }

    /**
     * Get all active sessions
     * GET /api/sessions/active
     */
    @Get('active')
    async getActiveSessions() {
        const sessions = await this.sessionManager.getActiveSessions()

        // Enrich with station details
        const enrichedSessions = await Promise.all(
            sessions.map(async (session) => {
                const station = await this.prisma.station.findUnique({
                    where: { id: session.stationId }
                })

                return {
                    ...session,
                    station: station ? {
                        id: station.id,
                        code: station.code,
                        name: station.name,
                        address: station.address
                    } : null
                }
            })
        )

        return enrichedSessions
    }

    /**
     * Get session by ID
     * GET /api/sessions/:id
     */
    @Get(':id')
    async getSession(@Param('id') id: string) {
        // Try to get from active sessions first (Redis)
        const activeSession = await this.sessionManager.getSession(id)

        if (activeSession) {
            const station = await this.prisma.station.findUnique({
                where: { id: activeSession.stationId }
            })

            return {
                ...activeSession,
                station: station ? {
                    id: station.id,
                    code: station.code,
                    name: station.name,
                    address: station.address
                } : null
            }
        }

        // If not active, get from database (completed sessions)
        const completedSession = await this.prisma.chargingSession.findUnique({
            where: { id },
            include: {
                station: true
            }
        })

        if (!completedSession) {
            throw new HttpException('Session not found', HttpStatus.NOT_FOUND)
        }

        return completedSession
    }

    /**
     * Get session statistics
     * GET /api/sessions/stats
     */
    @Get('stats/summary')
    async getSessionStats() {
        return await this.sessionManager.getSessionStats()
    }

    /**
     * Get sessions for a specific station
     * GET /api/sessions/station/:stationId
     */
    @Get('station/:stationId')
    async getStationSessions(
        @Param('stationId') stationId: string,
        @Query() query: ActiveOnlyQueryDto
    ) {
        if (query.active === true) {
            return await this.sessionManager.getStationActiveSessions(stationId)
        }

        // Get all sessions (active + completed)
        const activeSessions = await this.sessionManager.getStationActiveSessions(stationId)
        const completedSessions = await this.prisma.chargingSession.findMany({
            where: { stationId },
            orderBy: { startedAt: 'desc' },
            take: 50
        })

        return {
            active: activeSessions,
            recent: completedSessions
        }
    }

    /**
     * Get sessions for a specific user
     * GET /api/sessions/user/:userId
     */
    @Get('user/:userId')
    async getUserSessions(
        @Param('userId') userId: string,
        @Query() query: ActiveOnlyQueryDto
    ) {
        if (query.active === true) {
            return await this.sessionManager.getUserActiveSessions(userId)
        }

        // Get all sessions
        const activeSessions = await this.sessionManager.getUserActiveSessions(userId)
        const completedSessions = await this.prisma.chargingSession.findMany({
            where: { userId },
            include: { station: true },
            orderBy: { startedAt: 'desc' },
            take: 50
        })

        return {
            active: activeSessions,
            recent: completedSessions
        }
    }

    /**
     * Get session history with pagination
     * GET /api/sessions/history?page=1&limit=20&status=COMPLETED
     */
    @Get('history/all')
    async getSessionHistory(@Query() query: SessionHistoryQueryDto) {
        const pageNum = query.page || 1
        const limitNum = query.limit || 20
        const skip = (pageNum - 1) * limitNum

        const where: any = {}
        if (query.status) {
            where.status = query.status
        }

        const [sessions, total] = await Promise.all([
            this.prisma.chargingSession.findMany({
                where,
                include: { station: true },
                orderBy: { startedAt: 'desc' },
                skip,
                take: limitNum
            }),
            this.prisma.chargingSession.count({ where })
        ])

        return {
            sessions,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                totalPages: Math.ceil(total / limitNum)
            }
        }
    }
}

