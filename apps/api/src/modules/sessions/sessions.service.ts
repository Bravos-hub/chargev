import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../common/prisma/prisma.service'
import { ListSessionsDto } from './dto/list-sessions.dto'

@Injectable()
export class SessionsService {
  constructor(private prisma: PrismaService) { }

  async list(dto: ListSessionsDto) {
    const page = dto.page || 1
    const pageSize = dto.pageSize || 25

    const where = {
      AND: [
        dto.q
          ? {
            OR: [
              { id: { contains: dto.q, mode: 'insensitive' as any } },
            ],
          }
          : {},
        dto.stationId ? { stationId: dto.stationId } : {},
        dto.userId ? { userId: dto.userId } : {},
        dto.status ? { status: dto.status } : {},
      ],
    }

    const [items, total] = await Promise.all([
      this.prisma.chargingSession.findMany({
        where,
        orderBy: { startedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.chargingSession.count({ where }),
    ])

    return { items, page, pageSize, total }
  }

  getById(id: string) {
    return this.prisma.chargingSession.findUnique({ where: { id } })
  }
}
