import {
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Body,
    Param,
    Query,
    UseGuards,
    Res,
} from '@nestjs/common'
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiProduces } from '@nestjs/swagger'
import { FastifyReply } from 'fastify'
import { InvoicesService } from './invoices.service'
import { InvoiceGeneratorService } from './invoice-generator.service'
import {
    CreateInvoiceDto,
    UpdateInvoiceDto,
    GenerateInvoiceDto,
    InvoiceQueryDto,
    SendInvoiceDto,
} from './dto/invoice.dto'
import { JwtAuthGuard } from '../common/auth/jwt-auth.guard'
import { RolesGuard } from '../common/auth/roles.guard'
import { Roles } from '../common/auth/roles.decorator'
import { CurrentUser } from '../common/auth/current-user.decorator'
import { UserRole } from '@prisma/client'

@ApiTags('invoices')
@ApiBearerAuth('JWT-auth')
@Controller('invoices')
@UseGuards(JwtAuthGuard)
export class InvoicesController {
    constructor(
        private readonly invoicesService: InvoicesService,
        private readonly invoiceGeneratorService: InvoiceGeneratorService
    ) {}

    @Get()
    @UseGuards(RolesGuard)
    @Roles(
        UserRole.SUPER_ADMIN,
        UserRole.PLATFORM_ADMIN,
        UserRole.ORG_OWNER,
        UserRole.ORG_ADMIN
    )
    findAll(@Query() query: InvoiceQueryDto) {
        return this.invoicesService.findAll(query)
    }

    @Get('stats')
    @UseGuards(RolesGuard)
    @Roles(
        UserRole.SUPER_ADMIN,
        UserRole.PLATFORM_ADMIN,
        UserRole.ORG_OWNER,
        UserRole.ORG_ADMIN
    )
    getStats(@CurrentUser() user: { orgId: string }, @Query('orgId') orgId?: string) {
        return this.invoicesService.getInvoiceStats(orgId || user.orgId)
    }

    @Get('my')
    getMyInvoices(@CurrentUser() user: { orgId: string }) {
        return this.invoicesService.findByOrg(user.orgId)
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.invoicesService.findOne(id)
    }

    @Get(':id/details')
    getInvoiceDetails(@Param('id') id: string) {
        return this.invoiceGeneratorService.getInvoiceDetails(id)
    }

    @Get(':id/html')
    async getInvoiceHTML(@Param('id') id: string, @Res() reply: FastifyReply) {
        const details = await this.invoiceGeneratorService.getInvoiceDetails(id)
        const html = this.invoiceGeneratorService.generateInvoiceHTML(details)

        reply.header('Content-Type', 'text/html')
        reply.send(html)
    }

    @Get(':id/download')
    async downloadInvoice(@Param('id') id: string, @Res() reply: FastifyReply) {
        const details = await this.invoiceGeneratorService.getInvoiceDetails(id)
        const html = this.invoiceGeneratorService.generateInvoiceHTML(details)

        // In a production environment, you would convert HTML to PDF here
        // For now, we'll return the HTML with appropriate headers
        reply.header('Content-Type', 'text/html')
        reply.header('Content-Disposition', `attachment; filename="invoice-${details.invoiceNumber}.html"`)
        reply.send(html)
    }

    @Post()
    @UseGuards(RolesGuard)
    @Roles(
        UserRole.SUPER_ADMIN,
        UserRole.PLATFORM_ADMIN,
        UserRole.ORG_ADMIN
    )
    create(@Body() dto: CreateInvoiceDto) {
        return this.invoicesService.create(dto)
    }

    @Post('generate')
    @UseGuards(RolesGuard)
    @Roles(
        UserRole.SUPER_ADMIN,
        UserRole.PLATFORM_ADMIN,
        UserRole.ORG_ADMIN
    )
    generateInvoice(@Body() dto: GenerateInvoiceDto) {
        return this.invoicesService.generateInvoice(dto)
    }

    @Post(':id/send')
    @UseGuards(RolesGuard)
    @Roles(
        UserRole.SUPER_ADMIN,
        UserRole.PLATFORM_ADMIN,
        UserRole.ORG_ADMIN
    )
    sendInvoice(@Param('id') id: string, @Body() dto: SendInvoiceDto) {
        // In a real implementation, this would send the invoice via email
        return { success: true, message: 'Invoice sent successfully', invoiceId: id }
    }

    @Post(':id/mark-paid')
    @UseGuards(RolesGuard)
    @Roles(
        UserRole.SUPER_ADMIN,
        UserRole.PLATFORM_ADMIN,
        UserRole.ORG_ADMIN
    )
    markAsPaid(@Param('id') id: string) {
        return this.invoicesService.markAsPaid(id)
    }

    @Post('check-overdue')
    @UseGuards(RolesGuard)
    @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN)
    checkOverdueInvoices() {
        return this.invoicesService.checkOverdueInvoices()
    }

    @Patch(':id')
    @UseGuards(RolesGuard)
    @Roles(
        UserRole.SUPER_ADMIN,
        UserRole.PLATFORM_ADMIN,
        UserRole.ORG_ADMIN
    )
    update(@Param('id') id: string, @Body() dto: UpdateInvoiceDto) {
        return this.invoicesService.update(id, dto)
    }

    @Delete(':id')
    @UseGuards(RolesGuard)
    @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN)
    delete(@Param('id') id: string) {
        return this.invoicesService.delete(id)
    }
}

