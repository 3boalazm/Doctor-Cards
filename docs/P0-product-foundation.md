# P0 — Product Foundation

**Product:** Doctor QR Card Management Tool
**Status:** P0 decisions captured; ready for stakeholder review before P1 implementation
**Audience:** Internal company administrators and card-operations staff

## 1. Product intent

Build a dedicated internal tool that lets the company manage doctors' digital profiles and QR cards, prepare standard paper-card artwork for print, track each card's lifecycle, and measure QR scans with a deliberately minimal retention policy.

The existing website draft is a **visual and interaction reference only**. This product is a separate application; it is not an extension of the existing marketing/site draft.

## 2. Confirmed decisions

| Topic | Decision |
|---|---|
| First audience | Doctors directly; operated by the company's administration |
| Profile editing | Company administration only in the first release; no doctor self-service portal |
| Organizations / brands | Single company scope for the first release; no multi-tenant support |
| Draft card | A personal sample card for the owner, visibly marked: “نسخة تجريبية — لو عاوز نسخة خاصة تواصل معانا” |
| Standard card size | 90 × 55 mm (interpreting 9 × 5.5 as centimetres) |
| Initial standard material | Paper |
| Limited edition | Handmade production; track it in the tool, but do not automate its physical manufacture in P0/MVP |
| Responsive behavior | Admin tool and public doctor profile are responsive; print artwork remains at a fixed physical size |
| Analytics | QR scan count only; no visitor identity or contact-action tracking in the initial release |
| Event retention | Delete detailed scan events after 60 days; retain monthly aggregate scan totals per card |

## 3. Users and permissions

### Administrator / operations staff

- Create and update doctor records and public profiles.
- Create cards, assign serial numbers, attach QR tokens, choose editions/templates, and manage lifecycle status.
- Preview profile and print artwork.
- Record printing and distribution details.
- Review scan aggregates.
- Suspend or revoke a card.

### Doctor / public visitor

- A doctor has a public profile, but no account or editing access in the first release.
- A visitor can open a public profile through a QR code. The profile displays only information explicitly entered and approved by the company.

## 4. P0 scope

P0 establishes product boundaries and decisions. It does not implement production features.

### In scope

- Capture confirmed requirements and operational rules.
- Define initial entities and lifecycle.
- Define the print and analytics constraints that implementation must respect.
- Identify unresolved implementation inputs for P1.

### Out of scope for P0

- Rebuilding the existing visual draft or marketing site.
- Doctor self-service, accounts, or profile activation by the doctor.
- Multi-company / multi-brand tenancy.
- Automated production of handmade limited-edition cards.
- Contact-click analytics, unique visitor identification, or patient tracking.
- A general-purpose drag-and-drop design editor.

## 5. Core workflows for the first release

### A. Create and publish a doctor profile

1. An administrator creates a doctor record.
2. The administrator enters the approved profile details and public contact links.
3. The administrator previews the responsive page and checks that each link is valid.
4. The administrator publishes the profile.

### B. Create and manage a card

1. An administrator creates a card for a doctor or creates the explicitly labelled sample card.
2. The tool assigns a unique serial and a non-guessable QR token.
3. The administrator selects the standard or limited edition and an approved template.
4. The card moves through its lifecycle; its QR destination can be changed administratively without changing the printed QR.
5. A suspended/revoked card must not continue to expose its profile.

### C. Prepare standard print artwork

1. Select a doctor/card and standard template.
2. Review front/back artwork at the actual 90 × 55 mm size.
3. Check QR readability, text overflow, Arabic layout, and print-safe margins.
4. Export a print-ready file after the print supplier's specifications have been confirmed and tested.

### D. Review scan analytics

1. A valid request to a card's QR route increments that card's scan count.
2. The system retains only the operationally necessary detailed event data for up to 60 days.
3. A scheduled job removes detailed events older than 60 days.
4. Monthly per-card totals remain available after event deletion.

A scan is a QR-route request, not proof that a person read the profile or contacted the doctor. The initial release does not attempt to identify visitors or reliably distinguish people from devices.

## 6. Initial data model

- **Doctor:** internal ID, name, specialty, optional photo, profile status, created/updated timestamps.
- **Profile:** doctor relation, locale/content fields, public contact links, publication state.
- **Card:** doctor relation (optional only for the sample/unassigned state), edition, serial, status, QR token, timestamps.
- **Template:** name, edition, version, fixed print dimensions, asset references.
- **Print job:** card/batch relation, template version, export file reference, status, timestamps.
- **Distribution record:** card, recipient/doctor, date, responsible staff member, notes.
- **Scan event:** card, timestamp, minimal technical fields only if needed for security/aggregation; automatically deleted at 60 days.
- **Monthly scan aggregate:** card, calendar month, count; retained after detailed event deletion.
- **Audit log:** administrator changes to sensitive records and lifecycle state.

The precise profile fields and whether every field should be bilingual are P1 schema decisions; collect only information required for the public profile.

## 7. Card lifecycle

Initial proposed states:

`Draft → Ready for print → Printed → Distributed → Active`

Additional terminal/administrative states:

`Suspended`, `Revoked`

A handmade limited-edition card uses the same tracking lifecycle, with a production note/status recorded manually. The card status must not be conflated with the doctor's profile publication status.

## 8. Print constraints

- Nominal finished size: **90 × 55 mm**.
- Paper is the initial standard material.
- Print PDFs must use physical dimensions, not responsive screen dimensions.
- Responsive behavior applies to the admin and public web pages, not the physical card.
- Bleed, safe area, color profile, duplex orientation, sheet imposition, and crop marks are **not yet approved**. Confirm these with the print supplier and validate using a physical proof before locking export settings.
- Keep QR artwork high contrast, quiet-zone clear, and large enough for reliable scanning after trimming and production.
- Arabic names and long text must be tested for line wrapping and overflow.

## 9. Analytics and privacy requirements

- Count QR scans only in the initial release.
- Do not record visitor identity, precise location, or contact-click events.
- Keep detailed scan events for no longer than 60 days, then delete automatically.
- Retain monthly aggregate counts per card after event deletion.
- Protect the cleanup job with monitoring and tests; a failed cleanup must alert administrators and must not silently extend retention.
- Document that scan counts represent QR-route requests and may include repeated requests or automated previews.

## 10. P0 acceptance checklist

- [x] Product is defined as a dedicated tool, separate from the existing website draft.
- [x] First-release users and profile-editing responsibility are defined.
- [x] Single-company scope is confirmed; multi-tenancy is excluded.
- [x] Draft-card message and use are recorded.
- [x] Card size and initial materials are recorded.
- [x] Handmade limited-edition production is explicitly out of automation scope.
- [x] Scan-only analytics and 60-day detailed-event retention are defined.
- [x] Monthly per-card aggregates are retained.
- [ ] Print supplier confirms bleed, color, duplex, and imposition specifications.
- [ ] Profile fields and publication/review rules are approved.

## 11. Inputs needed before print automation

1. Confirm 90 × 55 **mm** is the finished size.
2. Obtain the printer's bleed, safe-area, color, duplex, and imposition requirements.
3. Produce and physically scan a proof from the intended paper stock and printer.
4. Approve the exact Arabic draft-card wording and its placement.
5. Approve the profile fields, languages, and rules for displaying each contact method.

## 12. Recommended next phase: P1 — Prototype and technical foundation

1. Audit the existing draft assets and record which are reusable; do not couple the new tool to the old site's deployment.
2. Finalize the profile schema, card lifecycle, and admin roles.
3. Build a responsive admin shell and public profile route using representative sample data.
4. Implement the first vertical slice: create doctor → create card/serial/token → publish profile → resolve QR route.
5. Add database persistence, authentication, audit logging, and automated tests before using real doctor data.
6. Validate print requirements with the supplier before implementing final PDF export.

**P1 exit criterion:** An authorized administrator can create a doctor and card, publish a profile, and have that card's QR route display the correct public profile; changes to the profile do not require reprinting the QR.
