/** Blueprint-style engraving (stethoscope, construction marks, ECG trace) used as a faint brand pattern.
 *  Colour comes from `currentColor`; size and placement from the caller's class. */
export default function MedicalLineArt({ className }: { className: string }) {
  const cross = (x: number, y: number) => `M${x - 6} ${y}H${x + 6}M${x} ${y - 6}V${y + 6}`;
  return <svg className={className} viewBox="0 0 400 640" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    <g strokeWidth="1" strokeDasharray="3 5" opacity=".7">
      <circle cx="290" cy="470" r="70"/><path d="M290 372V568M192 470H388"/><circle cx="200" cy="205" r="34"/>
    </g>
    <g strokeWidth="1.3">
      <circle cx="140" cy="36" r="9"/><circle cx="260" cy="36" r="9"/>
      <path d="M140 45C128 110 150 170 200 205M150 46C140 110 160 165 200 195"/>
      <path d="M260 45C272 110 250 170 200 205M250 46C260 110 240 165 200 195"/>
      <circle cx="200" cy="205" r="7"/>
      <path d="M200 212C200 300 110 330 115 420C120 520 245 548 262 505M208 212C208 305 122 335 127 420C132 505 236 530 252 497"/>
      <circle cx="290" cy="470" r="40"/><circle cx="290" cy="470" r="30"/><circle cx="290" cy="470" r="12"/>
      <path d="M262 505L256 513M252 497L246 505"/>
    </g>
    <g strokeWidth="1">
      <path d="M60 250V420M54 250H66M54 420H66M60 300H64M60 335H64M60 370H64"/>
      <path d={`${cross(60, 120)}${cross(340, 250)}${cross(80, 520)}${cross(350, 90)}`}/>
      <path d="M318 442L360 400H392"/>
    </g>
    <path strokeWidth="1.6" d="M0 600H150l10-22 12 44 10-78 14 96 10-40 8 0H400"/>
  </svg>;
}
