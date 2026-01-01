import { Body, Controller, Post, UseGuards, Request, Get, HttpCode, HttpStatus } from '@nestjs/common'
import { AuthService } from './auth.service'
import { RegisterDto } from './dto/register.dto'
import { LoginDto } from './dto/login.dto'
import { SendOtpDto, VerifyOtpDto } from './dto/otp.dto'
import { SocialLoginDto } from './dto/social.dto'
import { AttendantLoginDto } from './dto/attendant.dto'
import { Public } from '../common/decorators/auth.decorators'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'

@Controller('auth')
export class AuthController {
    constructor(private authService: AuthService) { }

    @Public()
    @Post('register')
    async register(@Body() registerDto: RegisterDto) {
        return this.authService.register(registerDto)
    }

    @Public()
    @Post('login')
    @HttpCode(HttpStatus.OK)
    async login(@Body() loginDto: LoginDto) {
        return this.authService.login(loginDto)
    }

    @Public()
    @Post('otp/send')
    async sendOtp(@Body() sendOtpDto: SendOtpDto) {
        return this.authService.sendOtp(sendOtpDto)
    }

    @Public()
    @Post('otp/verify')
    @HttpCode(HttpStatus.OK)
    async verifyOtp(@Body() verifyOtpDto: VerifyOtpDto) {
        return this.authService.verifyOtp(verifyOtpDto)
    }

    @Public()
    @Post('otp/resend')
    async resendOtp(@Body() sendOtpDto: SendOtpDto) {
        return this.authService.resendOtp(sendOtpDto)
    }

    @Public()
    @Post('social/google')
    async googleLogin(@Body() socialLoginDto: SocialLoginDto) {
        return this.authService.socialLogin('google', socialLoginDto.token)
    }

    @Public()
    @Post('social/apple')
    async appleLogin(@Body() socialLoginDto: SocialLoginDto) {
        return this.authService.socialLogin('apple', socialLoginDto.token)
    }

    @Public()
    @Post('attendant/login')
    @HttpCode(HttpStatus.OK)
    async attendantLogin(@Body() attendantLoginDto: AttendantLoginDto) {
        return this.authService.attendantLogin(
            attendantLoginDto.stationCode,
            attendantLoginDto.passcode
        )
    }

    @Public()
    @Post('refresh')
    async refresh(@Body('refreshToken') refreshToken: string) {
        return this.authService.refreshTokens(refreshToken)
    }

    @UseGuards(JwtAuthGuard)
    @Post('logout')
    async logout(@Request() req: any) {
        // Logic to revoke refresh tokens
        return { success: true }
    }
}
