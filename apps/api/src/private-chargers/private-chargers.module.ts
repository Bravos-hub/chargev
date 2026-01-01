import { Module } from '@nestjs/common'
import { PrivateChargersService } from './private-chargers.service'
import { PrivateChargersController } from './private-chargers.controller'
import { PrismaModule } from '../common/prisma/prisma.module'

@Module({
    imports: [PrismaModule],
    controllers: [PrivateChargersController],
    providers: [PrivateChargersService],
    exports: [PrivateChargersService],
})
export class PrivateChargersModule { }
