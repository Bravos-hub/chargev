import { Module } from '@nestjs/common'
import { KafkaModule } from '../../integrations/kafka/kafka.module'
import { RolesGuard } from '../../common/auth/roles.guard'
import { StationsController } from './stations.controller'
import { StationsService } from './stations.service'

@Module({
  imports: [KafkaModule],
  controllers: [StationsController],
  providers: [StationsService, RolesGuard],
})
export class StationsModule {}
