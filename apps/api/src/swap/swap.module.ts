import { Module } from '@nestjs/common'
import { SwapService } from './swap.service'
import { SwapController } from './swap.controller'
import { PrismaModule } from '../common/prisma/prisma.module'

@Module({
    imports: [PrismaModule],
    controllers: [SwapController],
    providers: [SwapService],
    exports: [SwapService],
})
export class SwapModule { }
