import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { MailgunService } from './mailgun.service'
import { TwilioService } from './twilio.service'
import { AfricasTalkingService } from './africastalking.service'
import { OtpService } from './otp.service'

@Module({
    imports: [ConfigModule],
    providers: [
        MailgunService,
        TwilioService,
        AfricasTalkingService,
        OtpService,
    ],
    exports: [
        MailgunService,
        TwilioService,
        AfricasTalkingService,
        OtpService,
    ],
})
export class CommunicationsModule {}

