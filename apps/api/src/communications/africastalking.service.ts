import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import axios, { AxiosInstance } from 'axios'

@Injectable()
export class AfricasTalkingService {
    private readonly logger = new Logger(AfricasTalkingService.name)
    private apiKey: string
    private username: string
    private senderId: string
    private baseUrl = 'https://api.africastalking.com/version1'
    private axiosInstance: AxiosInstance

    constructor(private configService: ConfigService) {
        this.apiKey = this.configService.get<string>('AFRICASTALKING_API_KEY') || ''
        this.username = this.configService.get<string>('AFRICASTALKING_USERNAME') || ''
        this.senderId = this.configService.get<string>('AFRICASTALKING_SENDER_ID') || ''

        if (this.apiKey && this.username) {
            this.axiosInstance = axios.create({
                baseURL: this.baseUrl,
                headers: {
                    'apiKey': this.apiKey,
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Accept': 'application/json',
                },
            })
        } else {
            this.logger.warn('AfricasTalking credentials not configured. SMS sending will be disabled.')
        }
    }

    async sendSms(to: string, message: string): Promise<boolean> {
        if (!this.apiKey || !this.username) {
            this.logger.warn('AfricasTalking not configured. SMS not sent.')
            return false
        }

        try {
            // Format phone number (remove + if present, AfricasTalking expects format like 254712345678)
            const formattedNumber = to.replace(/^\+/, '')

            const params = new URLSearchParams()
            params.append('username', this.username)
            params.append('to', formattedNumber)
            params.append('message', message)
            if (this.senderId) {
                params.append('from', this.senderId)
            }

            const response = await this.axiosInstance.post('/messaging', params.toString())

            if (response.data && response.data.SMSMessageData) {
                const recipients = response.data.SMSMessageData.Recipients || []
                const success = recipients.some((r: any) => r.statusCode === '101')

                if (success) {
                    this.logger.log(`SMS sent successfully to ${to}`)
                    return true
                } else {
                    this.logger.error(`Failed to send SMS to ${to}:`, response.data)
                    return false
                }
            }

            this.logger.error(`Unexpected response from AfricasTalking:`, response.data)
            return false
        } catch (error: any) {
            this.logger.error(`Failed to send SMS to ${to}:`, error.response?.data || error.message)
            return false
        }
    }

    async sendOtpSms(phoneNumber: string, code: string): Promise<boolean> {
        const message = `Your EVzone OTP code is: ${code}. This code will expire in 10 minutes. If you didn't request this code, please ignore this message.`
        return this.sendSms(phoneNumber, message)
    }

    /**
     * Check if a phone number is likely an African number
     * This is a simple heuristic - you may want to enhance this
     */
    isAfricanNumber(phoneNumber: string): boolean {
        // Remove + and spaces
        const cleaned = phoneNumber.replace(/[\s+]/g, '')
        
        // Common African country codes
        const africanCountryCodes = [
            '234', // Nigeria
            '254', // Kenya
            '256', // Uganda
            '255', // Tanzania
            '233', // Ghana
            '234', // Nigeria
            '27',  // South Africa
            '212', // Morocco
            '20',  // Egypt
            '251', // Ethiopia
            '225', // Côte d'Ivoire
            '221', // Senegal
            '260', // Zambia
            '263', // Zimbabwe
        ]

        return africanCountryCodes.some(code => cleaned.startsWith(code))
    }
}

