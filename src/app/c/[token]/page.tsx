'use client';

import { useEffect, useState } from 'react';
import { ArrowUpRight, AtSign, BriefcaseBusiness, MapPin, Share2, Smartphone, Stethoscope, UserRound } from 'lucide-react';

type Profile = { doctorNameAr: string; doctorNameEn: string; specialty: string; phone: string; whatsapp: string; email: string; clinicAddress: string; mapsUrl: string; website: string; bio: string };
export default function PublicProfile({ params }: { params: Promise<{ token: string }> }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [missing, setMissing] = useState(false);
  useEffect(() => {
    let alive = true;
    void params.then(({ token }) => fetch(`/api/cards/${token}`, { cache: 'no-store' }).then(async (r) => {
      if (!r.ok) throw new Error('not found');
      return r.json() as Promise<Profile>;
    }).then((data) => { if (alive) setProfile(data); }).catch(() => { if (alive) setMissing(true); }));
    return () => { alive = false; };
  }, [params]);
  if (missing) return <main className="profile-unavailable"><div className="profile-brand"><CreditMark/> DOCTOR CARDS</div><div className="unavailable-card"><span>404</span><h1>الصفحة غير متاحة</h1><p>قد يكون الرابط غير صحيح أو تم إيقاف هذه البطاقة.</p></div><small>Doctor Cards · صفحة تعريفية</small></main>;
  if (!profile) return <main className="profile-loading"><div className="loading-mark"><Stethoscope/></div><span>جارٍ تحميل البروفايل...</span></main>;
  const actions = [
    profile.phone && { label: 'اتصال', detail: profile.phone, href: `tel:${profile.phone}`, icon: <Smartphone/> },
    profile.whatsapp && { label: 'واتساب', detail: profile.whatsapp, href: `https://wa.me/${profile.whatsapp.replace(/\D/g, '')}`, icon: <MessageMark/> },
    profile.email && { label: 'البريد الإلكتروني', detail: profile.email, href: `mailto:${profile.email}`, icon: <AtSign/> },
    profile.mapsUrl && { label: 'موقع العيادة', detail: profile.clinicAddress || 'افتح الخريطة', href: profile.mapsUrl, icon: <MapPin/> },
    profile.website && { label: 'الموقع الإلكتروني', detail: profile.website.replace(/^https?:\/\//, ''), href: profile.website, icon: <ArrowUpRight/> },
  ].filter(Boolean) as { label: string; detail: string; href: string; icon: React.ReactNode }[];
  return <main className="public-page"><div className="profile-top"><div className="profile-brand"><CreditMark/> DOCTOR CARDS</div><button className="share-button" onClick={() => navigator.share?.({ title: profile.doctorNameAr, url: location.href })}><Share2 size={17}/><span>مشاركة</span></button></div><section className="profile-card"><div className="profile-cover"><div className="cover-pattern"/><div className="cover-label"><span/> DOCTOR PROFILE</div><div className="profile-portrait"><UserRound size={39}/></div></div><div className="profile-body"><div className="profile-heading"><span className="profile-verified"><i/> الملف التعريفي</span><h1>{profile.doctorNameAr}</h1>{profile.doctorNameEn && <div className="doctor-en" dir="ltr">{profile.doctorNameEn}</div>}{profile.specialty && <div className="profile-specialty"><BriefcaseBusiness size={15}/>{profile.specialty}</div>}</div>{profile.bio && <div className="profile-bio">{profile.bio}</div>}{actions.length > 0 && <div className="contact-list">{actions.map((action) => <a key={action.label} href={action.href} target={action.href.startsWith('https://') ? '_blank' : undefined} rel="noreferrer"><span className="contact-icon">{action.icon}</span><span className="contact-text"><b>{action.label}</b><small dir="auto">{action.detail}</small></span><ArrowUpRight size={16} className="contact-arrow"/></a>)}</div>}{profile.clinicAddress && !profile.mapsUrl && <div className="address-note"><MapPin size={16}/>{profile.clinicAddress}</div>}<div className="profile-footer"><span>ملف رقمي للطبيب</span><span>POWERED BY <b>DOCTOR CARDS</b></span></div></div></section><footer className="public-disclaimer">معلومات التواصل منشورة بموافقة صاحب البروفايل</footer></main>;
}
function CreditMark() { return <span className="profile-mark"><Stethoscope size={17}/></span>; }
function MessageMark() { return <span className="message-mark">◌</span>; }
