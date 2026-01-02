import { Module } from '@nestjs/common'
import { OperationsService } from './operations.service'
import { OperationsController } from './operations.controller'
import { PrismaModule } from '../common/prisma/prisma.module'

@Module({
    imports: [PrismaModule],
    controllers: [OperationsController],
    providers: [OperationsService],
    exports: [OperationsService],
})
export class OperationsModule {}

