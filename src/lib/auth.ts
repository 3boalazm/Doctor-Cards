import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

const isProd = process.env.NODE_ENV === 'production';
const DEV_PASSWORD = 'doctorcards-preview-only';
const DEV_SECRET = 'local-preview-secret-change-before-any-real-use';
const SESSION_MS = 1000 * 60 * 60 * 12;

/** Read lazily so env changes on Vercel are picked up per-invocation. */
function config() {
  const password = process.env.ADMIN_PASSWORD || (isProd ? '' : DEV_PASSWORD);
  const secret = process.env.AUTH_SECRET || (isProd ? '' : DEV_SECRET);
  const ready = password.length >= 12 && secret.length >= 32;
  return { password, secret, ready };
}
/** True when production env vars are missing/too weak: login fails closed instead of using defaults. */
export function authConfigured() { return config().ready; }

function digest(value: string) { return createHash('sha256').update(value).digest(); }
export function passwordMatches(input: unknown) {
  const { password, ready } = config();
  if (!ready || typeof input !== 'string') return false;
  return timingSafeEqual(digest(input), digest(password));
}
function signature(value: string) { return createHmac('sha256', config().secret).update(value).digest('base64url'); }
export function createSession() { const value = `admin.${Date.now() + SESSION_MS}`; return `${value}.${signature(value)}`; }
export const sessionCookie = { httpOnly: true, sameSite: 'strict' as const, secure: isProd, path: '/', maxAge: SESSION_MS / 1000 };

export function verifySession(request: Request) {
  if (!config().ready) return false;
  const raw = request.headers.get('cookie')?.split(';').map((part) => part.trim()).find((part) => part.startsWith('dc_session='))?.slice('dc_session='.length);
  if (!raw) return false;
  const [role, expires, sig] = raw.split('.');
  if (role !== 'admin' || !(Number(expires) > Date.now()) || !sig) return false;
  const a = Buffer.from(sig); const b = Buffer.from(signature(`${role}.${expires}`));
  return a.length === b.length && timingSafeEqual(a, b);
}

// Best-effort brute-force throttle (per server instance). 5 failures / 10 min per IP.
const attempts = new Map<string, { n: number; first: number }>();
export function throttled(ip: string) { const a = attempts.get(ip); return !!a && Date.now() - a.first < 600_000 && a.n >= 5; }
export function recordFailure(ip: string) { const a = attempts.get(ip); if (!a || Date.now() - a.first >= 600_000) attempts.set(ip, { n: 1, first: Date.now() }); else a.n += 1; }
export function clearFailures(ip: string) { attempts.delete(ip); }
export function clientIp(request: Request) { return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local'; }
