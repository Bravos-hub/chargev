import { Module, Global } from '@nestjs/common'
import { AuditService } from './audit.service'
import { AuditController } from './audit.controller'
import { AuditInterceptor } from './audit.interceptor'
import { PrismaModule } from '../common/prisma/prisma.module'

@Global() // Make AuditService available globally
@Module({
    imports: [PrismaModule],
    controllers: [AuditController],
    providers: [AuditService, AuditInterceptor],
    exports: [AuditService, AuditInterceptor],
})
export class AuditModule {}

