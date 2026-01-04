/**
 * Carbon Calculator Service
 * Calculates CO₂ emissions saved based on energy delivered.
 * Uses region-specific emission factors where available.
 */
import { Injectable, Logger } from '@nestjs/common'
import { EmissionScope } from './dto/esg.dto'

@Injectable()
export class CarbonCalculatorService {
  private readonly logger = new Logger(CarbonCalculatorService.name)

  // Default emission factors (kg CO2 per kWh)
  // These represent the CO2 that would have been emitted by the grid
  // Source: IEA, EPA, and regional grid data
  private readonly defaultEmissionFactor = 0.5 // kg CO2/kWh (global average)

  // Region-specific emission factors (kg CO2 per kWh)
  private readonly regionalEmissionFactors: Record<string, number> = {
    // North America
    'US': 0.42,
    'CA': 0.13, // Canada has cleaner grid
    'MX': 0.45,

    // Europe
    'EU': 0.28,
    'GB': 0.23,
    'DE': 0.40,
    'FR': 0.05, // Nuclear-heavy
    'NO': 0.01, // Hydro-heavy
    'SE': 0.02, // Hydro/nuclear

    // Asia
    'CN': 0.58,
    'IN': 0.82,
    'JP': 0.50,
    'KR': 0.45,
    'AU': 0.75,

    // Africa
    'ZA': 0.90, // Coal-heavy
    'KE': 0.20, // Hydro/geothermal

    // Latin America
    'BR': 0.10, // Hydro-heavy
    'AR': 0.35,
    'CL': 0.30,
  }

  /**
   * Calculate CO₂ emissions saved from energy delivered.
   * @param energyKwh Energy delivered in kWh
   * @param region Optional region code (ISO 3166-1 alpha-2)
   * @param scope Emission scope (default: SCOPE_2)
   * @returns Emissions calculation result
   */
  calculateEmissions(
    energyKwh: number,
    region?: string,
    scope: EmissionScope = EmissionScope.SCOPE_2,
  ) {
    const emissionFactor = this.getEmissionFactor(region)
    const co2Saved = energyKwh * emissionFactor

    // CO2 equivalent includes other GHGs (CH4, N2O) with global warming potential
    // Using a conservative multiplier of 1.05 for other GHGs
    const co2Equivalent = co2Saved * 1.05

    this.logger.debug(
      `Calculated emissions: ${energyKwh} kWh × ${emissionFactor} kg CO2/kWh = ${co2Saved} kg CO2`,
    )

    return {
      energyKwh,
      co2Saved: Math.round(co2Saved * 100) / 100, // Round to 2 decimals
      co2Equivalent: Math.round(co2Equivalent * 100) / 100,
      emissionFactor,
      scope,
      region: region || 'GLOBAL',
    }
  }

  /**
   * Get emission factor for a region.
   * @param region Optional region code
   * @returns Emission factor in kg CO2 per kWh
   */
  private getEmissionFactor(region?: string): number {
    if (!region) {
      return this.defaultEmissionFactor
    }

    const upperRegion = region.toUpperCase()
    return this.regionalEmissionFactors[upperRegion] || this.defaultEmissionFactor
  }

  /**
   * Calculate emissions for multiple sessions.
   * @param sessions Array of sessions with energy values
   * @param region Optional region code
   * @returns Aggregated emissions calculation
   */
  calculateBulkEmissions(
    sessions: Array<{ energyKwh: number; region?: string }>,
    defaultRegion?: string,
  ) {
    let totalEnergy = 0
    let totalCo2 = 0
    let totalCo2e = 0

    for (const session of sessions) {
      const calculation = this.calculateEmissions(
        session.energyKwh,
        session.region || defaultRegion,
      )
      totalEnergy += calculation.energyKwh
      totalCo2 += calculation.co2Saved
      totalCo2e += calculation.co2Equivalent
    }

    return {
      totalEnergy: Math.round(totalEnergy * 100) / 100,
      totalCo2Saved: Math.round(totalCo2 * 100) / 100,
      totalCo2Equivalent: Math.round(totalCo2e * 100) / 100,
      sessionCount: sessions.length,
    }
  }

  /**
   * Get emission factor for a specific region.
   * Useful for displaying to users.
   */
  getEmissionFactorForRegion(region?: string): number {
    return this.getEmissionFactor(region)
  }

  /**
   * List all supported regions and their emission factors.
   */
  getSupportedRegions(): Record<string, number> {
    return {
      ...this.regionalEmissionFactors,
      GLOBAL: this.defaultEmissionFactor,
    }
  }
}


