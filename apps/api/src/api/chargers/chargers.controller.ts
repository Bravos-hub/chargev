import { Controller, Get, Post, Body, Param, Query, HttpException, HttpStatus } from '@nestjs/common'
import { PrismaService } from '../../common/prisma/prisma.service'
import { CacheService } from '../../integrations/redis/cache.service'
import { KafkaService } from '../../integrations/kafka/kafka.service'

@Controller('api/chargers')
export class ChargersController {
    constructor(
        private prisma: PrismaService,
        private cache: CacheService,
        private kafka: KafkaService
    ) { }

    /**
     * Get all chargers with real-time status
     * GET /api/chargers
     */
    @Get()
    async getAllChargers(@Query('status') statusFilter?: string) {
        const chargers = await this.prisma.station.findMany({
            orderBy: { createdAt: 'desc' }
        })

        const onlineChargerIds = await this.cache.sMembers('chargers:online')
        const onlineSet = new Set(onlineChargerIds)

        // Enrich with real-time status from Redis
        const enrichedChargers = await Promise.all(
            chargers.map(async (charger) => {
                const isOnline = onlineSet.has(charger.id)
                const cachedStatus = await this.cache.get<any>(`charger:${charger.id}:status`)

                return {
                    id: charger.id,
                    code: charger.code,
                    name: charger.name,
                    address: charger.address,
                    latitude: charger.latitude,
                    longitude: charger.longitude,
                    status: charger.status,
                    isOnline,
                    lastSeen: cachedStatus?.lastConnected || charger.updatedAt.toISOString(),
                    createdAt: charger.createdAt,
                    updatedAt: charger.updatedAt
                }
            })
        )

        // Apply status filter if provided
        if (statusFilter) {
            if (statusFilter === 'ONLINE') {
                return enrichedChargers.filter(c => c.isOnline)
            } else if (statusFilter === 'OFFLINE') {
                return enrichedChargers.filter(c => !c.isOnline)
            }
        }

        return enrichedChargers
    }

    /**
     * Get single charger with detailed status
     * GET /api/chargers/:id
     */
    @Get(':id')
    async getCharger(@Param('id') id: string) {
        const charger = await this.prisma.station.findUnique({
            where: { id }
        })

        if (!charger) {
            throw new HttpException('Charger not found', HttpStatus.NOT_FOUND)
        }

        const onlineChargerIds = await this.cache.sMembers('chargers:online')
        const isOnline = onlineChargerIds.includes(id)

        // Get cached status and boot info
        const cachedStatus = await this.cache.get<any>(`charger:${id}:status`)
        const bootInfo = await this.cache.hGetAll(`charger:${id}:info`)

        // Get connector statuses (assuming 2 connectors for now)
        const connectors = await Promise.all([1, 2].map(async (connectorId) => {
            const connectorStatus = await this.cache.get<any>(`connector:${id}:${connectorId}`)
            return {
                id: connectorId,
                status: connectorStatus?.status || 'Unknown',
                errorCode: connectorStatus?.errorCode || 'NoError',
                lastUpdate: connectorStatus?.timestamp
            }
        }))

        return {
            ...charger,
            isOnline,
            lastSeen: cachedStatus?.lastConnected || charger.updatedAt.toISOString(),
            bootInfo: bootInfo?.bootInfo ? JSON.parse(bootInfo.bootInfo) : null,
            lastBoot: bootInfo?.lastBoot,
            connectors
        }
    }

    /**
     * Get charger status summary
     * GET /api/chargers/:id/status
     */
    @Get(':id/status')
    async getChargerStatus(@Param('id') id: string) {
        const onlineChargerIds = await this.cache.sMembers('chargers:online')
        const isOnline = onlineChargerIds.includes(id)
        const cachedStatus = await this.cache.get<any>(`charger:${id}:status`)

        if (!isOnline && !cachedStatus) {
            throw new HttpException('Charger not found or offline', HttpStatus.NOT_FOUND)
        }

        return {
            chargerId: id,
            isOnline,
            status: cachedStatus?.status || 'UNKNOWN',
            lastSeen: cachedStatus?.lastConnected || new Date().toISOString()
        }
    }

    /**
     * Send remote command to charger
     * POST /api/chargers/:id/command
     */
    @Post(':id/command')
    async sendCommand(
        @Param('id') id: string,
        @Body() commandDto: {
            action: string
            params: any
        }
    ) {
        // Check if charger is online
        const onlineChargerIds = await this.cache.sMembers('chargers:online')
        if (!onlineChargerIds.includes(id)) {
            throw new HttpException('Charger is offline', HttpStatus.BAD_REQUEST)
        }

        // Validate action
        const validActions = [
            'RemoteStartTransaction',
            'RemoteStopTransaction',
            'Reset',
            'UnlockConnector',
            'ChangeConfiguration',
            'GetConfiguration'
        ]

        if (!validActions.includes(commandDto.action)) {
            throw new HttpException('Invalid command action', HttpStatus.BAD_REQUEST)
        }

        // Publish command to Kafka for CSMS to execute
        const responseKey = `cmd_${Date.now()}_${id}`

        await this.kafka.emit('ocpp.command.request', {
            chargerId: id,
            action: commandDto.action,
            params: commandDto.params,
            responseKey
        })

        return {
            success: true,
            message: `Command ${commandDto.action} sent to charger ${id}`,
            responseKey,
            note: 'Monitor ocpp.command.response topic for result'
        }
    }

    /**
     * Get charger statistics
     * GET /api/chargers/:id/stats
     */
    @Get(':id/stats')
    async getChargerStats(@Param('id') id: string) {
        const sessions = await this.prisma.chargingSession.findMany({
            where: { stationId: id },
            orderBy: { startedAt: 'desc' },
            take: 100
        })

        const totalSessions = sessions.length
        const completedSessions = sessions.filter(s => s.status === 'COMPLETED').length
        const totalEnergy = sessions.reduce((sum, s) => sum + s.energyDelivered, 0)
        const totalRevenue = sessions.reduce((sum, s) => sum + s.cost, 0)

        return {
            chargerId: id,
            totalSessions,
            completedSessions,
            totalEnergy,
            totalRevenue,
            averageEnergy: totalSessions > 0 ? totalEnergy / totalSessions : 0,
            averageRevenue: totalSessions > 0 ? totalRevenue / totalSessions : 0
        }
    }
}
