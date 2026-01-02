import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Body,
    Param,
    Query,
    UseGuards,
    Request,
} from '@nestjs/common'
import { ShuttleService } from './shuttle.service'
import {
    CreateRouteDto,
    UpdateRouteDto,
    CreateRouteStopDto,
    CreateStudentDto,
    UpdateStudentDto,
    CreateTripDto,
    RecordAttendanceDto,
} from './dto/shuttle.dto'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { RolesGuard, ROLES_KEY } from '../common/guards/roles.guard'
import { UserRole } from '@prisma/client'
import { SetMetadata } from '@nestjs/common'

const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles)

@Controller('shuttle')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ShuttleController {
    constructor(private shuttleService: ShuttleService) {}

    // =================== ROUTES ===================

    @Post('routes')
    @Roles(UserRole.FLEET_MANAGER, UserRole.ORG_ADMIN)
    createRoute(@Request() req: any, @Body() dto: CreateRouteDto) {
        return this.shuttleService.createRoute(req.user.fleetId, dto)
    }

    @Get('routes')
    @Roles(UserRole.FLEET_MANAGER, UserRole.ORG_ADMIN, UserRole.FLEET_DRIVER)
    findAllRoutes(@Request() req: any) {
        return this.shuttleService.findAllRoutes(req.user.fleetId)
    }

    @Get('routes/:id')
    findRoute(@Param('id') id: string) {
        return this.shuttleService.findRoute(id)
    }

    @Get('routes/:id/stats')
    getRouteStats(@Param('id') id: string) {
        return this.shuttleService.getRouteStats(id)
    }

    @Put('routes/:id')
    @Roles(UserRole.FLEET_MANAGER, UserRole.ORG_ADMIN)
    updateRoute(@Param('id') id: string, @Body() dto: UpdateRouteDto) {
        return this.shuttleService.updateRoute(id, dto)
    }

    @Delete('routes/:id')
    @Roles(UserRole.FLEET_MANAGER, UserRole.ORG_ADMIN)
    deleteRoute(@Param('id') id: string) {
        return this.shuttleService.deleteRoute(id)
    }

    // =================== STOPS ===================

    @Post('stops')
    @Roles(UserRole.FLEET_MANAGER, UserRole.ORG_ADMIN)
    addStop(@Body() dto: CreateRouteStopDto) {
        return this.shuttleService.addStop(dto)
    }

    @Put('stops/:id')
    @Roles(UserRole.FLEET_MANAGER, UserRole.ORG_ADMIN)
    updateStop(@Param('id') id: string, @Body() dto: Partial<CreateRouteStopDto>) {
        return this.shuttleService.updateStop(id, dto)
    }

    @Delete('stops/:id')
    @Roles(UserRole.FLEET_MANAGER, UserRole.ORG_ADMIN)
    deleteStop(@Param('id') id: string) {
        return this.shuttleService.deleteStop(id)
    }

    @Post('routes/:routeId/reorder-stops')
    @Roles(UserRole.FLEET_MANAGER, UserRole.ORG_ADMIN)
    reorderStops(@Param('routeId') routeId: string, @Body('stopIds') stopIds: string[]) {
        return this.shuttleService.reorderStops(routeId, stopIds)
    }

    // =================== STUDENTS ===================

    @Post('students')
    @Roles(UserRole.FLEET_MANAGER, UserRole.ORG_ADMIN)
    createStudent(@Request() req: any, @Body() dto: CreateStudentDto) {
        return this.shuttleService.createStudent(req.user.fleetId, dto)
    }

    @Get('students')
    @Roles(UserRole.FLEET_MANAGER, UserRole.ORG_ADMIN, UserRole.FLEET_DRIVER)
    findAllStudents(@Request() req: any, @Query('routeId') routeId?: string) {
        return this.shuttleService.findAllStudents(req.user.fleetId, routeId)
    }

    @Get('students/:id')
    findStudent(@Param('id') id: string) {
        return this.shuttleService.findStudent(id)
    }

    @Put('students/:id')
    @Roles(UserRole.FLEET_MANAGER, UserRole.ORG_ADMIN)
    updateStudent(@Param('id') id: string, @Body() dto: UpdateStudentDto) {
        return this.shuttleService.updateStudent(id, dto)
    }

    @Delete('students/:id')
    @Roles(UserRole.FLEET_MANAGER, UserRole.ORG_ADMIN)
    deleteStudent(@Param('id') id: string) {
        return this.shuttleService.deleteStudent(id)
    }

    // =================== TRIPS ===================

    @Post('trips')
    @Roles(UserRole.FLEET_MANAGER, UserRole.ORG_ADMIN, UserRole.FLEET_DRIVER)
    startTrip(@Body() dto: CreateTripDto) {
        return this.shuttleService.startTrip(dto)
    }

    @Get('trips')
    @Roles(UserRole.FLEET_MANAGER, UserRole.ORG_ADMIN, UserRole.FLEET_DRIVER)
    findTrips(
        @Request() req: any,
        @Query('routeId') routeId?: string,
        @Query('date') date?: string,
        @Query('status') status?: string,
    ) {
        return this.shuttleService.findTrips(req.user.fleetId, { routeId, date, status })
    }

    @Get('trips/:id')
    findTrip(@Param('id') id: string) {
        return this.shuttleService.findTrip(id)
    }

    @Post('trips/:id/attendance')
    @Roles(UserRole.FLEET_DRIVER, UserRole.FLEET_MANAGER)
    recordAttendance(@Param('id') id: string, @Body() dto: RecordAttendanceDto) {
        return this.shuttleService.recordAttendance(id, dto)
    }

    @Post('trips/:id/end')
    @Roles(UserRole.FLEET_DRIVER, UserRole.FLEET_MANAGER)
    endTrip(@Param('id') id: string) {
        return this.shuttleService.endTrip(id)
    }
}

