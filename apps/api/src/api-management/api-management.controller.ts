import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Body,
    Param,
    Query,
    UseGuards,
    Request,
} from '@nestjs/common'
import { ApiKeyService } from './api-key.service'
import { WebhookService } from './webhook.service'
import { CreateApiKeyDto, UpdateApiKeyDto } from './dto/api-key.dto'
import { CreateWebhookDto, UpdateWebhookDto } from './dto/webhook.dto'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { RolesGuard, ROLES_KEY } from '../common/guards/roles.guard'
import { UserRole } from '@prisma/client'
import { SetMetadata } from '@nestjs/common'

const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles)

@Controller('api-management')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ApiManagementController {
    constructor(
        private apiKeyService: ApiKeyService,
        private webhookService: WebhookService,
    ) {}

    // =================== API KEYS ===================

    @Post('api-keys')
    @Roles(UserRole.ORG_OWNER, UserRole.ORG_ADMIN)
    createApiKey(@Request() req: any, @Body() dto: CreateApiKeyDto) {
        return this.apiKeyService.create(req.user.orgId, dto)
    }

    @Get('api-keys')
    @Roles(UserRole.ORG_OWNER, UserRole.ORG_ADMIN)
    findAllApiKeys(@Request() req: any) {
        return this.apiKeyService.findAll(req.user.orgId)
    }

    @Get('api-keys/:id')
    @Roles(UserRole.ORG_OWNER, UserRole.ORG_ADMIN)
    findOneApiKey(@Request() req: any, @Param('id') id: string) {
        return this.apiKeyService.findOne(id, req.user.orgId)
    }

    @Put('api-keys/:id')
    @Roles(UserRole.ORG_OWNER, UserRole.ORG_ADMIN)
    updateApiKey(@Request() req: any, @Param('id') id: string, @Body() dto: UpdateApiKeyDto) {
        return this.apiKeyService.update(id, req.user.orgId, dto)
    }

    @Delete('api-keys/:id')
    @Roles(UserRole.ORG_OWNER, UserRole.ORG_ADMIN)
    deleteApiKey(@Request() req: any, @Param('id') id: string) {
        return this.apiKeyService.delete(id, req.user.orgId)
    }

    @Post('api-keys/:id/regenerate')
    @Roles(UserRole.ORG_OWNER, UserRole.ORG_ADMIN)
    regenerateApiKey(@Request() req: any, @Param('id') id: string) {
        return this.apiKeyService.regenerateKey(id, req.user.orgId)
    }

    // =================== WEBHOOKS ===================

    @Post('webhooks')
    @Roles(UserRole.ORG_OWNER, UserRole.ORG_ADMIN)
    createWebhook(@Request() req: any, @Body() dto: CreateWebhookDto) {
        return this.webhookService.create(req.user.orgId, dto)
    }

    @Get('webhooks')
    @Roles(UserRole.ORG_OWNER, UserRole.ORG_ADMIN)
    findAllWebhooks(@Request() req: any) {
        return this.webhookService.findAll(req.user.orgId)
    }

    @Get('webhooks/:id')
    @Roles(UserRole.ORG_OWNER, UserRole.ORG_ADMIN)
    findOneWebhook(@Request() req: any, @Param('id') id: string) {
        return this.webhookService.findOne(id, req.user.orgId)
    }

    @Put('webhooks/:id')
    @Roles(UserRole.ORG_OWNER, UserRole.ORG_ADMIN)
    updateWebhook(@Request() req: any, @Param('id') id: string, @Body() dto: UpdateWebhookDto) {
        return this.webhookService.update(id, req.user.orgId, dto)
    }

    @Delete('webhooks/:id')
    @Roles(UserRole.ORG_OWNER, UserRole.ORG_ADMIN)
    deleteWebhook(@Request() req: any, @Param('id') id: string) {
        return this.webhookService.delete(id, req.user.orgId)
    }

    @Get('webhooks/:id/logs')
    @Roles(UserRole.ORG_OWNER, UserRole.ORG_ADMIN)
    getWebhookLogs(
        @Request() req: any,
        @Param('id') id: string,
        @Query('limit') limit?: number,
    ) {
        return this.webhookService.getLogs(id, req.user.orgId, limit)
    }

    @Post('webhooks/:id/test')
    @Roles(UserRole.ORG_OWNER, UserRole.ORG_ADMIN)
    testWebhook(@Request() req: any, @Param('id') id: string) {
        return this.webhookService.testWebhook(id, req.user.orgId)
    }
}

