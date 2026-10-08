import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // Autorise les appels depuis des pages statiques (widget, tableau de bord) ouvertes en file:// ou sur un autre domaine
  app.enableCors();
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
