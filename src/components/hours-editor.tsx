'use client';

import type { WorkingDay } from '@/lib/profile-extras';
import { fullWeek } from '@/lib/profile-extras';

const DAY_NAMES = {
  ar: ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'],
  en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
};

/** Seven-row weekly schedule editor (Saturday first). Styling comes from the host page's `.hours-editor` rules. */
export default function HoursEditor({ value, onChange, locale = 'ar' }: { value: WorkingDay[]; onChange: (next: WorkingDay[]) => void; locale?: 'ar' | 'en' }) {
  const week = fullWeek(value);
  const en = locale === 'en';
  const set = (day: number, patch: Partial<WorkingDay>) => onChange(week.map((item) => (item.day === day ? { ...item, ...patch } : item)));
  const firstOpen = week.find((item) => item.open);
  const applyToAll = () => { if (firstOpen) onChange(week.map((item) => (item.open ? { ...item, from: firstOpen.from, to: firstOpen.to } : item))); };
  return <div className="hours-editor">
    {week.map((item) => <div key={item.day} className={`hours-row${item.open ? ' is-open' : ''}`}>
      <label className="hours-day"><input type="checkbox" checked={item.open} onChange={(event) => set(item.day, { open: event.target.checked })}/><span>{DAY_NAMES[locale][item.day]}</span></label>
      {item.open
        ? <div className="hours-times" dir="ltr">
            <input type="time" value={item.from} aria-label={`${DAY_NAMES[locale][item.day]} ${en ? 'from' : 'من'}`} onChange={(event) => set(item.day, { from: event.target.value })}/>
            <span aria-hidden="true">–</span>
            <input type="time" value={item.to} aria-label={`${DAY_NAMES[locale][item.day]} ${en ? 'to' : 'إلى'}`} onChange={(event) => set(item.day, { to: event.target.value })}/>
          </div>
        : <span className="hours-closed">{en ? 'Closed' : 'إجازة'}</span>}
    </div>)}
    {week.filter((item) => item.open).length > 1 && <button type="button" className="hours-apply" onClick={applyToAll}>{en ? `Use ${firstOpen?.from}–${firstOpen?.to} for all open days` : `تطبيق ${firstOpen?.from}–${firstOpen?.to} على كل أيام العمل`}</button>}
  </div>;
}
