@AGENTS.md

# Palsya web

Next.js 16 (App Router, Turbopack) app for a patient programme: patients sign up, start a trial, do an
onboarding assessment that places them in a phase, then run daily sessions. Clinicians follow their assigned
patients, and admins manage users. The UI is translated into 7 languages.

Read `AGENTS.md` first. This Next.js version has breaking changes, so check `node_modules/next/dist/docs/`
before using a Next API. For example, middleware lives in `proxy.ts`, not `middleware.ts`.

## Stack

- **Next.js 16.3 / React 19.2**, TypeScript strict
- **Clerk** (`@clerk/nextjs`, `@clerk/elements`): authentication only. Roles are not stored in Clerk.
- **Neon Postgres + Drizzle ORM v1 (rc)** with `drizzle-orm/neon-http`. Relations use `defineRelations` (v1 API).
- **Stripe** for trials, subscriptions and payment methods
- **next-intl** for i18n (cookie-based locale, nothing in the URL)
- **Tailwind v4** + **shadcn/ui** (new-york, in `components/ui`) + lucide icons
- **react-hook-form + zod** for forms, **nodemailer** for email

## Commands

```bash
npm run dev            # dev server, http://localhost:3000
npm run build          # production build (also type-checks)
npm run lint           # eslint
npx drizzle-kit generate   # new migration from src/db/schema → drizzle/
npx drizzle-kit migrate    # apply migrations to DATABASE_URL
```

Scripts in `scripts/` (run with `node` or `npx tsx`):

- `create_admin.mjs`: make the first admin account
- `seed_content_library.mjs`, `seed_test_user.mjs`: seed data
- `role-tests.ts`: end-to-end role/permission/password-reset tests against a running build. Only runs with
  a Clerk `sk_test_` key. See the header comment for how to start it.
- `i18n-*.mjs`: translation checks (see Translations below)

## Setup

Copy `.env.example` to `.env` and fill it in. Each variable has a comment explaining it.
**Never commit `.env`** (it is gitignored). In development, leave `SMTP_HOST` empty and emails are printed
to the server console.

## Layout

- `app/`: routes, pages, server actions (`actions.ts` next to their page) and API routes (`app/api/`)
  - Public: `/`, `about`, `how-it-works`, `guides`, `stories`, `pricing`
  - Auth: `login`, `sign-in`, `sign-up`, `forgot-password`, `reset-password`, `accept-invite`, `auth/continue`
  - Patient: `patient`, `onboarding/*`, `dashboard/*` (sessions, progress)
  - Staff: `clinician/*`, `admin/*` (users, invite, audit)
  - `app/components/`: shared app components. `app/lib/`: plans/content (`content.ts`) and the programme definition.
- `components/ui/`: shadcn primitives. Add more with the shadcn CLI and don't hand-edit them heavily.
- `src/db/`: Drizzle client (`index.ts`), `relations.ts`, and tables in `schema/` (exported from `schema/index.ts`)
- `src/lib/`: server logic: `authz.ts`, `permissions.ts`, `audit.ts`, `assessment.ts`, `clinician.ts`,
  `user-admin.ts`, `password-reset.ts`, `patient-identity.ts`
- `lib/`: `billing/` (Stripe trial and subscription) and `email/` (mailer and templates)
- `i18n/`: next-intl config. `locales/<locale>/<namespace>.json`: messages.
- `drizzle/`: generated migrations. Never edit an applied migration. Add a new one instead.

The git repo root is one folder above this app and also holds an unrelated legacy prototype. Work in this folder.

## Auth and roles (security-critical)

- Roles are `patient`, `clinician` and `admin`. The DB enum also has a legacy `superuser`, which is treated as `admin`.
- **The role always comes from `users.role` in Postgres.** Never trust a role from the browser (form fields,
  query strings, storage or Clerk metadata the client could set).
  - Public sign-up → `patient`. An accepted admin invitation → the invited role (only trusted when
    `invitedVia: "invitation"`). Admins can change roles afterwards.
- **All permissions are defined in `src/lib/permissions.ts`.** Check them with `can(role, permission)`
  and never compare role strings directly. To change what a role can do, edit that file only.
- Enforce permissions on the server in `src/lib/authz.ts`:
  - Pages and layouts: `requirePagePermission(...)` (redirects)
  - API routes: `authorizeApi(...)` (returns a 401/403 JSON response)
  - Server actions: `authorizeAction(...)`
  - Per-patient records: `assertCanAccessPatient(actor, id)`. Clinicians only see assigned patients.
    Answer with 404 so you don't reveal whether the patient exists.
- `proxy.ts` only checks that the user is signed in on protected pages. API routes are deliberately not
  covered there, so **every new API route must call `authorizeApi` itself**.
- Suspended or soft-deleted users (`actor.blocked`) get no access.
- Log sensitive actions with `logAction(...)` from `src/lib/audit.ts`. Each new action code needs a
  migration that seeds it into `action_types`.
- Clerk and Stripe webhooks are in `app/api/webhooks/` and must verify their signing secrets.

## Translations

The languages are `en` (source of truth), `pt`, `nl`, `es`, `fr`, `de` and `af`. Details are in `README.md`.

- Never hard-code user-facing text, dates or currency. Use `t()`, `useFormatter()` or `money(n, locale)`.
  For page metadata, use `pageMetadata("<ns>.meta")`.
- When you add a string, add the key to `locales/en/<ns>.json` **and** to every other locale.
- Strings that aren't UI copy (for example, stored DB values) get a `// i18n-ignore -- reason` comment.
- Run these before finishing: `node scripts/i18n-check.mjs`, `node scripts/i18n-keys-used.mjs` and `node scripts/i18n-scan.mjs`.

## Conventions

- Server-only modules start with `import "server-only"`.
- Code in `app/` imports from `src/` with relative paths (for example `../../src/lib/authz`). The `@/*` alias points to the project root.
- Validate input with zod, on the server as well as in forms.
- Before calling a change done, run `npm run lint` and `npm run build`. For auth or role changes, also run `scripts/role-tests.ts`.
