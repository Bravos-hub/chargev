import { Body, Controller, Get, Param, Post, Request, UseGuards } from '@nestjs/common'
import { PrivateChargersService } from './private-chargers.service'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'

@Controller('chargers/private')
@UseGuards(JwtAuthGuard)
export class PrivateChargersController {
    constructor(private readonly privateChargersService: PrivateChargersService) { }

    @Get()
    getChargers(@Request() req: any) {
        return this.privateChargersService.getChargers(req.user.id)
    }

    @Get(':id')
    getCharger(@Param('id') id: string) {
        return this.privateChargersService.getCharger(id)
    }

    @Post(':id/access')
    updateAccess(@Param('id') id: string, @Body() dto: { userId: string, canAccess: boolean }) {
        return this.privateChargersService.updateAccess(id, dto.userId, dto.canAccess)
    }

    @Get(':id/schedule')
    getSchedule(@Param('id') id: string) {
        return this.privateChargersService.getSchedule(id)
    }

    @Post(':id/schedule')
    updateSchedule(@Param('id') id: string, @Body() schedule: any) {
        return this.privateChargersService.updateSchedule(id, schedule)
    }

    @Get(':id/pricing')
    getPricing(@Param('id') id: string) {
        return this.privateChargersService.getPricing(id)
    }

    @Post(':id/pricing')
    updatePricing(@Param('id') id: string, @Body() pricing: any) {
        return this.privateChargersService.updatePricing(id, pricing)
    }
}
