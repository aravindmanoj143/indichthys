import { buildApp } from './app';
import { config } from './config';
import { createPrisma } from './db';

const db = createPrisma();
const app = await buildApp(db);

const shutdown = async () => {
  await app.close();
  await db.$disconnect();
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

await app.listen({ port: config.port, host: config.host });
