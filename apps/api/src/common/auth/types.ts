export const ROLES = [
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
  role: Role
  tenantId: string
  orgId?: string | null
}
