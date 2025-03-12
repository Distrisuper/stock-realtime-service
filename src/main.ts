import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { setupSwagger } from './swagger.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  setupSwagger(app);
  const port = process.env.PORT || 8080;
  await app.listen(port);
  console.log(`Application is running on: ${await app.getUrl()}`);
}
bootstrap();