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
// import { StationsModule } from './modules/stations/stations.module'
// import { SessionsModule } from './modules/sessions/sessions.module'
// import { PaymentsModule } from './modules/payments/payments.module'
// import { NotificationsModule } from './modules/notifications/notifications.module'
// import { HealthModule } from './modules/health/health.module'

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
    // StationsModule,
    // SessionsModule,
    // PaymentsModule,
    // NotificationsModule,
    // HealthModule,
  ],
})
export class AppModule { }
