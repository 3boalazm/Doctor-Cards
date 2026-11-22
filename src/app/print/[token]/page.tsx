'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Printer, ArrowRight, ShieldCheck } from 'lucide-react';

type PrintCard = { doctorNameAr: string; doctorNameEn: string; specialty: string; serial: string; token: string; edition: string };
export default function PrintProof({ params }: { params: Promise<{ token: string }> }) {
  const [card, setCard] = useState<PrintCard | null>(null);
  const [qr, setQr] = useState('');
  const [error, setError] = useState(false);
  useEffect(() => {
    let alive = true;
    void params.then(async ({ token }) => {
      const response = await fetch(`/api/cards/${token}?mode=print`, { cache: 'no-store' });
      if (!response.ok) throw new Error('unavailable');
      const data = await response.json() as PrintCard;
      const png = await QRCode.toDataURL(`${location.origin}/c/${data.token}`, { width: 420, margin: 1, color: { dark: '#193c31', light: '#ffffff' } });
      if (alive) { setCard(data); setQr(png); }
    }).catch(() => { if (alive) setError(true); });
    return () => { alive = false; };
  }, [params]);
  if (error) return <main className="print-error"><h1>تعذر فتح معاينة الطباعة</h1><a href="/">العودة للوحة التحكم</a></main>;
  if (!card) return <main className="print-error">جارٍ تجهيز المعاينة...</main>;
  return <main className="print-workspace"><header className="print-toolbar"><a href="/" className="back-link"><ArrowRight size={16}/> رجوع للوحة</a><div className="proof-warning"><ShieldCheck size={16}/> إثبات تصميم فقط — إعدادات المطبعة لم تعتمد بعد</div><button onClick={() => window.print()}><Printer size={17}/> طباعة / حفظ PDF</button></header><div className="proof-title"><span>PRINT PROOF · {card.serial}</span><h1>معاينة الكارت — 90 × 55 مم</h1><p>مقاس فعلي بدون bleed. راجع عينة المطبعة قبل اعتماد ملفات الإنتاج.</p></div><section className="proof-cards"><div><small>01 · الوجه الأمامي</small><article className="proof-card proof-front"><div className="proof-front-brand"><i/> DOCTOR CARDS <span>{card.edition === 'DEMO' ? 'SAMPLE' : card.edition}</span></div><div className="proof-doctor"><b>{card.doctorNameAr}</b>{card.doctorNameEn && <span dir="ltr">{card.doctorNameEn}</span>}{card.specialty && <small>{card.specialty}</small>}</div><div className="proof-front-foot"><span>PROFILE · CONNECT · SHARE</span><span>{card.serial}</span></div>{card.edition === 'DEMO' && <div className="proof-demo">نسخة تجريبية — لو عاوز نسخة خاصة تواصل معانا</div>}</article></div><div><small>02 · الوجه الخلفي</small><article className="proof-card proof-back"><div className="proof-back-top"><b>تواصل بسهولة</b><span>ملفك التعريفي في مكان واحد</span></div><div className="proof-qr-wrap"><img src={qr} alt="QR code"/><span>امسح الكود لعرض البروفايل</span></div><div className="proof-back-foot">{card.serial}<span>90 × 55 MM</span></div></article></div></section><p className="proof-footnote">هذه المعاينة لا تشمل bleed أو علامات قص أو إعداد ألوان. اطبع بالحجم الفعلي 100% عند اختبار العينة.</p><style jsx global>{`@page{size:90mm 55mm;margin:0}@media print{html,body{background:#fff!important}.print-workspace{padding:0!important;background:#fff!important}.print-toolbar,.proof-title,.proof-cards>div>small,.proof-footnote{display:none!important}.proof-cards{display:block!important;margin:0!important}.proof-cards>div{display:block!important}.proof-card{width:90mm!important;height:55mm!important;margin:0!important;border:0!important;border-radius:0!important;box-shadow:none!important;page-break-after:always;break-after:page}.proof-card:last-child{page-break-after:auto;break-after:auto}.proof-demo{font-size:6pt!important}}`}</style></main>;
}
