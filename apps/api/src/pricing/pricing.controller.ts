import {
    Controller,
    Get,
    Post,
    Put,
    Patch,
    Delete,
    Body,
    Param,
    Query,
    UseGuards,
} from '@nestjs/common'
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery, ApiParam } from '@nestjs/swagger'
import { PricingService } from './pricing.service'
import { DynamicPricingService } from './dynamic-pricing.service'
import { CreatePricingDto, UpdatePricingDto, CalculatePriceDto } from './dto/pricing.dto'
import { CreatePricingRuleDto, UpdatePricingRuleDto, PricingRuleQueryDto } from './dto/pricing-rule.dto'
import { JwtAuthGuard } from '../common/auth/jwt-auth.guard'
import { RolesGuard } from '../common/auth/roles.guard'
import { Roles } from '../common/auth/roles.decorator'
import { UserRole } from '@prisma/client'

@ApiTags('pricing')
@ApiBearerAuth('JWT-auth')
@Controller('pricing')
@UseGuards(JwtAuthGuard)
export class PricingController {
    constructor(
        private readonly pricingService: PricingService,
        private readonly dynamicPricingService: DynamicPricingService
    ) {}

    // =================== PRICING ===================

    @Get('stations/:stationId')
    getPricing(@Param('stationId') stationId: string) {
        return this.pricingService.getPricing(stationId)
    }

    @Post('stations/:stationId')
    @UseGuards(RolesGuard)
    @Roles(
        UserRole.SUPER_ADMIN,
        UserRole.PLATFORM_ADMIN,
        UserRole.ORG_OWNER,
        UserRole.ORG_ADMIN,
        UserRole.STATION_OWNER_ORG
    )
    createPricing(
        @Param('stationId') stationId: string,
        @Body() dto: CreatePricingDto
    ) {
        return this.pricingService.createPricing(stationId, dto)
    }

    @Put('stations/:stationId')
    @UseGuards(RolesGuard)
    @Roles(
        UserRole.SUPER_ADMIN,
        UserRole.PLATFORM_ADMIN,
        UserRole.ORG_OWNER,
        UserRole.ORG_ADMIN,
        UserRole.STATION_OWNER_ORG
    )
    updatePricing(
        @Param('stationId') stationId: string,
        @Body() dto: UpdatePricingDto
    ) {
        return this.pricingService.updatePricing(stationId, dto)
    }

    @Delete('stations/:stationId')
    @UseGuards(RolesGuard)
    @Roles(
        UserRole.SUPER_ADMIN,
        UserRole.PLATFORM_ADMIN,
        UserRole.ORG_OWNER
    )
    deletePricing(@Param('stationId') stationId: string) {
        return this.pricingService.deletePricing(stationId)
    }

    // =================== PRICING RULES ===================

    @Get('rules')
    getRules(@Query() query: PricingRuleQueryDto) {
        return this.pricingService.getRules(query)
    }

    @Get('stations/:stationId/rules')
    getRulesByStation(@Param('stationId') stationId: string) {
        return this.pricingService.getRulesByStation(stationId)
    }

    @Get('rules/:id')
    getRule(@Param('id') id: string) {
        return this.pricingService.getRule(id)
    }

    @Post('stations/:stationId/rules')
    @UseGuards(RolesGuard)
    @Roles(
        UserRole.SUPER_ADMIN,
        UserRole.PLATFORM_ADMIN,
        UserRole.ORG_OWNER,
        UserRole.ORG_ADMIN
    )
    createRule(
        @Param('stationId') stationId: string,
        @Body() dto: CreatePricingRuleDto
    ) {
        return this.pricingService.createRuleForStation(stationId, dto)
    }

    @Patch('rules/:id')
    @UseGuards(RolesGuard)
    @Roles(
        UserRole.SUPER_ADMIN,
        UserRole.PLATFORM_ADMIN,
        UserRole.ORG_OWNER,
        UserRole.ORG_ADMIN
    )
    updateRule(@Param('id') id: string, @Body() dto: UpdatePricingRuleDto) {
        return this.pricingService.updateRule(id, dto)
    }

    @Delete('rules/:id')
    @UseGuards(RolesGuard)
    @Roles(
        UserRole.SUPER_ADMIN,
        UserRole.PLATFORM_ADMIN,
        UserRole.ORG_OWNER
    )
    deleteRule(@Param('id') id: string) {
        return this.pricingService.deleteRule(id)
    }

    @Post('rules/:id/toggle')
    @UseGuards(RolesGuard)
    @Roles(
        UserRole.SUPER_ADMIN,
        UserRole.PLATFORM_ADMIN,
        UserRole.ORG_OWNER,
        UserRole.ORG_ADMIN
    )
    toggleRule(@Param('id') id: string) {
        return this.pricingService.toggleRule(id)
    }

    // =================== DYNAMIC PRICING ===================

    @Post('calculate')
    calculatePrice(@Body() dto: CalculatePriceDto) {
        return this.dynamicPricingService.calculatePrice(dto)
    }

    @Get('stations/:stationId/estimate')
    estimateSessionCost(
        @Param('stationId') stationId: string,
        @Query('kwh') kwh: string,
        @Query('minutes') minutes: string,
        @Query('userId') userId?: string
    ) {
        return this.dynamicPricingService.estimateSessionCost(
            stationId,
            parseFloat(kwh),
            parseInt(minutes),
            userId
        )
    }

    @Get('stations/:stationId/current-rate')
    getCurrentRate(@Param('stationId') stationId: string) {
        return this.dynamicPricingService.getCurrentRate(stationId)
    }
}

