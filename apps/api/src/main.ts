import 'reflect-metadata'
import { ValidationPipe } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify'
import { ConfigService } from '@nestjs/config'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
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
      transformOptions: { enableImplicitConversion: true },
    })
  )

  const { TransformInterceptor } = await import('./common/interceptors/transform.interceptor')
  const { HttpExceptionFilter } = await import('./common/filters/http-exception.filter')

  app.useGlobalInterceptors(new TransformInterceptor())
  app.useGlobalFilters(new HttpExceptionFilter())

  // Swagger/OpenAPI Documentation
  const swaggerConfig = new DocumentBuilder()
    .setTitle('EVzone API')
    .setDescription(`
# EVzone Platform Backend API

## Overview
The EVzone API provides a comprehensive set of endpoints for managing:
- **Charging Infrastructure**: Stations, charge points, connectors
- **Pricing & Billing**: Dynamic pricing, subscriptions, invoices
- **Fleet Management**: Vehicles, drivers, trips
- **Battery Swap**: Swap stations, battery packs, swap sessions
- **User Management**: Authentication, profiles, wallets
- **Settlements**: CPO payouts, roaming settlements, reconciliation

## Authentication
Most endpoints require JWT authentication. Include the token in the Authorization header:
\`\`\`
Authorization: Bearer <your-token>
\`\`\`

## Rate Limiting
API requests are rate-limited per API key. Default limits:
- 1000 requests per hour for standard keys
- Custom limits available for enterprise keys

## Versioning
This API uses URL versioning. Current version: \`v1\`
    `)
    .setVersion('1.0.0')
    .setContact('EVzone Support', 'https://evzone.com', 'support@evzone.com')
    .setLicense('Proprietary', 'https://evzone.com/license')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth'
    )
    .addApiKey(
      {
        type: 'apiKey',
        name: 'X-API-Key',
        in: 'header',
        description: 'API Key for external integrations',
      },
      'API-key'
    )
    .addTag('auth', 'Authentication & authorization endpoints')
    .addTag('users', 'User management')
    .addTag('stations', 'Station management')
    .addTag('charge-points', 'Charge point management')
    .addTag('connectors', 'Connector management')
    .addTag('bookings', 'Booking management')
    .addTag('sessions', 'Charging session management')
    .addTag('pricing', 'Pricing and tariffs')
    .addTag('subscriptions', 'Subscription plans and management')
    .addTag('invoices', 'Invoice generation and management')
    .addTag('settlements', 'Settlement and reconciliation')
    .addTag('vehicles', 'Vehicle management')
    .addTag('fleets', 'Fleet management')
    .addTag('drivers', 'Driver management')
    .addTag('swap', 'Battery swap operations')
    .addTag('wallet', 'Wallet and payments')
    .addTag('notifications', 'Push notifications')
    .addTag('analytics', 'Analytics and reporting')
    .addTag('ocpi', 'OCPI roaming integration')
    .addTag('health', 'System health checks')
    .addServer('http://localhost:4000', 'Local Development')
    .addServer('https://api.evzone.com', 'Production')
    .build()

  const document = SwaggerModule.createDocument(app, swaggerConfig, {
    operationIdFactory: (controllerKey: string, methodKey: string) => methodKey,
  })

  await SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
    customSiteTitle: 'EVzone API Documentation',
    customCss: '.swagger-ui .topbar { display: none }',
  })

  console.log(`📚 Swagger documentation available at http://localhost:${port}/api/docs`)

  await app.listen(port, '0.0.0.0')
}

void bootstrap()
