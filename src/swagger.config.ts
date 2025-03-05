import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { INestApplication } from '@nestjs/common';

export function setupSwagger(app: INestApplication): void {
  const options = new DocumentBuilder()
    .setTitle('Servicio de Stock en Tiempo Real')
    .setDescription('Documentación de la API para el serviocio de stock en tiempo real')
    .setVersion('1.0')
    .build();

  const document = SwaggerModule.createDocument(app, options);
  SwaggerModule.setup('api-docs', app, document);
}