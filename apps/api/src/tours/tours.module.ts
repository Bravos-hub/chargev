import { Module } from '@nestjs/common'
import { ToursService } from './tours.service'
import { ToursController } from './tours.controller'
import { PrismaModule } from '../common/prisma/prisma.module'

@Module({
    imports: [PrismaModule],
    controllers: [ToursController],
    providers: [ToursService],
    exports: [ToursService],
})
export class ToursModule {}

