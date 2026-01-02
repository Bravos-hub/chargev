import { Module } from '@nestjs/common'
import { InvoicesController } from './invoices.controller'
import { InvoicesService } from './invoices.service'
import { InvoiceGeneratorService } from './invoice-generator.service'
import { PrismaModule } from '../common/prisma/prisma.module'

@Module({
    imports: [PrismaModule],
    controllers: [InvoicesController],
    providers: [InvoicesService, InvoiceGeneratorService],
    exports: [InvoicesService, InvoiceGeneratorService],
})
export class InvoicesModule {}

