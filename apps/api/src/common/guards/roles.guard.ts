import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { UserRole } from '.prisma/client'

export { UserRole }


/**
 * Role hierarchy for permission inheritance
 * Higher roles inherit permissions from lower roles
 */
export const ROLE_HIERARCHY: Record<UserRole, number> = {
    [UserRole.SUPER_ADMIN]: 1000,
    [UserRole.PLATFORM_ADMIN]: 900,
    [UserRole.ORG_OWNER]: 800,
    [UserRole.ORG_ADMIN]: 700,
    [UserRole.STATION_OWNER_ORG]: 600,
    [UserRole.STATION_OWNER_INDIVIDUAL]: 550,
    [UserRole.STATION_ADMIN]: 500,
    [UserRole.FLEET_MANAGER]: 450,
    [UserRole.TECHNICIAN_PUBLIC]: 400,
    [UserRole.TECHNICIAN_ORG]: 400,
    [UserRole.STATION_ATTENDANT]: 350,
    [UserRole.FLEET_DRIVER]: 300,
    [UserRole.RIDER_PREMIUM]: 200,
    [UserRole.RIDER_STANDARD]: 100,
    [UserRole.GUEST]: 50,
    // Legacy mapping
    [UserRole.EVZONE_ADMIN]: 1000,
    [UserRole.EVZONE_OPERATOR]: 900,
    [UserRole.EVZONE_OWNER]: 800,
    [UserRole.EVZONE_SITE_OWNER]: 600,
    [UserRole.EVZONE_TECH]: 400,
    [UserRole.EVZONE_DRIVER]: 100,
    [UserRole.EVZONE_FLEET_MANAGER]: 450,
}

/**
 * Permission groups for common access patterns
 */
export const PERMISSION_GROUPS = {
    STATION_OWNERS: [
        UserRole.STATION_OWNER_INDIVIDUAL,
        UserRole.STATION_OWNER_ORG
    ],
    STATION_MANAGERS: [
        UserRole.STATION_OWNER_INDIVIDUAL,
        UserRole.STATION_OWNER_ORG,
        UserRole.STATION_ADMIN
    ],
    STATION_STAFF: [
        UserRole.STATION_OWNER_INDIVIDUAL,
        UserRole.STATION_OWNER_ORG,
        UserRole.STATION_ADMIN,
        UserRole.STATION_ATTENDANT
    ],
    TECHNICIANS: [
        UserRole.TECHNICIAN_PUBLIC,
        UserRole.TECHNICIAN_ORG
    ],
    FLEET_USERS: [
        UserRole.FLEET_MANAGER,
        UserRole.FLEET_DRIVER
    ],
    RIDERS: [
        UserRole.RIDER_PREMIUM,
        UserRole.RIDER_STANDARD,
        UserRole.FLEET_DRIVER
    ],
    ALL_USERS: Object.values(UserRole),
}

export const ROLES_KEY = 'roles'
export const MIN_ROLE_LEVEL_KEY = 'minRoleLevel'
export const ORG_CONTEXT_KEY = 'requiresOrgContext'

@Injectable()
export class RolesGuard implements CanActivate {
    constructor(private reflector: Reflector) { }

    canActivate(context: ExecutionContext): boolean {
        const requiredRoles = this.reflector.get<UserRole[]>(ROLES_KEY, context.getHandler())
        const minRoleLevel = this.reflector.get<number>(MIN_ROLE_LEVEL_KEY, context.getHandler())
        const requiresOrgContext = this.reflector.get<boolean>(ORG_CONTEXT_KEY, context.getHandler())

        if (!requiredRoles && !minRoleLevel) {
            return true // No specific roles required
        }

        const request = context.switchToHttp().getRequest()
        const user = request.user as any

        if (!user) {
            throw new ForbiddenException('User not authenticated')
        }

        // Check specific roles
        if (requiredRoles && requiredRoles.length > 0) {
            const hasRole = requiredRoles.some(role => user.role === role)

            if (!hasRole) {
                throw new ForbiddenException(`Required roles: ${requiredRoles.join(', ')}`)
            }
        }

        // Check minimum role level
        if (minRoleLevel) {
            const userLevel = ROLE_HIERARCHY[user.role as UserRole] || 0

            if (userLevel < minRoleLevel) {
                throw new ForbiddenException('Insufficient permissions')
            }
        }

        // Check organizational context if required
        if (requiresOrgContext && !user.orgId) {
            throw new ForbiddenException('Organization context required')
        }

        return true
    }
}
