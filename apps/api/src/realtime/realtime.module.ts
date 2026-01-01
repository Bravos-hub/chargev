import { Module } from '@nestjs/common'
import { RealtimeGateway } from './realtime.gateway'
import { RedisModule } from '../integrations/redis/redis.module'

@Module({
    imports: [RedisModule],
    providers: [RealtimeGateway],
    exports: [RealtimeGateway],
})
export class RealtimeModule { }
