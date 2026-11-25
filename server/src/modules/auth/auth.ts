import { createHash, randomBytes } from 'node:crypto';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { config } from '../../config';
import type { Db } from '../../db';

export const SESSION_COOKIE = 'ix_session';
/** Every state-changing request must carry this header (blocks cross-site form posts). */
export const CSRF_HEADER = 'x-indichthys';

export interface AuthUser {
  id: number;
  email: string;
  displayName: string;
  role: 'user' | 'admin';
  /** The user's ichthyologist profile, if any. */
  profile: { id: number; slug: string; fullName: string; verificationStatus: string } | null;
}

declare module 'fastify' {
  interface FastifyRequest {
    user: AuthUser | null;
  }
}

/**
 * In production the frontend may be on another site (GitHub Pages) calling this API, so the session
 * cookie must be SameSite=None (which requires Secure). CSRF is still blocked by CSRF_HEADER + CORS.
 */
const cookieOptions = () =>
  config.isProduction ? ({ path: '/', sameSite: 'none', secure: true } as const) : ({ path: '/', sameSite: 'lax', secure: false } as const);

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

export async function createSession(db: Db, reply: FastifyReply, userId: number) {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + config.sessionDays * 86_400_000);
  await db.session.create({ data: { id: hashToken(token), userId, expiresAt } });
  reply.setCookie(SESSION_COOKIE, token, { ...cookieOptions(), httpOnly: true, expires: expiresAt });
}

export async function destroySession(db: Db, request: FastifyRequest, reply: FastifyReply) {
  const token = request.cookies[SESSION_COOKIE];
  if (token) await db.session.deleteMany({ where: { id: hashToken(token) } });
  reply.clearCookie(SESSION_COOKIE, cookieOptions());
}

/** Loads request.user from the session cookie and enforces the CSRF header on writes. */
export function registerAuth(app: FastifyInstance, db: Db) {
  app.decorateRequest('user', null);

  app.addHook('onRequest', async (request, reply) => {
    if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method) && request.url.startsWith('/api/')) {
      if (request.headers[CSRF_HEADER] !== '1') {
        return reply.code(403).send({ error: 'Missing request header.' });
      }
    }

    const token = request.cookies[SESSION_COOKIE];
    if (!token) return;
    const session = await db.session.findUnique({
      where: { id: hashToken(token) },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            displayName: true,
            role: true,
            profile: { select: { id: true, slug: true, fullName: true, verificationStatus: true } },
          },
        },
      },
    });
    if (!session || session.expiresAt < new Date()) {
      if (session) await db.session.delete({ where: { id: session.id } }).catch(() => {});
      reply.clearCookie(SESSION_COOKIE, cookieOptions());
      return;
    }
    request.user = { ...session.user, role: session.user.role === 'admin' ? 'admin' : 'user' };
  });
}

export function requireUser(request: FastifyRequest): AuthUser {
  if (!request.user) throw Object.assign(new Error('Please sign in.'), { statusCode: 401 });
  return request.user;
}

export function requireAdmin(request: FastifyRequest): AuthUser {
  const user = requireUser(request);
  if (user.role !== 'admin') throw Object.assign(new Error('Administrators only.'), { statusCode: 403 });
  return user;
}

export const isVerifiedExpert = (user: AuthUser | null) => user?.profile?.verificationStatus === 'verified';
