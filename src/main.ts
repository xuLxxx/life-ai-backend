import { NestFactory } from '@nestjs/core';
import { StandardSchemaValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule, ObserveInstrument } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    instrument: ObserveInstrument,
  });
  app.useGlobalPipes(new StandardSchemaValidationPipe());
  app.enableCors({ origin: process.env.WEB_ORIGIN?.split(',').map((value) => value.trim()) });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Life AI API')
    .setDescription('用户认证、邮箱验证、资料与头像接口')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const documentFactory = () => SwaggerModule.createDocument(app, swaggerConfig, {
    operationIdFactory: (_controller, method) => method,
  });
  SwaggerModule.setup('api', app, documentFactory, {
    jsonDocumentUrl: 'api/openapi.json',
    yamlDocumentUrl: 'api/openapi.yaml',
  });

  app.enableShutdownHooks();
  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();
