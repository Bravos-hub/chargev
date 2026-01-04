/**
 * Currency Converter Service
 * Provides real-time currency conversion with exchange rate caching.
 */
import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { CacheService } from '../integrations/redis/cache.service'
import axios from 'axios'

export interface ExchangeRate {
  from: string
  to: string
  rate: number
  timestamp: Date
  source: string
}

export interface ConversionResult {
  from: string
  to: string
  amount: number
  convertedAmount: number
  rate: number
  timestamp: Date
}

@Injectable()
export class CurrencyConverterService {
  private readonly logger = new Logger(CurrencyConverterService.name)
  private readonly cacheKeyPrefix = 'exchange_rate:'
  private readonly cacheTTL = 3600 // 1 hour in seconds
  private readonly apiKey: string | null
  private readonly apiProvider: 'fixer' | 'exchangerate' | 'openexchangerates'

  constructor(
    private configService: ConfigService,
    private cache: CacheService,
  ) {
    this.apiKey = this.configService.get<string>('EXCHANGE_RATE_API_KEY') || null
    this.apiProvider = (this.configService.get<string>('EXCHANGE_RATE_PROVIDER') || 'exchangerate') as any

    if (!this.apiKey) {
      this.logger.warn('Exchange rate API key not configured - using fallback rates')
    }
  }

  /**
   * Get exchange rate between two currencies.
   */
  async getExchangeRate(from: string, to: string): Promise<ExchangeRate> {
    const cacheKey = `${this.cacheKeyPrefix}${from}:${to}`
    
    // Check cache first
    const cached = await this.cache.get<ExchangeRate>(cacheKey)
    if (cached) {
      this.logger.debug(`Cache hit for ${from}->${to}`)
      return cached
    }

    // Fetch from API
    const rate = await this.fetchExchangeRate(from, to)
    
    // Cache the result
    await this.cache.set(cacheKey, rate, this.cacheTTL)
    
    return rate
  }

  /**
   * Convert amount from one currency to another.
   */
  async convert(amount: number, from: string, to: string): Promise<ConversionResult> {
    if (from.toUpperCase() === to.toUpperCase()) {
      return {
        from: from.toUpperCase(),
        to: to.toUpperCase(),
        amount,
        convertedAmount: amount,
        rate: 1,
        timestamp: new Date(),
      }
    }

    const exchangeRate = await this.getExchangeRate(from, to)
    const convertedAmount = amount * exchangeRate.rate

    return {
      from: from.toUpperCase(),
      to: to.toUpperCase(),
      amount,
      convertedAmount: Math.round(convertedAmount * 100) / 100, // Round to 2 decimals
      rate: exchangeRate.rate,
      timestamp: exchangeRate.timestamp,
    }
  }

  /**
   * Fetch exchange rate from API.
   */
  private async fetchExchangeRate(from: string, to: string): Promise<ExchangeRate> {
    if (!this.apiKey) {
      // Fallback to hardcoded rates (for development)
      return this.getFallbackRate(from, to)
    }

    try {
      let rate: number
      let source: string

      switch (this.apiProvider) {
        case 'fixer':
          rate = await this.fetchFromFixer(from, to)
          source = 'Fixer.io'
          break
        case 'openexchangerates':
          rate = await this.fetchFromOpenExchangeRates(from, to)
          source = 'OpenExchangeRates'
          break
        case 'exchangerate':
        default:
          rate = await this.fetchFromExchangeRateAPI(from, to)
          source = 'ExchangeRate-API'
          break
      }

      return {
        from: from.toUpperCase(),
        to: to.toUpperCase(),
        rate,
        timestamp: new Date(),
        source,
      }
    } catch (error: any) {
      this.logger.error(`Failed to fetch exchange rate: ${error.message}`)
      // Fallback to hardcoded rate
      return this.getFallbackRate(from, to)
    }
  }

  /**
   * Fetch from ExchangeRate-API (free tier available).
   */
  private async fetchFromExchangeRateAPI(from: string, to: string): Promise<number> {
    const url = this.apiKey
      ? `https://v6.exchangerate-api.com/v6/${this.apiKey}/pair/${from.toUpperCase()}/${to.toUpperCase()}`
      : `https://api.exchangerate-api.com/v4/latest/${from.toUpperCase()}`

    const response = await axios.get(url)
    
    if (this.apiKey) {
      return response.data.conversion_rate
    } else {
      return response.data.rates[to.toUpperCase()]
    }
  }

  /**
   * Fetch from Fixer.io.
   */
  private async fetchFromFixer(from: string, to: string): Promise<number> {
    const response = await axios.get(
      `https://api.fixer.io/latest?access_key=${this.apiKey}&base=${from.toUpperCase()}&symbols=${to.toUpperCase()}`,
    )
    return response.data.rates[to.toUpperCase()]
  }

  /**
   * Fetch from OpenExchangeRates.
   */
  private async fetchFromOpenExchangeRates(from: string, to: string): Promise<number> {
    const response = await axios.get(
      `https://openexchangerates.org/api/latest.json?app_id=${this.apiKey}&base=${from.toUpperCase()}`,
    )
    return response.data.rates[to.toUpperCase()]
  }

  /**
   * Get fallback exchange rate (for development/testing).
   */
  private getFallbackRate(from: string, to: string): ExchangeRate {
    // Hardcoded rates (approximate, for development only)
    const fallbackRates: Record<string, Record<string, number>> = {
      USD: { EUR: 0.92, GBP: 0.79, KES: 130, CAD: 1.35, AUD: 1.52 },
      EUR: { USD: 1.09, GBP: 0.86, KES: 141, CAD: 1.47, AUD: 1.65 },
      GBP: { USD: 1.27, EUR: 1.16, KES: 164, CAD: 1.71, AUD: 1.92 },
      KES: { USD: 0.0077, EUR: 0.0071, GBP: 0.0061, CAD: 0.010, AUD: 0.012 },
    }

    const fromUpper = from.toUpperCase()
    const toUpper = to.toUpperCase()

    let rate = 1
    if (fallbackRates[fromUpper] && fallbackRates[fromUpper][toUpper]) {
      rate = fallbackRates[fromUpper][toUpper]
    } else if (fallbackRates[toUpper] && fallbackRates[toUpper][fromUpper]) {
      rate = 1 / fallbackRates[toUpper][fromUpper]
    }

    this.logger.warn(`Using fallback exchange rate for ${from}->${to}: ${rate}`)

    return {
      from: fromUpper,
      to: toUpper,
      rate,
      timestamp: new Date(),
      source: 'Fallback',
    }
  }

  /**
   * Get multiple exchange rates at once.
   */
  async getMultipleRates(from: string, toCurrencies: string[]): Promise<Record<string, number>> {
    const rates: Record<string, number> = {}

    await Promise.all(
      toCurrencies.map(async (to) => {
        const exchangeRate = await this.getExchangeRate(from, to)
        rates[to.toUpperCase()] = exchangeRate.rate
      }),
    )

    return rates
  }

  /**
   * Clear exchange rate cache.
   */
  async clearCache(from?: string, to?: string) {
    if (from && to) {
      const cacheKey = `${this.cacheKeyPrefix}${from}:${to}`
      await this.cache.delete(cacheKey)
    } else {
      // Clear all exchange rate caches (use with caution)
      const keys = await this.cache.keys(`${this.cacheKeyPrefix}*`)
      if (keys.length > 0) {
        await this.cache.delete(...keys)
      }
    }
  }
}

