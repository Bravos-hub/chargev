import { Module } from '@nestjs/common'
import { RoutePlanningService } from './route-planning.service'
import { RoutePlanningController } from './route-planning.controller'
import { PrismaModule } from '../common/prisma/prisma.module'

@Module({
    imports: [PrismaModule],
    controllers: [RoutePlanningController],
    providers: [RoutePlanningService],
    exports: [RoutePlanningService],
})
export class RoutePlanningModule { }
