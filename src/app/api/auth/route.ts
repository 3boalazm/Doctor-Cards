import { NextResponse } from 'next/server';
import { authConfigured, clearFailures, clientIp, createSession, passwordMatches, recordFailure, sessionCookie, throttled, verifySession } from '@/lib/auth';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  return NextResponse.json({ authenticated: verifySession(request), configured: authConfigured() }, { headers: { 'Cache-Control': 'no-store' } });
}
export async function POST(request: Request) {
  if (!authConfigured()) return NextResponse.json({ error: 'الدخول غير مُفعّل: ضبط ADMIN_PASSWORD (12+ حرف) و AUTH_SECRET (32+ حرف) على الخادم.' }, { status: 503 });
  const ip = clientIp(request);
  if (throttled(ip)) return NextResponse.json({ error: 'محاولات كثيرة. حاول بعد 10 دقائق.' }, { status: 429 });
  const body = await request.json().catch(() => null);
  if (!passwordMatches(body?.password)) { recordFailure(ip); return NextResponse.json({ error: 'كلمة المرور غير صحيحة.' }, { status: 401 }); }
  clearFailures(ip);
  const response = NextResponse.json({ authenticated: true });
  response.cookies.set('dc_session', createSession(), sessionCookie);
  return response;
}
export async function DELETE() {
  const response = NextResponse.json({ authenticated: false });
  response.cookies.set('dc_session', '', { ...sessionCookie, maxAge: 0 });
  return response;
}
