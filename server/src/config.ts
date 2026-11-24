import 'dotenv/config';
import path from 'node:path';

export const config = {
  port: Number(process.env['PORT'] ?? 3000),
  host: process.env['HOST'] ?? '127.0.0.1',
  databaseUrl: process.env['DATABASE_URL'] ?? 'file:./data/indichthys.db',
  uploadDir: path.resolve(process.env['UPLOAD_DIR'] ?? './uploads'),
  /** Origins allowed to call the API (the Angular dev server uses a proxy, so this is for other clients). */
  corsOrigins: (process.env['CORS_ORIGINS'] ?? 'http://localhost:4200').split(','),
  isProduction: process.env['NODE_ENV'] === 'production',
  /** Built Angular app to serve alongside the API (single-service hosting). Unset in development. */
  webRoot: process.env['WEB_ROOT'] ? path.resolve(process.env['WEB_ROOT']) : null,
  /** Emails that become admins when they register (hosting without a shell for `user:admin`). */
  adminEmails: (process.env['ADMIN_EMAILS'] ?? '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean),
  sessionDays: Number(process.env['SESSION_DAYS'] ?? 30),
  maxPhotoBytes: 10 * 1024 * 1024,
  maxPhotosPerRequest: 6,
};
