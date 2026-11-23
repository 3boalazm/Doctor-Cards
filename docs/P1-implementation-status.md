# P1 Implementation Status

**Current milestone:** P1 feature slice A–E implemented on the current branch
**Production readiness:** Not yet approved for production card issuance. The local UI and Postgres store are implemented, but several operational/security validations remain.

## Delivered in this branch

### A. Print proof and imposition

- `/print/{token}` now uses the dedicated real stylesheet `src/app/print/print.css`; no styled-jsx global print rules.
- Finished trim: **90 × 55 mm** (per the print specification), with a toggle for 3 mm bleed (96 × 61 mm artboard) and crop marks.
- Front: navy `#0B1622` with a cyan glow and the stethoscope line-art engraving, white Arabic/English name, specialty chip, and a portrait panel that fades into the background and extends into bleed when bleed is enabled.
- Back: light `#F4F8FB`, 34 mm QR symbol (dark `#0B1622` on white) including a 4-module quiet zone inside a solid white frame, QR error correction level Q, destination URL, serial, and “امسح للتواصل / SCAN TO CONNECT”.
- A4 8-up with bleed is 2 × 96 mm + 3 mm gap = 195 mm wide, leaving 7.5 mm side margins on the 210 mm sheet.
- Repeated-card A4 8-up and A5 3-up imposition, with matching front/back sheets for duplex printing.
- **Caveat:** duplex alignment, bleed tolerance, color profile, and crop marks have not been validated against a selected printer/physical proof. The sheet repeats the same selected card; it is not a mixed-card batch imposition engine.

### B. Public doctor profile

- Responsive profile page with saved AR/EN preference, consented portrait, share, call, WhatsApp, email, maps, and website actions.
- Save Contact downloads a vCard 3.0 with CRLF line endings and line folding.
- Dynamic Open Graph metadata; public doctor profiles are `noindex`.
- Loading and unavailable states are explicit; layout is mobile-first at a 460 px maximum breakpoint.

### C. Portrait upload

- Admin upload resizes and encodes portraits as JPEG, max edge 512 px and max payload 150 KB.
- Upload and public rendering require photo consent; revoking the checkbox removes the saved portrait from publication.
- PostgreSQL stores the data URI in `portrait_data`; schema initialization includes migration-safe `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` for existing installs.
- JSON development storage normalizes older records to `portraitData: null`.

### D. Unclaimed cards

- Admin can bulk-generate 1–250 blank Standard cards with unique serials and unguessable QR tokens.
- Blank card status is `UNCLAIMED`; the print proof renders a generic claim card.
- The QR opens a claim form; submitting profile details and explicit publish consent claims the card once and transitions it to `ACTIVE`. `SUSPENDED` remains supported.
- **Security caveat:** possession of the printed QR URL is the claim capability; there is no separate one-time activation code yet. Avoid distribution before the intended recipient receives the physical card.

### E. Admin operations

- Search plus filters for card status and edition.
- Per-card monthly scan totals, copy-link, PNG/SVG QR download, print-proof link, status controls, distribution marking, and visible sign-out on desktop and mobile.
- Empty states and success/error toast feedback; root page remains RTL.

### F. Tests and validation

- `npm run lint` — TypeScript check.
- `npm run build` — Next production build.
- `npm test` — starts a temporary local Next server and runs smoke, print-layout, profile, portrait-validation, and admin RTL/operations tests.
- `node scripts/pg-store-test.mjs` — PGlite-backed Postgres-store tests, including legacy schema portrait migration, bulk generation, and claim-once behavior.

## Current architecture and limitations

- Admin identity continues to use the existing production login (`ADMIN_PASSWORD` and `AUTH_SECRET`); this branch did not change `src/lib/auth.ts` or the login flow.
- Persistence is PostgreSQL through the `pg` package when `POSTGRES_URL` or `DATABASE_URL` exists; otherwise local development uses `.data/store.json`. The Postgres adapter uses parameterized SQL and idempotent runtime schema initialization, **not Prisma migrations**.
- Portrait data is stored inline in a PostgreSQL text field. This meets the initial small-image requirement but can make doctor-list responses large as the card count grows; object storage and image delivery optimization remain future work.
- The admin consent checkbox and claim confirmation are not a full durable consent-evidence/audit workflow. Add consent version, actor/source, timestamps, revocation handling, and audit records before production policy reliance.
- Scan events are detailed for up to 60 days and monthly per-card totals are retained. The local timer is process-bound; production must run reliable scheduled retention/monitoring rather than depending on a continuously running application process.
- Claim form is public and currently accepts the QR token as the possession proof; no activation PIN, doctor verification, or moderation queue is implemented.
- Arabic/English toggle changes the public interface labels and doctor-name display. Specialty, biography, address, and other content are single-language inputs for now.
- Print sheets repeat one card per position; mixed-serial batch imposition and a printer-calibrated proof are not implemented.
- No multi-role admin system, bulk CSV import, feedback workflow, social-link fields, or advanced reports are implemented.
- Vercel deployment still needs actual project configuration and separate Preview/Production Postgres credentials; do not point Preview to production data. Do not print production cards from a temporary preview hostname.

## Required before production card issuance

1. Provision and test durable Postgres for Preview and Production separately; verify backups, restore, connection pooling, schema initialization privileges, and serial uniqueness under concurrent writes.
2. Validate the public claim policy and preferably add a separate activation code / recipient verification before blank-card distribution.
3. Approve durable consent evidence and a documented photo/profile revocation process.
4. Move retention to a monitored scheduled job and verify event deletion after 60 days while keeping monthly aggregates.
5. Confirm card trim, bleed, paper, duplex flip/alignment, color, imposition, QR readability, and crop marks with the selected printer using physical proofs.
6. Test public QR and vCard on real mobile devices and verify the final domain remains stable before any QR is printed.
7. Review security, privacy, and operational policies with the responsible company stakeholders.
