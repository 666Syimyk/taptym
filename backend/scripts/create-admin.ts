/* Creates (or updates the password/role of) an admin user.
 * Usage: npm run admin:create -- admin@example.com 'StrongPassword123!' SUPER_ADMIN */
import 'reflect-metadata';
import * as argon2 from 'argon2';
import { eq } from 'drizzle-orm';
import { loadConfig } from '../src/config/app-config';
import { adminUsers } from '../src/database/schema';
import { createDbForScripts } from '../src/database/scripts-db';

async function main() {
  const [email, password, role = 'SUPER_ADMIN'] = process.argv.slice(2);
  if (!email || !password) {
    console.error('Usage: npm run admin:create -- <email> <password> [ROLE]');
    process.exit(1);
  }
  if (password.length < 12) {
    console.error('Password must be at least 12 characters');
    process.exit(1);
  }
  const cfg = loadConfig();
  const handle = await createDbForScripts(cfg);
  const passwordHash = await argon2.hash(password);
  const [existing] = await handle.db
    .select()
    .from(adminUsers)
    .where(eq(adminUsers.email, email.toLowerCase()));
  if (existing) {
    await handle.db
      .update(adminUsers)
      .set({ passwordHash, role: role as any, active: true })
      .where(eq(adminUsers.id, existing.id));
    console.log(`Updated admin ${email} (${role})`);
  } else {
    await handle.db
      .insert(adminUsers)
      .values({ email: email.toLowerCase(), passwordHash, role: role as any });
    console.log(`Created admin ${email} (${role})`);
  }
  await handle.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
