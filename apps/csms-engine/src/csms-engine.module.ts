import { Module } from '@nestjs/common';
import { CsmsEngineController } from './csms-engine.controller';
import { CsmsEngineService } from './csms-engine.service';
import { OcppModule } from './ocpp/ocpp.module';
import { PrismaModule } from './prisma/prisma.module';
import { KafkaModule } from './kafka/kafka.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    OcppModule,
    PrismaModule,
    KafkaModule,
  ],
  controllers: [CsmsEngineController],
  providers: [CsmsEngineService],
})
export class CsmsEngineModule { }
