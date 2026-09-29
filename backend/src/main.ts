import os from 'os';
import { availableParallelism } from 'os';

/* eslint-disable @typescript-eslint/no-var-requires */
const cluster = require('cluster') as {
  isPrimary?: boolean;
  isMaster?: boolean;
  fork: () => { process: { pid?: number } };
  on: (event: string, cb: (...args: never[]) => void) => void;
};

function workerCount(): number {
  const raw = process.env.CLUSTER_WORKERS;
  if (raw && Number(raw) > 0) return Number(raw);
  const cpus = availableParallelism ? availableParallelism() : os.cpus().length;
  return Math.max(1, Math.min(cpus, 8));
}

function primary(): boolean {
  return Boolean(cluster.isPrimary ?? cluster.isMaster);
}

async function startWorker() {
  // 加载 .env
  try {
    const dotenv = await import('dotenv');
    dotenv.config();
  } catch {
    /* optional */
  }

  const { NestFactory } = await import('@nestjs/core');
  const { ValidationPipe } = await import('@nestjs/common');
  const { join } = await import('path');
  const { AppModule } = await import('./app.module');
  const { loadAppConfig } = await import('./config');

  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableCors({ origin: true, credentials: true });

  const cookieParserModule = require('cookie-parser') as ((...args: never[]) => unknown) & {
    default?: (...args: never[]) => unknown;
  };
  const cookieParser = (cookieParserModule.default ?? cookieParserModule) as unknown as (
    ...args: never[]
  ) => unknown;
  app.use(cookieParser());

  const expressApp = app.getHttpAdapter().getInstance();
  const express = await import('express');

  const uploads = join(process.cwd(), 'uploads');
  expressApp.use('/uploads', express.static(uploads));

  const assets = join(process.cwd(), '..', 'assets');
  expressApp.use('/assets', express.static(assets));

  const frontendDist = join(process.cwd(), '..', 'frontend', 'dist');
  expressApp.use(express.static(frontendDist, { index: 'index.html' }));
  expressApp.use((req: { method: string; path: string }, res: { sendFile: (p: string) => void }, next: () => void) => {
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

  const port = process.env.PORT
    ? Number(process.env.PORT)
    : loadAppConfig().server.port || 3000;
  await app.listen(port);
  console.log(`[worker ${process.pid}] listening on ${port}`);
}

async function bootstrap() {
  const useCluster = process.env.CLUSTER !== '0';
  const workers = workerCount();
  const isPrimary = primary();

  if (!useCluster || workers <= 1 || !isPrimary) {
    if (isPrimary && useCluster && workers <= 1) {
      console.log(`[cluster] single-process mode (workers=${workers})`);
    }
    await startWorker();
    return;
  }

  console.log(`[cluster] primary ${process.pid} forking ${workers} workers`);
  for (let i = 0; i < workers; i += 1) {
    cluster.fork();
  }

  cluster.on('exit', ((worker: { process: { pid?: number } }, code: number) => {
    console.warn(`[cluster] worker ${worker.process.pid} exited (${code}), restarting`);
    cluster.fork();
  }) as never);
}

bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});
