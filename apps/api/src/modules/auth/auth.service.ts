import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import { PrismaService } from '../../common/prisma/prisma.service'
import { RegisterDto } from './dto/register.dto'
import { LoginDto } from './dto/login.dto'
import { RefreshDto } from './dto/refresh.dto'
import { Role } from '../../common/auth/types'
import * as bcrypt from 'bcryptjs'
import { randomBytes, createHash } from 'crypto'

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } })
    if (existing) throw new ConflictException('Email already registered')

    const tenantName = dto.tenantName || `${dto.name} Tenant`
    const orgName = dto.orgName || `${dto.name} Org`

    const tenant = await this.prisma.tenant.create({
      data: { name: tenantName },
    })

    const org = await this.prisma.organization.create({
      data: {
        name: orgName,
        tenantId: tenant.id,
      },
    })

    const passwordHash = await bcrypt.hash(dto.password, 10)
    const role = (dto.role as Role) || 'EVZONE_OWNER'

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        name: dto.name,
        passwordHash,
        role,
        tenantId: tenant.id,
        orgId: org.id,
      },
    })

    return this.issueTokens(user.id, user.role, user.tenantId, user.orgId)
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } })
    if (!user) throw new UnauthorizedException('Invalid credentials')

    const ok = await bcrypt.compare(dto.password, user.passwordHash)
    if (!ok) throw new UnauthorizedException('Invalid credentials')

    return this.issueTokens(user.id, user.role, user.tenantId, user.orgId)
  }

  async refresh(dto: RefreshDto) {
    const tokenHash = this.hashToken(dto.refreshToken)
    const stored = await this.prisma.refreshToken.findFirst({
      where: {
        tokenHash,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
    })
    if (!stored) throw new UnauthorizedException('Invalid refresh token')

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    })

    const user = await this.prisma.user.findUnique({ where: { id: stored.userId } })
    if (!user) throw new UnauthorizedException('Invalid refresh token')

    return this.issueTokens(user.id, user.role, user.tenantId, user.orgId)
  }

  async logout(dto: RefreshDto) {
    const tokenHash = this.hashToken(dto.refreshToken)
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    })
    return { ok: true }
  }

  private async issueTokens(userId: string, role: Role, tenantId: string, orgId?: string | null) {
    const payload = { sub: userId, role, tenantId, orgId: orgId ?? null }
    const accessToken = await this.jwt.signAsync(payload)

    const refreshToken = randomBytes(32).toString('hex')
    const ttlDays = parseInt(this.config.get<string>('REFRESH_TOKEN_TTL_DAYS') || '30', 10)
    const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000)

    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: this.hashToken(refreshToken),
        expiresAt,
      },
    })

    return { accessToken, refreshToken }
  }

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex')
  }
}
