import { NextResponse } from 'next/server';
import { createCard, listCards } from '@/lib/store';
import { verifySession } from '@/lib/auth';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  if (!verifySession(request)) return NextResponse.json({ error: 'سجل الدخول أولاً.' }, { status: 401 });
  return NextResponse.json(await listCards());
}

export async function POST(request: Request) {
  if (!verifySession(request)) return NextResponse.json({ error: 'سجل الدخول أولاً.' }, { status: 401 });
  const body = await request.json().catch(() => null);
  if (!body || typeof body.doctorNameAr !== 'string' || !body.doctorNameAr.trim()) {
    return NextResponse.json({ error: 'اسم الطبيب بالعربي مطلوب.' }, { status: 400 });
  }
  if (!body.consentProfile) {
    return NextResponse.json({ error: 'يلزم تأكيد الموافقة على نشر بيانات البروفايل.' }, { status: 400 });
  }
  if (body.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
    return NextResponse.json({ error: 'صيغة البريد الإلكتروني غير صحيحة.' }, { status: 400 });
  }
  const safeUrl = (value: unknown) => {
    if (!value || typeof value !== 'string') return '';
    try { return new URL(value).protocol === 'https:' ? value : ''; } catch { return ''; }
  };
  const card = await createCard({
    doctorNameAr: body.doctorNameAr.trim().slice(0, 100),
    doctorNameEn: String(body.doctorNameEn ?? '').trim().slice(0, 100),
    specialty: String(body.specialty ?? '').trim().slice(0, 100),
    phone: String(body.phone ?? '').trim().slice(0, 40),
    whatsapp: String(body.whatsapp ?? '').trim().slice(0, 40),
    email: String(body.email ?? '').trim().slice(0, 160),
    clinicAddress: String(body.clinicAddress ?? '').trim().slice(0, 200),
    mapsUrl: safeUrl(body.mapsUrl),
    website: safeUrl(body.website),
    bio: String(body.bio ?? '').trim().slice(0, 500),
    edition: body.edition === 'LIMITED' ? 'LIMITED' : body.edition === 'DEMO' ? 'DEMO' : 'STANDARD',
    consentProfile: Boolean(body.consentProfile),
    consentPhoto: Boolean(body.consentPhoto),
  });
  return NextResponse.json(card, { status: 201 });
}
