import { NextResponse } from 'next/server';
import { getPublicCardSnapshot } from '@/lib/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function escapeVCard(value: string) { return value.replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;'); }
function foldLine(line: string) {
  const chars = Array.from(line); const out: string[] = []; let current = ''; let bytes = 0;
  for (const char of chars) {
    const size = Buffer.byteLength(char, 'utf8');
    if (bytes + size > 75) { out.push(current); current = ` ${char}`; bytes = size + 1; }
    else { current += char; bytes += size; }
  }
  out.push(current); return out.join('\r\n');
}

export async function GET(_request: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  const card = await getPublicCardSnapshot(token);
  if (!card) return NextResponse.json({ error: 'البروفايل غير متاح.' }, { status: 404 });
  const fullName = [card.doctorNameAr, card.doctorNameEn].filter(Boolean).join(' / ');
  const lines = [
    'BEGIN:VCARD', 'VERSION:3.0', `FN:${escapeVCard(fullName)}`, `N:${escapeVCard(card.doctorNameAr)};;;;`,
    ...(card.specialty ? [`TITLE:${escapeVCard(card.specialty)}`] : []),
    ...(card.extras?.workplaces?.[0] ? [`ORG:${escapeVCard(card.extras.workplaces[0])}`] : []),
    ...(card.phone ? [`TEL;TYPE=WORK,VOICE:${escapeVCard(card.phone)}`] : []),
    ...(card.extras?.bookingPhone && card.extras.bookingPhone !== card.phone ? [`TEL;TYPE=WORK,MSG:${escapeVCard(card.extras.bookingPhone)}`] : []),
    ...(card.email ? [`EMAIL;TYPE=WORK:${escapeVCard(card.email)}`] : []),
    ...(card.clinicAddress ? [`ADR;TYPE=WORK:;;${escapeVCard(card.clinicAddress)};;;;`] : []),
    ...(card.website ? [`URL:${escapeVCard(card.website)}`] : []),
    ...(card.mapsUrl ? [`URL:${escapeVCard(card.mapsUrl)}`] : []),
    'END:VCARD',
  ];
  const body = lines.map(foldLine).join('\r\n') + '\r\n';
  return new NextResponse(body, { headers: { 'Content-Type': 'text/vcard; charset=utf-8', 'Content-Disposition': 'attachment; filename="doctor-contact.vcf"', 'Cache-Control': 'no-store' } });
}
