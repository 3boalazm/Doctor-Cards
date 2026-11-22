'use client';

import { FormEvent, useState } from 'react';
import { Check, ShieldCheck, Stethoscope } from 'lucide-react';
import type { Dispatch, SetStateAction } from 'react';

type ClaimProfile = { state?: 'ACTIVE' | 'UNCLAIMED'; doctorNameAr: string; doctorNameEn: string; specialty: string; phone: string; whatsapp: string; email: string; clinicAddress: string; mapsUrl: string; website: string; bio: string; portraitData?: string | null };
const initial = { doctorNameAr: '', doctorNameEn: '', specialty: '', phone: '', whatsapp: '', email: '', clinicAddress: '', mapsUrl: '', website: '', bio: '', consentProfile: false };
export default function ClaimForm({ token, serial, locale, onClaimed }: { token: string; serial: string; locale: 'ar' | 'en'; onClaimed: Dispatch<SetStateAction<ClaimProfile | null>> }) {
  const [form, setForm] = useState(initial); const [error, setError] = useState(''); const [saving, setSaving] = useState(false);
  const en = locale === 'en';
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setSaving(true); setError('');
    try {
      const response = await fetch(`/api/cards/${token}/claim`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not claim this card.');
      const profileResponse = await fetch(`/api/cards/${token}`, { cache: 'no-store' });
      if (!profileResponse.ok) throw new Error('Claim was saved but the profile could not be loaded.');
      onClaimed(await profileResponse.json());
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'حدث خطأ غير متوقع.'); }
    finally { setSaving(false); }
  };
  const field = (key: Exclude<keyof typeof initial, 'consentProfile'>, label: string, placeholder: string, required = false, type = 'text') => <label className="claim-field"><span>{label}</span><input type={type} required={required} value={form[key]} onChange={(event) => setForm({ ...form, [key]: event.target.value })} placeholder={placeholder}/></label>;
  return <main className="doctor-profile-page" dir={en ? 'ltr' : 'rtl'} lang={locale}><header className="doctor-profile-top"><div className="profile-brand-lockup"><span className="brand-mark"><Stethoscope size={16}/></span><b>DOCTOR<span>CARDS</span></b></div><span className="claim-serial">{serial}</span></header><section className="claim-card"><span className="claim-kicker"><i/> {en ? 'UNCLAIMED CARD' : 'كارت غير مفعّل'}</span><h1>{en ? 'Claim your doctor card' : 'فعّل كارتك التعريفي'}</h1><p>{en ? 'Add your public details. Your profile will be published on this QR after you confirm consent.' : 'أكمل بياناتك التي ترغب في إتاحتها. هتظهر على صفحة الـQR بعد تأكيد موافقتك.'}</p><form onSubmit={submit} className="claim-form"><div className="claim-fields">{field('doctorNameAr', en ? 'Name in Arabic *' : 'اسم الدكتور بالعربي *', en ? 'Dr. Ahmed...' : 'د. أحمد محمود', true)}{field('doctorNameEn', en ? 'Name in English' : 'الاسم بالإنجليزي', 'Dr. Ahmed Mahmoud')}{field('specialty', en ? 'Specialty' : 'التخصص', en ? 'Cardiology' : 'التخصص')}{field('phone', en ? 'Phone' : 'رقم الهاتف', '+20 10 0000 0000', false, 'tel')}{field('whatsapp', 'WhatsApp', '+20 10 0000 0000', false, 'tel')}{field('email', en ? 'Email' : 'البريد الإلكتروني', 'doctor@example.com', false, 'email')}{field('clinicAddress', en ? 'Clinic address' : 'عنوان العيادة', en ? 'City, area' : 'المدينة، المنطقة')}{field('mapsUrl', 'Google Maps URL', 'https://maps.app.goo.gl/...')}{field('website', en ? 'Website' : 'الموقع الإلكتروني', 'https://example.com')}</div><label className="claim-field"><span>{en ? 'Short bio' : 'نبذة قصيرة'}</span><textarea maxLength={500} rows={3} value={form.bio} onChange={(event) => setForm({ ...form, bio: event.target.value })}/></label><label className="claim-consent"><input type="checkbox" required checked={form.consentProfile} onChange={(event) => setForm({ ...form, consentProfile: event.target.checked })}/><ShieldCheck size={16}/><span>{en ? 'I consent to publish the information above on my profile.' : 'أوافق على نشر البيانات أعلاه في بروفايلي.'}</span></label>{error && <div className="claim-error" role="alert">{error}</div>}<button className="claim-submit" disabled={saving}>{saving ? (en ? 'Saving...' : 'جارٍ التفعيل...') : <><Check size={17}/>{en ? 'Claim and publish card' : 'تفعيل الكارت ونشر البروفايل'}</>}</button></form></section></main>;
}
