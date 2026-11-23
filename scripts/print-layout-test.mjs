import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { CARD_BLEED_MM, CARD_TRIM, QR_PRINT, SHEET_LAYOUTS, cropMarkGeometry, printQrUrl } from '../src/lib/print-spec.ts';
const css = await readFile(new URL('../src/app/print/print.css', import.meta.url), 'utf8');
const page = await readFile(new URL('../src/app/print/[token]/page.tsx', import.meta.url), 'utf8');

// Spec values (docs/P1-print-specification.md: finished card 90 × 55 mm).
assert.deepEqual(CARD_TRIM, { widthMm: 90, heightMm: 55 });
assert.equal(CARD_BLEED_MM, 3);
assert.equal(QR_PRINT.sizeMm, 34);
assert.equal(QR_PRINT.quietZoneModules, 4);
assert.equal(QR_PRINT.errorCorrectionLevel, 'Q');
assert.deepEqual(SHEET_LAYOUTS.A4, { cardsPerSheet: 8, columns: 2, rows: 4 });
assert.deepEqual(SHEET_LAYOUTS.A5, { cardsPerSheet: 3, columns: 1, rows: 3 });
assert.equal(printQrUrl('https://cards.test/', 'x'), 'https://cards.test/c/x');

// The stylesheet repeats the sizes (CSS can't import TS) — it must agree with the constants.
const w = CARD_TRIM.widthMm, h = CARD_TRIM.heightMm, b = CARD_BLEED_MM, W = w + 2 * b, H = h + 2 * b;
assert.ok(css.includes(`@page bleedCard{size:${W}mm ${H}mm`), `bleed page must be ${W} × ${H} mm`);
assert.ok(css.includes(`@page trimCard{size:${w}mm ${h}mm`), `trim page must be ${w} × ${h} mm`);
assert.ok(css.includes(`--trim-w:${w}mm;--trim-h:${h}mm`), 'card trim variables must match the spec');
assert.ok(css.includes(`grid-template-columns:repeat(2,${W}mm)`) && css.includes(`grid-template-columns:repeat(2,${w}mm)`), 'A4 grid columns must match card size');
assert.ok(!/\b(85|91)mm\b/.test(css), 'no leftover 85/91 mm sizes from the old trim');

// A4 8-up must physically fit inside the sheet's padding box.
const a4 = css.match(/\.sheet-page\{[^}]*padding:(\d+(?:\.\d+)?)mm (\d+(?:\.\d+)?)mm[^}]*gap:(\d+(?:\.\d+)?)mm/);
assert.ok(a4, 'A4 sheet padding/gap must be declared in mm');
const [, padY, padX, gap] = a4.map(Number);
assert.ok(2 * W + gap <= 210 - 2 * padX, `A4 with bleed overflows: ${2 * W + gap}mm > ${210 - 2 * padX}mm`);
assert.ok(4 * H + 3 * gap <= 297 - 2 * padY, 'A4 rows overflow vertically');

// Crop marks follow the trim (marks at the trim lines, inside the bleed band).
const marks = cropMarkGeometry(true);
assert.equal(marks.viewBox, `0 0 ${W} ${H}`);
assert.ok(marks.path.includes(`M${b + w} 0V${b - 1}`) && marks.path.includes(`M${b + w + 1} ${b}H${W}`), 'right-hand crop marks must sit on the 90 mm trim line');
assert.equal(cropMarkGeometry(false).viewBox, `0 0 ${w} ${h}`);

// The trim box must stay absolutely positioned on both faces, or it drifts off the crop marks in RTL.
for (const face of ['card-front', 'card-back']) assert.ok(!new RegExp(`\\.${face}\\{[^}]*position:`).test(css), `.${face} must not override .card-trim positioning`);

// Front artwork may enter the bleed but never pass it (would print onto neighbouring cards).
assert.match(css, /\.card-front\{[^}]*clip-path:polygon\(calc\(-1 \* var\(--bleed\)\)/, 'front face must be clipped to its bleed box');

// Brand + QR safety.
for (const marker of ['@page sheetA4', '@page sheetA5', '#0b1622', '#1fb6d9', '34mm']) assert.ok(css.includes(marker), `print stylesheet missing ${marker}`);
assert.match(css, /\.back-qr-frame\{[^}]*background:#ffffff/, 'QR frame must stay solid white so the quiet zone is preserved');
assert.ok(page.includes("color: { dark: '#0b1622', light: '#ffffff' }"), 'QR must render dark-on-white for scan contrast');
assert.ok(page.includes("errorCorrectionLevel: QR_PRINT.errorCorrectionLevel"));
assert.ok(!page.includes('<style jsx'), 'print styles must live in the dedicated CSS stylesheet');
console.log('Print layout tests passed');
