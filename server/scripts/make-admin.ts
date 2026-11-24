/**
 * Grant (or revoke) the admin role.
 *   npm run user:admin -- someone@example.org
 *   npm run user:admin -- someone@example.org --revoke
 * The person must have registered in the app first.
 */
import { createPrisma } from '../src/db';

const [email, flag] = process.argv.slice(2);
if (!email) {
  console.error('Usage: npm run user:admin -- <email> [--revoke]');
  process.exit(1);
}
const db = createPrisma();
try {
  const user = await db.user.update({
    where: { email: email.trim().toLowerCase() },
    data: { role: flag === '--revoke' ? 'user' : 'admin' },
  });
  console.log(`${user.email} is now ${user.role}.`);
} catch {
  console.error(`No user with email ${email}. Register in the app first.`);
  process.exitCode = 1;
} finally {
  await db.$disconnect();
}
