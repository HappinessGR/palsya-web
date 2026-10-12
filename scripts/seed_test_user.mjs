import 'dotenv/config';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

const CLERK_USER_ID = 'user_3JW7ZiZf43lgByss5W5lmA3SWT7';

// Lookup tables — seed the values these rows will reference, if not already present.
await sql`
  insert into auth_methods (code, display_name)
  values ('password', 'Password'), ('google', 'Google'), ('apple', 'Apple')
  on conflict (code) do nothing
`;

await sql`
  insert into action_types (code, description)
  values
    ('view_patient_record', 'Viewed a patient record'),
    ('complete_exercise', 'Completed a scheduled exercise'),
    ('update_profile', 'Updated profile information')
  on conflict (code) do nothing
`;

const [authMethod] = await sql`select id from auth_methods where code = 'password'`;
const [actionType] = await sql`select id from action_types where code = 'complete_exercise'`;

const [user] = await sql`
  insert into users (clerk_user_id, email, full_name, role, status, mfa_enabled, email_verified_at)
  values (${CLERK_USER_ID}, 'dummy.patient@example.com', 'Dummy Patient', 'patient', 'active', false, now())
  on conflict (clerk_user_id) do update set updated_at = now()
  returning id
`;

await sql`
  insert into patient_profiles (user_id, onset_date, phase, preferred_language, consult_language)
  values (${user.id}, now() - interval '30 days', 2, 'en', 'en')
  on conflict (user_id) do update set updated_at = now()
`;

const [signInEvent] = await sql`
  insert into sign_in_events (user_id, email_attempted, auth_method_id, success, ip_address, user_agent)
  values (${user.id}, 'dummy.patient@example.com', ${authMethod.id}, true, '127.0.0.1', 'Mozilla/5.0 (dummy seed script)')
  returning id
`;

const [session] = await sql`
  insert into sessions (user_id, sign_in_event_id, expires_at, ip_address, user_agent)
  values (${user.id}, ${signInEvent.id}, now() + interval '7 days', '127.0.0.1', 'Mozilla/5.0 (dummy seed script)')
  returning id
`;

await sql`
  insert into activity_log (user_id, session_id, action_type_id, target_type, target_id, metadata)
  values (${user.id}, ${session.id}, ${actionType.id}, 'exercise', ${user.id}, ${JSON.stringify({ note: 'dummy seed data' })}::jsonb)
`;

console.log('Seeded dummy data for', CLERK_USER_ID);
console.log({ userId: user.id, signInEventId: signInEvent.id, sessionId: session.id });
