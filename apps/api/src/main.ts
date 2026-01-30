import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: (origin, callback) => {
      const allowed = process.env.WEB_URL ?? 'http://localhost:3000';
      // Allow the configured origin, Vercel preview deploys, and no-origin requests (server-to-server)
      if (
        !origin ||
        origin === allowed ||
        origin.endsWith('.vercel.app') ||
        origin === 'http://localhost:3000'
      ) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    },
    credentials: true,
  });

  app.setGlobalPrefix('api');

  const port = process.env.PORT ?? 4000;
  await app.listen(port);
  console.log(`API running on port ${port}`);
}

bootstrap();
