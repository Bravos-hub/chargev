import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common'
import { UsersService } from './users.service'
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard'
import { Roles } from '../../common/auth/roles.decorator'
import { RolesGuard } from '../../common/auth/roles.guard'
import { CurrentUser } from '../../common/auth/current-user.decorator'
import type { JwtUser } from '../../common/auth/types'
import { CreateUserDto } from './dto/create-user.dto'

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private users: UsersService) {}

  @Get('me')
  me(@CurrentUser() user: JwtUser) {
    return this.users.getById(user.id)
  }

  @Get()
  @Roles('EVZONE_ADMIN')
  list(@Query('q') q?: string) {
    return this.users.list(q)
  }

  @Get(':id')
  @Roles('EVZONE_ADMIN')
  get(@Param('id') id: string) {
    return this.users.getById(id)
  }

  @Post()
  @Roles('EVZONE_ADMIN')
  create(@Body() dto: CreateUserDto) {
    return this.users.create(dto)
  }
}
