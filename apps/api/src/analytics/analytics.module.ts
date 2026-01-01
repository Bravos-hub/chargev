import { Module } from '@nestjs/common'
import { AnalyticsService } from './analytics.service'
import { AnalyticsController } from './analytics.controller'
import { PrismaModule } from '../common/prisma/prisma.module'
import { RedisModule } from '../integrations/redis/redis.module'
import { SessionsManagerModule } from '../sessions/sessions-manager.module'

@Module({
    imports: [PrismaModule, RedisModule, SessionsManagerModule],
    controllers: [AnalyticsController],
    providers: [AnalyticsService],
    exports: [AnalyticsService],
})
export class AnalyticsModule { }
