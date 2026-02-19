import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS so the Next.js frontend (port 3000) can call the API.
  // credentials: true allows cookies (refresh token) to be sent cross-origin.
  app.enableCors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:3000',
    credentials: true,
  });

  // Parse cookies from incoming requests — needed for refresh token cookie.
  app.use(cookieParser());

  // Automatically validate request bodies using class-validator decorators
  // on DTO classes. `whitelist: true` strips properties not in the DTO.
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));

  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();
