import {
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Body,
    Param,
    Query,
    UseGuards,
} from '@nestjs/common'
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger'
import { SubscriptionService } from './subscription.service'
import {
    CreateSubscriptionPlanDto,
    UpdateSubscriptionPlanDto,
    CreateSubscriptionDto,
    SubscriptionPlanQueryDto,
    SubscriptionQueryDto,
} from './dto/subscription.dto'
import { JwtAuthGuard } from '../common/auth/jwt-auth.guard'
import { RolesGuard } from '../common/auth/roles.guard'
import { Roles } from '../common/auth/roles.decorator'
import { CurrentUser } from '../common/auth/current-user.decorator'
import { UserRole } from '@prisma/client'

@ApiTags('subscriptions')
@ApiBearerAuth('JWT-auth')
@Controller('subscriptions')
@UseGuards(JwtAuthGuard)
export class SubscriptionController {
    constructor(private readonly subscriptionService: SubscriptionService) {}

    // =================== SUBSCRIPTION PLANS ===================

    @Get('plans')
    findAllPlans(@Query() query: SubscriptionPlanQueryDto) {
        return this.subscriptionService.findAllPlans(query)
    }

    @Get('plans/public')
    getPublicPlans(@Query('orgId') orgId?: string) {
        return this.subscriptionService.getPublicPlans(orgId)
    }

    @Get('plans/:id')
    findPlan(@Param('id') id: string) {
        return this.subscriptionService.findPlan(id)
    }

    @Post('plans')
    @UseGuards(RolesGuard)
    @Roles(
        UserRole.SUPER_ADMIN,
        UserRole.PLATFORM_ADMIN,
        UserRole.ORG_OWNER,
        UserRole.ORG_ADMIN
    )
    createPlan(
        @CurrentUser() user: { orgId: string },
        @Body() dto: CreateSubscriptionPlanDto
    ) {
        return this.subscriptionService.createPlan(user.orgId, dto)
    }

    @Patch('plans/:id')
    @UseGuards(RolesGuard)
    @Roles(
        UserRole.SUPER_ADMIN,
        UserRole.PLATFORM_ADMIN,
        UserRole.ORG_OWNER,
        UserRole.ORG_ADMIN
    )
    updatePlan(@Param('id') id: string, @Body() dto: UpdateSubscriptionPlanDto) {
        return this.subscriptionService.updatePlan(id, dto)
    }

    @Delete('plans/:id')
    @UseGuards(RolesGuard)
    @Roles(
        UserRole.SUPER_ADMIN,
        UserRole.PLATFORM_ADMIN,
        UserRole.ORG_OWNER
    )
    deletePlan(@Param('id') id: string) {
        return this.subscriptionService.deletePlan(id)
    }

    // =================== USER SUBSCRIPTIONS ===================

    @Get()
    @UseGuards(RolesGuard)
    @Roles(
        UserRole.SUPER_ADMIN,
        UserRole.PLATFORM_ADMIN,
        UserRole.ORG_OWNER,
        UserRole.ORG_ADMIN
    )
    findAllSubscriptions(@Query() query: SubscriptionQueryDto) {
        return this.subscriptionService.findAllSubscriptions(query)
    }

    @Get('my')
    getMySubscriptions(@CurrentUser() user: { id: string }) {
        return this.subscriptionService.getUserSubscriptions(user.id)
    }

    @Get('my/active')
    getMyActiveSubscription(@CurrentUser() user: { id: string }) {
        return this.subscriptionService.getActiveSubscription(user.id)
    }

    @Get('my/benefits')
    getMyBenefits(@CurrentUser() user: { id: string }) {
        return this.subscriptionService.checkSubscriptionBenefits(user.id)
    }

    @Get(':id')
    findSubscription(@Param('id') id: string) {
        return this.subscriptionService.findSubscription(id)
    }

    @Post()
    subscribe(
        @CurrentUser() user: { id: string },
        @Body() dto: CreateSubscriptionDto
    ) {
        return this.subscriptionService.subscribe(user.id, dto)
    }

    @Post(':id/cancel')
    cancelSubscription(
        @Param('id') id: string,
        @CurrentUser() user: { id: string }
    ) {
        return this.subscriptionService.cancelSubscription(id, user.id)
    }

    @Post(':id/pause')
    pauseSubscription(
        @Param('id') id: string,
        @CurrentUser() user: { id: string }
    ) {
        return this.subscriptionService.pauseSubscription(id, user.id)
    }

    @Post(':id/resume')
    resumeSubscription(
        @Param('id') id: string,
        @CurrentUser() user: { id: string }
    ) {
        return this.subscriptionService.resumeSubscription(id, user.id)
    }

    @Post(':id/renew')
    @UseGuards(RolesGuard)
    @Roles(
        UserRole.SUPER_ADMIN,
        UserRole.PLATFORM_ADMIN,
        UserRole.ORG_ADMIN
    )
    renewSubscription(@Param('id') id: string) {
        return this.subscriptionService.renewSubscription(id)
    }

    // =================== ANALYTICS ===================

    @Get('stats')
    @UseGuards(RolesGuard)
    @Roles(
        UserRole.SUPER_ADMIN,
        UserRole.PLATFORM_ADMIN,
        UserRole.ORG_OWNER,
        UserRole.ORG_ADMIN
    )
    getSubscriptionStats(@CurrentUser() user: { orgId: string }) {
        return this.subscriptionService.getSubscriptionStats(user.orgId)
    }
}

