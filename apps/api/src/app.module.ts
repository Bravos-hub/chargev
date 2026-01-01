import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { PrismaModule } from './common/prisma/prisma.module'
import { KafkaModule } from './integrations/kafka/kafka.module'
import { RedisModule } from './integrations/redis/redis.module'
import { RealtimeModule } from './realtime/realtime.module'
import { SessionsManagerModule } from './sessions/sessions-manager.module'
import { AnalyticsModule } from './analytics/analytics.module'
import { ApiModule } from './api/api.module'
import { SmartChargingModule } from './smart-charging/smart-charging.module'
import { SecurityModule } from './common/security.module'
import { AuthModule } from './auth/auth.module'
import { VehiclesModule } from './vehicles/vehicles.module'
import { BookingsModule } from './bookings/bookings.module'
import { UsersModule } from './users/users.module'
import { WalletModule } from './wallet/wallet.module'
import { SwapModule } from './swap/swap.module'
import { PrivateChargersModule } from './private-chargers/private-chargers.module'
import { SupportModule } from './support/support.module'
import { FleetsModule } from './fleets/fleets.module'
import { OrganizationsModule } from './organizations/organizations.module'
import { RoutePlanningModule } from './route-planning/route-planning.module'
import { PaymentsModule } from './payments/payments.module'
import { NotificationsModule } from './notifications/notifications.module'
import { HealthModule } from './health/health.module'
// import { StationsModule } from './modules/stations/stations.module'
// import { SessionsModule } from './modules/sessions/sessions.module'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.local'],
    }),
    PrismaModule,
    KafkaModule,
    RedisModule, // Global Redis module
    SecurityModule, // Must be before feature modules for global guards
    RealtimeModule,
    SessionsManagerModule,
    AnalyticsModule,
    ApiModule,
    SmartChargingModule,
    AuthModule,
    VehiclesModule,
    BookingsModule,
    UsersModule,
    WalletModule,
    SwapModule,
    PrivateChargersModule,
    SupportModule,
    FleetsModule,
    OrganizationsModule,
    RoutePlanningModule,
    PaymentsModule,
    NotificationsModule,
    HealthModule,
    // StationsModule,
    // SessionsModule,
  ],
})
export class AppModule { }
