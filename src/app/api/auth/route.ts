import { NextResponse } from 'next/server';
import { createSession, LOCAL_PREVIEW_PASSWORD } from '@/lib/auth';
export const runtime = 'nodejs';
export async function GET(request: Request) {
  const valid = request.headers.get('cookie')?.includes('dc_session=') ?? false;
  return NextResponse.json({ authenticated: valid });
}
export async function POST(request: Request) {
  if (process.env.NODE_ENV === 'production') return NextResponse.json({ error: 'التطبيق المحلي فقط.' }, { status: 503 });
  const body = await request.json().catch(() => null);
  if (body?.password !== LOCAL_PREVIEW_PASSWORD) return NextResponse.json({ error: 'كلمة المرور غير صحيحة.' }, { status: 401 });
  const response = NextResponse.json({ authenticated: true });
  response.cookies.set('dc_session', createSession(), { httpOnly: true, sameSite: 'strict', secure: false, path: '/', maxAge: 60 * 60 * 12 });
  return response;
}
export async function DELETE() {
  const response = NextResponse.json({ authenticated: false });
  response.cookies.set('dc_session', '', { httpOnly: true, sameSite: 'strict', secure: false, path: '/', maxAge: 0 });
  return response;
}
