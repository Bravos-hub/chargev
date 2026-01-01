import { Body, Controller, Delete, Get, Param, Patch, Post, Request, UseGuards } from '@nestjs/common'
import { VehiclesService } from './vehicles.service'
import { CreateVehicleDto, UpdateVehicleDto } from './dto/vehicle.dto'
import { CreateMaintenanceRecordDto } from './dto/maintenance.dto'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { RolesGuard } from '../../common/guards/roles.guard'

@Controller('vehicles')
@UseGuards(JwtAuthGuard, RolesGuard)
export class VehiclesController {
    constructor(private readonly vehiclesService: VehiclesService) { }

    @Post()
    create(@Body() createVehicleDto: CreateVehicleDto) {
        return this.vehiclesService.create(createVehicleDto)
    }

    @Get()
    findAll(@Request() req) {
        return this.vehiclesService.findAll(req.user)
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.vehiclesService.findOne(id)
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updateVehicleDto: UpdateVehicleDto) {
        return this.vehiclesService.update(id, updateVehicleDto)
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.vehiclesService.remove(id)
    }

    // Sub-resources
    @Get(':id/diagnostics')
    getDiagnostics(@Param('id') id: string) {
        return this.vehiclesService.getDiagnostics(id)
    }

    @Get(':id/battery-health')
    getBatteryHealth(@Param('id') id: string) {
        return this.vehiclesService.getBatteryHealth(id)
    }

    @Post(':id/maintenance')
    addMaintenance(@Param('id') id: string, @Body() dto: CreateMaintenanceRecordDto) {
        return this.vehiclesService.addMaintenanceRecord(id, dto)
    }
}
