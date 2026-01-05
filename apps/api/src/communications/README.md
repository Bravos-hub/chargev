# Communications Module

This module provides email and SMS services for sending OTP codes using Mailgun, Twilio, and AfricasTalking.

## Services

### MailgunService
Handles email delivery via Mailgun API.
- **Usage**: Automatically used for email OTP codes
- **Configuration**: Requires `MAILGUN_API_KEY`, `MAILGUN_DOMAIN`, and optionally `MAILGUN_FROM_EMAIL`

### TwilioService
Handles SMS delivery via Twilio API (international).
- **Usage**: Used for SMS OTP codes, especially for non-African phone numbers
- **Configuration**: Requires `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and `TWILIO_PHONE_NUMBER`

### AfricasTalkingService
Handles SMS delivery via AfricasTalking API (Africa-focused).
- **Usage**: Used for SMS OTP codes, especially for African phone numbers
- **Configuration**: Requires `AFRICASTALKING_API_KEY`, `AFRICASTALKING_USERNAME`, and optionally `AFRICASTALKING_SENDER_ID`

### OtpService
Unified service that automatically routes OTP delivery to the appropriate provider.
- **Email**: Always uses Mailgun
- **SMS**: Automatically selects between Twilio and AfricasTalking based on:
  1. Explicit configuration preferences (`OTP_PREFER_AFRICASTALKING` or `OTP_PREFER_TWILIO`)
  2. Phone number region (African numbers prefer AfricasTalking)
  3. Fallback logic (if primary provider fails, tries the other)

## Integration

The `OtpService` is integrated into the `AuthModule` and used by `AuthService` to send OTP codes during authentication.

## Environment Variables

See the main `README.md` for complete environment variable configuration.

## Usage Example

```typescript
// In AuthService
async sendOtp(sendOtpDto: SendOtpDto) {
    const { identifier, type } = sendOtpDto
    const code = Math.floor(100000 + Math.random() * 900000).toString()
    
    // Save OTP to database
    await this.prisma.otpCode.create({...})
    
    // Send via appropriate provider
    await this.otpService.sendOtp(identifier, code, type)
}
```

## Provider Selection Logic

For SMS OTP codes:
1. If `OTP_PREFER_AFRICASTALKING=true`: Try AfricasTalking first, fallback to Twilio
2. If `OTP_PREFER_TWILIO=true`: Try Twilio first, fallback to AfricasTalking
3. Otherwise: Auto-detect based on phone number
   - African numbers (detected by country code): Try AfricasTalking first
   - Other numbers: Try Twilio first
   - Always fallback to the other provider if primary fails

## Error Handling

All services gracefully handle missing configuration and API errors:
- Missing credentials: Logs warning, returns `false`, but doesn't crash
- API errors: Logs error, returns `false`
- The OTP is still saved in the database even if sending fails

