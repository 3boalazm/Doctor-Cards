'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import { Activity, ArrowDownLeft, ArrowLeft, ArrowUpRight, BadgeCheck, BarChart3, Bell, BookOpen, Check, ChevronDown, CircleHelp, Copy, CreditCard, Download, ExternalLink, FileOutput, Filter, Globe2, LayoutDashboard, Link2, Menu, MoreHorizontal, Plus, Pause, Pencil, Play, Printer, Search, Send, Settings2, ShieldCheck, Stethoscope, Users, X } from 'lucide-react';

type Card = {
  id: string; doctorNameAr: string; doctorNameEn: string; specialty: string; phone: string; whatsapp: string; email: string;
  clinicAddress: string; mapsUrl: string; website: string; bio: string; serial: string; token: string;
  edition: 'STANDARD' | 'LIMITED' | 'DEMO'; status: 'ACTIVE' | 'SUSPENDED'; distributionStatus: 'NOT_DISTRIBUTED' | 'DISTRIBUTED'; consentProfile: boolean; consentPhoto: boolean;
  createdAt: string; scans?: number;
};
type FormValues = Omit<Card, 'id' | 'serial' | 'token' | 'status' | 'distributionStatus' | 'createdAt' | 'scans'>;
const blank: FormValues = { doctorNameAr: '', doctorNameEn: '', specialty: '', phone: '', whatsapp: '', email: '', clinicAddress: '', mapsUrl: '', website: '', bio: '', edition: 'STANDARD', consentProfile: false, consentPhoto: false };
const editionName = { STANDARD: 'Standard', LIMITED: 'Limited', DEMO: 'نسخة تجريبية' };

export default function Home() {
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Card | null>(null);
  const [form, setForm] = useState<FormValues>(blank);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [qr, setQr] = useState<{ data: string; url: string; name: string; serial: string } | null>(null);
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [password, setPassword] = useState('');

  const load = useCallback(async () => {
    try { const response = await fetch('/api/cards', { cache: 'no-store' }); setCards(await response.json()); }
    catch { setError('تعذر الاتصال بالخادم المحلي.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => {
    void fetch('/api/auth').then((r) => r.json()).then((result) => {
      setAuthenticated(Boolean(result.authenticated));
      if (result.authenticated) void load(); else setLoading(false);
    }).catch(() => { setAuthenticated(false); setLoading(false); });
  }, [load]);

  const signIn = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setError('');
    const response = await fetch('/api/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) });
    const result = await response.json();
    if (!response.ok) { setError(result.error || 'تعذر تسجيل الدخول.'); return; }
    setAuthenticated(true); setLoading(true); await load();
  };
  const signOut = async () => { await fetch('/api/auth', { method: 'DELETE' }); setAuthenticated(false); setCards([]); };

  const filtered = useMemo(() => cards.filter((card) => `${card.doctorNameAr} ${card.doctorNameEn} ${card.serial}`.toLowerCase().includes(query.toLowerCase())), [cards, query]);
  const totalScans = cards.reduce((sum, card) => sum + (card.scans ?? 0), 0);
  const activeCount = cards.filter((card) => card.status === 'ACTIVE').length;
  const showQr = async (card: Card) => {
    const url = `${window.location.origin}/c/${card.token}`;
    const data = await QRCode.toDataURL(url, { width: 480, margin: 2, color: { dark: '#142522', light: '#ffffff' } });
    setQr({ data, url, name: card.doctorNameAr, serial: card.serial });
  };
  const create = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setError(''); setSaving(true);
    try {
      const response = await fetch(editing ? `/api/cards/${editing.token}` : '/api/cards', { method: editing ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'تعذر حفظ البيانات');
      setForm(blank); setOpen(false); setEditing(null); await load(); setNotice(editing ? 'تم تحديث البروفايل والكارت مع بقاء رابط QR كما هو.' : 'اتعمل بروفايل وكارت QR جديد بنجاح.');
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'حدث خطأ غير متوقع.'); }
    finally { setSaving(false); }
  };
  const copy = async (value: string) => { await navigator.clipboard.writeText(value); setNotice('تم نسخ الرابط.'); setTimeout(() => setNotice(''), 2600); };
  const updateCardAction = async (card: Card, action: string, value: string) => {
    const key = action === 'toggle-status' ? 'status' : 'distributionStatus';
    const response = await fetch(`/api/cards/${card.token}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, [key]: value }) });
    if (!response.ok) { setNotice('تعذر تحديث حالة الكارت.'); return; }
    await load(); setNotice(action === 'toggle-status' ? (value === 'ACTIVE' ? 'تم تفعيل الكارت.' : 'تم إيقاف الكارت.') : 'تم تحديث حالة التوزيع.');
  };
  const exportCsv = async () => {
    const response = await fetch('/api/export');
    if (!response.ok) { setNotice('تعذر تصدير البيانات.'); return; }
    const blob = await response.blob(); const url = URL.createObjectURL(blob); const link = document.createElement('a');
    link.href = url; link.download = 'doctor-cards.csv'; link.click(); URL.revokeObjectURL(url); setNotice('تم تنزيل ملف CSV.');
  };
  const editCard = (card: Card) => {
    setEditing(card); setError('');
    setForm({ doctorNameAr: card.doctorNameAr, doctorNameEn: card.doctorNameEn, specialty: card.specialty, phone: card.phone, whatsapp: card.whatsapp, email: card.email, clinicAddress: card.clinicAddress, mapsUrl: card.mapsUrl, website: card.website, bio: card.bio, edition: card.edition, consentProfile: card.consentProfile, consentPhoto: card.consentPhoto });
    setOpen(true);
  };

  if (authenticated === null) return <main className="login-screen"><div className="login-card"><div className="brand-mark"><CreditCard size={21}/></div><h1>Doctor Cards</h1><p>سجّل الدخول للوحة الإدارة.</p><form onSubmit={signIn}><label>كلمة المرور<input autoFocus type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="أدخل كلمة المرور"/></label>{error && <div className="form-error">{error}</div>}<button className="primary-button">دخول لوحة الإدارة</button></form><small>الدخول للمصرّح لهم فقط.</small></div></main>;
  if (!authenticated) return <main className="login-screen"><div className="login-card"><div className="brand-mark"><CreditCard size={21}/></div><h1>Doctor Cards</h1><p>سجّل الدخول للوحة الإدارة.</p><form onSubmit={signIn}><label>كلمة المرور<input autoFocus type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="أدخل كلمة المرور"/></label>{error && <div className="form-error">{error}</div>}<button className="primary-button">دخول لوحة الإدارة</button></form><small>الدخول للمصرّح لهم فقط.</small></div></main>;

  return <main className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark"><CreditCard size={21}/><span className="brand-dot"/></div><div><strong>DOCTOR<span>CARDS</span></strong><small>إدارة الكروت الذكية</small></div><button className="mobile-close"><Menu size={19}/></button></div>
      <div className="workspace"><div className="workspace-icon">A</div><div><b>Aboalazm</b><small>مساحة العمل</small></div><ChevronDown size={15} className="muted-icon"/></div>
      <div className="nav-label">القائمة الرئيسية</div>
      <nav className="nav-list"><a className="nav-item active"><LayoutDashboard size={18}/><span>نظرة عامة</span></a><a className="nav-item"><Users size={18}/><span>الأطباء والكروت</span><span className="nav-count">{cards.length}</span></a><a className="nav-item"><FileOutput size={18}/><span>استوديو الطباعة</span><span className="soon">قريبًا</span></a><a className="nav-item"><BarChart3 size={18}/><span>التحليلات</span></a></nav>
      <div className="nav-label second-label">إدارة</div>
      <nav className="nav-list"><a className="nav-item"><Settings2 size={18}/><span>القوالب والإصدارات</span></a><a className="nav-item"><ShieldCheck size={18}/><span>سجل النشاط</span></a></nav>
      <div className="side-bottom"><div className="help-card"><div className="help-icon"><CircleHelp size={16}/></div><b>محتاج مساعدة؟</b><p>راجع دليل تجهيز الكروت وإدارة البروفايلات.</p><button>افتح دليل الاستخدام <ArrowLeft size={14}/></button></div><div className="user-profile"><div className="user-avatar">م</div><div className="user-copy"><b>مدير النظام</b><small>مسؤول الشركة · محلي</small></div><button type="button" className="logout-button" onClick={() => void signOut()} title="تسجيل الخروج"><ArrowLeft size={16}/></button></div></div>
    </aside>

    <section className="main-area">
      <header className="topbar"><div className="breadcrumb"><span>مساحة العمل</span><span className="crumb-sep">/</span><b>نظرة عامة</b></div><div className="top-actions"><span className="environment"><i/> بيئة تجريبية</span><button className="icon-button" aria-label="الإشعارات"><Bell size={18}/><i/></button><div className="top-avatar">م</div></div></header>
      <div className="content">
        <div className="welcome-row"><div><div className="eyebrow"><span className="eyebrow-line"/> مركز إدارة الكروت</div><h1>صباح الخير، مدير النظام <span>👋</span></h1><p className="subheading">نظرة سريعة على بروفايلات الدكاترة والكروت الصادرة.</p></div><button className="primary-button" onClick={() => { setError(''); setEditing(null); setForm(blank); setOpen(true); }}><Plus size={18}/> إضافة دكتور</button></div>
        <div className="prototype-note"><span className="note-mark"><Activity size={16}/></span><div><b>نسخة تأسيسية قيد التطوير</b><span>البيانات محفوظة محليًا للتجربة فقط — لا تدخل بيانات حقيقية قبل ربط قاعدة البيانات وتفعيل تسجيل الدخول.</span></div><button aria-label="إخفاء" onClick={(e) => e.currentTarget.parentElement?.remove()}><X size={16}/></button></div>
        <div className="stats-grid">
          <Stat icon={<Users size={18}/>} label="إجمالي الكروت" value={String(cards.length).padStart(2, '0')} hint="كل الإصدارات" tone="mint"/>
          <Stat icon={<BadgeCheck size={18}/>} label="كروت نشطة" value={String(activeCount).padStart(2, '0')} hint="جاهزة للاستخدام" tone="blue"/>
          <Stat icon={<Activity size={18}/>} label="مرات المسح" value={totalScans.toLocaleString('en-US')} hint="إجمالي محفوظ محليًا" tone="orange"/>
          <Stat icon={<CreditCard size={18}/>} label="نسخ تجريبية" value={String(cards.filter((card) => card.edition === 'DEMO').length).padStart(2, '0')} hint="Demo cards" tone="violet"/>
        </div>
        <div className="section-heading"><div><h2>الأطباء والكروت</h2><p>إدارة بيانات البروفايل، معاينة QR، وحالة كل كارت.</p></div><button className="secondary-button" onClick={() => void exportCsv()}><Download size={16}/> تصدير CSV</button></div>
        <div className="table-card"><div className="table-toolbar"><div className="search-box"><Search size={17}/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="ابحث بالاسم أو السيريال..."/><kbd>⌘ K</kbd></div><div className="toolbar-actions"><button className="filter-button" onClick={() => setNotice('الفلاتر المتقدمة ضمن الخطوة التالية.') }><Filter size={16}/> تصفية</button><button className="view-toggle"><span className="selected-view"><LayoutDashboard size={15}/></span><span><MoreHorizontal size={16}/></span></button></div></div>
          <div className="table-wrap"><table><thead><tr><th className="doctor-col">الدكتور</th><th>السيريال</th><th>الإصدار</th><th>حالة الكارت</th><th>مرات المسح</th><th>تاريخ الإضافة</th><th><span className="sr-only">إجراءات</span></th></tr></thead><tbody>
            {loading ? <tr><td colSpan={7} className="empty-row">جارٍ تحميل البيانات...</td></tr> : filtered.length ? filtered.map((card) => <tr key={card.id}><td><div className="doctor-cell"><div className={`doctor-avatar ${card.edition.toLowerCase()}`}>{card.doctorNameAr.trim().slice(0, 1)}</div><div><b>{card.doctorNameAr}</b><small>{card.specialty || 'تخصص غير محدد'}</small></div></div></td><td><span className="serial">{card.serial}</span></td><td><span className={`edition-tag ${card.edition.toLowerCase()}`}><i/>{editionName[card.edition]}</span></td><td><span className={`status-tag ${card.status.toLowerCase()}`}><i/> {card.status === 'ACTIVE' ? 'نشط' : 'موقوف'}</span><span className={`distribution-tag ${card.distributionStatus.toLowerCase()}`}>{card.distributionStatus === 'DISTRIBUTED' ? 'تم التسليم' : 'غير موزع'}</span></td><td><span className="scan-count"><Activity size={14}/>{card.scans ?? 0}</span></td><td className="date-cell">{new Intl.DateTimeFormat('ar-EG', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(card.createdAt))}</td><td><div className="row-actions"><button title="عرض QR" onClick={() => void showQr(card)}><QrMini/></button><a title="فتح البروفايل" href={`/c/${card.token}`} target="_blank" rel="noreferrer"><ExternalLink size={15}/></a><a title="معاينة الطباعة" href={`/print/${card.token}`} target="_blank" rel="noreferrer"><Printer size={14}/></a><button title="تعديل البروفايل" onClick={() => editCard(card)}><Pencil size={14}/></button><button title={card.status === 'ACTIVE' ? 'إيقاف الكارت' : 'تفعيل الكارت'} onClick={() => void updateCardAction(card, 'toggle-status', card.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE')}>{card.status === 'ACTIVE' ? <Pause size={14}/> : <Play size={14}/>}</button><button title={card.distributionStatus === 'DISTRIBUTED' ? 'إلغاء تسجيل التسليم' : 'تسجيل التسليم'} onClick={() => void updateCardAction(card, 'toggle-distribution', card.distributionStatus === 'DISTRIBUTED' ? 'NOT_DISTRIBUTED' : 'DISTRIBUTED')}><Send size={14}/></button><button title="نسخ الرابط" onClick={() => void copy(`${window.location.origin}/c/${card.token}`)}><Copy size={14}/></button></div></td></tr>) : <tr><td colSpan={7}><div className="empty-state"><div className="empty-icon"><Stethoscope size={22}/></div><b>{query ? 'مفيش نتائج مطابقة' : 'لسه مفيش كروت هنا'}</b><span>{query ? 'جرّب البحث باسم أو سيريال تاني.' : 'ابدأ بإضافة أول دكتور وأنشئ له بروفايل وكارت QR.'}</span>{!query && <button className="text-button" onClick={() => setOpen(true)}>إضافة أول دكتور <ArrowLeft size={15}/></button>}</div></td></tr>}
          </tbody></table></div><div className="table-footer"><span>عرض <b>{filtered.length}</b> من <b>{cards.length}</b> كارت</span><div className="pagination"><button disabled><ArrowDownLeft size={14}/></button><span>1</span><button disabled><ArrowUpRight size={14}/></button></div></div></div>
        <footer className="footer"><span>Doctor Cards <b>·</b> نسخة تأسيسية</span><span><ShieldCheck size={14}/> بيانات المسح: تفاصيل 60 يومًا ومجاميع شهرية</span></footer>
      </div>
    </section>

    {open && <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(false); }}><form className="modal" onSubmit={create}><div className="modal-head"><div><span className="modal-kicker">{editing ? `تعديل ${editing.serial}` : 'ملف جديد'}</span><h2>{editing ? 'تعديل البروفايل' : 'إضافة دكتور'}</h2><p>{editing ? 'تحديث البيانات لا يغيّر رابط QR المطبوع.' : 'أدخل البيانات الأساسية لإنشاء البروفايل ورابط QR.'}</p></div><button type="button" className="close-button" onClick={() => setOpen(false)}><X size={19}/></button></div><div className="form-scroll"><div className="form-section-title">البيانات الأساسية <span>* مطلوبة</span></div><div className="form-grid"><Field label="اسم الدكتور بالعربي *" required value={form.doctorNameAr} onChange={(doctorNameAr) => setForm({ ...form, doctorNameAr })} placeholder="د. أحمد محمود"/><Field label="الاسم بالإنجليزي" value={form.doctorNameEn} onChange={(doctorNameEn) => setForm({ ...form, doctorNameEn })} placeholder="Dr. Ahmed Mahmoud"/><Field label="التخصص" value={form.specialty} onChange={(specialty) => setForm({ ...form, specialty })} placeholder="طب الأسنان"/><label className="field"><span>نوع الإصدار</span><select disabled={Boolean(editing)} value={form.edition} onChange={(e) => setForm({ ...form, edition: e.target.value as FormValues['edition'] })}><option value="STANDARD">Standard · ورقي</option><option value="LIMITED">Limited · يدوي</option><option value="DEMO">نسخة تجريبية</option></select></label></div><div className="form-section-title separated">وسائل التواصل <span>اختياري</span></div><div className="form-grid"><Field label="رقم الهاتف" value={form.phone} onChange={(phone) => setForm({ ...form, phone })} placeholder="+20 10 0000 0000"/><Field label="WhatsApp" value={form.whatsapp} onChange={(whatsapp) => setForm({ ...form, whatsapp })} placeholder="+20 10 0000 0000"/><Field label="البريد الإلكتروني" value={form.email} onChange={(email) => setForm({ ...form, email })} placeholder="doctor@example.com" type="email"/><Field label="الموقع الإلكتروني" value={form.website} onChange={(website) => setForm({ ...form, website })} placeholder="https://example.com"/><Field label="عنوان العيادة" value={form.clinicAddress} onChange={(clinicAddress) => setForm({ ...form, clinicAddress })} placeholder="المنطقة، المدينة"/><Field label="رابط Google Maps" value={form.mapsUrl} onChange={(mapsUrl) => setForm({ ...form, mapsUrl })} placeholder="https://maps.app.goo.gl/..."/></div><label className="field full-field"><span>نبذة قصيرة</span><textarea rows={3} maxLength={500} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} placeholder="نبذة مهنية مختصرة عن الدكتور..."/></label><div className="consent-box"><ShieldCheck size={18}/><label><input type="checkbox" checked={form.consentProfile} onChange={(e) => setForm({ ...form, consentProfile: e.target.checked })}/><span>أؤكد موافقة الدكتور على نشر بيانات البروفايل المدخلة. <b>*</b></span></label></div><div className="consent-box photo-consent"><Globe2 size={17}/><label><input type="checkbox" checked={form.consentPhoto} onChange={(e) => setForm({ ...form, consentPhoto: e.target.checked })}/><span>موافقة نشر الصورة (لو هتضاف لاحقًا).</span></label></div>{error && <div className="form-error">{error}</div>}</div><div className="modal-foot"><button type="button" className="secondary-button" onClick={() => setOpen(false)}>إلغاء</button><button className="primary-button" disabled={saving}>{saving ? 'جارٍ الحفظ...' : editing ? <><Check size={17}/> حفظ التعديلات</> : <><Plus size={17}/> إنشاء بروفايل وكارت</>}</button></div></form></div>}
    {qr && <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) setQr(null); }}><div className="qr-modal"><button className="close-button qr-close" onClick={() => setQr(null)}><X size={19}/></button><div className="qr-modal-kicker">QR CARD · {qr.serial}</div><h2>{qr.name}</h2><p>امسح الكود لفتح صفحة البروفايل</p><img src={qr.data} alt={`QR code for ${qr.name}`}/><div className="qr-link" dir="ltr">{qr.url}</div><div className="qr-modal-actions"><button className="secondary-button" onClick={() => void copy(qr.url)}><Copy size={15}/> نسخ الرابط</button><a href={qr.url} target="_blank" rel="noreferrer" className="primary-button"><ExternalLink size={15}/> فتح الصفحة</a></div></div></div>}
    {notice && <div className="toast"><Check size={17}/>{notice}<button onClick={() => setNotice('')}><X size={14}/></button></div>}
  </main>;
}

function Stat({ icon, label, value, hint, tone }: { icon: React.ReactNode; label: string; value: string; hint: string; tone: string }) { return <div className="stat-card"><div className={`stat-icon ${tone}`}>{icon}</div><div className="stat-copy"><span>{label}</span><b>{value}</b><small>{hint}</small></div><div className="stat-decoration"/></div>; }
function Field({ label, value, onChange, placeholder, type = 'text', required = false }: { label: string; value: string; onChange: (value: string) => void; placeholder: string; type?: string; required?: boolean }) { return <label className="field"><span>{label}</span><input type={type} required={required} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}/></label>; }
function QrMini() { return <span className="qr-mini"><i/><i/><i/><i/><i/><i/><i/><i/><i/></span>; }
