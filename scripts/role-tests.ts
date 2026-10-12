/**
 * End-to-end checks for server-assigned roles, permissions and password reset.
 *
 *   MAIL_OUTBOX_DIR=.mail-outbox npx next start -p 3100   (other terminal, after `next build`; no -H: it proxies via localhost)
 *   MAIL_OUTBOX_DIR=.mail-outbox npx tsx scripts/role-tests.ts [http://127.0.0.1:3100]
 *
 * Creates three throwaway accounts in the Clerk DEVELOPMENT instance
 * (palsya-test-{patient,clinician,admin}+clerk_test@example.com), gets real
 * Clerk session tokens for them (no passwords typed anywhere), calls the app
 * as each of them, then deletes the accounts and their rows again. Refuses to
 * run against a production Clerk key.
 */
import "dotenv/config";
import Module from "node:module";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { createClerkClient } from "@clerk/backend";
import { neon } from "@neondatabase/serverless";

// The password-reset library is server-only; outside Next the "server-only"
// marker package would throw, so map it to an empty stub for this process.
const moduleWithResolve = Module as unknown as { _resolveFilename: (request: string, ...rest: unknown[]) => string };
const originalResolve = moduleWithResolve._resolveFilename;
moduleWithResolve._resolveFilename = function (request: string, ...rest: unknown[]) {
  if (request === "server-only") return path.join(__dirname, "server-only-stub.cjs");
  return originalResolve.call(this, request, ...rest);
};

const BASE = process.argv[2] ?? "http://127.0.0.1:3100";
const OUTBOX = path.resolve(process.env.MAIL_OUTBOX_DIR ?? ".mail-outbox");
process.env.MAIL_OUTBOX_DIR = OUTBOX;
if (!process.env.CLERK_SECRET_KEY?.startsWith("sk_test_")) {
  console.error("Refusing to run: CLERK_SECRET_KEY is not a development (sk_test_) key.");
  process.exit(2);
}

const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
const rawSql = neon(process.env.DATABASE_URL!);
// The harness's own queries retry once on a dropped connection (Neon's HTTP
// driver surfaces those as "fetch failed"); the app under test is not retried.
const sql = (async (strings: TemplateStringsArray, ...values: unknown[]) => {
  try {
    return await rawSql(strings, ...values);
  } catch (e) {
    if (!String((e as Error)?.message).includes("fetch failed")) throw e;
    await new Promise((r) => setTimeout(r, 1500));
    return rawSql(strings, ...values);
  }
}) as unknown as typeof rawSql;
const EMAIL = (who: string) => `palsya-test-${who}+clerk_test@example.com`;
const PREFIX = "palsya-test-";

type Row = { area: string; test: string; expected: string; actual: string; pass: boolean };
const results: Row[] = [];
function record(area: string, test: string, expected: string, actual: string, pass = expected === actual) {
  results.push({ area, test, expected, actual, pass });
  console.log(`${pass ? "✓" : "✗"} [${area}] ${test} — expected ${expected}, got ${actual}`);
}

// ─── Clerk helpers ────────────────────────────────────────────────────────
const sessions = new Map<string, string>(); // clerk user id → session id

async function tokenFor(clerkUserId: string): Promise<string> {
  let sid = sessions.get(clerkUserId);
  if (!sid) {
    sid = (await clerk.sessions.createSession({ userId: clerkUserId })).id;
    sessions.set(clerkUserId, sid);
  }
  return (await clerk.sessions.getToken(sid, undefined, 600)).jwt;
}

async function createTestUser(who: string, extra: Record<string, unknown> = {}) {
  return clerk.users.createUser({
    emailAddress: [EMAIL(who)],
    password: `Tst-${crypto.randomBytes(12).toString("base64url")}!9a`,
    firstName: "Test",
    lastName: who[0].toUpperCase() + who.slice(1),
    skipPasswordChecks: true,
    ...extra,
  });
}

async function cleanup() {
  const { data } = await clerk.users.getUserList({ query: PREFIX, limit: 100 });
  for (const u of data) {
    const email = u.emailAddresses[0]?.emailAddress ?? "";
    if (!email.startsWith(PREFIX)) continue;
    await sql`delete from password_reset_tokens where clerk_user_id = ${u.id}`;
    await sql`delete from subscriptions where clerk_user_id = ${u.id}`.catch(() => {});
    await sql`delete from users where clerk_user_id = ${u.id}`;
    await clerk.users.deleteUser(u.id);
  }
  const inv = await clerk.invitations.getInvitationList({ status: "pending", query: PREFIX, limit: 100 });
  for (const i of inv.data) if (i.emailAddress.startsWith(PREFIX)) await clerk.invitations.revokeInvitation(i.id);
  sessions.clear();
}

// ─── HTTP helper ──────────────────────────────────────────────────────────
async function call(
  pathname: string,
  opts: { as?: string | null; method?: string; body?: unknown; headers?: Record<string, string> } = {},
) {
  const headers: Record<string, string> = { ...(opts.headers ?? {}) };
  if (opts.as) headers.authorization = `Bearer ${await tokenFor(opts.as)}`;
  if (opts.body !== undefined) headers["content-type"] = "application/json";
  const res = await fetch(BASE + pathname, {
    method: opts.method ?? "GET",
    headers,
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
    redirect: "manual",
  });
  const location = res.headers.get("location");
  let json: Record<string, unknown> | null = null;
  const text = await res.text();
  try {
    json = JSON.parse(text);
  } catch {}
  return { status: res.status, location: location ? new URL(location, BASE).pathname : null, json, text };
}
const where = (r: { status: number; location: string | null }) =>
  r.location ? `${r.status}→${r.location}` : String(r.status);

async function dbRole(clerkUserId: string) {
  const [row] = await sql`select id, role from users where clerk_user_id = ${clerkUserId}`;
  return row as { id: string; role: string } | undefined;
}

function latestEmail(to: string, since: number) {
  if (!fs.existsSync(OUTBOX)) return null;
  const files = fs.readdirSync(OUTBOX).filter((f) => Number(f.split("-")[0]) >= since).sort();
  for (const f of files.reverse()) {
    const mail = JSON.parse(fs.readFileSync(path.join(OUTBOX, f), "utf8"));
    if (mail.to === to) return mail as { to: string; subject: string; text: string; html: string };
  }
  return null;
}

// ─── Tests ────────────────────────────────────────────────────────────────
async function main() {
  // Warm up the app and the database (Neon suspends idle computes) before measuring anything.
  for (let i = 0; i < 3; i++) if (await rawSql`select 1`.then(() => true, () => false)) break;
  await fetch(`${BASE}/about`).catch(() => {});
  await cleanup();
  const started = Date.now();
  const auditStart = new Date();

  // Accounts. Patient = public sign-up (no metadata). Clinician = created as a
  // patient, then promoted by the admin. Admin = the seed script.
  const patient = await createTestUser("patient");
  const clinician = await createTestUser("clinician");
  const admin = await createTestUser("admin");

  record("sign-up", "new account with no role → provisioned as patient (/me)", "307→/patient", where(await call("/me", { as: patient.id })));
  record("sign-up", "users.role for the new account", "patient", (await dbRole(patient.id))?.role ?? "none");

  execFileSync(process.execPath, ["scripts/create_admin.mjs", EMAIL("admin")], { stdio: "pipe", env: process.env });
  record("admin", "seed script makes the first admin (/me)", "307→/admin", where(await call("/me", { as: admin.id })));

  await call("/me", { as: clinician.id }); // provisioned as patient first
  const clinicianRow = (await dbRole(clinician.id))!;
  const promote = await call(`/api/admin/users/${clinicianRow.id}/role`, { as: admin.id, method: "PATCH", body: { role: "clinician" } });
  record("admin", "admin promotes an account to clinician (API)", "200", String(promote.status));
  record("sign-in", "clinician lands on /clinician (/me)", "307→/clinician", where(await call("/me", { as: clinician.id })));

  // Finalize after sign-in ignores anything the browser sends.
  const fin = await call("/api/auth/finalize", { as: patient.id, method: "POST", body: { role: "admin", intent: "signup" } });
  record("forged role", "POST /api/auth/finalize {role:'admin'} as patient", "patient route", fin.json?.redirect === "/sign-up/starting-trial" || fin.json?.redirect === "/patient" ? "patient route" : JSON.stringify(fin.json));
  record("forged role", "users.role after forged finalize", "patient", (await dbRole(patient.id))?.role ?? "none");
  const finC = await call("/api/auth/finalize", { as: clinician.id, method: "POST", body: { role: "admin" } });
  record("sign-in", "finalize redirect for clinician", "/clinician", String(finC.json?.redirect));
  const finA = await call("/api/auth/finalize", { as: admin.id, method: "POST", body: { role: "patient" } });
  record("sign-in", "finalize redirect for admin", "/admin", String(finA.json?.redirect));

  // Client-writable metadata (unsafeMetadata) and un-invited publicMetadata are not trusted.
  const sneaky = await createTestUser("sneaky", { unsafeMetadata: { role: "admin" } });
  record("forged role", "sign-up with unsafeMetadata {role:'admin'}", "307→/patient", where(await call("/me", { as: sneaky.id })));
  const legacy = await createTestUser("legacy", { publicMetadata: { role: "clinician", clinicianVerified: false } });
  record("forged role", "old self-registered clinician metadata (no invitation)", "307→/patient", where(await call("/me", { as: legacy.id })));

  // Page access per role.
  for (const [who, id, home] of [["patient", patient.id, "/patient"], ["clinician", clinician.id, "/clinician"], ["admin", admin.id, "/admin"]] as const) {
    for (const page of ["/patient", "/dashboard", "/clinician", "/admin", "/admin/users", "/onboarding"]) {
      const r = await call(page, { as: id });
      const own = page.startsWith(home) || (who === "patient" && (page === "/dashboard" || page === "/onboarding"));
      const actual = r.status === 200 || (own && r.status === 307) ? "allowed" : r.location === home ? `→${home}` : where(r);
      record("pages", `${who} opens ${page}`, own ? "allowed" : `→${home}`, actual);
    }
  }
  for (const page of ["/", "/login", "/sign-in", "/sign-up", "/signup"]) {
    record("redirect", `signed-in admin visits ${page}`, "307→/admin", where(await call(page, { as: admin.id })));
  }
  record("redirect", "signed-in patient visits /", "307→/patient", where(await call("/", { as: patient.id })));
  record("redirect", "signed-in clinician visits /signup", "307→/clinician", where(await call("/signup", { as: clinician.id })));
  record("redirect", "signed-out visitor opens /signup", "307→/sign-up", where(await call("/signup")));
  const anon = await call("/admin");
  record("redirect", "signed-out visitor opens /admin", "blocked", anon.status === 200 ? "200 (open!)" : "blocked");
  record("forged role", "patient opens /admin?role=admin with cookie role=admin", "307→/patient",
    where(await call("/admin?role=admin", { as: patient.id, headers: { cookie: "role=admin; authIntent=%7B%22role%22%3A%22admin%22%7D" } })));

  // Admin APIs: 403 for other roles, 401 signed out.
  const patientRow = (await dbRole(patient.id))!;
  const [pp] = await sql`select id from patient_profiles where user_id = ${patientRow.id}`;
  const adminApis: [string, string, unknown?][] = [
    ["GET", "/api/admin/users"],
    ["PATCH", `/api/admin/users/${patientRow.id}/role`, { role: "admin" }],
    ["PATCH", `/api/admin/users/${patientRow.id}/status`, { status: "suspended" }],
    ["POST", "/api/admin/invitations", { email: EMAIL("x"), role: "clinician", locale: "en" }],
    ["PUT", "/api/admin/assignments", { patientProfileId: pp.id, clinicianUserId: clinicianRow.id }],
  ];
  for (const [method, url, body] of adminApis) {
    record("admin API", `clinician ${method} ${url.replace(/[0-9a-f-]{36}/g, ":id")}`, "403", String((await call(url, { as: clinician.id, method, body })).status));
    record("admin API", `patient ${method} ${url.replace(/[0-9a-f-]{36}/g, ":id")}`, "403", String((await call(url, { as: patient.id, method, body })).status));
  }
  record("admin API", "signed-out GET /api/admin/users", "401", String((await call("/api/admin/users")).status));
  record("roles", "users.role of patient after clinician tried to make them admin", "patient", (await dbRole(patient.id))?.role ?? "none");
  record("billing", "clinician POST /api/billing/start-trial", "403", String((await call("/api/billing/start-trial", { as: clinician.id, method: "POST", body: {} })).status));

  // Clinician record-level access.
  const cUrl = `/api/clinician/patients/${pp.id}`;
  record("clinician", "unassigned patient record", "403", String((await call(cUrl, { as: clinician.id })).status));
  record("clinician", "patient calls clinician API", "403", String((await call("/api/clinician/patients", { as: patient.id })).status));
  const assign = await call("/api/admin/assignments", { as: admin.id, method: "PUT", body: { patientProfileId: pp.id, clinicianUserId: clinicianRow.id } });
  record("admin", "admin assigns patient to clinician", "200", String(assign.status));
  record("clinician", "assigned patient record", "200", String((await call(cUrl, { as: clinician.id })).status));
  const note = await call(`${cUrl}/notes`, { as: clinician.id, method: "POST", body: { body: "Test note from role-tests." } });
  record("clinician", "add note to assigned patient", "201", String(note.status), note.status === 201 || note.status === 200);
  const stageRes = await call(`${cUrl}/stage`, { as: clinician.id, method: "POST", body: { stage: 2, reason: "role-tests" } });
  record("clinician", "change assigned patient's stage", "200", String(stageRes.status), stageRes.status === 200 || stageRes.status === 201);
  record("clinician", "clinician opens own patient page", "200", String((await call(`/clinician/patients/${pp.id}`, { as: clinician.id })).status));

  // Invitations.
  const inviteStart = Date.now();
  const inv = await call("/api/admin/invitations", { as: admin.id, method: "POST", body: { email: EMAIL("invited"), role: "clinician", locale: "de" } });
  record("invite", "admin invites a clinician", "2xx", inv.status >= 200 && inv.status < 300 ? "2xx" : String(inv.status));
  const invMail = latestEmail(EMAIL("invited"), inviteStart);
  record("invite", "invitation email sent in chosen language (de)", "German + link", invMail && /Einladung|eingeladen/i.test(invMail.subject + invMail.text) && /ticket|accept-invite/.test(invMail.text) ? "German + link" : invMail?.subject ?? "no email");
  const invitationId = String((inv.json as { invitationId?: string; value?: { invitationId?: string } } | null)?.invitationId ?? (inv.json as { value?: { invitationId?: string } } | null)?.value?.invitationId ?? "");
  if (invitationId) record("invite", "admin revokes the invitation", "200", String((await call(`/api/admin/invitations/${invitationId}`, { as: admin.id, method: "DELETE" })).status));

  // Last admin.
  const adminRow = (await dbRole(admin.id))!;
  const otherAdmins = await sql`select count(*)::int n from users where role in ('admin','superuser') and status <> 'suspended' and deleted_at is null and clerk_user_id <> ${admin.id}`;
  const selfDemote = await call(`/api/admin/users/${adminRow.id}/role`, { as: admin.id, method: "PATCH", body: { role: "patient" } });
  if (otherAdmins[0].n === 0) {
    record("last admin", "only admin removes own admin role", "409", String(selfDemote.status));
    record("last admin", "role after refused self-demotion", "admin", (await dbRole(admin.id))?.role ?? "none");
  } else {
    record("last admin", "(skipped — another real admin exists)", "-", "-", true);
  }

  // Audit log.
  const audit = await sql`select t.code, count(*)::int n from activity_log a join action_types t on t.id = a.action_type_id
                          where a.created_at >= ${auditStart.toISOString()} group by 1 order by 1`;
  const codes = Object.fromEntries(audit.map((r) => [r.code, r.n]));
  for (const code of ["role_changed", "patient_assigned", "clinician_note_added", "patient_stage_changed", "user_invited", "invitation_revoked"]) {
    record("audit", `activity_log has ${code}`, "≥1", (codes[code] ?? 0) >= 1 ? "≥1" : "0");
  }

  // ── Password reset, per role (library called directly; UI checked in the browser) ──
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pr = require("../src/lib/password-reset") as typeof import("../src/lib/password-reset");
  for (const [who, u] of [["patient", patient], ["clinician", clinician], ["admin", admin]] as const) {
    const t0 = Date.now();
    const ip = `198.51.100.${who.length}`;
    const liveSession = await clerk.sessions.createSession({ userId: u.id });
    await pr.requestPasswordReset(EMAIL(who), ip, "fr");
    const mail = latestEmail(EMAIL(who), t0);
    const token = mail?.text.match(/token=([A-Za-z0-9_-]+)/)?.[1];
    record(`reset ${who}`, "reset email sent (French)", "yes", mail && token && /mot de passe/i.test(mail.subject) ? "yes" : "no");
    if (!token) continue;
    record(`reset ${who}`, "page state for fresh link", "valid", await pr.checkResetToken(token));
    record(`reset ${who}`, "mismatched passwords", "mismatch", (await pr.completePasswordReset(token, "Str0ng!Pass", "Str0ng!Pasz") as { error?: string }).error ?? "ok");
    record(`reset ${who}`, "weak password", "weak", (await pr.completePasswordReset(token, "password", "password") as { error?: string }).error ?? "ok");
    record(`reset ${who}`, "link still valid after rejected attempts", "valid", await pr.checkResetToken(token));
    const newPassword = `N3w!${crypto.randomBytes(9).toString("base64url")}`;
    const ok = await pr.completePasswordReset(token, newPassword, newPassword);
    record(`reset ${who}`, "valid new password accepted", "ok", ok.ok ? "ok" : (ok as { error: string }).error);
    const verified = await clerk.users.verifyPassword({ userId: u.id, password: newPassword }).then(() => "yes", () => "no");
    record(`reset ${who}`, "Clerk accepts the new password", "yes", verified);
    const s = await clerk.sessions.getSession(liveSession.id);
    record(`reset ${who}`, "other sessions signed out", "not active", s.status === "active" ? "active" : "not active");
    sessions.delete(u.id);
    record(`reset ${who}`, "reusing the same link", "used", (await pr.completePasswordReset(token, newPassword, newPassword) as { error?: string }).error ?? "ok");
    const changed = latestEmail(EMAIL(who), t0);
    record(`reset ${who}`, "'password changed' email", "sent", changed && changed.subject !== mail!.subject ? "sent" : "missing");
  }

  // Expired link.
  const t1 = Date.now();
  await pr.requestPasswordReset(EMAIL("sneaky"), "198.51.100.50", "en");
  const expTok = latestEmail(EMAIL("sneaky"), t1)?.text.match(/token=([A-Za-z0-9_-]+)/)?.[1];
  if (expTok) {
    await sql`update password_reset_tokens set expires_at = now() - interval '1 minute' where clerk_user_id = ${sneaky.id} and used_at is null`;
    record("reset", "expired link: page state", "expired", await pr.checkResetToken(expTok));
    record("reset", "expired link: submit", "expired", (await pr.completePasswordReset(expTok, "Str0ng!Pass1", "Str0ng!Pass1") as { error?: string }).error ?? "ok");
    const page = await call(`/reset-password?token=${expTok}`);
    record("reset", "expired link: page shows request-new-link", "yes", page.status === 200 && page.text.includes("/forgot-password") ? "yes" : String(page.status));
  }
  record("reset", "garbage token: page state", "invalid", await pr.checkResetToken("not-a-real-token"));

  // Unknown email, rate limits, older links invalidated.
  const t2 = Date.now();
  await pr.requestPasswordReset(EMAIL("nobody"), "198.51.100.60", "en");
  record("reset", "unknown email: no email sent", "none", latestEmail(EMAIL("nobody"), t2) ? "sent" : "none");
  const [before] = await sql`select count(*)::int n from password_reset_tokens where clerk_user_id = ${legacy.id}`;
  for (let i = 0; i < 4; i++) await pr.requestPasswordReset(EMAIL("legacy"), `198.51.100.${70 + i}`, "en");
  const tokens = await sql`select used_at from password_reset_tokens where clerk_user_id = ${legacy.id} order by created_at`;
  record("reset", "4 requests for one email in an hour → links issued", "3", String(tokens.length - before.n));
  record("reset", "older links invalidated when a new one is issued", "1 unused", `${tokens.filter((t) => !t.used_at).length} unused`);
  for (let i = 0; i < 10; i++) await pr.requestPasswordReset(`palsya-test-ip${i}+clerk_test@example.com`, "198.51.100.99", "en");
  const t3 = Date.now();
  await pr.requestPasswordReset(EMAIL("clinician"), "198.51.100.99", "en");
  record("reset", "11th request from one IP in an hour", "not sent", latestEmail(EMAIL("clinician"), t3) ? "sent" : "not sent");

  // Forgot-password page never reveals whether an email exists (same page for everyone).
  const forgot = await call("/forgot-password");
  record("reset", "/forgot-password renders", "200", String(forgot.status));
}

main()
  .catch((e) => {
    console.error(e);
    results.push({ area: "harness", test: String(e?.message ?? e), expected: "-", actual: "crash", pass: false });
  })
  .finally(async () => {
    await cleanup().catch((e) => console.error("cleanup failed", e));
    fs.mkdirSync(OUTBOX, { recursive: true });
    fs.writeFileSync(path.join(OUTBOX, "role-test-results.json"), JSON.stringify(results, null, 2));
    const failed = results.filter((r) => !r.pass);
    console.log(`\n${results.length - failed.length}/${results.length} passed`);
    process.exit(failed.length ? 1 : 0);
  });
