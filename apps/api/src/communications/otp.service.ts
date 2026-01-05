import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { MailgunService } from './mailgun.service'
import { TwilioService } from './twilio.service'
import { AfricasTalkingService } from './africastalking.service'
import { OtpType } from '../auth/dto/otp.dto'

@Injectable()
export class OtpService {
    private readonly logger = new Logger(OtpService.name)

    constructor(
        private mailgunService: MailgunService,
        private twilioService: TwilioService,
        private africastalkingService: AfricasTalkingService,
        private configService: ConfigService,
    ) {}

    /**
     * Send OTP code via email or SMS
     * Automatically selects the best provider based on type and region
     */
    async sendOtp(identifier: string, code: string, type: OtpType): Promise<boolean> {
        try {
            if (type === OtpType.EMAIL) {
                return await this.sendOtpEmail(identifier, code)
            } else {
                return await this.sendOtpSms(identifier, code)
            }
        } catch (error) {
            this.logger.error(`Failed to send OTP to ${identifier}:`, error)
            return false
        }
    }

    /**
     * Send OTP via email using Mailgun
     */
    private async sendOtpEmail(email: string, code: string): Promise<boolean> {
        return await this.mailgunService.sendOtpEmail(email, code)
    }

    /**
     * Send OTP via SMS
     * Automatically selects between Twilio and AfricasTalking based on:
     * 1. Configuration (which providers are enabled)
     * 2. Phone number region (African numbers prefer AfricasTalking)
     * 3. Fallback logic
     */
    private async sendOtpSms(phoneNumber: string, code: string): Promise<boolean> {
        const preferAfricasTalking = this.configService.get<string>('OTP_PREFER_AFRICASTALKING') === 'true'
        const preferTwilio = this.configService.get<string>('OTP_PREFER_TWILIO') === 'true'

        // Check if it's an African number
        const isAfricanNumber = this.africastalkingService.isAfricanNumber(phoneNumber)

        // Strategy 1: If explicitly configured to prefer a provider
        if (preferAfricasTalking) {
            const sent = await this.africastalkingService.sendOtpSms(phoneNumber, code)
            if (sent) return true
            // Fallback to Twilio if AfricasTalking fails
            return await this.twilioService.sendOtpSms(phoneNumber, code)
        }

        if (preferTwilio) {
            const sent = await this.twilioService.sendOtpSms(phoneNumber, code)
            if (sent) return true
            // Fallback to AfricasTalking if Twilio fails
            return await this.africastalkingService.sendOtpSms(phoneNumber, code)
        }

        // Strategy 2: Auto-select based on phone number region
        if (isAfricanNumber) {
            // Try AfricasTalking first for African numbers
            const sent = await this.africastalkingService.sendOtpSms(phoneNumber, code)
            if (sent) return true
            // Fallback to Twilio
            return await this.twilioService.sendOtpSms(phoneNumber, code)
        } else {
            // Try Twilio first for non-African numbers
            const sent = await this.twilioService.sendOtpSms(phoneNumber, code)
            if (sent) return true
            // Fallback to AfricasTalking
            return await this.africastalkingService.sendOtpSms(phoneNumber, code)
        }
    }
}

