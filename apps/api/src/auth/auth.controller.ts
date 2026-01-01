import { Body, Controller, Post, UseGuards, Request, Get, HttpCode, HttpStatus } from '@nestjs/common'
import { AuthService } from './auth.service'
import { RegisterDto } from './dto/register.dto'
import { LoginDto } from './dto/login.dto'
import { SendOtpDto, VerifyOtpDto } from './dto/otp.dto'
import { Public } from '../../common/decorators/auth.decorators'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { LocalAuthGuard } from '../../common/guards/local-auth.guard' // Need to create this if missing

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
    @Post('refresh')
    async refresh(@Body('refreshToken') refreshToken: string) {
        return this.authService.refreshTokens(refreshToken)
    }

    @UseGuards(JwtAuthGuard)
    @Get('me')
    getProfile(@Request() req) {
        return req.user
    }

    @UseGuards(JwtAuthGuard)
    @Post('logout')
    async logout(@Request() req) {
        // Logic to revoke refresh tokens
        return { success: true }
    }
}
