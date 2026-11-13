import 'reflect-metadata';
import './env';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { createHttpSecurityMiddleware, isAllowedWebOrigin } from './security/http-security';
import { readRuntimeSecurityConfig } from './security/security-config';

async function bootstrap() {
  const security = readRuntimeSecurityConfig();
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  app.use(require('express').json({ limit: '16kb' }));
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.disable('x-powered-by');
  expressApp.set('trust proxy', security.trustedProxyHops);
  app.use(createHttpSecurityMiddleware());
  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (error: Error | null, allow?: boolean) => void,
    ) => callback(null, isAllowedWebOrigin(origin, security.webOrigins)),
    methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key'],
    maxAge: 600,
  });
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));

  await app.listen(security.apiPort, security.apiHost);
  console.log(`CourtFlow API listening on http://${security.apiHost}:${security.apiPort}/api`);
}

void bootstrap();
