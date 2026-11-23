'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import { resizePortrait } from '@/lib/resize-portrait';
import { defaultHours, fullWeek, type ProfileExtras } from '@/lib/profile-extras';
import HoursEditor from '@/components/hours-editor';
import MedicalLineArt from '@/components/medical-line-art';
import './admin-theme.css';
import { Activity, ArrowDownLeft, ArrowLeft, ArrowUpRight, BadgeCheck, BarChart3, Bell, BookOpen, Check, ChevronDown, CircleHelp, Copy, CreditCard, Download, ExternalLink, FileOutput, Filter, Globe2, ImagePlus, LayoutDashboard, Link2, Menu, MoreHorizontal, Plus, Pause, Pencil, Play, Printer, Search, Send, Settings2, ShieldCheck, Stethoscope, Users, X } from 'lucide-react';

type Card = {
  id: string; doctorNameAr: string; doctorNameEn: string; specialty: string; phone: string; whatsapp: string; email: string;
  clinicAddress: string; mapsUrl: string; website: string; bio: string; serial: string; token: string;
  edition: 'STANDARD' | 'LIMITED' | 'DEMO'; status: 'UNCLAIMED' | 'ACTIVE' | 'SUSPENDED'; distributionStatus: 'NOT_DISTRIBUTED' | 'DISTRIBUTED'; consentProfile: boolean; consentPhoto: boolean;
  portraitData: string | null; createdAt: string; scans?: number; extras?: ProfileExtras;
};
// List sections are edited as one-item-per-line text; the API splits and sanitizes them.
type ExtrasForm = Omit<ProfileExtras, 'workplaces' | 'credentials' | 'services' | 'insurance'> & { workplaces: string; credentials: string; services: string; insurance: string };
type FormValues = Omit<Card, 'id' | 'serial' | 'token' | 'status' | 'distributionStatus' | 'createdAt' | 'scans' | 'extras'> & { extras: ExtrasForm };
const toExtrasForm = (extras?: ProfileExtras): ExtrasForm => ({ workplaces: (extras?.workplaces ?? []).join('\n'), bookingUrl: extras?.bookingUrl ?? '', bookingPhone: extras?.bookingPhone ?? '', hours: extras?.hours?.length ? fullWeek(extras.hours) : defaultHours(), hoursNote: extras?.hoursNote ?? '', credentials: (extras?.credentials ?? []).join('\n'), services: (extras?.services ?? []).join('\n'), fees: { consultation: extras?.fees?.consultation ?? '', followUp: extras?.fees?.followUp ?? '' }, insurance: (extras?.insurance ?? []).join('\n') });
const blank: FormValues = { doctorNameAr: '', doctorNameEn: '', specialty: '', phone: '', whatsapp: '', email: '', clinicAddress: '', mapsUrl: '', website: '', bio: '', edition: 'STANDARD', consentProfile: false, consentPhoto: false, portraitData: null, extras: toExtrasForm() };
const editionName = { STANDARD: 'Standard', LIMITED: 'Limited', DEMO: 'نسخة تجريبية' };

export default function Home() {
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | Card['status']>('ALL');
  const [editionFilter, setEditionFilter] = useState<'ALL' | Card['edition']>('ALL');
  const [open, setOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkCount, setBulkCount] = useState(8);
  const [editing, setEditing] = useState<Card | null>(null);
  const [form, setForm] = useState<FormValues>(blank);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [noticeKind, setNoticeKind] = useState<'success' | 'error'>('success');
  const notify = (message: string, kind: 'success' | 'error' = 'success') => { setNotice(message); setNoticeKind(kind); window.setTimeout(() => setNotice(''), 3000); };
  const [qr, setQr] = useState<{ data: string; svg: string; url: string; name: string; serial: string } | null>(null);
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [password, setPassword] = useState('');

  const load = useCallback(async () => {
    try { const response = await fetch('/api/cards', { cache: 'no-store' }); setCards(await response.json()); }
    catch { notify('تعذر الاتصال بالخادم.', 'error'); }
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

  const filtered = useMemo(() => cards.filter((card) => `${card.doctorNameAr} ${card.doctorNameEn} ${card.serial}`.toLowerCase().includes(query.toLowerCase()) && (statusFilter === 'ALL' || card.status === statusFilter) && (editionFilter === 'ALL' || card.edition === editionFilter)), [cards, query, statusFilter, editionFilter]);
  const totalScans = cards.reduce((sum, card) => sum + (card.scans ?? 0), 0);
  const activeCount = cards.filter((card) => card.status === 'ACTIVE').length;
  const showQr = async (card: Card) => {
    const url = `${window.location.origin}/c/${card.token}`;
    const options = { width: 480, margin: 4, errorCorrectionLevel: 'Q' as const, color: { dark: '#080710', light: '#ffffff' } };
    const [data, svg] = await Promise.all([QRCode.toDataURL(url, options), QRCode.toString(url, { ...options, type: 'svg' })]);
    setQr({ data, svg, url, name: card.doctorNameAr || card.serial, serial: card.serial });
  };
  const create = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setError(''); setSaving(true);
    try {
      const response = await fetch(editing ? `/api/cards/${editing.token}` : '/api/cards', { method: editing ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'تعذر حفظ البيانات');
      setForm(blank); setOpen(false); setEditing(null); await load(); notify(editing ? 'تم تحديث البروفايل والكارت مع بقاء رابط QR كما هو.' : 'اتعمل بروفايل وكارت QR جديد بنجاح.');
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'حدث خطأ غير متوقع.'); }
    finally { setSaving(false); }
  };
  const copy = async (value: string) => { try { await navigator.clipboard.writeText(value); notify('تم نسخ الرابط.'); } catch { notify('تعذر نسخ الرابط؛ تحقق من صلاحية الحافظة.', 'error'); } };
  const downloadQr = (format: 'png' | 'svg') => {
    if (!qr) return;
    const link = document.createElement('a');
    link.href = format === 'png' ? qr.data : `data:image/svg+xml;charset=utf-8,${encodeURIComponent(qr.svg)}`;
    link.download = `${qr.serial}.${format}`; link.click();
  };
  const generateBlankCards = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setSaving(true); setError('');
    try {
      const response = await fetch('/api/cards/bulk', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ count: bulkCount }) });
      const result = await response.json(); if (!response.ok) throw new Error(result.error || 'تعذر توليد الكروت.');
      setBulkOpen(false); await load(); notify(`اتولّد ${result.count} كروت فارغة جاهزة للطباعة والتفعيل.`);
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'حدث خطأ غير متوقع.'); }
    finally { setSaving(false); }
  };
  const updateCardAction = async (card: Card, action: string, value: string) => {
    try {
      const key = action === 'toggle-status' ? 'status' : 'distributionStatus';
      const response = await fetch(`/api/cards/${card.token}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, [key]: value }) });
      if (!response.ok) { notify('تعذر تحديث حالة الكارت.', 'error'); return; }
      await load(); notify(action === 'toggle-status' ? (value === 'ACTIVE' ? 'تم تفعيل الكارت.' : 'تم إيقاف الكارت.') : 'تم تحديث حالة التوزيع.');
    } catch { notify('حصل خطأ أثناء تحديث الكارت.', 'error'); }
  };
  const exportCsv = async () => {
    try {
      const response = await fetch('/api/export');
      if (!response.ok) { notify('تعذر تصدير البيانات.', 'error'); return; }
      const blob = await response.blob(); const url = URL.createObjectURL(blob); const link = document.createElement('a');
      link.href = url; link.download = 'doctor-cards.csv'; link.click(); URL.revokeObjectURL(url); notify('تم تنزيل ملف CSV.');
    } catch { notify('تعذر الاتصال أثناء تصدير البيانات.', 'error'); }
  };
  const uploadPortrait = async (file?: File) => {
    if (!file) return;
    setError('');
    try { const portraitData = await resizePortrait(file); setForm((current) => ({ ...current, portraitData })); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'تعذر تجهيز الصورة.'); }
  };
  const setExtra = (patch: Partial<ExtrasForm>) => setForm((current) => ({ ...current, extras: { ...current.extras, ...patch } }));
  const editCard = (card: Card) => {
    setEditing(card); setError('');
    setForm({ doctorNameAr: card.doctorNameAr, doctorNameEn: card.doctorNameEn, specialty: card.specialty, phone: card.phone, whatsapp: card.whatsapp, email: card.email, clinicAddress: card.clinicAddress, mapsUrl: card.mapsUrl, website: card.website, bio: card.bio, edition: card.edition, consentProfile: card.consentProfile, consentPhoto: card.consentPhoto, portraitData: card.portraitData ?? null, extras: toExtrasForm(card.extras) });
    setOpen(true);
  };

  if (authenticated === null) return <main className="login-screen"><MedicalLineArt className="admin-art login-art"/><div className="login-card"><div className="brand-mark"><Stethoscope size={21}/></div><h1>Doctor Cards</h1><p>سجّل الدخول للوحة الإدارة.</p><form onSubmit={signIn}><label>كلمة المرور<input autoFocus type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="أدخل كلمة المرور"/></label>{error && <div className="form-error">{error}</div>}<button className="primary-button">دخول لوحة الإدارة</button></form><small>الدخول للمصرّح لهم فقط.</small></div></main>;
  if (!authenticated) return <main className="login-screen"><MedicalLineArt className="admin-art login-art"/><div className="login-card"><div className="brand-mark"><Stethoscope size={21}/></div><h1>Doctor Cards</h1><p>سجّل الدخول للوحة الإدارة.</p><form onSubmit={signIn}><label>كلمة المرور<input autoFocus type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="أدخل كلمة المرور"/></label>{error && <div className="form-error">{error}</div>}<button className="primary-button">دخول لوحة الإدارة</button></form><small>الدخول للمصرّح لهم فقط.</small></div></main>;

  return <main className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark"><Stethoscope size={21}/><span className="brand-dot"/></div><div><strong>DOCTOR<span>CARDS</span></strong><small>إدارة الكروت الذكية</small></div><button className="mobile-close"><Menu size={19}/></button></div>
      <div className="workspace"><div className="workspace-icon">A</div><div><b>Aboalazm</b><small>مساحة العمل</small></div><ChevronDown size={15} className="muted-icon"/></div>
      <div className="nav-label">القائمة الرئيسية</div>
      <nav className="nav-list"><a className="nav-item active"><LayoutDashboard size={18}/><span>نظرة عامة</span></a><a className="nav-item"><Users size={18}/><span>الأطباء والكروت</span><span className="nav-count">{cards.length}</span></a><a className="nav-item"><FileOutput size={18}/><span>استوديو الطباعة</span><span className="soon">قريبًا</span></a><a className="nav-item"><BarChart3 size={18}/><span>التحليلات</span></a></nav>
      <div className="nav-label second-label">إدارة</div>
      <nav className="nav-list"><a className="nav-item"><Settings2 size={18}/><span>القوالب والإصدارات</span></a><a className="nav-item"><ShieldCheck size={18}/><span>سجل النشاط</span></a></nav>
      <div className="side-bottom"><div className="help-card"><div className="help-icon"><CircleHelp size={16}/></div><b>محتاج مساعدة؟</b><p>راجع دليل تجهيز الكروت وإدارة البروفايلات.</p><button>افتح دليل الاستخدام <ArrowLeft size={14}/></button></div><div className="user-profile"><div className="user-avatar">م</div><div className="user-copy"><b>مدير النظام</b><small>مسؤول الشركة · محلي</small></div><button type="button" className="logout-button" onClick={() => void signOut()} title="تسجيل الخروج"><ArrowLeft size={16}/></button></div></div>
    </aside>

    <section className="main-area">
      <MedicalLineArt className="admin-art"/>
      <header className="topbar"><div className="breadcrumb"><span>مساحة العمل</span><span className="crumb-sep">/</span><b>نظرة عامة</b></div><div className="top-actions"><span className="environment"><i/> بيئة تجريبية</span><button className="icon-button" aria-label="الإشعارات"><Bell size={18}/><i/></button><div className="top-avatar">م</div><button type="button" className="top-logout" onClick={() => void signOut()}><ArrowLeft size={14}/><span>خروج</span></button></div></header>
      <div className="content">
        <div className="welcome-row"><div><div className="eyebrow"><span className="eyebrow-line"/> مركز إدارة الكروت</div><h1>صباح الخير، مدير النظام <span>👋</span></h1><p className="subheading">نظرة سريعة على بروفايلات الدكاترة والكروت الصادرة.</p></div><button className="primary-button" onClick={() => { setError(''); setEditing(null); setForm(blank); setOpen(true); }}><Plus size={18}/> إضافة دكتور</button></div>
        <div className="prototype-note"><span className="note-mark"><Activity size={16}/></span><div><b>نسخة تأسيسية قيد التطوير</b><span>البيانات محفوظة محليًا للتجربة فقط — لا تدخل بيانات حقيقية قبل ربط قاعدة البيانات وتفعيل تسجيل الدخول.</span></div><button aria-label="إخفاء" onClick={(e) => e.currentTarget.parentElement?.remove()}><X size={16}/></button></div>
        <div className="stats-grid">
          <Stat icon={<Users size={18}/>} label="إجمالي الكروت" value={String(cards.length).padStart(2, '0')} hint="كل الإصدارات" tone="mint"/>
          <Stat icon={<BadgeCheck size={18}/>} label="كروت نشطة" value={String(activeCount).padStart(2, '0')} hint="جاهزة للاستخدام" tone="blue"/>
          <Stat icon={<Activity size={18}/>} label="مرات المسح" value={totalScans.toLocaleString('en-US')} hint="إجمالي محفوظ محليًا" tone="orange"/>
          <Stat icon={<CreditCard size={18}/>} label="نسخ تجريبية" value={String(cards.filter((card) => card.edition === 'DEMO').length).padStart(2, '0')} hint="Demo cards" tone="violet"/>
        </div>
        <div className="section-heading"><div><h2>الأطباء والكروت</h2><p>إدارة بيانات البروفايل، معاينة QR، وحالة كل كارت.</p></div><div className="section-buttons"><button className="secondary-button" onClick={() => { setError(''); setBulkOpen(true); }}><Plus size={15}/> توليد كروت فارغة</button><button className="secondary-button" onClick={() => void exportCsv()}><Download size={16}/> تصدير CSV</button></div></div>
        <div className="table-card"><div className="table-toolbar"><div className="search-box"><Search size={17}/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="ابحث بالاسم أو السيريال..."/><kbd>⌘ K</kbd></div><div className="toolbar-actions"><label className="filter-select"><Filter size={14}/><select aria-label="تصفية حسب حالة الكارت" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}><option value="ALL">كل الحالات</option><option value="UNCLAIMED">غير مخصص</option><option value="ACTIVE">نشط</option><option value="SUSPENDED">موقوف</option></select></label><label className="filter-select edition-filter"><select aria-label="تصفية حسب الإصدار" value={editionFilter} onChange={(e) => setEditionFilter(e.target.value as typeof editionFilter)}><option value="ALL">كل الإصدارات</option><option value="STANDARD">Standard</option><option value="LIMITED">Limited</option><option value="DEMO">تجريبي</option></select></label><button className="view-toggle"><span className="selected-view"><LayoutDashboard size={15}/></span><span><MoreHorizontal size={16}/></span></button></div></div>
          <div className="table-wrap"><table><thead><tr><th className="doctor-col">الدكتور</th><th>السيريال</th><th>الإصدار</th><th>حالة الكارت</th><th>مرات المسح</th><th>تاريخ الإضافة</th><th><span className="sr-only">إجراءات</span></th></tr></thead><tbody>
            {loading ? <tr><td colSpan={7} className="empty-row">جارٍ تحميل البيانات...</td></tr> : filtered.length ? filtered.map((card) => <tr key={card.id}><td><div className="doctor-cell"><div className={`doctor-avatar ${card.edition.toLowerCase()}`}>{card.consentPhoto && card.portraitData ? <img src={card.portraitData} alt=""/> : card.doctorNameAr.trim().slice(0, 1) || '—'}</div><div><b>{card.doctorNameAr || (card.status === 'UNCLAIMED' ? 'كارت غير مخصص' : '—')}</b><small>{card.specialty || (card.status === 'UNCLAIMED' ? 'يمكن تفعيله من خلال QR' : 'تخصص غير محدد')}</small></div></div></td><td><span className="serial">{card.serial}</span></td><td><span className={`edition-tag ${card.edition.toLowerCase()}`}><i/>{editionName[card.edition]}</span></td><td><span className={`status-tag ${card.status.toLowerCase()}`}><i/> {card.status === 'ACTIVE' ? 'نشط' : card.status === 'SUSPENDED' ? 'موقوف' : 'غير مخصص'}</span><span className={`distribution-tag ${card.distributionStatus.toLowerCase()}`}>{card.distributionStatus === 'DISTRIBUTED' ? 'تم التسليم' : 'غير موزع'}</span></td><td><span className="scan-count"><Activity size={14}/>{card.scans ?? 0}</span></td><td className="date-cell">{new Intl.DateTimeFormat('ar-EG', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(card.createdAt))}</td><td><div className="row-actions"><button title="عرض QR" onClick={() => void showQr(card)}><QrMini/></button><a title="فتح البروفايل" href={`/c/${card.token}`} target="_blank" rel="noreferrer"><ExternalLink size={15}/></a><a title="معاينة الطباعة" href={`/print/${card.token}`} target="_blank" rel="noreferrer"><Printer size={14}/></a>{card.status !== 'UNCLAIMED' && <button title="تعديل البروفايل" onClick={() => editCard(card)}><Pencil size={14}/></button>}{card.status !== 'UNCLAIMED' && <button title={card.status === 'ACTIVE' ? 'إيقاف الكارت' : 'تفعيل الكارت'} onClick={() => void updateCardAction(card, 'toggle-status', card.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE')}>{card.status === 'ACTIVE' ? <Pause size={14}/> : <Play size={14}/>}</button>}<button title={card.distributionStatus === 'DISTRIBUTED' ? 'إلغاء تسجيل التسليم' : 'تسجيل التسليم'} onClick={() => void updateCardAction(card, 'toggle-distribution', card.distributionStatus === 'DISTRIBUTED' ? 'NOT_DISTRIBUTED' : 'DISTRIBUTED')}><Send size={14}/></button><button title="نسخ الرابط" onClick={() => void copy(`${window.location.origin}/c/${card.token}`)}><Copy size={14}/></button></div></td></tr>) : <tr><td colSpan={7}><div className="empty-state"><div className="empty-icon"><Stethoscope size={22}/></div><b>{query || statusFilter !== 'ALL' || editionFilter !== 'ALL' ? 'مفيش نتائج مطابقة' : 'لسه مفيش كروت هنا'}</b><span>{query || statusFilter !== 'ALL' || editionFilter !== 'ALL' ? 'غيّر البحث أو الفلاتر وجرب تاني.' : 'ابدأ بإضافة أول دكتور أو ولّد كروت فارغة.'}</span>{!query && statusFilter === 'ALL' && editionFilter === 'ALL' && <button className="text-button" onClick={() => { setError(''); setBulkOpen(true); }}>توليد كروت فارغة <ArrowLeft size={15}/></button>}</div></td></tr>}
          </tbody></table></div><div className="table-footer"><span>عرض <b>{filtered.length}</b> من <b>{cards.length}</b> كارت</span><div className="pagination"><button disabled><ArrowDownLeft size={14}/></button><span>1</span><button disabled><ArrowUpRight size={14}/></button></div></div></div>
        <footer className="footer"><span>Doctor Cards <b>·</b> نسخة تأسيسية</span><span><ShieldCheck size={14}/> بيانات المسح: تفاصيل 60 يومًا ومجاميع شهرية</span></footer>
      </div>
    </section>

    {bulkOpen && <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) setBulkOpen(false); }}><form className="bulk-modal" onSubmit={generateBlankCards}><button type="button" className="close-button bulk-close" onClick={() => setBulkOpen(false)}><X size={18}/></button><div className="bulk-icon"><CreditCard size={22}/></div><span className="modal-kicker">BLANK CARDS</span><h2>توليد كروت غير مخصصة</h2><p>هتتولد بسيريالات وروابط QR فريدة، وتتطبع فاضية. الدكتور يقدر يضيف بياناته من صفحة التفعيل بعد مسح الكود.</p><label className="field"><span>عدد الكروت (1–250)</span><input type="number" min={1} max={250} required value={bulkCount} onChange={(e) => setBulkCount(Number(e.target.value))}/></label>{error && <div className="form-error">{error}</div>}<div className="bulk-actions"><button type="button" className="secondary-button" onClick={() => setBulkOpen(false)}>إلغاء</button><button className="primary-button" disabled={saving}>{saving ? 'جارٍ التوليد...' : <><Plus size={16}/> توليد الكروت</>}</button></div></form></div>}
    {open && <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(false); }}><form className="modal" onSubmit={create}><div className="modal-head"><div><span className="modal-kicker">{editing ? `تعديل ${editing.serial}` : 'ملف جديد'}</span><h2>{editing ? 'تعديل البروفايل' : 'إضافة دكتور'}</h2><p>{editing ? 'تحديث البيانات لا يغيّر رابط QR المطبوع.' : 'أدخل البيانات الأساسية لإنشاء البروفايل ورابط QR.'}</p></div><button type="button" className="close-button" onClick={() => setOpen(false)}><X size={19}/></button></div><div className="form-scroll"><div className="form-section-title">البيانات الأساسية <span>* مطلوبة</span></div><div className="form-grid"><Field label="اسم الدكتور بالعربي *" required value={form.doctorNameAr} onChange={(doctorNameAr) => setForm({ ...form, doctorNameAr })} placeholder="د. أحمد محمود"/><Field label="الاسم بالإنجليزي" value={form.doctorNameEn} onChange={(doctorNameEn) => setForm({ ...form, doctorNameEn })} placeholder="Dr. Ahmed Mahmoud"/><Field label="التخصص" value={form.specialty} onChange={(specialty) => setForm({ ...form, specialty })} placeholder="طب الأسنان"/><label className="field"><span>نوع الإصدار</span><select disabled={Boolean(editing)} value={form.edition} onChange={(e) => setForm({ ...form, edition: e.target.value as FormValues['edition'] })}><option value="STANDARD">Standard · ورقي</option><option value="LIMITED">Limited · يدوي</option><option value="DEMO">نسخة تجريبية</option></select></label></div><div className="form-section-title separated">وسائل التواصل <span>اختياري</span></div><div className="form-grid"><Field label="رقم الهاتف" value={form.phone} onChange={(phone) => setForm({ ...form, phone })} placeholder="+20 10 0000 0000"/><Field label="WhatsApp" value={form.whatsapp} onChange={(whatsapp) => setForm({ ...form, whatsapp })} placeholder="+20 10 0000 0000"/><Field label="البريد الإلكتروني" value={form.email} onChange={(email) => setForm({ ...form, email })} placeholder="doctor@example.com" type="email"/><Field label="الموقع الإلكتروني" value={form.website} onChange={(website) => setForm({ ...form, website })} placeholder="https://example.com"/><Field label="عنوان العيادة" value={form.clinicAddress} onChange={(clinicAddress) => setForm({ ...form, clinicAddress })} placeholder="المنطقة، المدينة"/><Field label="رابط Google Maps" value={form.mapsUrl} onChange={(mapsUrl) => setForm({ ...form, mapsUrl })} placeholder="https://maps.app.goo.gl/..."/></div><label className="field full-field"><span>نبذة قصيرة</span><textarea rows={3} maxLength={500} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} placeholder="نبذة مهنية مختصرة عن الدكتور..."/></label><div className="form-section-title separated">العمل والحجز <span>اختياري</span></div><label className="field full-field"><span>المستشفى أو جهة العمل</span><textarea rows={2} value={form.extras.workplaces} onChange={(e) => setExtra({ workplaces: e.target.value })} placeholder={'مستشفى القصر العيني\nمركز النيل الطبي'}/><small className="field-hint">جهة في كل سطر · حتى 5 جهات</small></label><div className="form-grid"><Field label="رابط الحجز الإلكتروني" value={form.extras.bookingUrl} onChange={(bookingUrl) => setExtra({ bookingUrl })} placeholder="https://..."/><Field label="رقم السكرتارية / الحجز" value={form.extras.bookingPhone} onChange={(bookingPhone) => setExtra({ bookingPhone })} placeholder="+20 10 0000 0000" type="tel"/></div><small className="field-hint">زر «احجز موعد» يفتح رابط الحجز، وإن لم يوجد يفتح واتساب برسالة حجز جاهزة، ثم رقم السكرتارية.</small><div className="form-section-title separated">الكشف والتأمين <span>اختياري</span></div><div className="form-grid"><label className="field"><span>سعر الكشف</span><input className="text-input" maxLength={40} value={form.extras.fees.consultation} onChange={(e) => setExtra({ fees: { ...form.extras.fees, consultation: e.target.value } })} placeholder="500 ج.م"/></label><label className="field"><span>سعر الإعادة / الاستشارة</span><input className="text-input" maxLength={40} value={form.extras.fees.followUp} onChange={(e) => setExtra({ fees: { ...form.extras.fees, followUp: e.target.value } })} placeholder="250 ج.م"/></label></div><label className="field full-field"><span>شركات التأمين والتعاقدات</span><textarea rows={2} value={form.extras.insurance} onChange={(e) => setExtra({ insurance: e.target.value })} placeholder={'مصر للتأمين\nأكسا'}/><small className="field-hint">شركة في كل سطر · حتى 20</small></label><div className="form-section-title separated">مواعيد العمل <span>اختياري</span></div><HoursEditor value={form.extras.hours} onChange={(hours) => setExtra({ hours })}/><label className="field full-field"><span>ملاحظة على المواعيد</span><input className="text-input" value={form.extras.hoursNote} maxLength={140} onChange={(e) => setExtra({ hoursNote: e.target.value })} placeholder="الكشف بالحجز المسبق"/></label><div className="form-section-title separated">التخصصات والمؤهلات <span>اختياري</span></div><label className="field full-field"><span>التخصصات الدقيقة والخدمات</span><textarea rows={3} value={form.extras.services} onChange={(e) => setExtra({ services: e.target.value })} placeholder={'قسطرة قلبية\nرسم قلب بالمجهود\nمتابعة مرضى الضغط'}/><small className="field-hint">خدمة في كل سطر · حتى 16</small></label><label className="field full-field"><span>المؤهلات العلمية</span><textarea rows={3} value={form.extras.credentials} onChange={(e) => setExtra({ credentials: e.target.value })} placeholder={'دكتوراه أمراض القلب — جامعة القاهرة\nزمالة الكلية الملكية للأطباء (لندن)'}/><small className="field-hint">مؤهل في كل سطر · انشر المؤهلات الموثّقة والمعتمدة فقط</small></label><div className="consent-box"><ShieldCheck size={18}/><label><input type="checkbox" checked={form.consentProfile} onChange={(e) => setForm({ ...form, consentProfile: e.target.checked })}/><span>أؤكد موافقة الدكتور على نشر بيانات البروفايل المدخلة. <b>*</b></span></label></div><div className="consent-box photo-consent"><Globe2 size={17}/><label><input type="checkbox" checked={form.consentPhoto} onChange={(e) => setForm({ ...form, consentPhoto: e.target.checked, portraitData: e.target.checked ? form.portraitData : null })}/><span>موافقة نشر صورة الدكتور.</span></label></div>{form.consentPhoto && <div className="portrait-upload"><div className="portrait-preview">{form.portraitData ? <img src={form.portraitData} alt="معاينة صورة الدكتور"/> : <ImagePlus size={20}/>}</div><label className="portrait-file-button"><ImagePlus size={15}/>{form.portraitData ? 'تغيير الصورة' : 'رفع صورة'}<input type="file" accept="image/*" onChange={(e) => { void uploadPortrait(e.target.files?.[0]); e.currentTarget.value = ''; }}/></label><small>JPEG · حتى 512px · أقل من 150KB</small></div>}{error && <div className="form-error">{error}</div>}</div><div className="modal-foot"><button type="button" className="secondary-button" onClick={() => setOpen(false)}>إلغاء</button><button className="primary-button" disabled={saving}>{saving ? 'جارٍ الحفظ...' : editing ? <><Check size={17}/> حفظ التعديلات</> : <><Plus size={17}/> إنشاء بروفايل وكارت</>}</button></div></form></div>}
    {qr && <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) setQr(null); }}><div className="qr-modal"><button className="close-button qr-close" onClick={() => setQr(null)}><X size={19}/></button><div className="qr-modal-kicker">QR CARD · {qr.serial}</div><h2>{qr.name}</h2><p>امسح الكود لفتح صفحة البروفايل</p><img src={qr.data} alt={`QR code for ${qr.name}`}/><div className="qr-link" dir="ltr">{qr.url}</div><div className="qr-modal-actions"><button className="secondary-button" onClick={() => void copy(qr.url)}><Copy size={15}/> نسخ الرابط</button><button className="secondary-button" onClick={() => downloadQr('png')}><Download size={15}/> PNG</button><button className="secondary-button" onClick={() => downloadQr('svg')}><FileOutput size={15}/> SVG</button><a href={qr.url} target="_blank" rel="noreferrer" className="primary-button"><ExternalLink size={15}/> فتح الصفحة</a></div></div></div>}
    {notice && <div className={`toast ${noticeKind}`} role="status">{noticeKind === 'error' ? <X size={17}/> : <Check size={17}/>} {notice}<button onClick={() => setNotice('')} aria-label="إغلاق"><X size={14}/></button></div>}
  </main>;
}

function Stat({ icon, label, value, hint, tone }: { icon: React.ReactNode; label: string; value: string; hint: string; tone: string }) { return <div className="stat-card"><div className={`stat-icon ${tone}`}>{icon}</div><div className="stat-copy"><span>{label}</span><b>{value}</b><small>{hint}</small></div><div className="stat-decoration"/></div>; }
function Field({ label, value, onChange, placeholder, type = 'text', required = false }: { label: string; value: string; onChange: (value: string) => void; placeholder: string; type?: string; required?: boolean }) { return <label className="field"><span>{label}</span><input type={type} required={required} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}/></label>; }
function QrMini() { return <span className="qr-mini"><i/><i/><i/><i/><i/><i/><i/><i/><i/></span>; }
