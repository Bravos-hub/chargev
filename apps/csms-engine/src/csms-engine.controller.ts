import { Controller, Get } from '@nestjs/common';
import { CsmsEngineService } from './csms-engine.service';

@Controller()
export class CsmsEngineController {
  constructor(private readonly csmsEngineService: CsmsEngineService) {}

  @Get()
  getHello(): string {
    return this.csmsEngineService.getHello();
  }
}
