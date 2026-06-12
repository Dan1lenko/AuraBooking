import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { join } from 'path';
import * as fs from 'fs';

async function bootstrap() {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is missing!');
  }

  const app = await NestFactory.create<NestExpressApplication>(AppModule, { rawBody: true });

  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  // Ensure upload directory exists
  const uploadDir = join(__dirname, '..', 'uploads');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  // Serve static assets from uploads directory
  app.useStaticAssets(uploadDir, {
    prefix: '/uploads/',
  });

  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();

