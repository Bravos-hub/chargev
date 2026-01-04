import { Module } from '@nestjs/common'
import { AnalyticsService } from './analytics.service'
import { AnalyticsController } from './analytics.controller'
import { ReportExportService } from './report-export.service'
import { OperatorDashboardService } from './operator-dashboard.service'
import { ResellerDashboardService } from './reseller-dashboard.service'
import { PrismaModule } from '../common/prisma/prisma.module'
import { RedisModule } from '../integrations/redis/redis.module'
import { SessionsManagerModule } from '../sessions/sessions-manager.module'

@Module({
    imports: [PrismaModule, RedisModule, SessionsManagerModule],
    controllers: [AnalyticsController],
    providers: [
        AnalyticsService,
        ReportExportService,
        OperatorDashboardService,
        ResellerDashboardService,
    ],
    exports: [
        AnalyticsService,
        ReportExportService,
        OperatorDashboardService,
        ResellerDashboardService,
    ],
})
export class AnalyticsModule { }
