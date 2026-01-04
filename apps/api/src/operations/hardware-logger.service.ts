/**
 * Hardware Logger Service
 * Provides structured logging for charger hardware events and operations.
 */
import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '../common/prisma/prisma.service'

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL',
}

export enum LogCategory {
  BOOT = 'BOOT',
  HEARTBEAT = 'HEARTBEAT',
  SESSION = 'SESSION',
  ERROR = 'ERROR',
  COMMAND = 'COMMAND',
  CONFIGURATION = 'CONFIGURATION',
  METER_VALUES = 'METER_VALUES',
  STATUS_NOTIFICATION = 'STATUS_NOTIFICATION',
  OTHER = 'OTHER',
}

export interface CreateHardwareLogDto {
  chargerId: string
  level: LogLevel
  category: LogCategory
  message: string
  data?: Record<string, any>
  errorCode?: string
  metadata?: Record<string, any>
}

export interface QueryHardwareLogsDto {
  chargerId?: string
  level?: LogLevel
  category?: LogCategory
  startDate?: Date
  endDate?: Date
  search?: string
  page?: number
  limit?: number
}

@Injectable()
export class HardwareLoggerService {
  private readonly logger = new Logger(HardwareLoggerService.name)

  constructor(private prisma: PrismaService) {}

  /**
   * Create a hardware log entry.
   */
  async createLog(dto: CreateHardwareLogDto) {
    const log = await this.prisma.hardwareLog.create({
      data: {
        chargerId: dto.chargerId,
        level: dto.level,
        category: dto.category,
        message: dto.message,
        data: dto.data || {},
        errorCode: dto.errorCode,
        metadata: dto.metadata || {},
      },
    })

    // Log to application logger as well
    const logMethod = this.getLogMethod(dto.level)
    this.logger[logMethod](`[${dto.chargerId}] ${dto.message}`, dto.data)

    return log
  }

  /**
   * Get hardware logs with filtering.
   */
  async getLogs(query: QueryHardwareLogsDto) {
    const where: any = {}

    if (query.chargerId) where.chargerId = query.chargerId
    if (query.level) where.level = query.level
    if (query.category) where.category = query.category
    if (query.search) {
      where.OR = [
        { message: { contains: query.search, mode: 'insensitive' } },
        { errorCode: { contains: query.search, mode: 'insensitive' } },
      ]
    }

    if (query.startDate || query.endDate) {
      where.createdAt = {}
      if (query.startDate) where.createdAt.gte = query.startDate
      if (query.endDate) where.createdAt.lte = query.endDate
    }

    const page = query.page || 1
    const limit = Math.min(query.limit || 50, 100) // Max 100 per page
    const skip = (page - 1) * limit

    const [logs, total] = await Promise.all([
      this.prisma.hardwareLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.hardwareLog.count({ where }),
    ])

    return {
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }
  }

  /**
   * Get logs for a specific charger.
   */
  async getChargerLogs(chargerId: string, limit = 100) {
    return this.prisma.hardwareLog.findMany({
      where: { chargerId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })
  }

  /**
   * Get error logs only.
   */
  async getErrorLogs(chargerId?: string, days = 7) {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const where: any = {
      level: { in: [LogLevel.ERROR, LogLevel.CRITICAL] },
      createdAt: { gte: startDate },
    }

    if (chargerId) {
      where.chargerId = chargerId
    }

    return this.prisma.hardwareLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
    })
  }

  /**
   * Get log statistics.
   */
  async getLogStatistics(chargerId?: string, days = 7) {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const where: any = {
      createdAt: { gte: startDate },
    }

    if (chargerId) {
      where.chargerId = chargerId
    }

    const logs = await this.prisma.hardwareLog.findMany({
      where,
      select: {
        level: true,
        category: true,
      },
    })

    const byLevel = {
      DEBUG: logs.filter((l: any) => l.level === LogLevel.DEBUG).length,
      INFO: logs.filter((l: any) => l.level === LogLevel.INFO).length,
      WARN: logs.filter((l: any) => l.level === LogLevel.WARN).length,
      ERROR: logs.filter((l: any) => l.level === LogLevel.ERROR).length,
      CRITICAL: logs.filter((l: any) => l.level === LogLevel.CRITICAL).length,
    }

    const byCategory = {
      BOOT: logs.filter((l: any) => l.category === LogCategory.BOOT).length,
      HEARTBEAT: logs.filter((l: any) => l.category === LogCategory.HEARTBEAT).length,
      SESSION: logs.filter((l: any) => l.category === LogCategory.SESSION).length,
      ERROR: logs.filter((l: any) => l.category === LogCategory.ERROR).length,
      COMMAND: logs.filter((l: any) => l.category === LogCategory.COMMAND).length,
      CONFIGURATION: logs.filter((l: any) => l.category === LogCategory.CONFIGURATION).length,
      METER_VALUES: logs.filter((l: any) => l.category === LogCategory.METER_VALUES).length,
      OTHER: logs.filter((l: any) => l.category === LogCategory.OTHER).length,
    }

    return {
      total: logs.length,
      byLevel,
      byCategory,
      period: {
        start: startDate,
        end: new Date(),
      },
    }
  }

  /**
   * Clean up old logs based on retention policy.
   */
  async cleanupOldLogs(retentionDays = 90) {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays)

    const result = await this.prisma.hardwareLog.deleteMany({
      where: {
        createdAt: { lt: cutoffDate },
      },
    })

    this.logger.log(`Cleaned up ${result.count} old hardware logs (older than ${retentionDays} days)`)

    return result
  }

  /**
   * Get log method for application logger.
   */
  private getLogMethod(level: LogLevel): 'debug' | 'log' | 'warn' | 'error' {
    switch (level) {
      case LogLevel.DEBUG:
        return 'debug'
      case LogLevel.INFO:
        return 'log'
      case LogLevel.WARN:
        return 'warn'
      case LogLevel.ERROR:
      case LogLevel.CRITICAL:
        return 'error'
      default:
        return 'log'
    }
  }
}


