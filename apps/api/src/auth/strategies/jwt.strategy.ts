import { ExtractJwt, Strategy } from 'passport-jwt'
import { PassportStrategy } from '@nestjs/passport'
import { Injectable, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PrismaService } from '../../common/prisma/prisma.service'
import { TokenPayload } from '../../common/auth/types'

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(
        private configService: ConfigService,
        private prisma: PrismaService,
    ) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: configService.get<string>('JWT_SECRET') || 'your-secret-key-change-in-production',
        })
    }

    async validate(payload: TokenPayload) {
        // Check if user still exists and is active
        const user = await this.prisma.user.findUnique({
            where: { id: payload.sub },
        })

        if (!user) {
            throw new UnauthorizedException('User no longer exists')
        }

        // You can also check for token revocation here if checking against Redis/DB

        return user
    }
}
