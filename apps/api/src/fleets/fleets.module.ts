import { Module } from '@nestjs/common'
import { FleetsService } from './fleets.service'
import { FleetsController } from './fleets.controller'
import { PrismaModule } from '../common/prisma/prisma.module'

@Module({
    imports: [PrismaModule],
    controllers: [FleetsController],
    providers: [FleetsService],
    exports: [FleetsService],
})
export class FleetsModule { }
