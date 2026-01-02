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
import { RatingsService } from './ratings.service'
import { CreateRatingDto, UpdateRatingDto, QueryRatingsDto } from './dto/rating.dto'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'

@Controller('ratings')
export class RatingsController {
    constructor(private ratingsService: RatingsService) {}

    @Post()
    @UseGuards(JwtAuthGuard)
    create(@Request() req: any, @Body() dto: CreateRatingDto) {
        return this.ratingsService.create(req.user.id, dto)
    }

    @Get()
    findAll(@Query() query: QueryRatingsDto) {
        return this.ratingsService.findAll(query)
    }

    @Get('entity/:entityType/:entityId')
    findByEntity(
        @Param('entityType') entityType: string,
        @Param('entityId') entityId: string,
    ) {
        return this.ratingsService.findByEntity(entityType, entityId)
    }

    @Get('stats/:entityType/:entityId')
    getEntityStats(
        @Param('entityType') entityType: string,
        @Param('entityId') entityId: string,
    ) {
        return this.ratingsService.getEntityStats(entityType, entityId)
    }

    @Get('top/:entityType')
    getTopRated(
        @Param('entityType') entityType: string,
        @Query('limit') limit?: number,
    ) {
        return this.ratingsService.getTopRated(entityType, limit)
    }

    @Get('user')
    @UseGuards(JwtAuthGuard)
    getUserRatings(@Request() req: any) {
        return this.ratingsService.getUserRatings(req.user.id)
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.ratingsService.findOne(id)
    }

    @Put(':id')
    @UseGuards(JwtAuthGuard)
    update(@Request() req: any, @Param('id') id: string, @Body() dto: UpdateRatingDto) {
        return this.ratingsService.update(id, req.user.id, dto)
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard)
    delete(@Request() req: any, @Param('id') id: string) {
        const isAdmin = ['SUPER_ADMIN', 'PLATFORM_ADMIN'].includes(req.user.role)
        return this.ratingsService.delete(id, req.user.id, isAdmin)
    }
}

