import { Test, TestingModule } from '@nestjs/testing'
import { INestApplication, ValidationPipe } from '@nestjs/common'
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify'
import { PrismaService } from '../src/common/prisma/prisma.service'
import * as bcrypt from 'bcrypt'

export interface TestContext {
    app: INestApplication
    prisma: PrismaService
    authToken: string
    testUser: {
        id: string
        email: string
        tenantId: string
        orgId: string
    }
}

export async function setupTestApp(moduleRef: TestingModule): Promise<NestFastifyApplication> {
    const app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter())

    app.setGlobalPrefix('api/v1')
    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
            transformOptions: { enableImplicitConversion: true },
        })
    )

    const { TransformInterceptor } = await import('../src/common/interceptors/transform.interceptor')
    const { HttpExceptionFilter } = await import('../src/common/filters/http-exception.filter')
    app.useGlobalInterceptors(new TransformInterceptor())
    app.useGlobalFilters(new HttpExceptionFilter())

    console.log('Initializing app...')
    await app.init()
    await app.getHttpAdapter().getInstance().ready()
    console.log('App initialized.')
    return app
}

export async function createTestUser(prisma: PrismaService): Promise<{
    tenant: any
    org: any
    user: any
    fleet: any
}> {
    // Clean up existing test data
    await cleanupTestData(prisma)

    // Create tenant
    const tenant = await prisma.tenant.create({
        data: {
            name: 'Test Tenant',
        },
    })

    // Create organization
    const org = await prisma.organization.create({
        data: {
            tenantId: tenant.id,
            name: 'Test Organization',
            type: 'CHARGING_NETWORK',
        },
    })

    // Create fleet
    const fleet = await prisma.fleet.create({
        data: {
            name: 'Test Fleet',
            orgId: org.id,
        },
    })

    // Create test user
    const passwordHash = await bcrypt.hash('testpassword123', 10)
    const user = await prisma.user.create({
        data: {
            email: 'test@evzone.com',
            passwordHash,
            name: 'Test User',
            role: 'SUPER_ADMIN',
            tenantId: tenant.id,
            orgId: org.id,
            verified: true,
        },
    })

    // Create wallet for user
    await prisma.wallet.create({
        data: {
            userId: user.id,
            balance: 100.00,
            currency: 'USD',
        },
    })

    return { tenant, org, user, fleet }
}

export async function cleanupTestData(prisma: PrismaService): Promise<void> {
    console.log('Cleaning up test data...')
    const tables = [
        // Level 4 (Dependencies on Level 3)
        'meterValue',
        'walletTransaction',
        'packInspection',
        'swapSession',
        'driverRating',
        'driverPayout',
        'driverShift',
        'shuttleTrip',
        'tourBooking',
        'rentalBooking',
        'routeStop',
        'job',
        'incident',
        'pricingRule',
        'rating',
        'savedRoute',
        'subscription',
        'payment',
        'webhookLog',
        'ocpicdr',

        // Level 3 (Dependencies on Level 2)
        'chargingSession',
        'booking',
        'batteryPack',
        'shelf',
        'connector',
        'chargePoint',
        'smartChargingPolicy',
        'chargerAccess',
        'schedule',
        'pricing',
        'vehicleDiagnostic',
        'trip',
        'maintenanceRecord',
        'faultCode',
        'rentalVehicle',
        'student',
        'shuttleRoute',
        'tour',
        'subscriptionPlan',
        'apiKey',
        'webhook',
        'ocpiPartner',
        'swapPlan',
        'payout', // Added based on OCPI/Roaming context if exists

        // Level 2 (Dependencies on Level 1)
        'station',
        'swapStation',
        'swapProvider',
        'driver',
        'vehicle',
        'fleet',
        'refreshToken',
        'wallet',
        'invoice',
        'settlement',
        'auditLog',
        'metadata',
        'mediaAsset',
        'otpCode',

        // Level 1 (Core models)
        'user',
        'organization',
        'tenant',
    ]

    for (const table of tables) {
        try {
            console.log(`Deleting data from ${table}...`)
            await (prisma as any)[table].deleteMany()
        } catch (error: any) {
            console.log(`Failed to delete from ${table}: ${error.message}`)
        }
    }
}

export async function getAuthToken(
    app: INestApplication,
    email: string,
    password: string
): Promise<string> {
    const supertest = await import('supertest')
    const request = supertest.default || supertest
    const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email, password })

    if (response.status !== 200 && response.status !== 201) {
        throw new Error(`Failed to get auth token: ${JSON.stringify(response.body)}`)
    }

    return response.body.data?.accessToken || response.body.accessToken
}

export function generateTestId(): string {
    return `test-${Date.now()}-${Math.random().toString(36).substring(7)}`
}

