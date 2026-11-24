import { existsSync, mkdirSync } from 'node:fs';
import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import fastifyStatic from '@fastify/static';
import Fastify, { type FastifyError } from 'fastify';
import { ZodError } from 'zod';
import { config } from './config';
import type { Db } from './db';
import { registerAuth } from './modules/auth/auth';
import { authRoutes } from './modules/auth/routes';
import { contentRoutes } from './modules/content/routes';
import { identificationRoutes } from './modules/identification/routes';
import { learningRoutes } from './modules/learning/routes';
import { publicationRoutes } from './modules/publications/routes';
import { registryRoutes } from './modules/registry/routes';

export async function buildApp(db: Db, opts: { logger?: boolean } = {}) {
  // Behind a hosting proxy in production: use X-Forwarded-For for rate limits.
  const app = Fastify({ logger: opts.logger ?? true, trustProxy: config.isProduction });

  mkdirSync(config.uploadDir, { recursive: true });

  await app.register(cors, { origin: config.corsOrigins, credentials: true });
  await app.register(cookie);
  // Limits apply only to routes that set config.rateLimit (login, register, contact…).
  await app.register(rateLimit, { global: false });
  registerAuth(app, db);
  await app.register(multipart, {
    limits: { fileSize: config.maxPhotoBytes, files: config.maxPhotosPerRequest, fields: 30 },
  });
  await app.register(fastifyStatic, {
    root: config.uploadDir,
    prefix: '/api/uploads/',
    decorateReply: false,
    // Only serve files; never directory listings.
    index: false,
    list: false,
  });

  app.setErrorHandler((err: FastifyError, _req, reply) => {
    if (err instanceof ZodError) {
      return reply.code(400).send({
        error: 'Invalid input',
        issues: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
      });
    }
    const status = err.statusCode ?? 500;
    if (status >= 500) app.log.error(err);
    return reply.code(status).send({ error: status >= 500 ? 'Internal server error' : err.message });
  });

  app.get('/api/health', async () => ({ ok: true }));
  await app.register(authRoutes, { prefix: '/api/auth', db });
  await app.register(identificationRoutes, { prefix: '/api/identification', db });
  await app.register(registryRoutes, { prefix: '/api/registry', db });
  await app.register(contentRoutes, { prefix: '/api', db });
  await app.register(publicationRoutes, { prefix: '/api/publications', db });
  await app.register(learningRoutes, { prefix: '/api/learning', db });

  // Production: serve the Angular build; unknown non-API paths get index.html so client routes work on reload.
  const webRoot = config.webRoot;
  if (webRoot && existsSync(webRoot)) {
    await app.register(fastifyStatic, { root: webRoot, prefix: '/', index: 'index.html', list: false, wildcard: false });
    app.setNotFoundHandler((req, reply) => {
      if (req.method !== 'GET' || req.url.startsWith('/api/')) return reply.code(404).send({ error: 'Not found' });
      return reply.sendFile('index.html', webRoot);
    });
  }

  return app;
}
