import { Body, Controller, Get, Post, Request, UseGuards } from '@nestjs/common'
import { RoutePlanningService } from './route-planning.service'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'

@Controller('routes')
@UseGuards(JwtAuthGuard)
export class RoutePlanningController {
    constructor(private readonly routePlanningService: RoutePlanningService) { }

    @Post('plan')
    planRoute(@Request() req: any, @Body() dto: any) {
        return this.routePlanningService.planRoute(req.user.id, dto)
    }

    @Get('history')
    getHistory(@Request() req: any) {
        return this.routePlanningService.getHistory(req.user.id)
    }
}
