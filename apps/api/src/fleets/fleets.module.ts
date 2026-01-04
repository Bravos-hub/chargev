import { Module } from '@nestjs/common'
import { FleetsService } from './fleets.service'
import { FleetsController } from './fleets.controller'
import { ReimbursementService } from './reimbursement.service'
import { FleetSchedulingService } from './fleet-scheduling.service'
import { PrismaModule } from '../common/prisma/prisma.module'
import { BookingsModule } from '../bookings/bookings.module'

@Module({
    imports: [PrismaModule, BookingsModule],
    controllers: [FleetsController],
    providers: [FleetsService, ReimbursementService, FleetSchedulingService],
    exports: [FleetsService, ReimbursementService, FleetSchedulingService],
})
export class FleetsModule { }
