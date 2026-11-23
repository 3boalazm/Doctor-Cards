'use client';

import { useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import { ArrowRight, Printer, ShieldCheck, Stethoscope } from 'lucide-react';
import '../print.css';
import { CARD_TRIM, cropMarkGeometry, printQrUrl, QR_PRINT, SHEET_LAYOUTS } from '@/lib/print-spec';

const TRIM_LABEL = `${CARD_TRIM.widthMm} × ${CARD_TRIM.heightMm}`;
import MedicalLineArt from '@/components/medical-line-art';

type PrintCard = { doctorNameAr: string; doctorNameEn: string; specialty: string; serial: string; token: string; edition: string; status: 'UNCLAIMED' | 'ACTIVE' | 'SUSPENDED'; portraitData?: string | null };
type SheetSize = 'single' | 'a4' | 'a5';
const demoCopy = 'نسخة تجريبية — لو عاوز نسخة خاصة تواصل معانا';

export default function PrintProof({ params }: { params: Promise<{ token: string }> }) {
  const [card, setCard] = useState<PrintCard | null>(null);
  const [qr, setQr] = useState('');
  const [error, setError] = useState(false);
  const [bleed, setBleed] = useState(true);
  const [cropMarks, setCropMarks] = useState(true);
  const [sheet, setSheet] = useState<SheetSize>('single');
  const [origin, setOrigin] = useState('');

  useEffect(() => {
    let alive = true;
    setOrigin(window.location.origin);
    void params.then(async ({ token }) => {
      const response = await fetch(`/api/cards/${token}?mode=print`, { cache: 'no-store' });
      if (!response.ok) throw new Error('unavailable');
      const data = await response.json() as PrintCard;
      const png = await QRCode.toDataURL(printQrUrl(window.location.origin, data.token), { width: 900, margin: QR_PRINT.renderMarginModules, errorCorrectionLevel: QR_PRINT.errorCorrectionLevel, color: { dark: '#0b1622', light: '#ffffff' } });
      if (alive) { setCard(data); setQr(png); }
    }).catch(() => { if (alive) setError(true); });
    return () => { alive = false; };
  }, [params]);

  const shortUrl = useMemo(() => card && origin ? printQrUrl(origin, card.token) : '', [card, origin]);
  if (error) return <main className="print-proof-page"><div className="print-error"><h1>تعذر فتح معاينة الطباعة</h1><a href="/">العودة للوحة التحكم</a></div></main>;
  if (!card || !qr) return <main className="print-proof-page"><div className="print-error">جارٍ تجهيز المعاينة...</div></main>;

  const count = sheet === 'a4' ? SHEET_LAYOUTS.A4.cardsPerSheet : sheet === 'a5' ? SHEET_LAYOUTS.A5.cardsPerSheet : 1;
  const noBleed = bleed ? '' : 'no-bleed';
  const crop = cropMarks ? <CropMarks bleed={bleed}/> : null;
  return <main className={`print-proof-page ${sheet === 'single' ? 'single-proof' : 'sheet-mode'} ${noBleed}`}>
    <header className="proof-toolbar">
      <a href="/"><ArrowRight size={16}/> رجوع للوحة</a>
      <label>ورقة الطباعة <select value={sheet} onChange={(e) => setSheet(e.target.value as SheetSize)}><option value="single">كارت واحد</option><option value="a4">A4 · 8 كروت</option><option value="a5">A5 · 3 كروت</option></select></label>
      <label className="check-control"><input type="checkbox" checked={bleed} onChange={(e) => setBleed(e.target.checked)}/> 3 مم Bleed</label>
      <label className="check-control"><input type="checkbox" checked={cropMarks} onChange={(e) => setCropMarks(e.target.checked)}/> علامات قص</label>
      <button className="print-action" onClick={() => window.print()}><Printer size={16}/> طباعة / حفظ PDF</button>
    </header>
    <section className="proof-heading"><h1>معاينة الطباعة · {card.serial}</h1><p>المقاس النهائي {TRIM_LABEL} مم. اختر ورقة الطباعة ثم راجع إثبات الطباعة.</p></section>
    <div className="proof-notice"><ShieldCheck size={15} style={{ verticalAlign: 'middle', marginInlineEnd: 5 }}/> إثبات بصري أولي؛ راجع معايرة المطبعة واتجاه الوجهين قبل اعتماد الإنتاج.</div>
    {sheet === 'single' ? <section className="proof-sides">
      <div className="proof-side"><span className="proof-side-title">01 · الوجه الأمامي</span><CardFace side="front" card={card} qr={qr} shortUrl={shortUrl} bleed={bleed}>{crop}</CardFace></div>
      <div className="proof-side"><span className="proof-side-title">02 · الوجه الخلفي</span><CardFace side="back" card={card} qr={qr} shortUrl={shortUrl} bleed={bleed}>{crop}</CardFace></div>
    </section> : <section className="sheet-preview">
      <div className={`sheet-page ${sheet === 'a5' ? 'a5' : ''} ${noBleed}`} aria-label={`${sheet.toUpperCase()} front imposition`}>
        {Array.from({ length: count }, (_, index) => <div className="sheet-cell" key={`front-${index}`}><CardFace side="front" card={card} qr={qr} shortUrl={shortUrl} bleed={bleed}>{crop}</CardFace></div>)}
      </div>
      <div className={`sheet-page sheet-back-page ${sheet === 'a5' ? 'a5' : ''} ${noBleed}`} aria-label={`${sheet.toUpperCase()} back imposition`}>
        {Array.from({ length: count }, (_, index) => <div className="sheet-cell" key={`back-${index}`}><CardFace side="back" card={card} qr={qr} shortUrl={shortUrl} bleed={bleed}>{crop}</CardFace></div>)}
      </div>
    </section>}
    <p className="proof-footnote">{count} كروت بالورقة · أمام وظهر بترتيب متطابق للطباعة على الوجهين · {bleed ? '3 مم نزف حول كل كارت' : 'بدون Bleed'}.</p>
  </main>;
}

function CardFace({ side, card, qr, shortUrl, bleed, children }: { side: 'front' | 'back'; card: PrintCard; qr: string; shortUrl: string; bleed: boolean; children: React.ReactNode }) {
  return <div className={`card-bleed bleed-${side}`}><article className={`card-trim card-${side}`}>
    {side === 'front'
      ? <><MedicalLineArt className="card-art front-art"/>
          <div className="front-copy">
            <div className="front-brand"><span className="front-mark"><Stethoscope/></span>DOCTOR <b>CARDS</b></div>
            <div className="front-name-ar">{card.status === 'UNCLAIMED' ? 'بطاقة طبيب' : card.doctorNameAr || 'اسم الطبيب'}</div>
            {card.status === 'UNCLAIMED' ? <div className="front-name-en">SCAN TO CLAIM YOUR PROFILE</div> : card.doctorNameEn && <div className="front-name-en">{card.doctorNameEn}</div>}
            {card.specialty && <div className="front-specialty"><Stethoscope/>{card.specialty}</div>}
            {card.edition === 'DEMO' && <div className="front-edition">SAMPLE EDITION</div>}
          </div>
          <div className="portrait-panel">{card.portraitData ? <img src={card.portraitData} alt="Doctor portrait"/> : <div className="portrait-fallback"><MedicalLineArt className="card-art fallback-art"/><span className="fallback-emblem"><Stethoscope/></span></div>}</div>
          {card.edition === 'DEMO' && <div className="demo-ribbon">{demoCopy}</div>}</>
      : <><MedicalLineArt className="card-art back-art"/>
          <div className="back-qr-frame"><img src={qr} alt="QR code"/></div>
          <div className="back-copy"><div className="back-kicker"><span className="front-mark"><Stethoscope/></span>DOCTOR CARDS</div><div className="back-cta">امسح للتواصل<br/><span>SCAN TO CONNECT</span></div><div className="back-url">{shortUrl}</div><div className="back-serial">{card.serial}</div></div></>}
  </article>{children}{!bleed && <span className="trim-size-label">{TRIM_LABEL} mm</span>}</div>;
}
function CropMarks({ bleed }: { bleed: boolean }) { const { viewBox, path } = cropMarkGeometry(bleed); return <svg className="crop-overlay" viewBox={viewBox} preserveAspectRatio="none" aria-hidden="true"><path d={path} fill="none" stroke="#111" strokeWidth=".18" vectorEffect="non-scaling-stroke"/></svg>; }
