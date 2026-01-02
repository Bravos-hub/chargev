import { Test, TestingModule } from '@nestjs/testing'
import { INestApplication } from '@nestjs/common'
import * as request from 'supertest'
import { AppModule } from '../src/app.module'
import { PrismaService } from '../src/common/prisma/prisma.service'
import { setupTestApp, createTestUser, cleanupTestData, getAuthToken } from './setup'

describe('Stations (e2e)', () => {
    let app: INestApplication
    let prisma: PrismaService
    let authToken: string
    let testData: { tenant: any; org: any; user: any; fleet: any }
    let createdStationId: string

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile()

        app = await setupTestApp(moduleFixture)
        prisma = moduleFixture.get<PrismaService>(PrismaService)

        // Create test user and get auth token
        testData = await createTestUser(prisma)
        authToken = await getAuthToken(app, 'test@evzone.com', 'testpassword123')
    })

    afterAll(async () => {
        if (prisma) {
            await cleanupTestData(prisma)
        }
        if (app) {
            await app.close()
        }
    })

    describe('POST /stations', () => {
        it('should create a new station', async () => {
            const createDto = {
                code: 'TEST-STN-001',
                name: 'Test Station',
                region: 'Test Region',
                country: 'US',
                address: '123 Test Street',
                lat: 40.7128,
                lng: -74.0060,
                type: 'CHARGE',
                status: 'ONLINE',
                connectors: 2,
            }

            const response = await request(app.getHttpServer())
                .post('/api/v1/stations')
                .set('Authorization', `Bearer ${authToken}`)
                .send(createDto)
                .expect(201)

            expect(response.body.data).toBeDefined()
            expect(response.body.data.code).toBe(createDto.code)
            expect(response.body.data.name).toBe(createDto.name)
            expect(response.body.data.status).toBe('ONLINE')

            createdStationId = response.body.data.id
        })

        it('should fail to create station with duplicate code', async () => {
            const createDto = {
                code: 'TEST-STN-001',
                name: 'Duplicate Station',
                region: 'Test Region',
                country: 'US',
                address: '456 Test Avenue',
                type: 'CHARGE',
            }

            await request(app.getHttpServer())
                .post('/api/v1/stations')
                .set('Authorization', `Bearer ${authToken}`)
                .send(createDto)
                .expect(400)
        })

        it('should fail without authentication', async () => {
            await request(app.getHttpServer())
                .post('/api/v1/stations')
                .send({ code: 'TEST', name: 'Test' })
                .expect(401)
        })
    })

    describe('GET /stations', () => {
        it('should return a list of stations', async () => {
            const response = await request(app.getHttpServer())
                .get('/api/v1/stations')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200)

            expect(response.body.data).toBeDefined()
            expect(response.body.data.stations).toBeInstanceOf(Array)
            expect(response.body.data.total).toBeGreaterThanOrEqual(1)
        })

        it('should filter stations by status', async () => {
            const response = await request(app.getHttpServer())
                .get('/api/v1/stations')
                .query({ status: 'ONLINE' })
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200)

            expect(response.body.data.stations).toBeInstanceOf(Array)
            response.body.data.stations.forEach((station: any) => {
                expect(station.status).toBe('ONLINE')
            })
        })

        it('should support pagination', async () => {
            const response = await request(app.getHttpServer())
                .get('/api/v1/stations')
                .query({ limit: 1, offset: 0 })
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200)

            expect(response.body.data.limit).toBe(1)
            expect(response.body.data.stations.length).toBeLessThanOrEqual(1)
        })
    })

    describe('GET /stations/:id', () => {
        it('should return station details', async () => {
            const response = await request(app.getHttpServer())
                .get(`/api/v1/stations/${createdStationId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200)

            expect(response.body.data).toBeDefined()
            expect(response.body.data.id).toBe(createdStationId)
            expect(response.body.data.code).toBe('TEST-STN-001')
        })

        it('should return 404 for non-existent station', async () => {
            await request(app.getHttpServer())
                .get('/api/v1/stations/non-existent-id')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(404)
        })
    })

    describe('GET /stations/:id/stats', () => {
        it('should return station statistics', async () => {
            const response = await request(app.getHttpServer())
                .get(`/api/v1/stations/${createdStationId}/stats`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200)

            expect(response.body.data).toBeDefined()
            expect(response.body.data.station).toBeDefined()
            expect(response.body.data.sessions).toBeDefined()
            expect(response.body.data.energy).toBeDefined()
        })
    })

    describe('PATCH /stations/:id', () => {
        it('should update station', async () => {
            const updateDto = {
                name: 'Updated Test Station',
                status: 'MAINTENANCE',
            }

            const response = await request(app.getHttpServer())
                .patch(`/api/v1/stations/${createdStationId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .send(updateDto)
                .expect(200)

            expect(response.body.data.name).toBe(updateDto.name)
            expect(response.body.data.status).toBe(updateDto.status)
        })
    })

    describe('DELETE /stations/:id', () => {
        it('should delete station', async () => {
            await request(app.getHttpServer())
                .delete(`/api/v1/stations/${createdStationId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200)

            // Verify deletion
            await request(app.getHttpServer())
                .get(`/api/v1/stations/${createdStationId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(404)
        })
    })
})

