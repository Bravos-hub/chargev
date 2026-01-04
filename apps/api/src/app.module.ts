import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { ScheduleModule } from '@nestjs/schedule'
import { PrismaModule } from './common/prisma/prisma.module'
import { KafkaModule } from './integrations/kafka/kafka.module'
import { RedisModule } from './integrations/redis/redis.module'
import { RealtimeModule } from './realtime/realtime.module'
import { SessionsManagerModule } from './sessions/sessions-manager.module'
import { AnalyticsModule } from './analytics/analytics.module'
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

// New Enhanced Architecture Modules
import { AuditModule } from './audit/audit.module'
import { ApiManagementModule } from './api-management/api-management.module'
import { RatingsModule } from './ratings/ratings.module'
import { DriversModule } from './drivers/drivers.module'
import { ShuttleModule } from './shuttle/shuttle.module'
import { ToursModule } from './tours/tours.module'
import { RentalsModule } from './rentals/rentals.module'
import { OperationsModule } from './operations/operations.module'
import { OCPIModule } from './ocpi/ocpi.module'
import { ConnectorsModule } from './connectors/connectors.module'
import { StationsModule } from './stations/stations.module'
import { PricingModule } from './pricing/pricing.module'
import { InvoicesModule } from './invoices/invoices.module'
import { SettlementsModule } from './settlements/settlements.module'
import { ESGModule } from './esg/esg.module'
// ML Service Integration (optional - controlled by ML_SERVICE_ENABLED env var)
// import { MLClientModule } from './integrations/ml/ml-client.module'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.local'],
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    KafkaModule,
    RedisModule, // Global Redis module
    SecurityModule, // Must be before feature modules for global guards
    
    // Core Infrastructure
    RealtimeModule,
    SessionsManagerModule,
    AnalyticsModule,
    SmartChargingModule,
    // MLClientModule, // Uncomment when ML service is ready and ML_SERVICE_ENABLED=true
    
    // Authentication & Users
    AuthModule,
    UsersModule,
    
    // Charging Infrastructure
    StationsModule,
    BookingsModule,
    ConnectorsModule,
    PrivateChargersModule,
    SwapModule,
    
    // Fleet Partner Features
    FleetsModule,
    VehiclesModule,
    DriversModule,
    ShuttleModule,
    ToursModule,
    RentalsModule,
    
    // Business Operations
    OrganizationsModule,
    WalletModule,
    PaymentsModule,
    PricingModule,
    InvoicesModule,
    SettlementsModule,
    RoutePlanningModule,
    
    // Platform Features
    RatingsModule,
    NotificationsModule,
    SupportModule,
    OperationsModule,
    
    // Integrations & Management
    ApiManagementModule,
    OCPIModule,
    AuditModule, // Global - provides AuditService everywhere
    
    // ESG & Reporting
    ESGModule,
    
    // System
    HealthModule,
  ],
})
export class AppModule { }
