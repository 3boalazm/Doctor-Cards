# P1.1 — Doctor Profile Specification

**Status:** Proposed for implementation
**Audience:** Administration and product/engineering
**Scope:** Public doctor profile managed by company staff; no doctor accounts in the MVP.

## 1. Profile rules

- Every public profile belongs to one doctor and is edited by an authorized company administrator.
- A profile is not public until it is explicitly published and publication consent is recorded.
- All fields except the doctor's Arabic name are optional.
- Optional fields are shown only when populated and approved for publication; empty sections are omitted.
- Profile pages are responsive and support right-to-left Arabic layout. English name is optional; full bilingual page content is not required for the MVP.
- Profile changes do not change the card's QR URL.
- No patient information is collected or displayed by this system.

## 2. Public fields

| Field | Required | Public when populated? | Validation / rendering |
|---|---:|---:|---|
| Doctor name in Arabic | Yes | Yes | Trimmed; reject blank value; handle long names without clipping |
| Doctor name in English | No | Yes | Optional plain text |
| Specialty | No | Yes | Plain text; omit if empty |
| Profile photo | No | Yes | Approved image only; crop/size limits set in implementation; never publish before consent |
| Phone | No | Yes | Validate as a telephone value; render as a `tel:` action |
| WhatsApp | No | Yes | Validate/normalize phone number; render a WhatsApp link only when valid |
| Email | No | Yes | Validate email; render as a `mailto:` action |
| Clinic address | No | Yes | Plain text; omit if empty |
| Google Maps URL | No | Yes | HTTPS URL from an allowed maps host; show map action only when valid |
| Website | No | Yes | HTTPS URL; reject unsafe schemes |
| Social links | No | Yes | Zero or more typed links; HTTPS only; validate supported host/URL |
| Short biography | No | Yes | Plain text, length-limited; no raw HTML |

### Contact display behavior

- A contact action is rendered only if its value is present and passes validation.
- No tracking is attached to contact actions in the MVP.
- Do not infer, expose, or scrape contact information from other sources.

## 3. Internal-only fields

These fields must never be included in the public profile response:

- Doctor internal ID.
- Card serial and card lifecycle status.
- QR token or token hash.
- Edition and template identifiers.
- Print status and print-job metadata.
- Distribution status, staff notes, and recipient-operational details.
- Created/updated timestamps where not explicitly needed publicly.
- Consent evidence and administrator audit information.

## 4. Consent and publication gate

Before publishing a profile, an administrator must confirm that the doctor has authorized the company to publish the selected personal details and, separately, the profile photo if supplied.

Store a consent record with:

- Consent state and scope (profile data and photo treated as separate scopes).
- Recorded timestamp.
- Recording administrator.
- Evidence/reference or source note, without storing unnecessary sensitive material.
- Consent text/version shown at the time, if applicable.
- Revocation timestamp/reason when consent is withdrawn.

Publishing is blocked if required consent is absent or revoked. Revocation must allow the profile to be unpublished promptly, while retaining only the minimum internal audit record required by company policy. Obtain internal legal/privacy approval for the exact wording and retention policy before production; this specification does not replace that review.

## 5. Profile states

`Draft → Published → Unpublished`

- **Draft:** Admin-only preview; not available from a public card route.
- **Published:** Publicly visible through an active card route, provided consent remains valid.
- **Unpublished:** Public content is hidden; QR route shows a neutral unavailable page.

Card lifecycle and profile publication state are independent. Suspending/revoking a card must not silently delete the doctor profile; publishing or unpublishing a profile must not rewrite card serials or tokens.

## 6. Acceptance criteria

- Arabic name is required; all other listed profile fields can be omitted.
- Missing or invalid optional fields do not break the page and are not rendered.
- Arabic layout is RTL and responsive; long names and missing photos have a sensible fallback.
- Unsafe URL schemes and malformed links are rejected.
- Admin preview is distinct from public publication.
- Publication requires current consent for all supplied public personal data and the photo when present.
- Internal IDs, token data, print/distribution metadata, and consent evidence are never exposed in public responses.
- Public profile changes leave the QR URL unchanged.
