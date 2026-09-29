import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableCors({ origin: true, credentials: true });

  const uploads = join(process.cwd(), 'uploads');
  app.useStaticAssets(uploads, { prefix: '/uploads/' });

  const assets = join(process.cwd(), '..', 'assets');
  app.useStaticAssets(assets, { prefix: '/assets/' });

  const frontendDist = join(process.cwd(), '..', 'frontend', 'dist');
  app.useStaticAssets(frontendDist, { index: false });
  app.use((req, res, next) => {
    if (
      req.method === 'GET' &&
      !req.path.startsWith('/api') &&
      !req.path.startsWith('/uploads') &&
      !req.path.startsWith('/assets') &&
      !req.path.includes('.')
    ) {
      res.sendFile(join(frontendDist, 'index.html'));
      return;
    }
    next();
  });

  await app.listen(process.env.PORT ? Number(process.env.PORT) : 3000);
}
bootstrap();
