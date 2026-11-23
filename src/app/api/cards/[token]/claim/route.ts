import { NextResponse } from 'next/server';
import { claimUnclaimedCard } from '@/lib/store';
import { validatePortraitData } from '@/lib/portrait-validation';
import { sanitizeExtras } from '@/lib/profile-extras';
export const runtime = 'nodejs';

export async function POST(request: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  const body = await request.json().catch(() => null);
  if (!body || typeof body.doctorNameAr !== 'string' || !body.doctorNameAr.trim()) return NextResponse.json({ error: 'الاسم بالعربي مطلوب.' }, { status: 400 });
  if (body.consentProfile !== true) return NextResponse.json({ error: 'يلزم الموافقة على نشر البيانات لإكمال تفعيل الكارت.' }, { status: 400 });
  if (body.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) return NextResponse.json({ error: 'صيغة البريد الإلكتروني غير صحيحة.' }, { status: 400 });
  const portrait = body.consentPhoto ? validatePortraitData(body.portraitData) : { ok: true as const, data: null };
  if (!portrait.ok) return NextResponse.json({ error: portrait.error }, { status: 400 });
  const safeUrl = (value: unknown) => { if (!value || typeof value !== 'string') return ''; try { return new URL(value).protocol === 'https:' ? value : ''; } catch { return ''; } };
  const card = await claimUnclaimedCard(token, {
    doctorNameAr: body.doctorNameAr.trim().slice(0, 100), doctorNameEn: String(body.doctorNameEn ?? '').trim().slice(0, 100),
    specialty: String(body.specialty ?? '').trim().slice(0, 100), phone: String(body.phone ?? '').trim().slice(0, 40),
    whatsapp: String(body.whatsapp ?? '').trim().slice(0, 40), email: String(body.email ?? '').trim().slice(0, 160),
    clinicAddress: String(body.clinicAddress ?? '').trim().slice(0, 200), mapsUrl: safeUrl(body.mapsUrl), website: safeUrl(body.website),
    bio: String(body.bio ?? '').trim().slice(0, 500), portraitData: portrait.data, extras: sanitizeExtras(body.extras), consentPhoto: Boolean(body.consentPhoto),
  });
  if (!card) return NextResponse.json({ error: 'الكارت تم تفعيله بالفعل أو لم يعد متاحًا.' }, { status: 409 });
  return NextResponse.json({ status: card.status, serial: card.serial });
}
