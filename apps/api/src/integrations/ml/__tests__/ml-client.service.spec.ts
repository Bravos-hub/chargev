/**
 * Unit tests for ML Client Service.
 */
import { Test, TestingModule } from '@nestjs/testing'
import { ConfigService } from '@nestjs/config'
import { CacheService } from '../../redis/cache.service'
import { MLClientService } from '../ml-client.service'
import axios from 'axios'

// Mock axios
jest.mock('axios')
const mockedAxios = axios as jest.Mocked<typeof axios>

describe('MLClientService', () => {
  let service: MLClientService
  let cacheService: jest.Mocked<CacheService>
  let configService: jest.Mocked<ConfigService>

  beforeEach(async () => {
    // Reset mocks
    jest.clearAllMocks()

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MLClientService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config: Record<string, any> = {
                ML_SERVICE_URL: 'http://localhost:8000',
                ML_SERVICE_API_KEY: 'test-key',
                ML_SERVICE_TIMEOUT: 5000,
                ML_SERVICE_ENABLED: true,
              }
              return config[key]
            }),
          },
        },
        {
          provide: CacheService,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            delete: jest.fn(),
          },
        },
      ],
    }).compile()

    service = module.get<MLClientService>(MLClientService)
    cacheService = module.get(CacheService)
    configService = module.get(ConfigService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('healthCheck', () => {
    it('should return health status', async () => {
      const mockResponse = {
        data: { status: 'healthy', service: 'evzone-ml-service', version: '1.0.0' },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      }

      // Mock axios.create to return a mock instance
      const mockAxiosInstance = {
        request: jest.fn().mockResolvedValue(mockResponse),
      }
      mockedAxios.create = jest.fn().mockReturnValue(mockAxiosInstance as any)

      // Re-instantiate service to use mocked axios
      const serviceWithMock = new MLClientService(configService, cacheService)
      const result = await serviceWithMock.healthCheck()
      expect(result.status).toBe('healthy')
    })
  })

  describe('predictFailure', () => {
    it('should return prediction from cache if available', async () => {
      const cachedPrediction = {
        charger_id: 'test-1',
        failure_probability: 0.15,
        confidence: 0.85,
        recommended_action: 'Monitor',
        model_version: 'v1.0.0',
        timestamp: new Date(),
      }

      cacheService.get.mockResolvedValue(cachedPrediction as any)

      const result = await service.predictFailure({
        charger_id: 'test-1',
        metrics: {} as any,
      })

      expect(result).toEqual(cachedPrediction)
    })

    it('should call ML service if not cached', async () => {
      cacheService.get.mockResolvedValue(null)

      const mockResponse = {
        data: {
          charger_id: 'test-1',
          failure_probability: 0.15,
          confidence: 0.85,
          recommended_action: 'Monitor',
          model_version: 'v1.0.0',
          timestamp: new Date(),
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      }

      const mockAxiosInstance = {
        request: jest.fn().mockResolvedValue(mockResponse),
      }
      mockedAxios.create = jest.fn().mockReturnValue(mockAxiosInstance as any)

      const serviceWithMock = new MLClientService(configService, cacheService)
      const result = await serviceWithMock.predictFailure({
        charger_id: 'test-1',
        metrics: {} as any,
      })

      expect(result.charger_id).toBe('test-1')
      expect(cacheService.set).toHaveBeenCalled()
    })
  })
})

