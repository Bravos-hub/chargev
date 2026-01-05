import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import formData from 'form-data'
import Mailgun from 'mailgun.js'

@Injectable()
export class MailgunService {
    private readonly logger = new Logger(MailgunService.name)
    private mailgun: any
    private domain: string

    constructor(private configService: ConfigService) {
        const apiKey = this.configService.get<string>('MAILGUN_API_KEY')
        const domain = this.configService.get<string>('MAILGUN_DOMAIN')

        if (apiKey && domain) {
            const mailgun = new Mailgun(formData)
            this.mailgun = mailgun.client({
                username: 'api',
                key: apiKey,
            })
            this.domain = domain
        } else {
            this.logger.warn('Mailgun credentials not configured. Email sending will be disabled.')
        }
    }

    async sendEmail(to: string, subject: string, text: string, html?: string): Promise<boolean> {
        if (!this.mailgun || !this.domain) {
            this.logger.warn('Mailgun not configured. Email not sent.')
            return false
        }

        try {
            const from = this.configService.get<string>('MAILGUN_FROM_EMAIL') || `noreply@${this.domain}`

            await this.mailgun.messages.create(this.domain, {
                from,
                to,
                subject,
                text,
                html: html || text,
            })

            this.logger.log(`Email sent successfully to ${to}`)
            return true
        } catch (error) {
            this.logger.error(`Failed to send email to ${to}:`, error)
            return false
        }
    }

    async sendOtpEmail(email: string, code: string): Promise<boolean> {
        const subject = 'Your EVzone OTP Code'
        const text = `Your OTP code is: ${code}\n\nThis code will expire in 10 minutes.\n\nIf you didn't request this code, please ignore this email.`
        const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #333;">Your EVzone OTP Code</h2>
                <p>Your OTP code is:</p>
                <div style="background-color: #f4f4f4; padding: 20px; text-align: center; margin: 20px 0;">
                    <h1 style="color: #0066cc; font-size: 32px; margin: 0; letter-spacing: 5px;">${code}</h1>
                </div>
                <p>This code will expire in 10 minutes.</p>
                <p style="color: #666; font-size: 12px;">If you didn't request this code, please ignore this email.</p>
            </div>
        `

        return this.sendEmail(email, subject, text, html)
    }
}

