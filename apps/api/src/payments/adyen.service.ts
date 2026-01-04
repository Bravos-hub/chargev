/**
 * Adyen Payment Service
 * Handles Adyen payment gateway integration alongside Stripe.
 */
import { Injectable, Logger, BadRequestException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PrismaService } from '../common/prisma/prisma.service'
import axios from 'axios'

// Adyen SDK types (will be available when @adyen/api-library is installed)
interface AdyenPaymentRequest {
  amount: {
    value: number
    currency: string
  }
  reference: string
  returnUrl: string
  merchantAccount: string
  paymentMethod?: any
  metadata?: Record<string, string>
}

interface AdyenPaymentResponse {
  pspReference: string
  resultCode: string
  action?: any
  paymentData?: string
}

@Injectable()
export class AdyenService {
  private readonly logger = new Logger(AdyenService.name)
  private readonly apiKey: string | null
  private readonly merchantAccount: string | null
  private readonly environment: 'test' | 'live'
  private readonly baseUrl: string

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>('ADYEN_API_KEY') || null
    this.merchantAccount = this.configService.get<string>('ADYEN_MERCHANT_ACCOUNT') || null
    this.environment = (this.configService.get<string>('ADYEN_ENVIRONMENT') || 'test') as 'test' | 'live'
    
    this.baseUrl = this.environment === 'live' 
      ? 'https://pal-live.adyen.com/pal/servlet'
      : 'https://pal-test.adyen.com/pal/servlet'

    if (!this.apiKey || !this.merchantAccount) {
      this.logger.warn('Adyen API key or merchant account not configured - Adyen payments disabled')
    }
  }

  /**
   * Ensure Adyen is configured.
   */
  private ensureConfigured() {
    if (!this.apiKey || !this.merchantAccount) {
      throw new BadRequestException('Adyen payments are not configured')
    }
  }

  /**
   * Create a payment session.
   */
  async createPaymentSession(
    amount: number,
    currency: string,
    reference: string,
    returnUrl: string,
    metadata?: Record<string, string>,
  ): Promise<AdyenPaymentResponse> {
    this.ensureConfigured()

    try {
      // Using Adyen Checkout API
      const response = await axios.post(
        `${this.baseUrl}/Payment/v68/payments`,
        {
          amount: {
            value: Math.round(amount * 100), // Convert to minor units
            currency: currency.toUpperCase(),
          },
          reference,
          returnUrl,
          merchantAccount: this.merchantAccount,
          metadata,
        },
        {
          headers: {
            'X-API-Key': this.apiKey,
            'Content-Type': 'application/json',
          },
        },
      )

      return response.data
    } catch (error: any) {
      this.logger.error(`Adyen payment creation failed: ${error.message}`, error.response?.data)
      throw new BadRequestException(`Adyen payment failed: ${error.message}`)
    }
  }

  /**
   * Get payment status.
   */
  async getPaymentStatus(pspReference: string): Promise<any> {
    this.ensureConfigured()

    try {
      const response = await axios.get(
        `${this.baseUrl}/Payment/v68/payments/${pspReference}`,
        {
          headers: {
            'X-API-Key': this.apiKey,
          },
        },
      )

      return response.data
    } catch (error: any) {
      this.logger.error(`Adyen payment status check failed: ${error.message}`)
      throw new BadRequestException(`Failed to get payment status: ${error.message}`)
    }
  }

  /**
   * Refund a payment.
   */
  async refundPayment(
    pspReference: string,
    amount: number,
    currency: string,
  ): Promise<any> {
    this.ensureConfigured()

    try {
      const response = await axios.post(
        `${this.baseUrl}/Payment/v68/refunds`,
        {
          originalReference: pspReference,
          amount: {
            value: Math.round(amount * 100),
            currency: currency.toUpperCase(),
          },
          merchantAccount: this.merchantAccount,
        },
        {
          headers: {
            'X-API-Key': this.apiKey,
            'Content-Type': 'application/json',
          },
        },
      )

      return response.data
    } catch (error: any) {
      this.logger.error(`Adyen refund failed: ${error.message}`, error.response?.data)
      throw new BadRequestException(`Adyen refund failed: ${error.message}`)
    }
  }

  /**
   * Handle Adyen webhook.
   */
  async handleWebhook(notification: any): Promise<{ received: boolean }> {
    this.ensureConfigured()

    try {
      // Verify webhook signature (HMAC)
      // In production, verify the X-Adyen-Signature header
      
      const eventCode = notification.eventCode
      const pspReference = notification.pspReference
      const success = notification.success === 'true'

      this.logger.log(`Adyen webhook received: ${eventCode} for ${pspReference}, success: ${success}`)

      // Process webhook based on event code
      // AUTHORISATION, CAPTURE, REFUND, etc.

      return { received: true }
    } catch (error: any) {
      this.logger.error(`Adyen webhook handling failed: ${error.message}`)
      throw new BadRequestException(`Webhook handling failed: ${error.message}`)
    }
  }

  /**
   * Verify webhook signature.
   */
  private verifyWebhookSignature(payload: string, signature: string): boolean {
    // Implement HMAC verification
    // This should use ADYEN_HMAC_KEY from config
    const hmacKey = this.configService.get<string>('ADYEN_HMAC_KEY')
    if (!hmacKey) {
      this.logger.warn('Adyen HMAC key not configured - webhook verification skipped')
      return true // In development, allow without verification
    }

    // TODO: Implement HMAC-SHA256 verification
    // const crypto = require('crypto')
    // const calculatedSignature = crypto
    //   .createHmac('sha256', hmacKey)
    //   .update(payload)
    //   .digest('base64')
    // return calculatedSignature === signature

    return true // Placeholder
  }
}

