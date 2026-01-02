import { Module } from '@nestjs/common'
import { OCPIService } from './ocpi.service'
import { OCPIController } from './ocpi.controller'
import { PrismaModule } from '../common/prisma/prisma.module'

@Module({
    imports: [PrismaModule],
    controllers: [OCPIController],
    providers: [OCPIService],
    exports: [OCPIService],
})
export class OCPIModule {}

