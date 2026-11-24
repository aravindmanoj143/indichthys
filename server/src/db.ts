import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { config } from './config';
import { PrismaClient } from './generated/prisma/client';

/**
 * Database client. Moving to PostgreSQL:
 *   npm i @prisma/adapter-pg pg
 *   import { PrismaPg } from '@prisma/adapter-pg';
 *   const adapter = new PrismaPg({ connectionString: config.databaseUrl });
 * and set provider = "postgresql" in prisma/schema.prisma.
 */
export function createPrisma(url = config.databaseUrl): PrismaClient {
  const adapter = new PrismaBetterSqlite3({ url });
  return new PrismaClient({ adapter });
}

export type Db = PrismaClient;
