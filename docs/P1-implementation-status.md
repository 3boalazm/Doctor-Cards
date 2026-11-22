# P1 Implementation Status

**Current milestone:** First vertical-slice prototype
**Environment:** Local development only; not approved for real doctor data or production deployment.

## Implemented

- Next.js + TypeScript application shell with Arabic RTL administration UI.
- Local admin login with an HttpOnly, SameSite session cookie; admin API routes require a valid session (preview password is development-only).
- Doctor/card creation and profile editing with required Arabic name and profile-publication consent gate; edits preserve the QR token and edition/serial pairing.
- Server-generated opaque QR token and edition-prefixed serial.
- Public `/c/{token}` profile route, responsive rendering, and safe limited public payload.
- Scan counter aggregated by card and UTC calendar month; expired detailed in-prototype events are pruned on scan writes and a daily timer while the local Node development process is running.
- QR preview and print-proof route at `/print/{token}`.
- Print proof lays out front/back artwork at 90 × 55 mm and uses browser print/save-to-PDF. It is explicitly a proof, not a supplier-approved production PDF.
- Fictional demo profile for previewing the flow.
- Card suspension/reactivation, manual distribution-state tracking, and authenticated CSV export.
- Integration smoke test for login, access control, consent validation, card creation, QR privacy, suspension, and distribution.

## Deliberate prototype limitations

- Persistence is a local JSON file in `.data/`; it is not PostgreSQL, is not multi-instance safe, and may not persist on serverless hosts.
- No authentication or authorization is installed. All admin API operations must be treated as development-only.
- No photo upload or social-link editor yet.
- Consent is a required admin checkbox but does not yet capture a durable consent record/evidence, text version, or revocation workflow.
- Detailed event retention currently runs when a scan is recorded, not through a monitored scheduled job; monthly totals are updated on every scan.
- Serial allocation is suitable only for a single-process demo and needs a database uniqueness constraint and transaction before real use.
- No final CMYK/bleed/duplex/imposition configuration until confirmed by the print supplier and proven physically.
- Limited Edition can be tagged but its handcraft production workflow is not automated.

## Work required before production

1. Replace JSON storage with PostgreSQL + Prisma schema, migrations, transactions, and unique constraints.
2. Add admin authentication, server-side role checks, rate limits, CSRF-safe mutations, and audit logging.
3. Replace consent checkbox-only behavior with explicit consent records, scope (profile/photo), source/version/timestamps, revocation, and publish/unpublish enforcement.
4. Add a robust 60-day scheduled event purge with monitoring, retries, and tests; retain per-card monthly aggregates.
5. Add photo handling and structured, validated social links as specified.
6. Implement card suspension/revocation and editable profile lifecycle in the admin UI.
7. Agree with the print supplier on bleed, safe area, color, duplex, imposition, fonts, and PDF requirements; validate a physical proof before labeling any export print-ready.
8. Add automated tests for API validation, public-data privacy, QR flow, retention, access control, and print dimensions.
