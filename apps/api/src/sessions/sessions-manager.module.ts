import { Module, forwardRef } from '@nestjs/common'
import { SessionManagerService } from './session-manager.service'
import { RedisModule } from '../integrations/redis/redis.module'
import { KafkaModule } from '../integrations/kafka/kafka.module'
import { PrismaModule } from '../common/prisma/prisma.module'

@Module({
    imports: [RedisModule, forwardRef(() => KafkaModule), PrismaModule],
    providers: [SessionManagerService],
    exports: [SessionManagerService],
})
export class SessionsManagerModule { }
