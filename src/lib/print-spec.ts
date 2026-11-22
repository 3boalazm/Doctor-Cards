export const CARD_TRIM = { widthMm: 85, heightMm: 55 } as const;
export const CARD_BLEED_MM = 3;
export const QR_PRINT = { sizeMm: 34, quietZoneModules: 4, errorCorrectionLevel: 'Q', renderMarginModules: 4 } as const;
export const SHEET_LAYOUTS = { A4: { cardsPerSheet: 8, columns: 2, rows: 4 }, A5: { cardsPerSheet: 3, columns: 1, rows: 3 } } as const;

export function printQrUrl(origin: string, token: string) {
  return `${origin.replace(/\/$/, '')}/c/${token}`;
}
