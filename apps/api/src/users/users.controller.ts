import { Body, Controller, Delete, Get, Param, Patch, Post, Request, UseGuards } from '@nestjs/common'
import { UsersService } from './users.service'
import { CreateUserDto, UpdateUserDto } from './dto/user.dto'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { RolesGuard } from '../common/guards/roles.guard'
import { Roles } from '../common/decorators/auth.decorators'

export enum UserRole {
    SUPER_ADMIN = 'SUPER_ADMIN',
    PLATFORM_ADMIN = 'PLATFORM_ADMIN',
    ORG_OWNER = 'ORG_OWNER',
    ORG_ADMIN = 'ORG_ADMIN',
    STATION_OWNER_INDIVIDUAL = 'STATION_OWNER_INDIVIDUAL',
    STATION_OWNER_ORG = 'STATION_OWNER_ORG',
    STATION_ADMIN = 'STATION_ADMIN',
    STATION_ATTENDANT = 'STATION_ATTENDANT',
    TECHNICIAN_PUBLIC = 'TECHNICIAN_PUBLIC',
    TECHNICIAN_ORG = 'TECHNICIAN_ORG',
    FLEET_MANAGER = 'FLEET_MANAGER',
    FLEET_DRIVER = 'FLEET_DRIVER',
    RIDER_PREMIUM = 'RIDER_PREMIUM',
    RIDER_STANDARD = 'RIDER_STANDARD',
    GUEST = 'GUEST'
}

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
    constructor(private readonly usersService: UsersService) { }

    @Post()
    @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.FLEET_MANAGER)
    create(@Body() createUserDto: CreateUserDto) {
        return this.usersService.create(createUserDto)
    }

    @Get()
    @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.FLEET_MANAGER)
    findAll(@Request() req: any) {
        return this.usersService.findAll(req.user)
    }

    @Get('me')
    getMe(@Request() req: any) {
        return this.usersService.findOne(req.user.id)
    }

    @Patch('me')
    updateMe(@Request() req: any, @Body() updateUserDto: UpdateUserDto) {
        return this.usersService.update(req.user.id, updateUserDto)
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.usersService.findOne(id)
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
        return this.usersService.update(id, updateUserDto)
    }

    @Delete(':id')
    @Roles(UserRole.SUPER_ADMIN)
    remove(@Param('id') id: string) {
        return this.usersService.remove(id)
    }

    @Get(':id/vehicles')
    getVehicles(@Param('id') id: string) {
        return this.usersService.getVehicles(id)
    }

    @Get(':id/sessions')
    getSessions(@Param('id') id: string) {
        return this.usersService.getSessions(id)
    }
}
