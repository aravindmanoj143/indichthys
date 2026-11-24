import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { config } from '../../config';
import type { Db } from '../../db';
import { createSession, destroySession, requireUser } from './auth';
import { hashPassword, verifyPassword } from './password';

const Credentials = z.object({
  email: z.email().max(200).transform((e) => e.trim().toLowerCase()),
  password: z.string().min(1).max(200),
});
const Registration = Credentials.extend({
  password: z.string().min(10, 'Use at least 10 characters').max(200),
  displayName: z.string().trim().min(2).max(120),
});

/** Strict per-IP limits for credential endpoints. */
const authLimit = { config: { rateLimit: { max: 10, timeWindow: '15 minutes' } } };

export async function authRoutes(app: FastifyInstance, { db }: { db: Db }) {
  app.get('/me', async (request) => ({ user: request.user }));

  app.post('/register', authLimit, async (request, reply) => {
    const body = Registration.parse(request.body);
    const exists = await db.user.findUnique({ where: { email: body.email }, select: { id: true } });
    if (exists) return reply.code(409).send({ error: 'An account with this email already exists.' });
    const user = await db.user.create({
      data: {
        email: body.email,
        displayName: body.displayName,
        passwordHash: await hashPassword(body.password),
        role: config.adminEmails.includes(body.email.toLowerCase()) ? 'admin' : 'user',
      },
    });
    await createSession(db, reply, user.id);
    return reply.code(201).send({ ok: true });
  });

  app.post('/login', authLimit, async (request, reply) => {
    const body = Credentials.parse(request.body);
    const user = await db.user.findUnique({ where: { email: body.email } });
    // Same message whether the email or the password is wrong.
    if (!user || !(await verifyPassword(body.password, user.passwordHash))) {
      return reply.code(401).send({ error: 'Email or password is incorrect.' });
    }
    await createSession(db, reply, user.id);
    return { ok: true };
  });

  app.post('/logout', async (request, reply) => {
    await destroySession(db, request, reply);
    return { ok: true };
  });

  app.post('/password', authLimit, async (request) => {
    const me = requireUser(request);
    const body = z
      .object({ currentPassword: z.string().min(1), newPassword: z.string().min(10).max(200) })
      .parse(request.body);
    const user = await db.user.findUniqueOrThrow({ where: { id: me.id } });
    if (!(await verifyPassword(body.currentPassword, user.passwordHash))) {
      throw Object.assign(new Error('Current password is incorrect.'), { statusCode: 400 });
    }
    await db.user.update({ where: { id: me.id }, data: { passwordHash: await hashPassword(body.newPassword) } });
    return { ok: true };
  });
}
