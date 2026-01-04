/**
 * TypeScript interfaces for ML service integration.
 * These interfaces match the ML service API contract.
 */

export interface ChargerMetrics {
  charger_id: string
  connector_status: string
  energy_delivered: number
  power: number
  temperature?: number
  error_codes: string[]
  uptime_hours: number
  total_sessions: number
  last_maintenance?: Date | string
  metadata?: Record<string, any>
}

export interface FailurePredictionRequest {
  charger_id: string
  metrics: ChargerMetrics
}

export interface FailurePredictionResponse {
  charger_id: string
  failure_probability: number
  predicted_failure_date?: Date | string
  confidence: number
  recommended_action: string
  model_version: string
  timestamp: Date | string
}

export interface MaintenanceScheduleRequest {
  charger_id: string
  metrics: ChargerMetrics
}

export interface MaintenanceScheduleResponse {
  charger_id: string
  recommended_date: Date | string
  urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  estimated_downtime_hours: number
  model_version: string
  timestamp: Date | string
}

export interface BatchPredictionRequest {
  chargers: ChargerMetrics[]
}

export interface BatchPredictionResponse {
  predictions: FailurePredictionResponse[]
  total: number
  timestamp: Date | string
}

export interface ModelInfo {
  name: string
  version: string
  type: string
  status: 'LOADED' | 'UNLOADED' | 'ERROR'
  loaded_at?: Date | string
  accuracy?: number
  metadata?: Record<string, any>
}

export interface ModelListResponse {
  models: ModelInfo[]
  total: number
}

export interface ReloadModelResponse {
  success: boolean
  model_name: string
  version: string
  message: string
  timestamp: Date | string
}

export interface HealthResponse {
  status: string
  service: string
  version: string
  checks?: {
    database?: string
    redis?: string
    kafka?: string
    models?: string
  }
}

