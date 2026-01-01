import { Body, Controller, Delete, Get, Param, Patch, Post, Request, UseGuards } from '@nestjs/common'
import { UsersService } from './users.service'
import { CreateUserDto, UpdateUserDto } from './dto/user.dto'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { RolesGuard } from '../../common/guards/roles.guard'
import { Roles } from '../../common/decorators/auth.decorators'
import { UserRole } from '@prisma/client'

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
    findAll(@Request() req) {
        return this.usersService.findAll(req.user)
    }

    @Get('profile')
    getProfile(@Request() req) {
        return this.usersService.findOne(req.user.id)
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
}
