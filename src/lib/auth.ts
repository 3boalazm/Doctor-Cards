import { createHmac, timingSafeEqual } from 'node:crypto';

export const LOCAL_PREVIEW_PASSWORD = process.env.ADMIN_PASSWORD || 'doctorcards-preview-only';
const secret = process.env.AUTH_SECRET || 'local-preview-secret-change-before-any-real-use';
function signature(value: string) { return createHmac('sha256', secret).update(value).digest('base64url'); }
export function createSession() { const value = `admin.${Date.now() + 1000 * 60 * 60 * 12}`; return `${value}.${signature(value)}`; }
export function verifySession(request: Request) {
  const raw = request.headers.get('cookie')?.split(';').map((part) => part.trim()).find((part) => part.startsWith('dc_session='))?.slice('dc_session='.length);
  if (!raw) return false;
  const [role, expires, sig] = raw.split('.');
  if (role !== 'admin' || Number(expires) < Date.now() || !sig) return false;
  const expected = signature(`${role}.${expires}`);
  const a = Buffer.from(sig); const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
