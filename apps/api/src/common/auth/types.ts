// All UserRole values from Prisma schema
export const ROLES = [
  // System Administration
  'SUPER_ADMIN',
  'PLATFORM_ADMIN',
  
  // Organization Management
  'ORG_OWNER',
  'ORG_ADMIN',
  
  // Station Ownership & Management
  'STATION_OWNER_INDIVIDUAL',
  'STATION_OWNER_ORG',
  'STATION_ADMIN',
  'STATION_ATTENDANT',
  
  // Technical Support
  'TECHNICIAN_PUBLIC',
  'TECHNICIAN_ORG',
  
  // Fleet Management
  'FLEET_MANAGER',
  'FLEET_DRIVER',
  
  // End Users
  'RIDER_PREMIUM',
  'RIDER_STANDARD',
  'GUEST',
  
  // Legacy (for backwards compatibility)
  'EVZONE_ADMIN',
  'EVZONE_OPERATOR',
  'EVZONE_OWNER',
  'EVZONE_SITE_OWNER',
  'EVZONE_TECH',
  'EVZONE_DRIVER',
  'EVZONE_FLEET_MANAGER',
] as const

export type Role = (typeof ROLES)[number]

export type JwtUser = {
  id: string
  email: string
  role: Role
  tenantId: string
  orgId?: string | null
  fleetId?: string | null
}

export type TokenPayload = JwtUser
