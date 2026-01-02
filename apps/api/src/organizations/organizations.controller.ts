import { Body, Controller, Get, Param, Post, Request, UseGuards } from '@nestjs/common'
import { OrganizationsService } from './organizations.service'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { CreateOrganizationDto } from './dto/organization.dto'

@Controller('organizations')
@UseGuards(JwtAuthGuard)
export class OrganizationsController {
    constructor(private readonly organizationsService: OrganizationsService) { }

    @Get()
    findAll(@Request() req: any) {
        return this.organizationsService.findAll(req.user.id)
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.organizationsService.findOne(id)
    }

    @Post()
    create(@Request() req: any, @Body() dto: CreateOrganizationDto) {
        return this.organizationsService.create(req.user.id, dto)
    }
}
