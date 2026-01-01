import { NestFactory } from '@nestjs/core';
import { WsAdapter } from '@nestjs/platform-ws';
import { CsmsEngineModule } from './csms-engine.module';

async function bootstrap() {
  const app = await NestFactory.create(CsmsEngineModule);
  app.useWebSocketAdapter(new WsAdapter(app));
  await app.listen(process.env.port ?? 3001); // Change port to avoid conflict with api
}
bootstrap();
