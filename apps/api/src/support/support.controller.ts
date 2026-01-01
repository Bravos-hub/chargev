import { Body, Controller, Get, Param, Post, Request, UseGuards } from '@nestjs/common'
import { SupportService } from './support.service'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'

@Controller('support')
@UseGuards(JwtAuthGuard)
export class SupportController {
    constructor(private readonly supportService: SupportService) { }

    @Get('tickets')
    getTickets(@Request() req: any) {
        return this.supportService.getTickets(req.user.id)
    }

    @Post('tickets')
    createTicket(@Request() req: any, @Body() dto: any) {
        return this.supportService.createTicket(req.user.id, dto)
    }

    @Get('tickets/:id')
    getTicket(@Param('id') id: string) {
        return this.supportService.getTicket(id)
    }

    @Post('tickets/:id/messages')
    addMessage(@Param('id') id: string, @Request() req: any, @Body('content') content: string) {
        return this.supportService.addMessage(id, req.user.id, content)
    }

    @Get('faqs')
    getFaqs() {
        return this.supportService.getFaqs()
    }
}
