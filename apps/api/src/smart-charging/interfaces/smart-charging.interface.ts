export enum ChargingPriorityLevel {
    LOW = 'LOW',
    MEDIUM = 'MEDIUM',
    HIGH = 'HIGH',
    CRITICAL = 'CRITICAL'
}

export interface SitePowerLimit {
    siteId: string;
    maxPower: number;
    currentLoad: number;
    availablePower: number;
    chargers: ChargerAllocation[];
}

export interface ChargerAllocation {
    chargerId: string;
    allocatedPower: number;
    maxPower: number;
    priority: number;
    isCharging: boolean;
}

export interface ChargingPriority {
    sessionId: string;
    userId: string;
    userType: 'FLEET' | 'PUBLIC';
    priority: number;
    requestedPower: number;
    chargerId: string;
    timestamp: Date;
}
