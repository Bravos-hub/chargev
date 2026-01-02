import { Module } from '@nestjs/common'
import { ShuttleService } from './shuttle.service'
import { ShuttleController } from './shuttle.controller'
import { PrismaModule } from '../common/prisma/prisma.module'

@Module({
    imports: [PrismaModule],
    controllers: [ShuttleController],
    providers: [ShuttleService],
    exports: [ShuttleService],
})
export class ShuttleModule {}

