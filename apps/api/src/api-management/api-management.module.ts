import { Module } from '@nestjs/common'
import { ApiKeyService } from './api-key.service'
import { WebhookService } from './webhook.service'
import { ApiManagementController } from './api-management.controller'
import { PrismaModule } from '../common/prisma/prisma.module'

@Module({
    imports: [PrismaModule],
    controllers: [ApiManagementController],
    providers: [ApiKeyService, WebhookService],
    exports: [ApiKeyService, WebhookService],
})
export class ApiManagementModule {}

