import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { UserRole } from './roles.guard'

/**
 * Organizational Context Guard
 * Ensures users can only access resources within their organization
 */
@Injectable()
export class OrgContextGuard implements CanActivate {
    constructor(private reflector: Reflector) { }

    canActivate(context: ExecutionContext): boolean {
        const request = context.switchToHttp().getRequest()
        const user = request.user

        if (!user) {
            return false
        }

        // Super admins and platform admins can access all organizations
        if (user.role === UserRole.SUPER_ADMIN || user.role === UserRole.PLATFORM_ADMIN) {
            return true
        }

        // Extract organization ID from request
        const orgId = this.extractOrgId(request)

        if (!orgId) {
            // If no org ID in request, allow (will be handled by other guards)
            return true
        }

        // Check if user belongs to the organization
        if (user.orgId !== orgId) {
            throw new ForbiddenException('Access denied: Organization mismatch')
        }

        return true
    }

    private extractOrgId(request: any): string | null {
        // Try to extract org ID from various sources

        // 1. From URL params
        if (request.params?.orgId) {
            return request.params.orgId
        }

        // 2. From query string
        if (request.query?.orgId) {
            return request.query.orgId
        }

        // 3. From request body
        if (request.body?.orgId) {
            return request.body.orgId
        }

        // 4. From station ownership (requires database lookup in real implementation)
        if (request.params?.stationId) {
            // In production, lookup station's organization
            // For now, we'll skip this check
        }

        return null
    }
}
