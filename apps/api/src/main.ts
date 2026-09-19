import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { json, urlencoded } from 'express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  app.setGlobalPrefix('api');
  
  app.use(helmet());
  app.enableCors({ origin: ['http://localhost:3000', 'http://127.0.0.1:3000'] });
  app.use(json({ limit: '8mb' }));
  app.use(urlencoded({ limit: '8mb', extended: true }));
  
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new TransformInterceptor());

  const config = new DocumentBuilder()
    .setTitle('Radar de Oportunidades API')
    .setDescription('The API for Radar de Oportunidades platform')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.API_PORT || 3001;
  await app.listen(port, '127.0.0.1');
  console.log(`Application is running on: ${await app.getUrl()}`);
}
bootstrap();
