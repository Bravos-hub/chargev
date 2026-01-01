import { Injectable } from '@nestjs/common';

@Injectable()
export class CsmsEngineService {
  getHello(): string {
    return 'Hello World!';
  }
}
