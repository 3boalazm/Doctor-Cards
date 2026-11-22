import { NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth';
import { createBlankCards } from '@/lib/store';
export const runtime = 'nodejs';

export async function POST(request: Request) {
  if (!verifySession(request)) return NextResponse.json({ error: 'سجل الدخول أولاً.' }, { status: 401 });
  const body = await request.json().catch(() => null);
  const count = Number(body?.count);
  if (!Number.isInteger(count) || count < 1 || count > 250) return NextResponse.json({ error: 'عدد الكروت لازم يكون من 1 إلى 250.' }, { status: 400 });
  const cards = await createBlankCards(count);
  return NextResponse.json({ count: cards.length, cards }, { status: 201 });
}
