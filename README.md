# Doctor Cards

Dedicated internal software for managing doctors' profiles and QR cards, preparing paper-card artwork, tracking distribution, and measuring QR scans with privacy-conscious retention.

## Product specifications

- [P0 Product Foundation](docs/P0-product-foundation.md) — confirmed product decisions and scope.
- [P1 Doctor Profile Specification](docs/P1-profile-specification.md) — public fields, validation, consent, and publication rules.
- [P1 Technical Specification](docs/P1-technical-specification.md) — architecture, data relationships, QR lifecycle, privacy, and vertical-slice criteria.
- [P1 Print Specification](docs/P1-print-specification.md) — fixed-size output and supplier-dependent settings.
- [P1 Implementation Status](docs/P1-implementation-status.md) — what currently runs and what is still required before real data/production.
- [Vercel Setup Checklist](docs/vercel-setup.md) — project settings, environment-variable names, and deployment blockers.

## Run the local prototype

```bash
npm install
npm run dev
```

Open `http://localhost:3000` and sign in with the local preview password `doctorcards-preview-only` (override with `ADMIN_PASSWORD`). The current P1 slice supports creating and editing a doctor/card, generating a random QR route, showing a public responsive profile, suspending cards, marking distribution, counting QR route requests, authenticated CSV export, and opening a 90 × 55 mm print proof that can be saved through the browser's print dialog.

Run `npm test` while the dev server is running for an integration smoke test.

**Important:** current storage is a local JSON development adapter under `.data/`; the login is a local preview guard, not production identity/authentication. Use fictional test records only. Do not deploy or enter real doctor data until PostgreSQL/Prisma persistence, production authentication/authorization, durable consent evidence, reliable scheduled analytics retention, complete profile fields (including social links/photo), and supplier-approved print output are implemented and reviewed.
