/**
 * NestJS module for ML service client integration.
 * 
 * Note: This module uses axios directly (already in dependencies).
 * If you prefer @nestjs/axios, install it: npm install @nestjs/axios
 * and update ml-client.service.ts to use HttpService instead.
 */
import { Module, Global } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { RedisModule } from '../redis/redis.module'
import { MLClientService } from './ml-client.service'

@Global()
@Module({
  imports: [
    ConfigModule,
    RedisModule,
  ],
  providers: [MLClientService],
  exports: [MLClientService],
})
export class MLClientModule {
  // Module is optional and can be conditionally imported
  // It will gracefully degrade if ML_SERVICE_ENABLED=false
}

