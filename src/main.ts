import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureApp } from './app.setup';
import { AppConfigService } from './shared/infrastructure/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  configureApp(app);
  const configService = app.get(AppConfigService);
  await app.listen(configService.port);
}
void bootstrap();
