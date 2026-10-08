/**
 * Gate 10's mark: a nameless head and shoulders, a blindfold in the club's colour, a question mark. Drawn, not shipped —
 * nothing borrowed from the Worker's cow, nothing that could be a rival's colour (the band is `--club-primary`).
 * Decorative: the heading beside it says what it is.
 */
export function MysteryMark({className,peek=false}:{className?:string;peek?:boolean}){
 return <svg className={className} viewBox="0 0 140 130" aria-hidden="true" focusable="false">
  <path d="M10 130 C10 96 34 84 70 84 C106 84 130 96 130 130 Z" fill="currentColor"/>
  <ellipse cx="70" cy="52" rx="27" ry="31" fill="currentColor"/>
  <g style={{transform:peek?'translateY(-14px) rotate(-8deg)':'rotate(-4deg)',transformOrigin:'70px 52px',transition:'transform .4s cubic-bezier(.3,1.4,.5,1)'}}>
   <rect x="38" y="42" width="64" height="15" fill="var(--club-primary)" stroke="var(--mag-ink)" strokeWidth="3"/>
   <path d="M100 46 L124 38 L122 50 Z" fill="var(--club-primary)" stroke="var(--mag-ink)" strokeWidth="3" strokeLinejoin="round"/>
  </g>
  <text x="70" y="120" textAnchor="middle" fontFamily="var(--mag-display)" fontWeight="900" fontSize="46" fill="var(--mag-paper)" stroke="var(--mag-ink)" strokeWidth="2.5" paintOrder="stroke">?</text>
 </svg>
}
