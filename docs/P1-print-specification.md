# P1.3 — Print Specification

**Status:** Internal baseline; supplier-dependent values remain open
**Scope:** Standard paper cards and the manually produced Limited Edition.

## 1. Confirmed physical requirements

- Finished card size: **90 × 55 mm**.
- Standard edition: paper stock.
- Limited Edition: handmade, with manual finishing/production.
- The print layout is fixed-size physical artwork, independent of responsive web layouts.
- QR token must resolve to the correct card and remain valid after profile edits.

## 2. Print template contract

Each approved template must define and version:

- Edition and template version.
- Finished trim width/height in millimetres.
- Front and back artwork.
- Safe area and content placement rules.
- QR position, dimensions, contrast, quiet zone, and minimum test size.
- Arabic/English text styles and overflow behavior.
- Optional serial placement and demo-card disclaimer where applicable.
- Export format and embedded/outlined font policy.

Print jobs must retain the template version and generated-file reference used at export. Updating the template must not silently alter previously generated jobs.

## 3. Draft card

The draft card is a demonstrator based on the owner's personal card and must be visibly labelled:

**«نسخة تجريبية — لو عاوز نسخة خاصة تواصل معانا»**

It is a separate template/configuration from a doctor's production card. Do not publish the owner's personal details or photo in the public profile without explicit consent.

## 4. QR and production checks

Before releasing any file:

- Confirm the encoded URL belongs to the correct card and production domain.
- Scan the QR from the exported PDF and from a physical proof.
- Test with multiple phones and ordinary print/lighting conditions.
- Ensure the QR quiet zone is clear of trim, folds, textures, foil, and decorative elements.
- Confirm the QR still works after trimming and any handmade finishing.
- Check serial/QR correspondence against the print-job record.

## 5. Supplier-dependent values — do not guess

The following remain configurable and must be confirmed with the selected print supplier before print-ready export is locked:

- Bleed amount and safe-area margin.
- Color profile, ink coverage, and whether PDF should be CMYK or supplier-converted.
- Duplex flip edge and front/back alignment tolerance.
- Sheet imposition, number-up layout, crop marks, and page orientation.
- Paper weight/finish and acceptable QR contrast/texture.
- Font embedding versus outlining requirements.
- File standard/PDF version and maximum file size.

Create a physical proof using the intended paper and production path. Verify size, trim, alignment, legibility, and QR scanning before bulk printing.

## 6. PDF generation acceptance criteria

Once supplier settings are confirmed, an exported file must:

- Measure exactly 90 × 55 mm at finished trim size.
- Include only the supplier-approved bleed, marks, color handling, and duplex setup.
- Render Arabic correctly, with no clipped text, missing glyphs, or unexpected direction changes.
- Preserve QR contrast and quiet zone.
- Match the on-screen proof and versioned template.
- Be reproducible for a single card and, later, for a batch without mismatching serials and QR codes.

## 7. Limited Edition operating path

The tool records the edition, card serial, assigned doctor, artwork/template version, and manual production/distribution status. It may provide a digital design reference or print file if the handcraft process requires one, but it does not claim to automate handmade finishing in the MVP.
