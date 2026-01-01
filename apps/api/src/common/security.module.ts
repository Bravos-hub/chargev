import { Module, Global } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { JwtModule } from '@nestjs/jwt'
import { PassportModule } from '@nestjs/passport'
import { JwtAuthGuard } from './guards/jwt-auth.guard'
import { RolesGuard } from './guards/roles.guard'
import { ApiKeyGuard } from './guards/api-key.guard'
import { PrismaModule } from './prisma/prisma.module'
import { RedisModule } from '../integrations/redis/redis.module'

@Global()
@Module({
    imports: [
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.register({
            global: true,
            secret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
            signOptions: {
                expiresIn: '24h',
            },
        }),
        PrismaModule,
        RedisModule,
    ],
    providers: [
        JwtAuthGuard,
        RolesGuard,
        ApiKeyGuard,
        // Apply JWT guard globally to all routes
        {
            provide: APP_GUARD,
            useClass: JwtAuthGuard,
        },
        // Apply Roles guard globally (checked after JWT)
        {
            provide: APP_GUARD,
            useClass: RolesGuard,
        },
    ],
    exports: [JwtModule, JwtAuthGuard, RolesGuard, ApiKeyGuard],
})
export class SecurityModule { }
