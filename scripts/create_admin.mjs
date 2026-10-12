// Creates the first admin (there is no public admin sign-up).
//   node scripts/create_admin.mjs person@example.com
// - If a Clerk account with that email exists: its users row becomes role "admin".
// - Otherwise: creates a Clerk invitation carrying role "admin" and prints the link
//   (the person opens it, sets a password on /accept-invite, and is provisioned as admin).
// Every change is written to activity_log (actor = null, i.e. "system / seed script").
import 'dotenv/config';
import { neon } from '@neondatabase/serverless';
import { createClerkClient } from '@clerk/backend';

const email = process.argv[2]?.trim().toLowerCase();
if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  console.error('Usage: node scripts/create_admin.mjs person@example.com');
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);
const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000').replace(/\/$/, '');

async function audit(code, targetId, metadata) {
  const [type] = await sql`select id from action_types where code = ${code}`;
  if (!type) throw new Error(`action type ${code} missing — run the migrations first`);
  await sql`insert into activity_log (user_id, action_type_id, target_type, target_id, metadata)
            values (null, ${type.id}, ${targetId ? 'user' : 'invitation'}, ${targetId}, ${JSON.stringify(metadata)})`;
}

const { data: [clerkUser] } = await clerk.users.getUserList({ emailAddress: [email], limit: 1 });

if (clerkUser) {
  const fullName = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') || email.split('@')[0];
  const [before] = await sql`select id, role from users where clerk_user_id = ${clerkUser.id}`;
  const [row] = await sql`
    insert into users (clerk_user_id, email, full_name, role, status)
    values (${clerkUser.id}, ${email}, ${fullName}, 'admin', 'active')
    on conflict (clerk_user_id) do update set role = 'admin', status = 'active', updated_at = now()
    returning id`;
  await sql`insert into staff_profiles (user_id, title, employment_status) values (${row.id}, 'Administrator', 'active')
            on conflict (user_id) do nothing`;
  await clerk.users.updateUserMetadata(clerkUser.id, { publicMetadata: { role: 'admin', invitedVia: null } });
  await audit('role_changed', row.id, { from: before?.role ?? null, to: 'admin', email, via: 'scripts/create_admin.mjs' });
  console.log(`${email} is now an admin (users.id ${row.id}). Sign in and open ${appUrl}/admin.`);
} else {
  const invitation = await clerk.invitations.createInvitation({
    emailAddress: email,
    publicMetadata: { role: 'admin', invitedVia: 'invitation', invitedBy: 'scripts/create_admin.mjs' },
    redirectUrl: `${appUrl}/accept-invite`,
    notify: false,
    ignoreExisting: true,
  });
  await audit('user_invited', null, { invitationId: invitation.id, email, role: 'admin', via: 'scripts/create_admin.mjs' });
  console.log(`No account for ${email} yet. Send them this admin invitation link:\n${invitation.url}`);
}
