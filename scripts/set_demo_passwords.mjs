// Gives the demo accounts known passwords so each role can be tested by hand.
//   node scripts/set_demo_passwords.mjs
// - Development Clerk instance only (refuses an sk_live_ key).
// - Sets a fresh random password on palsya-demo-{patient,clinician,admin}+clerk_test@example.com.
// - Creates palsya-demo-superuser+clerk_test@example.com (users.role "superuser") if it doesn't exist.
// - Prints the passwords once; they are not stored anywhere else.
// "+clerk_test" emails accept the verification code 424242 in development.
import 'dotenv/config';
import crypto from 'node:crypto';
import { neon } from '@neondatabase/serverless';
import { createClerkClient } from '@clerk/backend';

if (!process.env.CLERK_SECRET_KEY?.startsWith('sk_test_')) {
  console.error('Refusing to run: CLERK_SECRET_KEY is not a development (sk_test_) key.');
  process.exit(2);
}

const sql = neon(process.env.DATABASE_URL);
const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
const EMAIL = (who) => `palsya-demo-${who}+clerk_test@example.com`;

// Upper, lower, digit and symbol so it passes src/lib/password-policy.ts.
const newPassword = () => `Demo-${crypto.randomBytes(9).toString('base64url')}-7a!`;

async function audit(code, targetId, metadata) {
  const [type] = await sql`select id from action_types where code = ${code}`;
  if (!type) return;
  await sql`insert into activity_log (user_id, action_type_id, target_type, target_id, metadata)
            values (null, ${type.id}, 'user', ${targetId}, ${JSON.stringify(metadata)})`;
}

const results = [];

for (const who of ['patient', 'clinician', 'admin']) {
  const email = EMAIL(who);
  const { data: [user] } = await clerk.users.getUserList({ emailAddress: [email], limit: 1 });
  if (!user) {
    results.push({ role: who, email, password: '(account not found — skipped)' });
    continue;
  }
  const password = newPassword();
  await clerk.users.updateUser(user.id, { password, skipPasswordChecks: true, signOutOfOtherSessions: true });
  results.push({ role: who, email, password });
}

// Super admin: create in Clerk + users row with role "superuser" (the app treats it as admin).
{
  const email = EMAIL('superuser');
  const password = newPassword();
  let { data: [user] } = await clerk.users.getUserList({ emailAddress: [email], limit: 1 });
  if (user) {
    await clerk.users.updateUser(user.id, { password, skipPasswordChecks: true, signOutOfOtherSessions: true });
  } else {
    user = await clerk.users.createUser({
      emailAddress: [email],
      password,
      firstName: 'Demo',
      lastName: 'Superuser',
      skipPasswordChecks: true,
      publicMetadata: { role: 'superuser', invitedVia: null },
    });
  }
  const [row] = await sql`
    insert into users (clerk_user_id, email, full_name, role, status, email_verified_at)
    values (${user.id}, ${email}, 'Demo Superuser', 'superuser', 'active', now())
    on conflict (clerk_user_id) do update set role = 'superuser', status = 'active', updated_at = now()
    returning id`;
  await sql`insert into staff_profiles (user_id, title, employment_status) values (${row.id}, 'Super administrator', 'active')
            on conflict (user_id) do nothing`;
  await audit('role_changed', row.id, { to: 'superuser', email, via: 'scripts/set_demo_passwords.mjs' });
  results.push({ role: 'superuser', email, password });
}

console.table(results);
