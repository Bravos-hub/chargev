import { Module } from '@nestjs/common'
import { SettlementsController } from './settlements.controller'
import { SettlementsService } from './settlements.service'
import { ReconciliationService } from './reconciliation.service'
import { PrismaModule } from '../common/prisma/prisma.module'

@Module({
    imports: [PrismaModule],
    controllers: [SettlementsController],
    providers: [SettlementsService, ReconciliationService],
    exports: [SettlementsService, ReconciliationService],
})
export class SettlementsModule {}

