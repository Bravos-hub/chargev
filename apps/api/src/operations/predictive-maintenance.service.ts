/**
 * Predictive Maintenance Service
 * Integrates with ML service to provide failure predictions and maintenance scheduling.
 */
import { Injectable, Logger, Optional } from '@nestjs/common'
import { PrismaService } from '../common/prisma/prisma.service'
import { MLClientService } from '../integrations/ml/ml-client.service'

export interface MaintenancePrediction {
  chargerId: string
  failureProbability: number
  predictedFailureDate?: Date
  confidence: number
  recommendedAction: string
  urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  recommendedMaintenanceDate?: Date
  estimatedDowntimeHours?: number
  modelVersion: string
  timestamp: Date
}

@Injectable()
export class PredictiveMaintenanceService {
  private readonly logger = new Logger(PredictiveMaintenanceService.name)

  constructor(
    private prisma: PrismaService,
    @Optional() private mlClient?: MLClientService,
  ) {}

  /**
   * Get failure prediction for a charger.
   */
  async predictFailure(chargerId: string): Promise<MaintenancePrediction | null> {
    if (!this.mlClient) {
      this.logger.warn('ML client not available, skipping prediction')
      return null
    }

    try {
      // Get charger metrics
      const metrics = await this.getChargerMetrics(chargerId)

      // Get prediction from ML service
      const prediction = await this.mlClient.predictFailure({
        charger_id: chargerId,
        metrics,
      })

      // Determine urgency based on failure probability
      const urgency =
        prediction.failure_probability > 0.8
          ? 'CRITICAL'
          : prediction.failure_probability > 0.6
            ? 'HIGH'
            : prediction.failure_probability > 0.4
              ? 'MEDIUM'
              : 'LOW'

      return {
        chargerId: prediction.charger_id,
        failureProbability: prediction.failure_probability,
        predictedFailureDate: prediction.predicted_failure_date
          ? new Date(prediction.predicted_failure_date)
          : undefined,
        confidence: prediction.confidence,
        recommendedAction: prediction.recommended_action,
        urgency,
        modelVersion: prediction.model_version,
        timestamp: new Date(prediction.timestamp),
      }
    } catch (error) {
      this.logger.error(`Failed to predict failure for charger ${chargerId}: ${error}`)
      return null
    }
  }

  /**
   * Get maintenance schedule recommendation.
   */
  async getMaintenanceSchedule(chargerId: string) {
    if (!this.mlClient) {
      this.logger.warn('ML client not available, skipping maintenance prediction')
      return null
    }

    try {
      const metrics = await this.getChargerMetrics(chargerId)

      const schedule = await this.mlClient.predictMaintenance({
        charger_id: chargerId,
        metrics,
      })

      return {
        chargerId: schedule.charger_id,
        recommendedDate: new Date(schedule.recommended_date),
        urgency: schedule.urgency,
        estimatedDowntimeHours: schedule.estimated_downtime_hours,
        modelVersion: schedule.model_version,
        timestamp: new Date(schedule.timestamp),
      }
    } catch (error) {
      this.logger.error(`Failed to get maintenance schedule for charger ${chargerId}: ${error}`)
      return null
    }
  }

  /**
   * Get charger metrics for ML prediction.
   */
  private async getChargerMetrics(chargerId: string) {
    // Get charger from database
    const charger = await this.prisma.station.findUnique({
      where: { id: chargerId },
      include: {
        _count: {
          select: {
            sessions: true,
          },
        },
      },
    })

    if (!charger) {
      throw new Error(`Charger ${chargerId} not found`)
    }

    // Get recent sessions for metrics
    const recentSessions = await this.prisma.chargingSession.findMany({
      where: { stationId: chargerId },
      orderBy: { startedAt: 'desc' },
      take: 100,
    })

    // Calculate metrics
    const totalSessions = (charger._count as any)?.sessions || 0
    const totalEnergy = recentSessions.reduce((sum, s) => sum + (s.kwh || 0), 0)
    const averagePower = recentSessions.length > 0
      ? totalEnergy / recentSessions.length
      : 0

    // Calculate uptime (simplified - would need actual uptime tracking)
    const createdAt = charger.createdAt
    const now = new Date()
    const uptimeHours = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60)

    // Get last maintenance (from incidents/jobs)
    const lastMaintenance = await this.prisma.job.findFirst({
      where: {
        stationId: chargerId,
        type: 'MAINTENANCE',
        status: 'COMPLETED',
      },
      orderBy: { completedAt: 'desc' },
    })

    return {
      charger_id: chargerId,
      connector_status: charger.status || 'UNKNOWN',
      energy_delivered: totalEnergy,
      power: averagePower,
      temperature: undefined, // Would come from real-time metrics
      error_codes: [], // Would come from real-time status
      uptime_hours: uptimeHours,
      total_sessions: totalSessions,
      last_maintenance: lastMaintenance?.completedAt || undefined,
    }
  }

  /**
   * Get predictions for multiple chargers.
   */
  async batchPredictions(chargerIds: string[]): Promise<MaintenancePrediction[]> {
    if (!this.mlClient) {
      this.logger.warn('ML client not available, skipping batch predictions')
      return []
    }

    try {
      // Get metrics for all chargers
      const metricsPromises = chargerIds.map((id) => this.getChargerMetrics(id))
      const metricsArray = await Promise.all(metricsPromises)

      // Get batch prediction
      const batchResponse = await this.mlClient.batchPredictions({
        chargers: metricsArray,
      })

      return batchResponse.predictions.map((p) => {
        const urgency =
          p.failure_probability > 0.8
            ? 'CRITICAL'
            : p.failure_probability > 0.6
              ? 'HIGH'
              : p.failure_probability > 0.4
                ? 'MEDIUM'
                : 'LOW'

        return {
          chargerId: p.charger_id,
          failureProbability: p.failure_probability,
          predictedFailureDate: p.predicted_failure_date
            ? new Date(p.predicted_failure_date)
            : undefined,
          confidence: p.confidence,
          recommendedAction: p.recommended_action,
          urgency,
          modelVersion: p.model_version,
          timestamp: new Date(p.timestamp),
        }
      })
    } catch (error) {
      this.logger.error(`Batch prediction failed: ${error}`)
      return []
    }
  }

  /**
   * Create maintenance job from prediction.
   */
  async createMaintenanceJobFromPrediction(
    chargerId: string,
    orgId: string,
    prediction: MaintenancePrediction,
  ) {
    // This would integrate with OperationsService to create a job
    // For now, return the recommendation
    return {
      chargerId,
      recommendedAction: prediction.recommendedAction,
      urgency: prediction.urgency,
      recommendedDate: prediction.recommendedMaintenanceDate || new Date(),
      failureProbability: prediction.failureProbability,
    }
  }
}



