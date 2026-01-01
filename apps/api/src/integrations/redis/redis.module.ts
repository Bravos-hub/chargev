import { Module } from '@nestjs/common'
import { RedisService } from './redis.service'
import { CacheService } from './cache.service'
import { PubSubService } from './pubsub.service'

@Module({
  providers: [RedisService, CacheService, PubSubService],
  exports: [RedisService, CacheService, PubSubService],
})
export class RedisModule { }
