import { Body, Controller, Get, Param, Post, Request, UseGuards } from '@nestjs/common'
import { FleetsService } from './fleets.service'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'

@Controller('fleets')
@UseGuards(JwtAuthGuard)
export class FleetsController {
    constructor(private readonly fleetsService: FleetsService) { }

    @Get()
    findAll(@Request() req: any) {
        return this.fleetsService.findAll(req.user.id)
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.fleetsService.findOne(id)
    }

    @Post()
    create(@Request() req: any, @Body() dto: any) {
        return this.fleetsService.create(req.user.id, dto)
    }
}
