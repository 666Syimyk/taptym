import { Logger } from '@nestjs/common';
import * as argon2 from 'argon2';
import { sql } from 'drizzle-orm';
import type { AppDb } from '../../database/database.module';
import { adminUsers } from '../../database/schema';

/**
 * Creates the first team account from ADMIN_BOOTSTRAP_EMAIL / ADMIN_BOOTSTRAP_PASSWORD,
 * for hosts where nobody can run the admin:create command. It acts only while there is
 * no admin at all, so changing or leaking the variables later cannot add accounts.
 * In production the panel still asks to set up two-factor sign-in on first login.
 */
export async function bootstrapFirstAdmin(db: AppDb): Promise<void> {
  const email = process.env.ADMIN_BOOTSTRAP_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_BOOTSTRAP_PASSWORD;
  if (!email || !password) return;
  const logger = new Logger('AdminBootstrap');
  if (password.length < 12) {
    logger.warn('ADMIN_BOOTSTRAP_PASSWORD must have at least 12 characters; no admin created');
    return;
  }
  const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(adminUsers);
  if (count > 0) return;
  await db
    .insert(adminUsers)
    .values({ email, passwordHash: await argon2.hash(password), role: 'SUPER_ADMIN' })
    .onConflictDoNothing();
  logger.log(`Created the first admin ${email}`);
}
