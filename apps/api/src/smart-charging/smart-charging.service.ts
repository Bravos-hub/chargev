import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '../common/prisma/prisma.service'
import { CacheService } from '../integrations/redis/cache.service'
import { SessionManagerService } from '../sessions/session-manager.service'
import { KafkaService } from '../integrations/kafka/kafka.service'
import { SitePowerLimit, ChargerAllocation, ChargingPriority } from './interfaces/smart-charging.interface'

@Injectable()
export class SmartChargingService {
    private readonly logger = new Logger(SmartChargingService.name)

    // Default power per charger (can be overridden)
    private readonly DEFAULT_MAX_POWER = 22 // kW (Type 2 AC charger)

    constructor(
        private prisma: PrismaService,
        private cache: CacheService,
        private sessionManager: SessionManagerService,
        private kafka: KafkaService
    ) { }

    /**
     * Get or create site power configuration
     */
    async getSitePowerLimit(siteId: string): Promise<SitePowerLimit> {
        // Check cache first
        const cached = await this.cache.get<SitePowerLimit>(`site:${siteId}:power`)
        if (cached) {
            return cached
        }

        // Get from database or use default
        const site = await this.prisma.station.findUnique({
            where: { id: siteId },
            include: {
                chargePoints: true
            }
        })

        if (!site) {
            throw new Error(`Site ${siteId} not found`)
        }

        // Calculate total available power  
        // Default: 50kW per charger or use site's totalPowerCapacity if available
        const totalChargers = site.chargePoints.length
        const maxPower = (site as any).totalPowerCapacity || (totalChargers * 50)

        const activeSessions = await this.sessionManager.getActiveSessions()
        const siteActiveSessions = activeSessions.filter((s: any) =>
            s.stationId === siteId && site.chargePoints.some((cp: any) => cp.id === s.chargePointId)
        )

        // Calculate current load (assuming 7kW average per active session)
        const currentLoad = siteActiveSessions.length * 7

        const chargers: ChargerAllocation[] = site.chargePoints.map((cp: any) => ({
            chargerId: cp.id,
            allocatedPower: siteActiveSessions.some((s: any) => s.chargePointId === cp.id) ? 7 : 0,
            maxPower: this.DEFAULT_MAX_POWER,
            priority: 1,
            isCharging: siteActiveSessions.some((s: any) => s.chargePointId === cp.id)
        }))

        const powerLimit: SitePowerLimit = {
            siteId,
            maxPower,
            currentLoad,
            availablePower: maxPower - currentLoad,
            chargers
        }

        // Cache for 1 minute (real-time data)
        await this.cache.set(`site:${siteId}:power`, powerLimit, 60)

        return powerLimit
    }

    /**
     * Update site power limit
     */
    async updateSitePowerLimit(siteId: string, maxPower: number): Promise<void> {
        // Update in database (extend site model to include this)
        // For now, just cache it
        const current = await this.getSitePowerLimit(siteId)
        current.maxPower = maxPower
        current.availablePower = maxPower - current.currentLoad

        await this.cache.set(`site:${siteId}:power`, current, 3600) // 1 hour

        this.logger.log(`Updated site ${siteId} power limit to ${maxPower}kW`)

        // Trigger rebalancing
        await this.rebalanceLoadForSite(siteId)
    }

    /**
     * Dynamic load balancing algorithm
     */
    async rebalanceLoadForSite(siteId: string): Promise<void> {
        const siteLimit = await this.getSitePowerLimit(siteId)

        if (siteLimit.currentLoad <= siteLimit.maxPower) {
            this.logger.log(`Site ${siteId} within power limits, no rebalancing needed`)
            return
        }

        this.logger.warn(`Site ${siteId} exceeding power limit! Current: ${siteLimit.currentLoad}kW, Max: ${siteLimit.maxPower}kW`)

        // Get all active sessions at this site
        const activeSessions = await this.sessionManager.getActiveSessions()
        const siteSessions = activeSessions.filter((s: any) =>
            s.stationId === siteId && siteLimit.chargers.some((c: any) => c.chargerId === s.chargePointId)
        )

        // Priority-based allocation
        const prioritizedSessions = await this.prioritizeSessions(siteSessions)

        // Calculate fair share
        const availablePower = siteLimit.maxPower
        const totalSessions = prioritizedSessions.length

        if (totalSessions === 0) return

        // Allocate power based on priority
        let remainingPower = availablePower
        const allocations: Map<string, number> = new Map()

        // High priority first (Fleet)
        const fleetSessions = prioritizedSessions.filter((p: ChargingPriority) => p.userType === 'FLEET')
        const publicSessions = prioritizedSessions.filter((p: ChargingPriority) => p.userType === 'PUBLIC')

        // Allocate 70% to fleet, 30% to public if both present
        if (fleetSessions.length > 0 && publicSessions.length > 0) {
            const fleetPower = availablePower * 0.7
            const publicPower = availablePower * 0.3

            // Distribute fleet power
            const fleetShare = fleetPower / fleetSessions.length
            fleetSessions.forEach((s: ChargingPriority) => allocations.set(s.sessionId, fleetShare))

            // Distribute public power
            const publicShare = publicPower / publicSessions.length
            publicSessions.forEach((s: ChargingPriority) => allocations.set(s.sessionId, publicShare))
        } else {
            // All same type, distribute equally
            const equalShare = availablePower / totalSessions
            prioritizedSessions.forEach((s: ChargingPriority) => allocations.set(s.sessionId, equalShare))
        }

        // Send charging profiles to chargers via OCPP
        for (const [sessionId, allocatedPower] of allocations.entries()) {
            const session = siteSessions.find((s: any) => s.id === sessionId)
            if (!session) continue

            await this.setChargingProfile(session.stationId, sessionId, allocatedPower)
        }

        this.logger.log(`Rebalanced power for site ${siteId}: ${allocations.size} sessions`)
    }

    /**
     * Prioritize sessions based on user type and other factors
     */
    private async prioritizeSessions(sessions: any[]): Promise<ChargingPriority[]> {
        const priorities: ChargingPriority[] = []

        for (const session of sessions) {
            // Determine user type (would come from user profile in real implementation)
            const userType: 'FLEET' | 'PUBLIC' = session.userId?.startsWith('fleet') ? 'FLEET' : 'PUBLIC'

            // Priority calculation:
            // Fleet users: base priority 100
            // Public users: base priority 50
            // Add time-based boost (earlier sessions get slight priority)
            const basePriority = userType === 'FLEET' ? 100 : 50
            const timeFactor = (Date.now() - session.startedAt.getTime()) / 60000 // minutes
            const priority = basePriority + Math.min(timeFactor * 0.1, 10)

            priorities.push({
                sessionId: session.id,
                userId: session.userId || 'anonymous',
                userType,
                priority,
                requestedPower: 7, // Default 7kW
                chargerId: session.stationId,
                timestamp: session.startedAt
            })
        }

        // Sort by priority (highest first)
        return priorities.sort((a, b) => b.priority - a.priority)
    }

    /**
     * Set charging profile for a charger via OCPP
     */
    private async setChargingProfile(
        chargerId: string,
        sessionId: string,
        maxPower: number
    ): Promise<void> {
        // Send OCPP SetChargingProfile command via Kafka
        const chargingProfile = {
            chargingProfileId: Date.now(),
            stackLevel: 0,
            chargingProfilePurpose: 'TxProfile',
            chargingProfileKind: 'Absolute',
            chargingSchedule: {
                chargingRateUnit: 'W',
                chargingSchedulePeriod: [{
                    startPeriod: 0,
                    limit: maxPower * 1000 // Convert kW to W
                }]
            }
        }

        await this.kafka.emit('ocpp.command.request', {
            chargerId,
            action: 'SetChargingProfile',
            params: {
                connectorId: 0, // All connectors
                csChargingProfiles: chargingProfile
            }
        })

        this.logger.log(`Set charging profile for charger ${chargerId}: ${maxPower}kW`)
    }

    /**
     * Add session to charging queue
     */
    async queueChargingSession(
        userId: string,
        chargerId: string,
        userType: 'FLEET' | 'PUBLIC',
        requestedPower: number = 7
    ): Promise<ChargingPriority> {
        const priority: ChargingPriority = {
            sessionId: `queue_${Date.now()}`,
            userId,
            userType,
            priority: userType === 'FLEET' ? 100 : 50,
            requestedPower,
            chargerId,
            timestamp: new Date()
        }

        // Add to Redis queue
        await this.cache.sAdd(`charger:${chargerId}:queue`, JSON.stringify(priority))

        this.logger.log(`Queued charging request for user ${userId} at charger ${chargerId}`)

        return priority
    }

    /**
     * Process charging queue for a charger
     */
    async processQueue(chargerId: string): Promise<void> {
        const queueItems = await this.cache.sMembers(`charger:${chargerId}:queue`)

        if (queueItems.length === 0) return

        const queue: ChargingPriority[] = queueItems
            .map((item: string) => JSON.parse(item))
            .sort((a: any, b: any) => b.priority - a.priority)

        // Check if charger is available
        const onlineChargers = await this.cache.sMembers('chargers:online')
        if (!onlineChargers.includes(chargerId)) {
            this.logger.warn(`Charger ${chargerId} is offline, cannot process queue`)
            return
        }

        // Get active sessions for this charger
        const sessions = await this.sessionManager.getStationActiveSessions(chargerId)

        if (sessions.length > 0) {
            this.logger.log(`Charger ${chargerId} is busy, queue waiting`)
            return
        }

        // Start charging for highest priority user
        const nextInQueue = queue[0]

        // Remove from queue
        await this.cache.sRem(`charger:${chargerId}:queue`, JSON.stringify(nextInQueue))

        // Send remote start command
        await this.kafka.emit('ocpp.command.request', {
            chargerId,
            action: 'RemoteStartTransaction',
            params: {
                idTag: nextInQueue.userId,
                connectorId: 1
            }
        })

        this.logger.log(`Started charging from queue for user ${nextInQueue.userId} (${nextInQueue.userType})`)
    }

    /**
     * Get queue status for a charger
     */
    async getQueueStatus(chargerId: string): Promise<ChargingPriority[]> {
        const queueItems = await this.cache.sMembers(`charger:${chargerId}:queue`)

        return queueItems
            .map((item: string) => JSON.parse(item))
            .sort((a: any, b: any) => b.priority - a.priority)
    }
}
