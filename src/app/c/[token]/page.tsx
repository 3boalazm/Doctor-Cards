import type { Metadata } from 'next';
import { getCardForPrint } from '@/lib/store';
import ProfileClient from './profile-client';

export const dynamic = 'force-dynamic';
export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const { token } = await params;
  const card = await getCardForPrint(token);
  if (!card) return { title: 'Profile unavailable | Doctor Cards', robots: { index: false, follow: false } };
  const name = [card.doctorNameAr, card.doctorNameEn].filter(Boolean).join(' · ');
  const title = `${name} | Doctor Cards`;
  const description = [card.specialty, 'Doctor contact profile'].filter(Boolean).join(' · ');
  return { title, description, robots: { index: false, follow: false, googleBot: { index: false, follow: false } }, openGraph: { title, description, type: 'profile' } };
}

export default async function PublicProfilePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <ProfileClient token={token}/>;
}
