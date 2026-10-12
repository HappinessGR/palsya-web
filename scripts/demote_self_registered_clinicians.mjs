// One-off clean-up after removing clinician self-registration.
// Before the roles change, /login let a brand-new account claim "clinician"
// (publicMetadata { role: "clinician", clinicianVerified: false }, no invitation).
// Those accounts are demoted to patient; an admin can re-invite real clinicians.
//   node scripts/demote_self_registered_clinicians.mjs          → dry run (lists only)
//   node scripts/demote_self_registered_clinicians.mjs --apply  → demotes + audit log
import 'dotenv/config';
import { neon } from '@neondatabase/serverless';
import { createClerkClient } from '@clerk/backend';

const apply = process.argv.includes('--apply');
const sql = neon(process.env.DATABASE_URL);
const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

const suspects = [];
for (let offset = 0; ; offset += 100) {
  const { data } = await clerk.users.getUserList({ limit: 100, offset });
  for (const u of data) {
    const meta = u.publicMetadata ?? {};
    if (meta.role === 'clinician' && meta.invitedVia !== 'invitation') suspects.push(u);
  }
  if (data.length < 100) break;
}

console.log(`${suspects.length} self-registered clinician account(s)${apply ? '' : ' (dry run — add --apply to demote)'}`);
const [type] = await sql`select id from action_types where code = 'user_demoted_self_registered'`;

for (const u of suspects) {
  const email = u.emailAddresses.find((e) => e.id === u.primaryEmailAddressId)?.emailAddress ?? u.id;
  console.log(`  ${email}`);
  if (!apply) continue;
  const [row] = await sql`update users set role = 'patient', updated_at = now() where clerk_user_id = ${u.id} returning id`;
  if (row) {
    await sql`insert into patient_profiles (user_id) values (${row.id}) on conflict (user_id) do nothing`;
    await sql`update patient_profiles set assigned_clinician_id = null where assigned_clinician_id = ${row.id}`;
  }
  await clerk.users.updateUserMetadata(u.id, { publicMetadata: { role: 'patient', clinicianVerified: null } });
  await sql`insert into activity_log (user_id, action_type_id, target_type, target_id, metadata)
            values (null, ${type.id}, 'user', ${row?.id ?? null}, ${JSON.stringify({ email, from: 'clinician', to: 'patient' })})`;
}
