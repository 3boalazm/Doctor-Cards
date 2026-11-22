'use client';

import { useEffect, useState } from 'react';
import { ArrowUpRight, AtSign, BriefcaseBusiness, ContactRound, Languages, MapPin, Share2, Smartphone, Stethoscope, UserRound, MessageCircle, Globe2 } from 'lucide-react';
import './profile.css';
import ClaimForm from './claim-form';

type Profile = { state?: 'ACTIVE' | 'UNCLAIMED'; serial?: string; doctorNameAr: string; doctorNameEn: string; specialty: string; phone: string; whatsapp: string; email: string; clinicAddress: string; mapsUrl: string; website: string; bio: string; portraitData?: string | null };
type Locale = 'ar' | 'en';
const copy = {
  ar: { profile: 'الملف التعريفي', share: 'مشاركة', save: 'حفظ جهة الاتصال', call: 'اتصال', whatsapp: 'واتساب', email: 'البريد الإلكتروني', map: 'موقع العيادة', website: 'الموقع الإلكتروني', bio: 'نبذة', disclaimer: 'معلومات التواصل منشورة بموافقة صاحب البروفايل', loading: 'جارٍ تحميل البروفايل...', missing: 'الصفحة غير متاحة', missingHint: 'قد يكون الرابط غير صحيح أو تم إيقاف هذه البطاقة.', powered: 'ملف رقمي للطبيب' },
  en: { profile: 'DOCTOR PROFILE', share: 'Share', save: 'Save contact', call: 'Call', whatsapp: 'WhatsApp', email: 'Email', map: 'Clinic location', website: 'Website', bio: 'About', disclaimer: 'Contact information is published with the profile owner’s consent.', loading: 'Loading profile...', missing: 'Profile unavailable', missingHint: 'This link may be invalid or the card has been suspended.', powered: 'Digital doctor profile' },
};

export default function ProfileClient({ token }: { token: string }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [missing, setMissing] = useState(false);
  const [locale, setLocale] = useState<Locale>('ar');
  const [shareNotice, setShareNotice] = useState('');
  useEffect(() => {
    try { const remembered = localStorage.getItem('doctor-card-locale'); if (remembered === 'en' || remembered === 'ar') setLocale(remembered); } catch { /* private browsing */ }
    let alive = true;
    void fetch(`/api/cards/${token}`, { cache: 'no-store' }).then(async (response) => {
      if (!response.ok) throw new Error('missing');
      return await response.json() as Profile;
    }).then((data) => { if (alive) setProfile(data); }).catch(() => { if (alive) setMissing(true); });
    return () => { alive = false; };
  }, [token]);
  const t = copy[locale];
  const changeLocale = (value: Locale) => { setLocale(value); try { localStorage.setItem('doctor-card-locale', value); } catch { /* private browsing */ } };
  const share = async () => {
    try {
      if (navigator.share) await navigator.share({ title: profile?.doctorNameAr || 'Doctor Cards', url: location.href });
      else { await navigator.clipboard.writeText(location.href); setShareNotice(locale === 'ar' ? 'تم نسخ الرابط' : 'Link copied'); window.setTimeout(() => setShareNotice(''), 2200); }
    } catch { /* user canceled native share */ }
  };
  if (profile?.state === 'UNCLAIMED') return <ClaimForm token={token} serial={profile.serial || ''} locale={locale} onClaimed={setProfile}/>;
  if (missing) return <main className="doctor-profile-page" dir={locale === 'ar' ? 'rtl' : 'ltr'} lang={locale}><header className="doctor-profile-top"><Brand/></header><section className="doctor-profile-error"><div className="error-code">404</div><h1>{t.missing}</h1><p>{t.missingHint}</p><Brand/></section></main>;
  if (!profile) return <main className="doctor-profile-page" dir={locale === 'ar' ? 'rtl' : 'ltr'} lang={locale}><div className="profile-loading-state"><span className="brand-mark"><Stethoscope size={20}/></span><b>{t.loading}</b></div></main>;

  const displayName = locale === 'en' ? (profile.doctorNameEn || profile.doctorNameAr) : profile.doctorNameAr;
  const links = [
    profile.phone && { label: t.call, value: profile.phone, href: `tel:${profile.phone}`, icon: <Smartphone/> },
    profile.whatsapp && { label: t.whatsapp, value: profile.whatsapp, href: `https://wa.me/${profile.whatsapp.replace(/\D/g, '')}`, icon: <MessageCircle/> },
    profile.email && { label: t.email, value: profile.email, href: `mailto:${profile.email}`, icon: <AtSign/> },
    profile.mapsUrl && { label: t.map, value: profile.clinicAddress || t.map, href: profile.mapsUrl, icon: <MapPin/> },
    profile.website && { label: t.website, value: profile.website.replace(/^https?:\/\//, ''), href: profile.website, icon: <Globe2/> },
  ].filter(Boolean) as { label: string; value: string; href: string; icon: React.ReactNode }[];
  return <main className="doctor-profile-page" dir={locale === 'ar' ? 'rtl' : 'ltr'} lang={locale}>
    <header className="doctor-profile-top"><Brand/><div className="profile-top-actions"><button className="locale-toggle" onClick={() => changeLocale(locale === 'ar' ? 'en' : 'ar')} aria-label="Change language"><Languages size={16}/><span>{locale === 'ar' ? 'EN' : 'عربي'}</span></button><button className="profile-share" onClick={() => void share()}><Share2 size={16}/><span>{t.share}</span></button></div></header>
    <article className="doctor-profile-card"><div className="doctor-profile-cover"><div className="profile-cover-lines"/><span className="profile-cover-label">{t.profile}</span><div className="doctor-portrait">{profile.portraitData ? <img src={profile.portraitData} alt={displayName}/> : <UserRound size={35}/>}</div></div>
      <div className="doctor-profile-content"><span className="profile-status"><i/>{t.profile}</span><h1>{displayName}</h1>{locale === 'ar' && profile.doctorNameEn && <div className="profile-english-name" dir="ltr">{profile.doctorNameEn}</div>}{profile.specialty && <div className="profile-specialty"><BriefcaseBusiness size={15}/><span>{profile.specialty}</span></div>}
        {profile.bio && <section className="profile-about"><b>{t.bio}</b><p>{profile.bio}</p></section>}
        <a className="save-contact-button" href={`/api/cards/${token}/vcf`}><ContactRound size={18}/>{t.save}<ArrowUpRight size={15}/></a>
        {links.length > 0 && <nav className="profile-contact-actions" aria-label={locale === 'ar' ? 'وسائل التواصل' : 'Contact methods'}>{links.map((link) => <a key={link.label} href={link.href} target={link.href.startsWith('https://') ? '_blank' : undefined} rel="noreferrer"><span className="contact-icon">{link.icon}</span><span className="contact-label"><b>{link.label}</b><small dir="auto">{link.value}</small></span><ArrowUpRight size={15} className="contact-arrow"/></a>)}</nav>}
        {profile.clinicAddress && !profile.mapsUrl && <div className="profile-address"><MapPin size={15}/>{profile.clinicAddress}</div>}
        <footer className="doctor-profile-footer"><span>{t.powered}</span><b><span className="footer-mark"><Stethoscope size={12}/></span> DOCTOR CARDS</b></footer>
      </div>
    </article><footer className="doctor-profile-disclaimer">{t.disclaimer}</footer>{shareNotice && <div role="status" className="profile-share-toast">{shareNotice}</div>}
  </main>;
}
function Brand() { return <div className="profile-brand-lockup"><span className="brand-mark"><Stethoscope size={16}/></span><b>DOCTOR<span>CARDS</span></b></div>; }
