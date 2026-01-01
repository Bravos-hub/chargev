import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import * as bcrypt from 'bcrypt'
import { PrismaService } from '../../common/prisma/prisma.service'
import { RegisterDto } from './dto/register.dto'
import { LoginDto } from './dto/login.dto'
import { SendOtpDto, VerifyOtpDto, OtpType } from './dto/otp.dto'
import { TokenPayload } from '../../common/auth/types'
import { v4 as uuidv4 } from 'uuid'

@Injectable()
export class AuthService {
    constructor(
        private prisma: PrismaService,
        private jwtService: JwtService,
        private configService: ConfigService,
    ) { }

    // ===========================================
    // REGISTRATION & LOGIN
    // ===========================================

    async register(registerDto: RegisterDto) {
        const { email, phone, password, ...rest } = registerDto

        // Validate existence
        if (email) {
            const exists = await this.prisma.user.findUnique({ where: { email } })
            if (exists) throw new ConflictException('Email already registered')
        }
        if (phone) {
            const exists = await this.prisma.user.findUnique({ where: { phone } })
            if (exists) throw new ConflictException('Phone already registered')
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10)

        // Create user
        try {
            const user = await this.prisma.user.create({
                data: {
                    ...rest,
                    email,
                    phone,
                    passwordHash: hashedPassword,
                    tenantId: 'tenant-1', // Default tenant for now
                    // If role implies wallet, create one
                    wallet: this.shouldCreateWallet(registerDto.role) ? {
                        create: { currency: 'USD' }
                    } : undefined
                },
            })

            // Generate tokens
            const tokens = await this.generateTokens(user)
            return { user, ...tokens }
        } catch (error) {
            console.error(error)
            throw new BadRequestException('Registration failed')
        }
    }

    async login(loginDto: LoginDto) {
        const { email, phone, password } = loginDto

        let user
        if (email) {
            user = await this.prisma.user.findUnique({ where: { email } })
        } else if (phone) {
            user = await this.prisma.user.findUnique({ where: { phone } })
        }

        if (!user || !user.passwordHash) {
            throw new UnauthorizedException('Invalid credentials')
        }

        const isMatch = await bcrypt.compare(password, user.passwordHash)
        if (!isMatch) {
            throw new UnauthorizedException('Invalid credentials')
        }

        const tokens = await this.generateTokens(user)
        return { user, ...tokens }
    }

    async validateUser(username: string, pass: string): Promise<any> {
        // Used by LocalStrategy
        const user = await this.prisma.user.findUnique({
            where: { email: username }
        })
        if (user && user.passwordHash && await bcrypt.compare(pass, user.passwordHash)) {
            const { passwordHash, ...result } = user
            return result
        }
        return null
    }

    // ===========================================
    // OTP & VERIFICATION
    // ===========================================

    async sendOtp(sendOtpDto: SendOtpDto) {
        const { identifier, type } = sendOtpDto

        // Generate 6-digit code
        const code = Math.floor(100000 + Math.random() * 900000).toString()
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

        // Save to DB
        await this.prisma.otpCode.create({
            data: {
                identifier,
                type,
                code, // In production, hash this code!
                expiresAt,
            },
        })

        // TODO: Integrate with SMS/Email provider (Twilio, Africa's Talking, SendGrid)
        console.log(`[MOCK OTP] Sending ${code} to ${identifier}`)

        return { success: true, message: 'OTP sent' }
    }

    async verifyOtp(verifyOtpDto: VerifyOtpDto) {
        const { identifier, type, code } = verifyOtpDto

        const record = await this.prisma.otpCode.findFirst({
            where: {
                identifier,
                type,
                code, // If hashed, compare hash
                verified: false,
                expiresAt: { gt: new Date() },
            },
            orderBy: { createdAt: 'desc' },
        })

        if (!record) {
            throw new BadRequestException('Invalid or expired OTP')
        }

        // Mark verified
        await this.prisma.otpCode.update({
            where: { id: record.id },
            data: { verified: true },
        })

        // If existing user, mark user as verified
        if (type === 'phone') {
            await this.prisma.user.updateMany({
                where: { phone: identifier },
                data: { verified: true }
            })
        } else {
            await this.prisma.user.updateMany({
                where: { email: identifier },
                data: { verified: true }
            })
        }

        return { success: true, verified: true }
    }

    // ===========================================
    // TOKENS
    // ===========================================

    async refreshTokens(refreshToken: string) {
        try {
            const payload = this.jwtService.verify(refreshToken, {
                secret: this.configService.get('JWT_REFRESH_SECRET'),
            })

            // Check DB for refresh token validity
            const savedToken = await this.prisma.refreshToken.findUnique({
                where: { token: refreshToken },
                include: { user: true }
            })

            if (!savedToken || savedToken.revokedAt || new Date() > savedToken.expiresAt) {
                throw new UnauthorizedException('Invalid refresh token')
            }

            // Rotate tokens
            await this.prisma.refreshToken.update({
                where: { id: savedToken.id },
                data: { revokedAt: new Date() } // Revoke old one
            })

            return this.generateTokens(savedToken.user)

        } catch (e) {
            throw new UnauthorizedException('Invalid refresh token')
        }
    }

    private async generateTokens(user: any) {
        const payload: TokenPayload = {
            sub: user.id,
            email: user.email,
            role: user.role,
            orgId: user.orgId,
        }

        const accessToken = this.jwtService.sign(payload)
        const refreshToken = this.jwtService.sign(payload, {
            secret: this.configService.get('JWT_REFRESH_SECRET'),
            expiresIn: '7d'
        })

        // Save refresh token
        await this.prisma.refreshToken.create({
            data: {
                userId: user.id,
                token: refreshToken,
                tokenHash: 'todo-hash', // Should hash for security
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
            }
        })

        return {
            accessToken,
            refreshToken,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
            }
        }
    }

    // Helper
    private shouldCreateWallet(role: string): boolean {
        const walletRoles = ['RIDER_STANDARD', 'RIDER_PREMIUM', 'FLEET_DRIVER', 'STATION_OWNER_INDIVIDUAL']
        return walletRoles.includes(role)
    }
}
