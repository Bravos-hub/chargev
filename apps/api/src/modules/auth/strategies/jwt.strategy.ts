import { Injectable, UnauthorizedException } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'
import { ConfigService } from '@nestjs/config'
import { PrismaService } from '../../../common/prisma/prisma.service'
import type { JwtUser } from '../../../common/auth/types'

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private config: ConfigService, private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.get<string>('JWT_SECRET') || 'change_me',
    })
  }

  async validate(payload: { sub: string; role: string; tenantId: string; orgId?: string | null }): Promise<JwtUser> {
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } })
    if (!user) throw new UnauthorizedException()

    return {
      id: user.id,
      role: user.role,
      tenantId: user.tenantId,
      orgId: user.orgId,
    }
  }
}
