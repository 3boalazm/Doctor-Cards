import { NextResponse } from 'next/server';
import { getCardForPrint, getPublicCard, getUnclaimedCard, updateCard } from '@/lib/store';
import { verifySession } from '@/lib/auth';
import { validatePortraitData } from '@/lib/portrait-validation';
import { sanitizeExtras } from '@/lib/profile-extras';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  const mode = new URL(request.url).searchParams.get('mode');
  if (mode === 'print') {
    const card = await getCardForPrint(token);
    if (!card) return NextResponse.json({ error: 'الكارت غير متاح.' }, { status: 404 });
    return NextResponse.json(card);
  }
  const unclaimed = await getUnclaimedCard(token);
  if (unclaimed) return NextResponse.json({ state: 'UNCLAIMED', serial: unclaimed.serial });
  const card = await getPublicCard(token);
  if (!card) return NextResponse.json({ error: 'البروفايل غير متاح حاليًا.' }, { status: 404 });
  const { doctorNameAr, doctorNameEn, specialty, phone, whatsapp, email, clinicAddress, mapsUrl, website, bio, extras } = card;
  return NextResponse.json({ state: 'ACTIVE', doctorNameAr, doctorNameEn, specialty, phone, whatsapp, email, clinicAddress, mapsUrl, website, bio, extras, portraitData: card.consentPhoto ? card.portraitData : null });
}

export async function PATCH(request: Request, context: { params: Promise<{ token: string }> }) {
  if (!verifySession(request)) return NextResponse.json({ error: 'سجل الدخول أولاً.' }, { status: 401 });
  const { token } = await context.params;
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'بيانات غير صالحة.' }, { status: 400 });
  if (body.action === 'toggle-status') {
    const updated = await updateCard(token, { status: body.status === 'SUSPENDED' ? 'SUSPENDED' : 'ACTIVE' });
    return updated ? NextResponse.json({ status: updated.status }) : NextResponse.json({ error: 'الكارت غير موجود.' }, { status: 404 });
  }
  if (body.action === 'toggle-distribution') {
    const updated = await updateCard(token, { distributionStatus: body.distributionStatus === 'DISTRIBUTED' ? 'DISTRIBUTED' : 'NOT_DISTRIBUTED' });
    return updated ? NextResponse.json({ distributionStatus: updated.distributionStatus }) : NextResponse.json({ error: 'الكارت غير موجود.' }, { status: 404 });
  }
  if (typeof body.doctorNameAr !== 'string' || !body.doctorNameAr.trim()) return NextResponse.json({ error: 'اسم الطبيب بالعربي مطلوب.' }, { status: 400 });
  if (!body.consentProfile) return NextResponse.json({ error: 'يلزم تأكيد الموافقة على نشر بيانات البروفايل.' }, { status: 400 });
  const portrait = body.consentPhoto ? validatePortraitData(body.portraitData) : { ok: true as const, data: null };
  if (!portrait.ok) return NextResponse.json({ error: portrait.error }, { status: 400 });
  const cleanUrl = (value: unknown) => { if (!value || typeof value !== 'string') return ''; try { return new URL(value).protocol === 'https:' ? value : ''; } catch { return ''; } };
  const updated = await updateCard(token, {
    doctorNameAr: body.doctorNameAr.trim().slice(0, 100), doctorNameEn: String(body.doctorNameEn ?? '').trim().slice(0, 100),
    specialty: String(body.specialty ?? '').trim().slice(0, 100), phone: String(body.phone ?? '').trim().slice(0, 40),
    whatsapp: String(body.whatsapp ?? '').trim().slice(0, 40), email: String(body.email ?? '').trim().slice(0, 160),
    clinicAddress: String(body.clinicAddress ?? '').trim().slice(0, 200), mapsUrl: cleanUrl(body.mapsUrl), website: cleanUrl(body.website),
    bio: String(body.bio ?? '').trim().slice(0, 500), portraitData: portrait.data, extras: sanitizeExtras(body.extras), edition: body.edition === 'LIMITED' ? 'LIMITED' : body.edition === 'DEMO' ? 'DEMO' : 'STANDARD',
    consentProfile: true, consentPhoto: Boolean(body.consentPhoto),
  });
  return updated ? NextResponse.json(updated) : NextResponse.json({ error: 'الكارت غير موجود.' }, { status: 404 });
}
