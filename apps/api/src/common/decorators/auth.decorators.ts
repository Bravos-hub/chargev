import { SetMetadata } from '@nestjs/common'
import { UserRole, PERMISSION_GROUPS, ROLE_HIERARCHY } from '../guards/roles.guard'

// Mark endpoint as public (no auth required)
export const Public = () => SetMetadata('isPublic', true)

// Require specific roles
export const Roles = (...roles: UserRole[]) => SetMetadata('roles', roles)

// Require minimum role level (uses hierarchy)
export const MinRoleLevel = (role: UserRole) =>
    SetMetadata('minRoleLevel', ROLE_HIERARCHY[role])

// Require organizational context
export const RequiresOrg = () => SetMetadata('requiresOrgContext', true)

// Convenience decorators for common permission groups
export const StationOwners = () => Roles(...PERMISSION_GROUPS.STATION_OWNERS)
export const StationManagers = () => Roles(...PERMISSION_GROUPS.STATION_MANAGERS)
export const StationStaff = () => Roles(...PERMISSION_GROUPS.STATION_STAFF)
export const Technicians = () => Roles(...PERMISSION_GROUPS.TECHNICIANS)
export const FleetUsers = () => Roles(...PERMISSION_GROUPS.FLEET_USERS)
export const Riders = () => Roles(...PERMISSION_GROUPS.RIDERS)

