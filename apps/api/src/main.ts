import 'reflect-metadata'
import { ValidationPipe } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify'
import { ConfigService } from '@nestjs/config'
import { AppModule } from './app.module'

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: true })
  )

  const config = app.get(ConfigService)
  const port = parseInt(config.get<string>('PORT') || '4000', 10)
  const origin = config.get<string>('CORS_ORIGIN')

  app.setGlobalPrefix('api/v1')
  app.enableCors({
    origin: origin ? origin.split(',') : true,
    credentials: true,
  })
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    })
  )

  const { TransformInterceptor } = await import('./common/interceptors/transform.interceptor')
  const { HttpExceptionFilter } = await import('./common/filters/http-exception.filter')

  app.useGlobalInterceptors(new TransformInterceptor())
  app.useGlobalFilters(new HttpExceptionFilter())

  await app.listen(port, '0.0.0.0')
}

void bootstrap()
