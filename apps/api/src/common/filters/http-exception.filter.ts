import {
    ExceptionFilter,
    Catch,
    ArgumentsHost,
    HttpException,
    HttpStatus,
} from '@nestjs/common'
import { FastifyReply } from 'fastify'

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
    catch(exception: any, host: ArgumentsHost) {
        const ctx = host.switchToHttp()
        const response = ctx.getResponse<FastifyReply>()

        const status =
            exception instanceof HttpException
                ? exception.getStatus()
                : HttpStatus.INTERNAL_SERVER_ERROR

        const exceptionResponse: any =
            exception instanceof HttpException
                ? exception.getResponse()
                : { message: 'Internal server error' }

        const message =
            typeof exceptionResponse === 'object'
                ? exceptionResponse.message || exception.message
                : exceptionResponse

        const code =
            typeof exceptionResponse === 'object' && exceptionResponse.code
                ? exceptionResponse.code
                : `ERR_${status}`

        const errorResponse = {
            success: false,
            error: {
                code: code,
                message: Array.isArray(message) ? message[0] : message,
                details: typeof exceptionResponse === 'object' ? exceptionResponse : null,
            },
        }

        void response.status(status).send(errorResponse)
    }
}
