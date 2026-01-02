import { Test, TestingModule } from '@nestjs/testing'
import { INestApplication } from '@nestjs/common'
import * as request from 'supertest'
import { AppModule } from '../src/app.module'
import { PrismaService } from '../src/common/prisma/prisma.service'
import { setupTestApp, createTestUser, cleanupTestData, getAuthToken } from './setup'

describe('Pricing (e2e)', () => {
    let app: INestApplication
    let prisma: PrismaService
    let authToken: string
    let testData: { tenant: any; org: any; user: any; fleet: any }
    let testStation: any
    let testPricing: any

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile()

        app = await setupTestApp(moduleFixture)
        prisma = moduleFixture.get<PrismaService>(PrismaService)

        testData = await createTestUser(prisma)
        authToken = await getAuthToken(app, 'test@evzone.com', 'testpassword123')

        // Create a test station for pricing tests
        testStation = await prisma.station.create({
            data: {
                code: 'PRICE-TEST-001',
                name: 'Pricing Test Station',
                region: 'Test Region',
                country: 'US',
                address: '123 Test St',
                orgId: testData.org.id,
                type: 'CHARGE',
                status: 'ONLINE',
            },
        })
    })

    afterAll(async () => {
        if (prisma) {
            await cleanupTestData(prisma)
        }
        if (app) {
            await app.close()
        }
    })

    describe('POST /pricing/stations/:stationId', () => {
        it('should create pricing for a station', async () => {
            const createDto = {
                type: 'ENERGY_BASED',
                perKwh: 0.35,
                perMinute: 0.02,
                currency: 'USD',
            }

            const response = await request(app.getHttpServer())
                .post(`/api/v1/pricing/stations/${testStation.id}`)
                .set('Authorization', `Bearer ${authToken}`)
                .send(createDto)
                .expect(201)

            expect(response.body.data).toBeDefined()
            expect(response.body.data.perKwh).toBe('0.35')
            expect(response.body.data.currency).toBe('USD')

            testPricing = response.body.data
        })

        it('should fail to create duplicate pricing for station', async () => {
            const createDto = {
                type: 'FLAT_RATE',
                flatRate: 5.00,
            }

            await request(app.getHttpServer())
                .post(`/api/v1/pricing/stations/${testStation.id}`)
                .set('Authorization', `Bearer ${authToken}`)
                .send(createDto)
                .expect(400)
        })
    })

    describe('GET /pricing/stations/:stationId', () => {
        it('should return pricing for a station', async () => {
            const response = await request(app.getHttpServer())
                .get(`/api/v1/pricing/stations/${testStation.id}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200)

            expect(response.body.data).toBeDefined()
            expect(response.body.data.stationId).toBe(testStation.id)
        })
    })

    describe('POST /pricing/stations/:stationId/rules', () => {
        it('should create a pricing rule', async () => {
            const createDto = {
                name: 'Peak Hours',
                type: 'TIME_OF_USE',
                priority: 10,
                conditions: { startHour: 17, endHour: 21 },
                adjustment: { type: 'multiplier', value: 1.5 },
                active: true,
            }

            const response = await request(app.getHttpServer())
                .post(`/api/v1/pricing/stations/${testStation.id}/rules`)
                .set('Authorization', `Bearer ${authToken}`)
                .send(createDto)
                .expect(201)

            expect(response.body.data).toBeDefined()
            expect(response.body.data.name).toBe(createDto.name)
            expect(response.body.data.type).toBe('TIME_OF_USE')
        })
    })

    describe('GET /pricing/stations/:stationId/rules', () => {
        it('should return pricing rules for a station', async () => {
            const response = await request(app.getHttpServer())
                .get(`/api/v1/pricing/stations/${testStation.id}/rules`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200)

            expect(response.body.data).toBeInstanceOf(Array)
            expect(response.body.data.length).toBeGreaterThanOrEqual(1)
        })
    })

    describe('POST /pricing/calculate', () => {
        it('should calculate price for a session', async () => {
            const calculateDto = {
                stationId: testStation.id,
                energyKwh: 25,
                durationMinutes: 45,
            }

            const response = await request(app.getHttpServer())
                .post('/api/v1/pricing/calculate')
                .set('Authorization', `Bearer ${authToken}`)
                .send(calculateDto)
                .expect(201)

            expect(response.body.data).toBeDefined()
            expect(response.body.data.total).toBeGreaterThan(0)
            expect(response.body.data.currency).toBe('USD')
            expect(response.body.data.energyCost).toBeDefined()
        })
    })

    describe('GET /pricing/stations/:stationId/current-rate', () => {
        it('should return current rate for a station', async () => {
            const response = await request(app.getHttpServer())
                .get(`/api/v1/pricing/stations/${testStation.id}/current-rate`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200)

            expect(response.body.data).toBeDefined()
            expect(response.body.data.perKwh).toBeDefined()
            expect(response.body.data.currency).toBe('USD')
        })
    })

    describe('PUT /pricing/stations/:stationId', () => {
        it('should update pricing', async () => {
            const updateDto = {
                perKwh: 0.40,
                touEnabled: true,
            }

            const response = await request(app.getHttpServer())
                .put(`/api/v1/pricing/stations/${testStation.id}`)
                .set('Authorization', `Bearer ${authToken}`)
                .send(updateDto)
                .expect(200)

            expect(response.body.data.perKwh).toBe('0.4')
            expect(response.body.data.touEnabled).toBe(true)
        })
    })
})

