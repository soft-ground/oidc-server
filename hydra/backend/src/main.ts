import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: process.env.FRONTEND_ORIGIN ?? 'http://localhost:24031',
    credentials: true,
  });
  const port = Number(process.env.PORT ?? 24042);
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`Hydra backend listening on http://localhost:${port}`);
}
void bootstrap();
