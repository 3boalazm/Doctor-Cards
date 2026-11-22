# Vercel Setup Checklist

This repository is prepared for a Vercel **Next.js build**, but it is not yet production-deployable. No Vercel project is linked in this repository/account for Doctor Cards, and the current application stores records in a local JSON file. Vercel Functions have ephemeral filesystems, so doctor/card records must not be stored there.

## 1. Create the Vercel project

When creating the project, import this Git repository and use:

- Framework preset: **Next.js** (auto-detected; also set in `vercel.json`).
- Root directory: repository root.
- Install command: `npm ci`.
- Build command: `npm run build`.
- Output directory: leave the Vercel default.
- Node.js runtime: use a currently supported LTS version compatible with the Vercel Next.js runtime.

The Vercel project must be created from the branch containing this application. Do not connect this app to another existing project.

## 2. Environment-variable contract

Copy the names from `.env.example`; never commit real values or place them in source code.

| Variable | Vercel targets | Purpose | Status |
|---|---|---|---|
| `ADMIN_PASSWORD` | Development, Preview, Production | Local/admin password configuration | Required for the current preview guard; replace with a proper identity provider before real production use |
| `AUTH_SECRET` | Development, Preview, Production | Signs admin session cookies | Required; use a different random secret for each environment |
| `DATABASE_URL` | Development, Preview, Production | Pooled PostgreSQL connection for runtime | Required before Vercel data APIs can be enabled; not currently consumed by the JSON prototype |
| `DIRECT_URL` | Development, Preview, Production or CI migration scope | Direct PostgreSQL connection for schema migrations | Future Prisma migration input; not currently consumed |

Generate secrets outside Git, for example:

```bash
openssl rand -hex 32
openssl rand -base64 32
```

Use the first output for `AUTH_SECRET` and a separate long random output for `ADMIN_PASSWORD`. Do not reuse local, Preview, and Production secrets. Enter secrets directly in Vercel's Environment Variables UI as encrypted/sensitive values; do not send or commit them.

Use the PostgreSQL provider's **pooled** URL for `DATABASE_URL` and its **direct** URL for `DIRECT_URL`. Do not fabricate a URL. Ensure SSL is enabled as required by the provider. The current code has no PostgreSQL/Prisma adapter yet, so adding these variables alone does not create persistent storage.

## 3. Set values separately by environment

- **Development:** local-only test credentials and a non-production database, if provisioned.
- **Preview:** isolated preview credentials and preferably a separate preview database/schema. Do not point preview deployments at production records.
- **Production:** production secrets and the production PostgreSQL URL only after persistence and authentication are implemented and verified.

Do not manually set `NODE_ENV` or `VERCEL_URL`; Vercel manages these. QR links currently use the request origin; production QR URLs must be verified against the final project domain before printing.

## 4. Current deployment guard / blockers

The current implementation deliberately returns `503` from its APIs when `NODE_ENV=production`, and its data store is `.data/store.json`. This is intentional fail-closed behavior: deploying it as-is will **not** provide a working hosted admin or persistent profiles.

Before enabling Vercel Preview/Production APIs:

1. Implement and test PostgreSQL + Prisma persistence and migrations.
2. Replace the demo login with production-grade authentication and role checks; remove the default preview password.
3. Add consent records, upload storage, audit logs, and protected admin operations.
4. Move scan-retention cleanup to a reliable scheduled job and test 60-day deletion/monthly rollups.
5. Verify the app's public base URL and scan/QR behavior on the final Vercel domain.
6. Confirm printer bleed/color/duplex specifications and test a physical proof before producing cards.

**Do not enter real doctor data or print production QR cards from the sandbox preview URL.**


## Update: production login + Postgres (branch `fix/production-login-and-postgres`)

- The blanket `503` on `NODE_ENV=production` is removed. Login is fail-closed instead: if `ADMIN_PASSWORD` (12+ chars) or `AUTH_SECRET` (32+ chars) is missing, `/api/auth` returns 503 with a clear message; the default preview password only works outside production and is no longer shown on the login page.
- Sessions are HMAC-signed (verified on every request, `Secure` cookie in production), password comparison is constant-time, and 5 failed attempts per IP lock for 10 minutes (best-effort per instance).
- Storage: when `POSTGRES_URL` or `DATABASE_URL` exists (Vercel Postgres already provisioned), cards/scans/monthly totals live in Postgres (tables auto-created, serial via sequence). Without it, local dev keeps using `.data/store.json`.
- Tests: `npm test` (HTTP smoke, needs dev server) and `node scripts/pg-store-test.mjs` (store logic on PGlite).
- Still open: consent evidence/audit log, photo upload, scheduled purge job, multi-user roles.
