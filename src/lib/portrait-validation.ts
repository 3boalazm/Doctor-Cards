export const MAX_PORTRAIT_BYTES = 150 * 1024;
const JPEG_DATA_URI = /^data:image\/jpeg;base64,([A-Za-z0-9+/]+={0,2})$/;

export function validatePortraitData(value: unknown): { ok: true; data: string | null } | { ok: false; error: string } {
  if (value == null || value === '') return { ok: true, data: null };
  if (typeof value !== 'string') return { ok: false, error: 'الصورة يجب أن تكون JPEG.' };
  const match = JPEG_DATA_URI.exec(value);
  if (!match) return { ok: false, error: 'ارفع صورة JPEG فقط.' };
  const bytes = Buffer.from(match[1], 'base64');
  if (bytes.length > MAX_PORTRAIT_BYTES) return { ok: false, error: 'حجم الصورة بعد الضغط يجب ألا يتجاوز 150 KB.' };
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[2] !== 0xff) return { ok: false, error: 'ملف الصورة غير صالح.' };
  return { ok: true, data: value };
}
