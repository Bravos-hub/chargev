import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
} from '@nestjs/common'
import { Observable } from 'rxjs'
import { tap } from 'rxjs/operators'
import { AuditService } from './audit.service'
import { Reflector } from '@nestjs/core'

export const AUDIT_ACTION_KEY = 'audit_action'
export const AUDIT_ENTITY_KEY = 'audit_entity'

// Decorator to mark methods for auditing
export function Audited(action: string, entityType: string) {
    return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
        Reflect.defineMetadata(AUDIT_ACTION_KEY, action, descriptor.value)
        Reflect.defineMetadata(AUDIT_ENTITY_KEY, entityType, descriptor.value)
        return descriptor
    }
}

@Injectable()
export class AuditInterceptor implements NestInterceptor {
    constructor(
        private auditService: AuditService,
        private reflector: Reflector,
    ) {}

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const request = context.switchToHttp().getRequest()
        const handler = context.getHandler()

        const action = this.reflector.get<string>(AUDIT_ACTION_KEY, handler)
        const entityType = this.reflector.get<string>(AUDIT_ENTITY_KEY, handler)

        if (!action || !entityType) {
            return next.handle()
        }

        const user = request.user
        const startTime = Date.now()

        return next.handle().pipe(
            tap(async (response) => {
                try {
                    const entityId = request.params?.id || response?.id || 'unknown'

                    await this.auditService.log({
                        tenantId: user?.tenantId || 'system',
                        userId: user?.id,
                        entityType,
                        entityId: String(entityId),
                        action,
                        changes: this.extractChanges(request, response),
                        ipAddress: request.ip || request.connection?.remoteAddress,
                        userAgent: request.headers['user-agent'],
                        metadata: {
                            method: request.method,
                            path: request.path,
                            duration: Date.now() - startTime,
                        },
                    })
                } catch (error) {
                    // Silent fail - don't break the request
                }
            }),
        )
    }

    private extractChanges(request: any, response: any): Record<string, any> | undefined {
        if (request.method === 'POST') {
            return { created: { old: null, new: request.body } }
        }
        if (request.method === 'PUT' || request.method === 'PATCH') {
            return { updated: { old: null, new: request.body } }
        }
        if (request.method === 'DELETE') {
            return { deleted: { old: response, new: null } }
        }
        return undefined
    }
}

