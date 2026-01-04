import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import * as bcrypt from 'bcrypt'
import { PrismaService } from '../common/prisma/prisma.service'
import { RegisterDto } from './dto/register.dto'
import { LoginDto } from './dto/login.dto'
import { SendOtpDto, VerifyOtpDto, OtpType } from './dto/otp.dto'
import { TokenPayload } from '../common/auth/types'
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

        // Check if tenant exists, create if not
        let tenant = await this.prisma.tenant.findUnique({ where: { id: 'tenant-1' } })
        if (!tenant) {
            tenant = await this.prisma.tenant.create({
                data: { id: 'tenant-1', name: 'Default Tenant' }
            })
        }

        // Validate orgId if provided
        if (rest.orgId) {
            const org = await this.prisma.organization.findUnique({ where: { id: rest.orgId } })
            if (!org) {
                throw new BadRequestException(`Organization with id ${rest.orgId} does not exist`)
            }
        }

        // Validate fleetId if provided
        if (rest.fleetId) {
            const fleet = await this.prisma.fleet.findUnique({ where: { id: rest.fleetId } })
            if (!fleet) {
                throw new BadRequestException(`Fleet with id ${rest.fleetId} does not exist`)
            }
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
                    tenantId: 'tenant-1',
                    // If role implies wallet, create one
                    wallet: this.shouldCreateWallet(registerDto.role) ? {
                        create: { currency: 'USD' }
                    } : undefined
                },
            })

            // Generate tokens
            const tokens = await this.generateTokens(user)
            return tokens
        } catch (error: unknown) {
            console.error('Registration error:', error)
            // Return more specific error messages based on Prisma error codes
            if (error && typeof error === 'object' && 'code' in error) {
                if (error.code === 'P2003') {
                    throw new BadRequestException('Invalid reference: tenant, organization, or fleet does not exist')
                }
                if (error.code === 'P2002') {
                    throw new ConflictException('Email or phone number already registered')
                }
            }
            const errorMessage = error && typeof error === 'object' && 'message' in error 
                ? String(error.message) 
                : 'Unknown error'
            throw new BadRequestException(`Registration failed: ${errorMessage}`)
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
        return tokens
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
        await (this.prisma as any).otpCode.create({
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

        const record = await (this.prisma as any).otpCode.findFirst({
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

    async resendOtp(sendOtpDto: SendOtpDto) {
        // Reuse sendOtp logic
        return this.sendOtp(sendOtpDto)
    }

    async socialLogin(type: 'google' | 'apple', token: string) {
        let email: string
        let name: string

        if (type === 'google') {
            const { OAuth2Client } = await import('google-auth-library')
            const client = new OAuth2Client(this.configService.get('GOOGLE_CLIENT_ID'))
            try {
                const ticket = await client.verifyIdToken({
                    idToken: token,
                    audience: this.configService.get('GOOGLE_CLIENT_ID'),
                })
                const payload = ticket.getPayload()
                if (!payload || !payload.email) throw new UnauthorizedException('Invalid Google token payload')
                email = payload.email
                name = payload.name || 'Google User'
            } catch (error) {
                throw new UnauthorizedException('Google token verification failed')
            }
        } else {
            // Placeholder for Apple verification (requires JWKS verification)
            console.log(`[MOCK APPLE] Logging in with apple: ${token}`)
            email = `apple_user_${uuidv4().substring(0, 8)}@example.com`
            name = 'Apple User'
        }

        // Find or create user
        let user = await this.prisma.user.findUnique({ where: { email } })
        if (!user) {
            user = await this.prisma.user.create({
                data: {
                    email,
                    name,
                    role: 'RIDER_STANDARD',
                    tenantId: 'tenant-1',
                    verified: true
                }
            })
        }

        return this.generateTokens(user)
    }

    async attendantLogin(stationCode: string, passcode: string) {
        // TODO: Verify attendant passcode with station
        // For now, looking for a user with role STATION_ATTENDANT and matching org/station info
        // This is a placeholder logic
        if (passcode !== '1234') {
            throw new UnauthorizedException('Invalid attendant credentials')
        }

        const user = await this.prisma.user.findFirst({
            where: {
                role: 'STATION_ATTENDANT',
                // Additional scope checks would go here
            }
        })

        if (!user) {
            throw new UnauthorizedException('Attendant account not found')
        }

        return this.generateTokens(user)
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
            id: user.id,
            email: user.email,
            role: user.role,
            tenantId: user.tenantId || 'tenant-1',
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
