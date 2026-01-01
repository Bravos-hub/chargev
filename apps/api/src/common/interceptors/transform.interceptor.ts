import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
} from '@nestjs/common'
import { Observable } from 'rxjs'
import { map } from 'rxjs/operators'

export interface Response<T> {
    success: boolean
    data: T
    meta?: {
        page?: number
        limit?: number
        total?: number
        totalPages?: number
    }
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, Response<T>> {
    intercept(
        context: ExecutionContext,
        next: CallHandler
    ): Observable<Response<T>> {
        return next.handle().pipe(
            map((data) => {
                // If the data already has a success property, assume it's already formatted
                if (data && typeof data === 'object' && 'success' in data) {
                    return data
                }

                // Handle pagination data if it follows a specific structure
                // e.g., { results: [], total: 100, page: 1, limit: 10 }
                if (data && typeof data === 'object' && 'results' in data && 'total' in data) {
                    const { results, total, page, limit, ...rest } = data
                    const totalPages = limit ? Math.ceil(total / limit) : undefined

                    return {
                        success: true,
                        data: results,
                        meta: {
                            page,
                            limit,
                            total,
                            totalPages,
                            ...rest
                        },
                    }
                }

                return {
                    success: true,
                    data,
                }
            })
        )
    }
}
