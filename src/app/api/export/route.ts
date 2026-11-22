import { NextResponse } from 'next/server';
import { listCards } from '@/lib/store';
import { verifySession } from '@/lib/auth';
export const runtime = 'nodejs';
function cell(value: unknown) { return `"${String(value ?? '').replaceAll('"', '""')}"`; }
export async function GET(request: Request) {
  if (!verifySession(request)) return NextResponse.json({ error: 'سجل الدخول أولاً.' }, { status: 401 });
  const cards = await listCards();
  const rows = [['الاسم بالعربي', 'الاسم بالإنجليزي', 'التخصص', 'السيريال', 'الإصدار', 'الحالة', 'التوزيع', 'عدد المسحات', 'تاريخ الإنشاء'], ...cards.map((card) => [card.doctorNameAr, card.doctorNameEn, card.specialty, card.serial, card.edition, card.status, card.distributionStatus, card.scans, card.createdAt])];
  const csv = '\uFEFF' + rows.map((row) => row.map(cell).join(',')).join('\r\n');
  return new NextResponse(csv, { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="doctor-cards.csv"', 'Cache-Control': 'no-store' } });
}
