/**
 * ML Service Client for integrating with the standalone ML microservice.
 * Provides HTTP client with retry logic, circuit breaker, and caching.
 */
import {
  Injectable,
  Logger,
  HttpException,
  HttpStatus,
  OnModuleInit,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
// Note: Using axios directly (already in dependencies)
// If you prefer @nestjs/axios, install it: npm install @nestjs/axios
import axios, { AxiosError, AxiosInstance } from 'axios'
import { CacheService } from '../redis/cache.service'
import {
  FailurePredictionRequest,
  FailurePredictionResponse,
  MaintenanceScheduleRequest,
  MaintenanceScheduleResponse,
  BatchPredictionRequest,
  BatchPredictionResponse,
  ModelListResponse,
  HealthResponse,
} from './ml-client.interface'

@Injectable()
export class MLClientService implements OnModuleInit {
  private readonly logger = new Logger(MLClientService.name)
  private readonly baseUrl: string
  private readonly apiKey: string
  private readonly timeout: number
  private readonly enabled: boolean
  private readonly cachePrefix = 'ml:prediction'
  private circuitBreakerOpen = false
  private circuitBreakerFailures = 0
  private readonly circuitBreakerThreshold = 5
  private readonly circuitBreakerResetTime = 60000 // 1 minute

  private readonly httpClient: AxiosInstance

  constructor(
    private readonly config: ConfigService,
    private readonly cache: CacheService,
  ) {
    this.baseUrl = this.config.get<string>('ML_SERVICE_URL') || 'http://localhost:8000'
    this.apiKey = this.config.get<string>('ML_SERVICE_API_KEY') || ''
    this.timeout = this.config.get<number>('ML_SERVICE_TIMEOUT') || 5000
    this.enabled = this.config.get<boolean>('ML_SERVICE_ENABLED') || false

    // Create axios instance
    this.httpClient = axios.create({
      baseURL: this.baseUrl,
      timeout: this.timeout,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.apiKey,
      },
    })
  }

  async onModuleInit() {
    if (this.enabled) {
      this.logger.log(`ML Service client initialized: ${this.baseUrl}`)
      // Test connection
      try {
        await this.healthCheck()
        this.logger.log('ML Service is available')
      } catch (error) {
        this.logger.warn('ML Service is not available, predictions will be disabled')
      }
    } else {
      this.logger.log('ML Service client is disabled (ML_SERVICE_ENABLED=false)')
    }
  }

  /**
   * Check if ML service is enabled and available.
   */
  private isAvailable(): boolean {
    if (!this.enabled) {
      return false
    }

    if (this.circuitBreakerOpen) {
      // Check if we should reset circuit breaker
      if (Date.now() - this.circuitBreakerResetTime > this.circuitBreakerResetTime) {
        this.circuitBreakerOpen = false
        this.circuitBreakerFailures = 0
        this.logger.log('Circuit breaker reset')
      } else {
        return false
      }
    }

    return true
  }

  /**
   * Record a failure for circuit breaker.
   */
  private recordFailure() {
    this.circuitBreakerFailures++
    if (this.circuitBreakerFailures >= this.circuitBreakerThreshold) {
      this.circuitBreakerOpen = true
      this.logger.warn('Circuit breaker opened - ML service unavailable')
    }
  }

  /**
   * Record a success for circuit breaker.
   */
  private recordSuccess() {
    this.circuitBreakerFailures = 0
    if (this.circuitBreakerOpen) {
      this.circuitBreakerOpen = false
      this.logger.log('Circuit breaker closed - ML service available')
    }
  }

  /**
   * Make HTTP request with retry and error handling.
   */
  private async makeRequest<T>(
    method: 'GET' | 'POST',
    endpoint: string,
    data?: any,
    retries = 2,
  ): Promise<T> {
    if (!this.isAvailable()) {
      throw new HttpException(
        'ML Service is unavailable',
        HttpStatus.SERVICE_UNAVAILABLE,
      )
    }

    let lastError: any
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await this.httpClient.request<T>({
          method,
          url: endpoint,
          data,
        })

        this.recordSuccess()
        return response.data
      } catch (error) {
        lastError = error
        if (attempt < retries) {
          // Wait before retry (exponential backoff)
          await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)))
          continue
        }

        this.recordFailure()
        const axiosError = error as AxiosError
        this.logger.error(
          `ML Service request failed: ${axiosError.message}`,
          axiosError.stack,
        )
        throw new HttpException(
          `ML Service error: ${axiosError.message}`,
          axiosError.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
        )
      }
    }

    // Should never reach here, but TypeScript needs it
    throw lastError
  }

  /**
   * Health check for ML service.
   */
  async healthCheck(): Promise<HealthResponse> {
    try {
      return await this.makeRequest<HealthResponse>('GET', '/health')
    } catch (error) {
      this.logger.warn('ML Service health check failed')
      throw error
    }
  }

  /**
   * Predict charger failure.
   */
  async predictFailure(
    request: FailurePredictionRequest,
    useCache = true,
  ): Promise<FailurePredictionResponse> {
    const cacheKey = `${this.cachePrefix}:failure:${request.charger_id}`

    // Check cache first
    if (useCache) {
      const cached = await this.cache.get<FailurePredictionResponse>(cacheKey)
      if (cached) {
        this.logger.debug(`Cache hit for charger ${request.charger_id}`)
        return cached
      }
    }

    try {
      const response = await this.makeRequest<FailurePredictionResponse>(
        'POST',
        '/api/v1/predictions/failure',
        request,
      )

      // Cache result (TTL: 1 hour)
      if (useCache) {
        await this.cache.set(cacheKey, response, 3600)
      }

      return response
    } catch (error) {
      this.logger.error(
        `Failed to predict failure for charger ${request.charger_id}: ${error}`,
      )
      throw error
    }
  }

  /**
   * Get maintenance schedule prediction.
   */
  async predictMaintenance(
    request: MaintenanceScheduleRequest,
  ): Promise<MaintenanceScheduleResponse> {
    try {
      return await this.makeRequest<MaintenanceScheduleResponse>(
        'POST',
        '/api/v1/predictions/maintenance',
        request,
      )
    } catch (error) {
      this.logger.error(
        `Failed to predict maintenance for charger ${request.charger_id}: ${error}`,
      )
      throw error
    }
  }

  /**
   * Get cached prediction for a charger.
   */
  async getCachedPrediction(
    chargerId: string,
  ): Promise<FailurePredictionResponse | null> {
    const cacheKey = `${this.cachePrefix}:failure:${chargerId}`
    return await this.cache.get<FailurePredictionResponse>(cacheKey)
  }

  /**
   * Batch predictions for multiple chargers.
   */
  async batchPredictions(
    request: BatchPredictionRequest,
  ): Promise<BatchPredictionResponse> {
    try {
      return await this.makeRequest<BatchPredictionResponse>(
        'POST',
        '/api/v1/predictions/batch',
        request,
      )
    } catch (error) {
      this.logger.error(`Batch prediction failed: ${error}`)
      throw error
    }
  }

  /**
   * List available models.
   */
  async listModels(): Promise<ModelListResponse> {
    try {
      return await this.makeRequest<ModelListResponse>('GET', '/api/v1/models')
    } catch (error) {
      this.logger.error(`Failed to list models: ${error}`)
      throw error
    }
  }

  /**
   * Invalidate cache for a charger.
   */
  async invalidateCache(chargerId: string): Promise<void> {
    const cacheKey = `${this.cachePrefix}:failure:${chargerId}`
    await this.cache.delete(cacheKey)
    this.logger.debug(`Cache invalidated for charger ${chargerId}`)
  }
}

