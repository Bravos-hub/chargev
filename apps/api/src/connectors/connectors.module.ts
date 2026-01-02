import { Module } from '@nestjs/common'
import { ConnectorsService } from './connectors.service'
import { ConnectorsController } from './connectors.controller'
import { PrismaModule } from '../common/prisma/prisma.module'

@Module({
    imports: [PrismaModule],
    controllers: [ConnectorsController],
    providers: [ConnectorsService],
    exports: [ConnectorsService],
})
export class ConnectorsModule {}

