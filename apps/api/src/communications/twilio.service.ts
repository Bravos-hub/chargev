import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import * as twilio from 'twilio'

@Injectable()
export class TwilioService {
    private readonly logger = new Logger(TwilioService.name)
    private client: twilio.Twilio | null = null
    private fromNumber: string

    constructor(private configService: ConfigService) {
        const accountSid = this.configService.get<string>('TWILIO_ACCOUNT_SID')
        const authToken = this.configService.get<string>('TWILIO_AUTH_TOKEN')
        const fromNumber = this.configService.get<string>('TWILIO_PHONE_NUMBER')

        if (accountSid && authToken && fromNumber) {
            this.client = twilio(accountSid, authToken)
            this.fromNumber = fromNumber
        } else {
            this.logger.warn('Twilio credentials not configured. SMS sending will be disabled.')
        }
    }

    async sendSms(to: string, message: string): Promise<boolean> {
        if (!this.client) {
            this.logger.warn('Twilio not configured. SMS not sent.')
            return false
        }

        try {
            await this.client.messages.create({
                body: message,
                from: this.fromNumber,
                to,
            })

            this.logger.log(`SMS sent successfully to ${to}`)
            return true
        } catch (error) {
            this.logger.error(`Failed to send SMS to ${to}:`, error)
            return false
        }
    }

    async sendOtpSms(phoneNumber: string, code: string): Promise<boolean> {
        const message = `Your EVzone OTP code is: ${code}. This code will expire in 10 minutes. If you didn't request this code, please ignore this message.`
        return this.sendSms(phoneNumber, message)
    }
}

