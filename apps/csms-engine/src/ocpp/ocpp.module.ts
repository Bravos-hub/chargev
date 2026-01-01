import { Module } from '@nestjs/common';
import { OcppGateway } from './ocpp.gateway';
import { OcppCommandService } from './ocpp-command.service';

@Module({
    providers: [OcppGateway, OcppCommandService],
    exports: [OcppCommandService],
})
export class OcppModule { }
