import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { apiReference } from '@scalar/nestjs-api-reference';
import { AllExceptionsFilter } from 'common/filters/all-exception.filter';
import type { AppConfig } from 'config/configuration';
import helmet from 'helmet';
import { rawBodyMiddleware } from 'middleware';
import { Logger } from 'nestjs-pino';
import { join } from 'path';

import { AppModule } from './app.module';
import { ValidationFailedHttpException } from './common/exceptions';
import { BaseExceptionsFilter } from './common/filters/base-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
    snapshot: true,
  });

  const configService = app.get(ConfigService<AppConfig, true>);
  const apiPort = configService.get<number>('apiPort');
  const logger = app.get(Logger);
  const corsMaxAge = configService.get<number>('corsMaxAge');

  const helmetContentSecurityPolicy = {
    directives: {
      defaultSrc: [`'self'`],
      styleSrc: [`'self'`, `'unsafe-inline'`, 'unpkg.com', 'cdn.jsdelivr.net', 'fonts.googleapis.com'],
      connectSrc: [`'self'`, `unpkg.com`],
      fontSrc: [`'self'`, 'fonts.gstatic.com'],
      imgSrc: [`'self'`, 'data:', 'cdn.jsdelivr.net'],
      scriptSrc: [`'self'`, `'unsafe-eval'`, `https: 'unsafe-inline'`, `cdn.jsdelivr.net`, `unpkg.com`],
    },
  };

  app.useLogger(app.get(Logger));
  app.use(
    helmet({
      contentSecurityPolicy: helmetContentSecurityPolicy,
    }),
    rawBodyMiddleware({}),
  );
  app.enableCors({
    maxAge: corsMaxAge,
  });
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  app.useGlobalFilters(new AllExceptionsFilter(), new BaseExceptionsFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      exceptionFactory: (errors) => {
        return new ValidationFailedHttpException(errors);
      },
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      validationError: { target: false },
    }),
  );

  app.setGlobalPrefix('api');

  app.useStaticAssets(join(__dirname, '../..', 'static'), { prefix: '/static' });

  const openApiConfig = new DocumentBuilder()
    .setTitle('NeuraFlow API')
    .setDescription('API documentation for NeuraFlow Backend')
    .setVersion('1.0')
    .addServer(`http://localhost:${apiPort}`, 'Local')
    .setExternalDoc(
      'For Validation Errors please check class-validator',
      'https://github.com/typestack/class-validator#validation-errors',
    )
    .addBearerAuth()
    .addGlobalParameters({
      in: 'header',
      name: 'X-Api-Version',
      required: false,
      description: 'API Version',
    })
    .build();

  const document = SwaggerModule.createDocument(app, openApiConfig, {
    deepScanRoutes: true,
  });
  SwaggerModule.setup('api-docs', app, document, {
    ui: false,
  });

  app.use('/api-docs', apiReference({ content: document }));

  await app.listen(apiPort, () => {
    logger.log(`Application started at port:${apiPort}`);
  });
}
void bootstrap();
