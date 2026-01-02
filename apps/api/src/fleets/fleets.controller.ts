import { Body, Controller, Get, Param, Post, Request, UseGuards } from '@nestjs/common'
import { FleetsService } from './fleets.service'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { CreateFleetDto } from './dto/fleet.dto'

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
    create(@Request() req: any, @Body() dto: CreateFleetDto) {
        return this.fleetsService.create(req.user.id, dto)
    }
}
