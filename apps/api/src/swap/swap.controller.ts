import { Body, Controller, Get, Param, Post, Request, UseGuards } from '@nestjs/common'
import { SwapService } from './swap.service'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'

@Controller('swap')
@UseGuards(JwtAuthGuard)
export class SwapController {
    constructor(private readonly swapService: SwapService) { }

    @Get('stations')
    getStations() {
        return this.swapService.getStations()
    }

    @Get('stations/:id')
    getStation(@Param('id') id: string) {
        return this.swapService.getStation(id)
    }

    @Post('initiate')
    initiateSwap(@Request() req: any, @Body() dto: { stationId: string, vehicleId: string }) {
        return this.swapService.initiateSwap(req.user.id, dto.stationId, dto.vehicleId)
    }

    @Post(':id/complete')
    completeSwap(@Param('id') id: string) {
        return this.swapService.completeSwap(id)
    }

    @Get('batteries')
    getUserBatteries(@Request() req: any) {
        return this.swapService.getUserBatteries(req.user.id)
    }

    @Get('history')
    getSwapHistory(@Request() req: any) {
        return this.swapService.getSwapHistory(req.user.id)
    }
}
