import { Module, forwardRef } from '@nestjs/common'
import { OperationsService } from './operations.service'
import { OperationsController } from './operations.controller'
import { PredictiveMaintenanceService } from './predictive-maintenance.service'
import { HardwareLoggerService } from './hardware-logger.service'
import { PrismaModule } from '../common/prisma/prisma.module'
// Optional ML client - will be null if not enabled
// import { MLClientModule } from '../integrations/ml/ml-client.module'

@Module({
    imports: [
        PrismaModule,
        // MLClientModule, // Uncomment when ML service is enabled
    ],
    controllers: [OperationsController],
    providers: [OperationsService, PredictiveMaintenanceService, HardwareLoggerService],
    exports: [OperationsService, PredictiveMaintenanceService, HardwareLoggerService],
})
export class OperationsModule {}

