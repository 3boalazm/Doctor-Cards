// Finished size per docs/P1-print-specification.md. print.css repeats these in @page/grid rules
// (CSS can't import TS); scripts/print-layout-test.mjs fails if the two drift apart.
export const CARD_TRIM = { widthMm: 90, heightMm: 55 } as const;
export const CARD_BLEED_MM = 3;
export const QR_PRINT = { sizeMm: 34, quietZoneModules: 4, errorCorrectionLevel: 'Q', renderMarginModules: 4 } as const;
export const SHEET_LAYOUTS = { A4: { cardsPerSheet: 8, columns: 2, rows: 4 }, A5: { cardsPerSheet: 3, columns: 1, rows: 3 } } as const;

/** Corner crop marks in millimetre units, derived from the spec so they always sit on the trim line. */
export function cropMarkGeometry(bleed: boolean) {
  const { widthMm: w, heightMm: h } = CARD_TRIM;
  if (!bleed) return { viewBox: `0 0 ${w} ${h}`, path: `M-2 0H0 M0 -2V0 M${w} 0H${w + 2} M${w} -2V0 M-2 ${h}H0 M0 ${h}V${h + 2} M${w} ${h}H${w + 2} M${w} ${h}V${h + 2}` };
  const b = CARD_BLEED_MM, W = w + 2 * b, H = h + 2 * b, left = b, right = b + w, top = b, bottom = b + h;
  // Marks stay inside the bleed band, 1 mm clear of the trim, so they are cut away with it.
  return { viewBox: `0 0 ${W} ${H}`, path: `M0 ${top}H${left - 1} M${left} 0V${top - 1} M${right + 1} ${top}H${W} M${right} 0V${top - 1} M0 ${bottom}H${left - 1} M${left} ${bottom + 1}V${H} M${right + 1} ${bottom}H${W} M${right} ${bottom + 1}V${H}` };
}

export function printQrUrl(origin: string, token: string) {
  return `${origin.replace(/\/$/, '')}/c/${token}`;
}
