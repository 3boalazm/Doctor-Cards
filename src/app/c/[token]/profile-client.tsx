'use client';

import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { AtSign, BadgeCheck, CalendarCheck, Check, Clock3, ContactRound, Copy, Globe2, GraduationCap, Hospital, Link2, MapPin, MessageCircle, Phone, QrCode, Share2, Stethoscope, UserRound, X } from 'lucide-react';
import './profile.css';
import ClaimForm from './claim-form';
import MedicalLineArt from '@/components/medical-line-art';
import { DAY_ORDER, clinicNow, emptyExtras, openStatus, type ProfileExtras } from '@/lib/profile-extras';

type Profile = { state?: 'ACTIVE' | 'UNCLAIMED'; serial?: string; doctorNameAr: string; doctorNameEn: string; specialty: string; phone: string; whatsapp: string; email: string; clinicAddress: string; mapsUrl: string; website: string; bio: string; portraitData?: string | null; extras?: Partial<ProfileExtras> };
type Locale = 'ar' | 'en';
const sectionCopy = {
  ar: { book: 'احجز موعد', bookingPhoneLabel: 'رقم الحجز / السكرتارية', hours: 'مواعيد العمل', openNow: 'مفتوح الآن', closedNow: 'مغلق الآن', closes: 'يغلق', opens: 'يفتح', today: 'اليوم', tomorrow: 'غدًا', dayOff: 'إجازة', services: 'التخصصات والخدمات', credentials: 'المؤهلات العلمية', workplaces: 'جهات العمل', visit: 'الكشف والتأمين', consultation: 'سعر الكشف', followUp: 'الإعادة', insurance: 'شركات التأمين المتعاقد معها', feeNote: 'الأسعار قابلة للتغيير — تأكد عند الحجز', shareTitle: 'شارك البروفايل', shareHint: 'خلي اللي جنبك يصوّر الكود من شاشتك', copyLink: 'نسخ الرابط', shareVia: 'مشاركة', close: 'إغلاق', days: ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'], bookMessage: (name: string) => `مرحبًا، أرغب في حجز موعد مع ${name}` },
  en: { book: 'Book appointment', bookingPhoneLabel: 'Booking / secretary', hours: 'Working hours', openNow: 'Open now', closedNow: 'Closed now', closes: 'closes', opens: 'opens', today: 'today', tomorrow: 'tomorrow', dayOff: 'Closed', services: 'Specialties & services', credentials: 'Credentials', workplaces: 'Workplaces', visit: 'Fees & insurance', consultation: 'Consultation', followUp: 'Follow-up', insurance: 'Accepted insurance', feeNote: 'Fees may change — confirm when booking', shareTitle: 'Share profile', shareHint: 'Let the person next to you scan this from your screen', copyLink: 'Copy link', shareVia: 'Share', close: 'Close', days: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'], bookMessage: (name: string) => `Hello, I'd like to book an appointment with ${name}` },
};
/** "18:30" → "6:30 م" / "6:30 PM" (Latin digits to match phone numbers on the page). */
function formatTime(time: string, locale: Locale) {
  const date = new Date(Date.UTC(1970, 0, 1, Number(time.slice(0, 2)), Number(time.slice(3, 5))));
  return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-EG-u-nu-latn' : 'en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'UTC' }).format(date);
}
const copy = {
  ar: { profile: 'الملف التعريفي', share: 'مشاركة', save: 'حفظ جهة الاتصال', call: 'اتصال', whatsapp: 'واتساب', email: 'إيميل', map: 'الخريطة', website: 'الموقع', phoneLabel: 'رقم الهاتف', emailLabel: 'البريد الإلكتروني', addressLabel: 'عنوان العيادة', websiteLabel: 'الموقع الإلكتروني', bio: 'نبذة', details: 'بيانات التواصل', copyValue: 'نسخ', copied: 'تم النسخ', linkCopied: 'تم نسخ الرابط', contactNav: 'وسائل التواصل', disclaimer: 'معلومات التواصل منشورة بموافقة صاحب البروفايل', loading: 'جارٍ تحميل البروفايل...', missing: 'الصفحة غير متاحة', missingHint: 'قد يكون الرابط غير صحيح أو تم إيقاف هذه البطاقة.', powered: 'ملف رقمي للطبيب', language: 'اللغة' },
  en: { profile: 'Doctor profile', share: 'Share', save: 'Save contact', call: 'Call', whatsapp: 'WhatsApp', email: 'Email', map: 'Map', website: 'Website', phoneLabel: 'Phone', emailLabel: 'Email', addressLabel: 'Clinic address', websiteLabel: 'Website', bio: 'About', details: 'Contact details', copyValue: 'Copy', copied: 'Copied', linkCopied: 'Link copied', contactNav: 'Contact methods', disclaimer: 'Contact information is published with the profile owner’s consent.', loading: 'Loading profile...', missing: 'Profile unavailable', missingHint: 'This link may be invalid or the card has been suspended.', powered: 'Digital doctor profile', language: 'Language' },
};

/** Samples the portrait's lower half and returns a deep, readable tint for the hero fade and card glow. */
function usePortraitTint(src?: string | null) {
  const [tint, setTint] = useState<string | null>(null);
  useEffect(() => {
    if (!src) { setTint(null); return; }
    let alive = true;
    const image = new Image();
    image.onload = () => {
      try {
        const canvas = document.createElement('canvas'); canvas.width = 24; canvas.height = 24;
        const context = canvas.getContext('2d', { willReadFrequently: true }); if (!context) return;
        context.drawImage(image, 0, 0, 24, 24);
        const data = context.getImageData(0, 10, 24, 14).data;
        let r = 0, g = 0, b = 0, n = 0;
        for (let i = 0; i < data.length; i += 4) { if (data[i + 3] < 128) continue; r += data[i]; g += data[i + 1]; b += data[i + 2]; n++; }
        if (!n || !alive) return;
        r /= n * 255; g /= n * 255; b /= n * 255;
        const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
        let h = 20;
        if (d > 0.02) h = max === r ? 60 * (((g - b) / d) % 6) : max === g ? 60 * ((b - r) / d + 2) : 60 * ((r - g) / d + 4);
        const s = d > 0.02 ? Math.min(0.62, Math.max(0.3, d / (1 - Math.abs(max + min - 1)))) : 0.12;
        setTint(`hsl(${Math.round((h + 360) % 360)} ${Math.round(s * 100)}% 30%)`);
      } catch { /* tainted or unsupported canvas: keep the default warm tint */ }
    };
    image.src = src;
    return () => { alive = false; };
  }, [src]);
  return tint;
}

function initialOf(name: string) {
  // Strip honorifics like "د/", "م/", "دكتورة ", "Dr.", "ENG\" so the monogram uses the actual name.
  const clean = name.replace(/^\s*(?:(?:د|م|أ|ا)\s*[./\\]|(?:دكتورة?|Dr|Eng|Prof)\s*(?:[./\\]|\s))\s*/i, '').trim();
  return clean.charAt(0).toUpperCase();
}

export default function ProfileClient({ token }: { token: string }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [missing, setMissing] = useState(false);
  const [locale, setLocale] = useState<Locale>('ar');
  const [notice, setNotice] = useState('');
  const [copiedKey, setCopiedKey] = useState('');
  const [, setTick] = useState(0);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [qrData, setQrData] = useState('');
  useEffect(() => {
    if (!sheetOpen) return;
    if (!qrData) void import('qrcode').then(({ default: QR }) => QR.toDataURL(location.href, { margin: 1, width: 520, errorCorrectionLevel: 'M', color: { dark: '#0b1622', light: '#ffffff' } })).then(setQrData).catch(() => { /* QR is a convenience; link actions still work */ });
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setSheetOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [sheetOpen, qrData]);
  useEffect(() => { const id = window.setInterval(() => setTick((value) => value + 1), 60_000); return () => window.clearInterval(id); }, []); // keeps "open now" current
  useEffect(() => {
    try { const remembered = localStorage.getItem('doctor-card-locale'); if (remembered === 'en' || remembered === 'ar') setLocale(remembered); } catch { /* private browsing */ }
    let alive = true;
    void fetch(`/api/cards/${token}`, { cache: 'no-store' }).then(async (response) => {
      if (!response.ok) throw new Error('missing');
      return await response.json() as Profile;
    }).then((data) => { if (alive) setProfile(data); }).catch(() => { if (alive) setMissing(true); });
    return () => { alive = false; };
  }, [token]);
  const tint = usePortraitTint(profile?.portraitData);
  const t = copy[locale];
  const dir = locale === 'ar' ? 'rtl' : 'ltr';
  const changeLocale = (value: Locale) => { setLocale(value); try { localStorage.setItem('doctor-card-locale', value); } catch { /* private browsing */ } };
  const flash = (message: string) => { setNotice(message); window.setTimeout(() => setNotice(''), 2200); };
  const share = async () => {
    try {
      if (navigator.share) await navigator.share({ title: profile?.doctorNameAr || 'Doctor Cards', url: location.href });
      else { await navigator.clipboard.writeText(location.href); flash(t.linkCopied); }
    } catch { /* user canceled native share */ }
  };
  const copyLink = async () => { try { await navigator.clipboard.writeText(location.href); flash(t.linkCopied); } catch { /* clipboard blocked */ } };
  const copyValue = async (key: string, value: string) => {
    try { await navigator.clipboard.writeText(value); setCopiedKey(key); flash(t.copied); window.setTimeout(() => setCopiedKey(''), 1600); } catch { /* clipboard blocked */ }
  };
  const langSwitch = <div className="profile-lang" role="group" aria-label={t.language}>
    <button type="button" aria-pressed={locale === 'ar'} onClick={() => changeLocale('ar')}>ع</button>
    <button type="button" aria-pressed={locale === 'en'} onClick={() => changeLocale('en')}>EN</button>
  </div>;

  if (profile?.state === 'UNCLAIMED') return <ClaimForm token={token} serial={profile.serial || ''} locale={locale} onClaimed={setProfile}/>;
  if (missing) return <main className="doctor-profile-page" dir={dir} lang={locale}><div className="profile-backdrop" aria-hidden="true"/><header className="doctor-profile-top"><Brand/>{langSwitch}</header><section className="doctor-profile-error"><div className="error-code">404</div><h1>{t.missing}</h1><p>{t.missingHint}</p><Brand/></section></main>;
  if (!profile) return <main className="doctor-profile-page" dir={dir} lang={locale}><div className="profile-backdrop" aria-hidden="true"/><div className="profile-loading-state" role="status"><span className="brand-mark"><Stethoscope size={20}/></span><b>{t.loading}</b></div></main>;

  const displayName = locale === 'en' ? (profile.doctorNameEn || profile.doctorNameAr) : profile.doctorNameAr;
  const altName = locale === 'en' ? (profile.doctorNameEn ? profile.doctorNameAr : '') : profile.doctorNameEn;
  const portrait = profile.portraitData || null;
  const waHref = profile.whatsapp ? `https://wa.me/${profile.whatsapp.replace(/\D/g, '')}` : '';
  const quick = [
    profile.phone && { key: 'call', label: t.call, href: `tel:${profile.phone}`, icon: <Phone/> },
    profile.whatsapp && { key: 'whatsapp', label: t.whatsapp, href: waHref, icon: <MessageCircle/> },
    profile.mapsUrl && { key: 'map', label: t.map, href: profile.mapsUrl, icon: <MapPin/> },
    profile.email && { key: 'email', label: t.email, href: `mailto:${profile.email}`, icon: <AtSign/> },
    profile.website && { key: 'website', label: t.website, href: profile.website, icon: <Globe2/> },
  ].filter(Boolean) as { key: string; label: string; href: string; icon: ReactNode }[];
  const s = sectionCopy[locale];
  const ex: ProfileExtras = { ...emptyExtras(), ...profile.extras };
  // Booking priority: dedicated booking link → WhatsApp with a ready message → secretary phone.
  const booking = ex.bookingUrl ? ex.bookingUrl
    : profile.whatsapp ? `${waHref}?text=${encodeURIComponent(s.bookMessage(profile.doctorNameAr))}`
    : ex.bookingPhone ? `tel:${ex.bookingPhone}` : '';
  const now = clinicNow();
  const status = ex.hours.length ? openStatus(ex.hours, now) : null;
  const statusText = !status ? '' : status.open
    ? `${s.openNow}${status.closesAt ? ` · ${s.closes} ${formatTime(status.closesAt, locale)}` : ''}`
    : `${s.closedNow}${status.next ? ` · ${s.opens} ${status.next.day === now.day ? s.today : status.next.day === (now.day + 1) % 7 ? s.tomorrow : s.days[status.next.day]} ${formatTime(status.next.from, locale)}` : ''}`;
  const week = DAY_ORDER.map((day) => ex.hours.find((item) => item.day === day) ?? { day, open: false, from: '', to: '' });
  const details = [
    profile.phone && { key: 'phone', label: t.phoneLabel, value: profile.phone, href: `tel:${profile.phone}`, icon: <Phone/> },
    ex.bookingPhone && ex.bookingPhone !== profile.phone && { key: 'booking', label: s.bookingPhoneLabel, value: ex.bookingPhone, href: `tel:${ex.bookingPhone}`, icon: <CalendarCheck/> },
    profile.whatsapp && profile.whatsapp !== profile.phone && { key: 'wa', label: t.whatsapp, value: profile.whatsapp, href: waHref, icon: <MessageCircle/> },
    profile.email && { key: 'mail', label: t.emailLabel, value: profile.email, href: `mailto:${profile.email}`, icon: <AtSign/> },
    profile.clinicAddress && { key: 'address', label: t.addressLabel, value: profile.clinicAddress, href: profile.mapsUrl || '', icon: <MapPin/> },
    profile.website && { key: 'site', label: t.websiteLabel, value: profile.website.replace(/^https?:\/\//, '').replace(/\/$/, ''), href: profile.website, icon: <Globe2/> },
  ].filter(Boolean) as { key: string; label: string; value: string; href: string; icon: ReactNode }[];
  const external = (href: string) => href.startsWith('https://') ? { target: '_blank', rel: 'noreferrer' } : {};
  const initial = initialOf(displayName);
  let step = 0; const reveal = () => ({ '--i': step++ } as CSSProperties);

  return <main className="doctor-profile-page has-dock" dir={dir} lang={locale} style={tint ? { '--photo-tint': tint } as CSSProperties : undefined}>
    <div className="profile-backdrop" aria-hidden="true">{portrait && <img src={portrait} alt=""/>}</div>
    <header className="doctor-profile-top"><Brand/>{langSwitch}</header>

    <article className="doctor-profile-card">
      <MedicalLineArt className="profile-art"/>
      <section className={`profile-hero ${portrait ? 'has-photo' : 'no-photo'}`} style={reveal()}>
        {portrait
          ? <img className="profile-hero-photo" src={portrait} alt={displayName}/>
          : <><MedicalLineArt className="profile-hero-art"/><div className="profile-monogram" aria-hidden="true">{initial || <UserRound size={34}/>}</div></>}
        <span className="profile-chip"><i/>{t.profile}</span>
        <div className="profile-hero-text">
          <h1>{displayName}</h1>
          {altName && <p className="profile-alt-name"><bdi>{altName}</bdi></p>}
          {ex.workplaces[0] && <p className="profile-workplace"><Hospital size={15}/><span>{ex.workplaces[0]}</span>{ex.workplaces.length > 1 && <em>+{ex.workplaces.length - 1}</em>}</p>}
          {profile.specialty && <div className="profile-tags"><span className="profile-tag"><Stethoscope size={14}/>{profile.specialty}</span></div>}
        </div>
      </section>

      {quick.length > 0 && <nav className="profile-quick" aria-label={t.contactNav} style={reveal()}>
        {quick.map((item, index) => <a key={item.key} className={index === 0 ? 'is-primary' : undefined} href={item.href} {...external(item.href)}><span className="quick-circle">{item.icon}</span><span className="quick-label">{item.label}</span></a>)}
      </nav>}

      {(status || ex.hoursNote) && <section className="profile-section" style={reveal()}>
        <div className="section-head"><h2>{s.hours}</h2>{status && <span className={`open-pill${status.open ? ' is-open' : ''}`}><i/>{statusText}</span>}</div>
        {status && <ul className="profile-hours">{week.map((item) => <li key={item.day} className={`${item.day === now.day ? 'is-today' : ''}${item.open ? '' : ' is-off'}`}>
          <span className="hours-name">{s.days[item.day]}</span>
          <span className="hours-value" dir="ltr">{item.open ? <bdi>{formatTime(item.from, locale)} – {formatTime(item.to, locale)}</bdi> : <bdi>{s.dayOff}</bdi>}</span>
        </li>)}</ul>}
        {ex.hoursNote && <p className="hours-note" dir="auto"><Clock3 size={14}/>{ex.hoursNote}</p>}
      </section>}

      {(ex.fees.consultation || ex.fees.followUp || ex.insurance.length > 0) && <section className="profile-section" style={reveal()}><h2>{s.visit}</h2>
        {(ex.fees.consultation || ex.fees.followUp) && <><div className="profile-fees">
          {ex.fees.consultation && <div className="fee-tile is-main"><small>{s.consultation}</small><b dir="auto">{ex.fees.consultation}</b></div>}
          {ex.fees.followUp && <div className="fee-tile"><small>{s.followUp}</small><b dir="auto">{ex.fees.followUp}</b></div>}
        </div><p className="fee-note">{s.feeNote}</p></>}
        {ex.insurance.length > 0 && <div className="profile-insurance"><small>{s.insurance}</small><ul className="profile-services">{ex.insurance.map((item) => <li key={item} dir="auto"><BadgeCheck size={14}/>{item}</li>)}</ul></div>}
      </section>}

      {profile.bio && <section className="profile-section" style={reveal()}><h2>{t.bio}</h2><p className="profile-about-text" dir="auto">{profile.bio}</p></section>}

      {ex.services.length > 0 && <section className="profile-section" style={reveal()}><h2>{s.services}</h2>
        <ul className="profile-services">{ex.services.map((item) => <li key={item} dir="auto">{item}</li>)}</ul>
      </section>}

      {ex.credentials.length > 0 && <section className="profile-section" style={reveal()}><h2>{s.credentials}</h2>
        <ul className="profile-list">{ex.credentials.map((item) => <li key={item}><span className="row-icon"><GraduationCap/></span><span dir="auto">{item}</span></li>)}</ul>
      </section>}

      {ex.workplaces.length > 1 && <section className="profile-section" style={reveal()}><h2>{s.workplaces}</h2>
        <ul className="profile-list">{ex.workplaces.map((item) => <li key={item}><span className="row-icon"><Hospital/></span><span dir="auto">{item}</span></li>)}</ul>
      </section>}

      {details.length > 0 && <section className="profile-section" style={reveal()}><h2>{t.details}</h2>
        <ul className="profile-rows">{details.map((row) => <li key={row.key}>
          {row.href
            ? <a className="row-main" href={row.href} {...external(row.href)}><span className="row-icon">{row.icon}</span><span className="row-text"><small>{row.label}</small><b dir="auto">{row.value}</b></span></a>
            : <div className="row-main"><span className="row-icon">{row.icon}</span><span className="row-text"><small>{row.label}</small><b dir="auto">{row.value}</b></span></div>}
          <button type="button" className={`row-copy${copiedKey === row.key ? ' is-done' : ''}`} onClick={() => void copyValue(row.key, row.value)} aria-label={`${t.copyValue} ${row.label}`}>{copiedKey === row.key ? <Check size={16}/> : <Copy size={16}/>}</button>
        </li>)}</ul>
      </section>}

      <footer className="doctor-profile-footer" style={reveal()}><span>{t.powered}</span><b><span className="footer-mark"><Stethoscope size={12}/></span>DOCTOR CARDS</b></footer>
    </article>
    <footer className="doctor-profile-disclaimer">{t.disclaimer}</footer>

    <div className="profile-dock">
      {booking
        ? <><a className="dock-save" href={booking} {...external(booking)}><CalendarCheck size={19}/><span>{s.book}</span></a><a className="dock-share" href={`/api/cards/${token}/vcf`} aria-label={t.save} title={t.save}><ContactRound size={19}/></a></>
        : <a className="dock-save" href={`/api/cards/${token}/vcf`}><ContactRound size={19}/><span>{t.save}</span></a>}
      <button type="button" className="dock-share" onClick={() => setSheetOpen(true)} aria-label={s.shareTitle} title={s.shareTitle} aria-haspopup="dialog"><QrCode size={19}/></button>
    </div>
    {sheetOpen && <div className="profile-sheet-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setSheetOpen(false); }}>
      <div className="profile-sheet" role="dialog" aria-modal="true" aria-labelledby="share-sheet-title">
        <button type="button" className="sheet-close" onClick={() => setSheetOpen(false)} aria-label={s.close}><X size={18}/></button>
        <h2 id="share-sheet-title">{s.shareTitle}</h2>
        <p>{s.shareHint}</p>
        <div className="sheet-qr">{qrData ? <img src={qrData} alt={`QR · ${displayName}`}/> : <span className="sheet-qr-loading"/>}</div>
        <b className="sheet-name">{displayName}</b>
        <div className="sheet-actions">
          <button type="button" className="sheet-primary" onClick={() => void share()}><Share2 size={17}/>{s.shareVia}</button>
          <button type="button" className="sheet-secondary" onClick={() => void copyLink()}><Link2 size={17}/>{s.copyLink}</button>
        </div>
      </div>
    </div>}
    {notice && <div role="status" className="profile-share-toast">{notice}</div>}
  </main>;
}
function Brand() { return <div className="profile-brand-lockup"><span className="brand-mark"><Stethoscope size={15}/></span><b>DOCTOR<span>CARDS</span></b></div>; }
