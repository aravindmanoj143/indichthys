import { randomBytes } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { Db } from '../../db';
import { requireUser } from '../auth/auth';

const SlugParam = z.object({ slug: z.string().regex(/^[a-z0-9-]+$/) });
const LessonParam = SlugParam.extend({ position: z.coerce.number().int().min(1) });

export const SUBJECTS = ['ichthyology', 'taxonomy', 'identification', 'photography', 'morphometrics', 'field-methods', 'molecular'] as const;

/** Score a quiz: fraction of questions answered with a correct option. */
export function scoreQuiz(
  questions: { id: number; options: { id: number; isCorrect: boolean }[] }[],
  answers: Record<string, number>,
): { score: number; correct: Set<number> } {
  const correct = new Set<number>();
  for (const q of questions) {
    const chosen = answers[String(q.id)];
    if (chosen != null && q.options.some((o) => o.id === chosen && o.isCorrect)) correct.add(q.id);
  }
  return { score: questions.length ? correct.size / questions.length : 0, correct };
}

/** Human-friendly certificate code, e.g. "IX-7K2M-Q9PD". No 0/O/1/I to avoid confusion. */
export function certificateCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = randomBytes(8);
  const chars = [...bytes].map((b) => alphabet[b % alphabet.length]).join('');
  return `IX-${chars.slice(0, 4)}-${chars.slice(4)}`;
}

export async function learningRoutes(app: FastifyInstance, { db }: { db: Db }) {
  app.get('/courses', async (request) => {
    const q = z
      .object({
        subject: z.enum(SUBJECTS).optional(),
        kind: z.enum(['indichthys', 'external']).optional(),
        format: z.enum(['online', 'in-person', 'field', 'blended']).optional(),
        level: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
        q: z.string().trim().max(100).optional(),
      })
      .parse(request.query);
    const courses = await db.course.findMany({
      where: {
        status: 'published',
        ...(q.subject ? { subject: q.subject } : {}),
        ...(q.kind ? { kind: q.kind } : {}),
        ...(q.format ? { format: q.format } : {}),
        ...(q.level ? { level: q.level } : {}),
        ...(q.q ? { OR: [{ title: { contains: q.q } }, { summary: { contains: q.q } }, { provider: { contains: q.q } }] } : {}),
      },
      orderBy: [{ kind: 'desc' }, { title: 'asc' }],
      omit: { description: true },
      include: { _count: { select: { lessons: true, questions: true } } },
    });
    const userId = request.user?.id;
    const [done, certs] = userId
      ? await Promise.all([
          db.lessonCompletion.findMany({ where: { userId }, select: { lesson: { select: { courseId: true } } } }),
          db.certificate.findMany({ where: { userId }, select: { courseId: true, code: true } }),
        ])
      : [[], []];
    return courses.map(({ _count, ...c }) => ({
      ...c,
      lessonCount: _count.lessons,
      questionCount: _count.questions,
      lessonsDone: done.filter((d) => d.lesson.courseId === c.id).length,
      certificate: certs.find((x) => x.courseId === c.id)?.code ?? null,
    }));
  });

  app.get('/courses/:slug', async (request, reply) => {
    const { slug } = SlugParam.parse(request.params);
    const course = await db.course.findFirst({
      where: { slug, status: 'published' },
      include: {
        lessons: { orderBy: { position: 'asc' }, select: { id: true, position: true, title: true } },
        _count: { select: { questions: true } },
      },
    });
    if (!course) return reply.code(404).send({ error: 'Course not found' });
    const userId = request.user?.id;
    const [done, cert] = userId
      ? await Promise.all([
          db.lessonCompletion.findMany({ where: { userId, lesson: { courseId: course.id } }, select: { lessonId: true } }),
          db.certificate.findUnique({ where: { userId_courseId: { userId, courseId: course.id } }, select: { code: true, score: true } }),
        ])
      : [[], null];
    const doneIds = new Set(done.map((d) => d.lessonId));
    const { _count, lessons, ...rest } = course;
    return {
      ...rest,
      questionCount: _count.questions,
      lessons: lessons.map((l) => ({ position: l.position, title: l.title, done: doneIds.has(l.id) })),
      certificate: cert,
    };
  });

  app.get('/courses/:slug/lessons/:position', async (request, reply) => {
    const { slug, position } = LessonParam.parse(request.params);
    const course = await db.course.findFirst({ where: { slug, status: 'published' }, select: { id: true, title: true, _count: { select: { lessons: true } } } });
    if (!course) return reply.code(404).send({ error: 'Course not found' });
    const lesson = await db.lesson.findUnique({ where: { courseId_position: { courseId: course.id, position } } });
    if (!lesson) return reply.code(404).send({ error: 'Lesson not found' });
    const done = request.user
      ? !!(await db.lessonCompletion.findUnique({ where: { userId_lessonId: { userId: request.user.id, lessonId: lesson.id } } }))
      : false;
    return {
      courseTitle: course.title,
      position: lesson.position,
      title: lesson.title,
      body: lesson.body,
      total: course._count.lessons,
      done,
    };
  });

  app.post('/courses/:slug/lessons/:position/complete', async (request, reply) => {
    const user = requireUser(request);
    const { slug, position } = LessonParam.parse(request.params);
    const lesson = await db.lesson.findFirst({ where: { position, course: { slug } }, select: { id: true } });
    if (!lesson) return reply.code(404).send({ error: 'Lesson not found' });
    await db.lessonCompletion.upsert({
      where: { userId_lessonId: { userId: user.id, lessonId: lesson.id } },
      update: {},
      create: { userId: user.id, lessonId: lesson.id },
    });
    return { done: true };
  });

  /** Questions without the answers. */
  app.get('/courses/:slug/quiz', async (request, reply) => {
    const { slug } = SlugParam.parse(request.params);
    const course = await db.course.findFirst({
      where: { slug, status: 'published', kind: 'indichthys' },
      select: {
        title: true,
        passMark: true,
        questions: {
          orderBy: { position: 'asc' },
          select: { id: true, prompt: true, options: { orderBy: { position: 'asc' }, select: { id: true, label: true } } },
        },
      },
    });
    return course ?? reply.code(404).send({ error: 'Course not found' });
  });

  app.post('/courses/:slug/quiz', { config: { rateLimit: { max: 30, timeWindow: '1 hour' } } }, async (request, reply) => {
    const user = requireUser(request);
    const { slug } = SlugParam.parse(request.params);
    const { answers } = z.object({ answers: z.record(z.string(), z.number().int()) }).parse(request.body);
    const course = await db.course.findFirst({
      where: { slug, status: 'published', kind: 'indichthys' },
      select: {
        id: true,
        passMark: true,
        questions: { select: { id: true, explanation: true, options: { select: { id: true, isCorrect: true } } } },
      },
    });
    if (!course) return reply.code(404).send({ error: 'Course not found' });
    if (!course.questions.length) return reply.code(409).send({ error: 'This course has no assessment.' });

    const { score, correct } = scoreQuiz(course.questions, answers);
    const passed = score >= course.passMark;
    let certificate: { code: string } | null = null;
    if (passed) {
      const name = user.profile?.fullName ?? user.displayName;
      const existing = await db.certificate.findUnique({ where: { userId_courseId: { userId: user.id, courseId: course.id } } });
      certificate = existing
        ? await db.certificate.update({ where: { id: existing.id }, data: { score: Math.max(existing.score, score) }, select: { code: true } })
        : await db.certificate.create({ data: { code: certificateCode(), userId: user.id, courseId: course.id, recipientName: name, score }, select: { code: true } });
    }
    return {
      score,
      passMark: course.passMark,
      passed,
      certificate,
      results: course.questions.map((q) => ({
        questionId: q.id,
        correct: correct.has(q.id),
        correctOptionId: q.options.find((o) => o.isCorrect)?.id ?? null,
        explanation: q.explanation,
      })),
    };
  });

  /** Public certificate verification. */
  app.get('/certificates/:code', async (request, reply) => {
    const { code } = z.object({ code: z.string().regex(/^IX-[A-Z0-9]{4}-[A-Z0-9]{4}$/) }).parse(request.params);
    const cert = await db.certificate.findUnique({
      where: { code },
      select: { code: true, recipientName: true, score: true, issuedAt: true, course: { select: { slug: true, title: true, provider: true } } },
    });
    return cert ?? reply.code(404).send({ error: 'No certificate with this code.' });
  });

  app.get('/me/certificates', async (request) => {
    const user = requireUser(request);
    return db.certificate.findMany({
      where: { userId: user.id },
      orderBy: { issuedAt: 'desc' },
      select: { code: true, score: true, issuedAt: true, course: { select: { slug: true, title: true } } },
    });
  });
}
