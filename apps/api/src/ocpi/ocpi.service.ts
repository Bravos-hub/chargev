import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common'
import { PrismaService } from '../common/prisma/prisma.service'
import { CreateOCPIPartnerDto, UpdateOCPIPartnerDto, OCPICDRDto } from './dto/ocpi.dto'
import axios from 'axios'
import * as crypto from 'crypto'

@Injectable()
export class OCPIService {
    private readonly logger = new Logger(OCPIService.name)

    constructor(private prisma: PrismaService) {}

    // =================== PARTNERS ===================

    async createPartner(orgId: string, dto: CreateOCPIPartnerDto) {
        // Generate tokens if not provided
        const tokenA = dto.tokenA || this.generateToken()

        return this.prisma.oCPIPartner.create({
            data: {
                organizationId: orgId,
                name: dto.name,
                partyId: dto.partyId,
                countryCode: dto.countryCode,
                role: dto.role,
                version: '2.2.1',
                url: dto.versionUrl || '',
                tokenA,
                tokenB: dto.tokenB,
                endpoints: dto.credentials,
            },
        })
    }

    async findAllPartners(orgId: string) {
        return this.prisma.oCPIPartner.findMany({
            where: { organizationId: orgId },
            include: {
                _count: { select: { cdrs: true } },
            },
        })
    }

    async findPartner(id: string) {
        const partner = await this.prisma.oCPIPartner.findUnique({
            where: { id },
        })

        if (!partner) throw new NotFoundException('OCPI Partner not found')
        return partner
    }

    async updatePartner(id: string, dto: UpdateOCPIPartnerDto) {
        await this.findPartner(id)

        return this.prisma.oCPIPartner.update({
            where: { id },
            data: {
                name: dto.name,
                status: dto.status,
                url: dto.versionUrl,
                tokenA: dto.tokenA,
                tokenB: dto.tokenB,
                endpoints: dto.credentials,
            },
        })
    }

    async deletePartner(id: string) {
        await this.findPartner(id)
        await this.prisma.oCPIPartner.delete({ where: { id } })
        return { success: true }
    }

    async activatePartner(id: string) {
        return this.prisma.oCPIPartner.update({
            where: { id },
            data: { status: 'ACTIVE' },
        })
    }

    async suspendPartner(id: string) {
        return this.prisma.oCPIPartner.update({
            where: { id },
            data: { status: 'SUSPENDED' },
        })
    }

    // =================== CREDENTIALS EXCHANGE ===================

    async initiateCredentialsExchange(id: string) {
        const partner = await this.findPartner(id)

        if (!partner.url) {
            throw new BadRequestException('Partner version URL not configured')
        }

        try {
            // OCPI credentials handshake
            const versionsResponse = await axios.get(partner.url, {
                headers: { Authorization: `Token ${partner.tokenA}` },
            })

            this.logger.log(`Versions response: ${JSON.stringify(versionsResponse.data)}`)

            // Update partner with version info
            await this.prisma.oCPIPartner.update({
                where: { id },
                data: {
                    version: versionsResponse.data.data?.[0]?.version || '2.2.1',
                    lastSyncAt: new Date(),
                },
            })

            return { success: true, versions: versionsResponse.data }
        } catch (error: any) {
            this.logger.error(`Credentials exchange failed: ${error.message}`)
            throw new BadRequestException(`Failed to exchange credentials: ${error.message}`)
        }
    }

    // =================== CDRs ===================

    async createCDR(dto: OCPICDRDto) {
        return this.prisma.oCPICDR.create({
            data: {
                partnerId: dto.partnerId,
                externalId: dto.cdrId,
                sessionId: dto.sessionId,
                startDateTime: new Date(),
                endDateTime: new Date(),
                energyKwh: 0,
                totalCost: 0,
                currency: 'USD',
                status: 'SENT',
                rawData: dto.cdrData,
            },
        })
    }

    async findCDRs(partnerId?: string, startDate?: string, endDate?: string) {
        const where: any = {}
        if (partnerId) where.partnerId = partnerId
        if (startDate || endDate) {
            where.createdAt = {}
            if (startDate) where.createdAt.gte = new Date(startDate)
            if (endDate) where.createdAt.lte = new Date(endDate)
        }

        return this.prisma.oCPICDR.findMany({
            where,
            include: { partner: { select: { name: true, partyId: true } } },
            orderBy: { createdAt: 'desc' },
        })
    }

    async findCDR(id: string) {
        const cdr = await this.prisma.oCPICDR.findUnique({
            where: { id },
            include: { partner: true },
        })

        if (!cdr) throw new NotFoundException('CDR not found')
        return cdr
    }

    async syncCDRs(partnerId: string) {
        const partner = await this.findPartner(partnerId)

        // Implementation would fetch CDRs from partner's endpoint
        // This is a placeholder for the actual OCPI CDR sync logic

        await this.prisma.oCPIPartner.update({
            where: { id: partnerId },
            data: { lastSyncAt: new Date() },
        })

        return { success: true, message: 'CDR sync initiated' }
    }

    // =================== LOCATIONS ===================

    async getLocations(orgId: string) {
        // Convert stations to OCPI location format
        const stations = await this.prisma.station.findMany({
            where: { orgId },
            include: {
                chargePoints: {
                    include: { connectors: true },
                },
            },
        })

        return stations.map(station => this.stationToOCPILocation(station))
    }

    async pushLocations(partnerId: string) {
        const partner = await this.findPartner(partnerId)

        if (partner.role !== 'EMSP') {
            throw new BadRequestException('Can only push locations to EMSP partners')
        }

        // Get locations to push
        const locations = await this.getLocations(partner.organizationId)

        // Implementation would POST locations to partner's endpoint
        this.logger.log(`Would push ${locations.length} locations to partner ${partner.name}`)

        return { success: true, locationsPushed: locations.length }
    }

    // =================== HELPERS ===================

    private generateToken(): string {
        return crypto.randomBytes(32).toString('base64url')
    }

    private stationToOCPILocation(station: any) {
        return {
            country_code: 'KE', // Default, should come from config
            party_id: station.org?.id?.substring(0, 3).toUpperCase() || 'EVZ',
            id: station.id,
            publish: true,
            name: station.name,
            address: station.address,
            city: station.city || 'Unknown',
            postal_code: station.postalCode || '',
            country: 'KEN',
            coordinates: {
                latitude: String(station.latitude),
                longitude: String(station.longitude),
            },
            evses: station.chargePoints?.map((cp: any) => ({
                uid: cp.id,
                evse_id: `${station.id}*${cp.id}`,
                status: cp.status === 'ONLINE' ? 'AVAILABLE' : 'UNAVAILABLE',
                connectors: cp.connectors?.map((c: any) => ({
                    id: c.id,
                    standard: c.type,
                    format: 'CABLE',
                    power_type: c.powerType,
                    max_voltage: 400,
                    max_amperage: c.maxPower ? (c.maxPower * 1000) / 400 : 32,
                    max_electric_power: c.maxPower ? c.maxPower * 1000 : 22000,
                })) || [],
            })) || [],
            last_updated: station.updatedAt.toISOString(),
        }
    }
}
