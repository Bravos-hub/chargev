import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../common/prisma/prisma.service'
import { KafkaService } from '../../integrations/kafka/kafka.service'
import { ListStationsDto } from './dto/list-stations.dto'
import { CreateStationDto } from './dto/create-station.dto'
import { UpdateStationDto } from './dto/update-station.dto'

@Injectable()
export class StationsService {
  constructor(private prisma: PrismaService, private kafka: KafkaService) { }

  async list(dto: ListStationsDto) {
    const page = dto.page || 1
    const pageSize = dto.pageSize || 25

    const where = {
      AND: [
        dto.q
          ? {
            OR: [
              { code: { contains: dto.q, mode: 'insensitive' as any } },
              { name: { contains: dto.q, mode: 'insensitive' as any } },
              { address: { contains: dto.q, mode: 'insensitive' as any } },
            ],
          }
          : {},
        dto.region ? { region: dto.region } : {},
        dto.type ? { type: dto.type } : {},
        dto.status ? { status: dto.status } : {},
        dto.orgId ? { orgId: dto.orgId } : {},
      ],
    }

    const [items, total] = await Promise.all([
      this.prisma.station.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.station.count({ where }),
    ])

    return { items, page, pageSize, total }
  }

  getById(id: string) {
    return this.prisma.station.findUnique({ where: { id } })
  }

  create(dto: CreateStationDto) {
    return this.prisma.station.create({
      data: {
        code: dto.code,
        name: dto.name,
        region: dto.region,
        country: dto.country,
        orgId: dto.orgId,
        type: dto.type as any,
        status: dto.status as any,
        address: dto.address,
        lat: dto.lat,
        lng: dto.lng,
        make: dto.make,
        model: dto.model,
        maxKw: dto.maxKw,
      },
    })
  }

  update(id: string, dto: UpdateStationDto) {
    return this.prisma.station.update({
      where: { id },
      data: {
        name: dto.name,
        status: dto.status as any,
        address: dto.address,
        lat: dto.lat,
        lng: dto.lng,
        maxKw: dto.maxKw,
      },
    })
  }

  async command(id: string, command: string) {
    const job = await this.prisma.commandJob.create({
      data: {
        stationId: id,
        command,
      },
    })

    await this.kafka.emit('commands.jobs', {
      jobId: job.id,
      stationId: id,
      command,
    })

    return job
  }
}
