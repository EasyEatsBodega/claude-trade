import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      const allowed = process.env.WEB_URL ?? 'http://localhost:3000';
      // Allow the configured origin (with or without www), Vercel preview deploys, and no-origin requests
      const allowedHost = allowed.replace('https://', '').replace('http://', '');
      const originHost = origin?.replace('https://', '').replace('http://', '') ?? '';
      if (
        !origin ||
        origin === allowed ||
        originHost === `www.${allowedHost}` ||
        originHost === allowedHost.replace('www.', '') ||
        origin.endsWith('.vercel.app') ||
        origin.endsWith('.traide.dev') ||
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
