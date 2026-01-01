import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common'
import { StationsService } from './stations.service'
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard'
import { RolesGuard } from '../../common/auth/roles.guard'
import { Roles } from '../../common/auth/roles.decorator'
import { ListStationsDto } from './dto/list-stations.dto'
import { CreateStationDto } from './dto/create-station.dto'
import { UpdateStationDto } from './dto/update-station.dto'
import { CommandStationDto } from './dto/command-station.dto'

@Controller('stations')
@UseGuards(JwtAuthGuard, RolesGuard)
export class StationsController {
  constructor(private stations: StationsService) {}

  @Get()
  list(@Query() dto: ListStationsDto) {
    return this.stations.list(dto)
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.stations.getById(id)
  }

  @Post()
  @Roles('EVZONE_ADMIN', 'EVZONE_OPERATOR')
  create(@Body() dto: CreateStationDto) {
    return this.stations.create(dto)
  }

  @Patch(':id')
  @Roles('EVZONE_ADMIN', 'EVZONE_OPERATOR')
  update(@Param('id') id: string, @Body() dto: UpdateStationDto) {
    return this.stations.update(id, dto)
  }

  @Post(':id/commands')
  @Roles('EVZONE_ADMIN', 'EVZONE_OPERATOR')
  command(@Param('id') id: string, @Body() dto: CommandStationDto) {
    return this.stations.command(id, dto.command)
  }
}
