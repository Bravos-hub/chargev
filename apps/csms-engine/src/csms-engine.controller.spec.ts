import { Test, TestingModule } from '@nestjs/testing';
import { CsmsEngineController } from './csms-engine.controller';
import { CsmsEngineService } from './csms-engine.service';

describe('CsmsEngineController', () => {
  let csmsEngineController: CsmsEngineController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [CsmsEngineController],
      providers: [CsmsEngineService],
    }).compile();

    csmsEngineController = app.get<CsmsEngineController>(CsmsEngineController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(csmsEngineController.getHello()).toBe('Hello World!');
    });
  });
});
