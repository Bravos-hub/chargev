import { Module } from '@nestjs/common'
import { StationsController } from './stations.controller'
import { ChargePointsController, StationChargePointsController } from './charge-points.controller'
import { StationsService } from './stations.service'
import { ChargePointsService } from './charge-points.service'
import { PrismaModule } from '../common/prisma/prisma.module'

@Module({
    imports: [PrismaModule],
    controllers: [
        StationsController,
        ChargePointsController,
        StationChargePointsController,
    ],
    providers: [StationsService, ChargePointsService],
    exports: [StationsService, ChargePointsService],
})
export class StationsModule {}

