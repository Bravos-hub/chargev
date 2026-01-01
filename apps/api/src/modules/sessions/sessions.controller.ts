import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common'
import { SessionsService } from './sessions.service'
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard'
import { ListSessionsDto } from './dto/list-sessions.dto'

@Controller('sessions')
@UseGuards(JwtAuthGuard)
export class SessionsController {
  constructor(private sessions: SessionsService) {}

  @Get()
  list(@Query() dto: ListSessionsDto) {
    return this.sessions.list(dto)
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.sessions.getById(id)
  }
}
