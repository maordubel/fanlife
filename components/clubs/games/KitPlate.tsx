import type {KitView} from '@/lib/clubs/gate-content'
/** Colour names the club archive may carry → magazine tokens. Anything unmapped is NOT painted (never guessed, never yellow). */
const TOKEN:Record<string,string>={red:'--mag-vermilion',white:'--mag-white',blue:'--mag-navy',navy:'--mag-navy',green:'--mag-green',black:'--mag-ink',purple:'--mag-purple',grey:'--mag-muted',gray:'--mag-muted'}
export const paint=(name:string|undefined)=>name&&TOKEN[name]?`var(${TOKEN[name]})`:null
const BODY='M82 18 L120 6 Q170 28 220 6 L258 18 L312 74 L282 110 L252 92 L252 300 L88 300 L88 92 L58 110 L28 74 Z'
/** One garment, drawn from the sourced fields only: design (hoops/stripes/checkers/halves/sash/solid) and up to two painted colours. */
export function KitPlate({kit,label=true}:{kit:Pick<KitView,'id'|'design'|'colours'|'season'>;label?:boolean}) {
 const a=paint(kit.colours[0]),b=paint(kit.colours[1])||a,id=`kp-${kit.id.replace(/[^a-z0-9]/gi,'')}`,design=(kit.design||'').toLowerCase()
 const painted=!!a
 return <svg viewBox="0 0 340 320" role="img" aria-label={`${kit.season} ${kit.design||''} ${kit.colours.join('/')}`.trim()} className="kit-plate" data-painted={painted}>
  <defs><clipPath id={id}><path d={BODY}/></clipPath></defs>
  <g clipPath={`url(#${id})`}>
   <rect width="340" height="320" fill={a||'var(--mag-card)'}/>
   {painted&&design.includes('hoop')&&Array.from({length:6},(_,i)=><rect key={i} x="0" y={20+i*48} width="340" height="24" fill={b!}/>)}
   {painted&&design.includes('stripe')&&Array.from({length:6},(_,i)=><rect key={i} x={30+i*52} y="0" width="26" height="320" fill={b!}/>)}
   {painted&&design.includes('check')&&Array.from({length:48},(_,i)=>{const x=i%8,y=Math.floor(i/8);return (x+y)%2===0?<rect key={i} x={28+x*35} y={y*52} width="35" height="52" fill={b!}/>:null})}
   {painted&&design.includes('half')&&<rect x="170" y="0" width="170" height="320" fill={b!}/>}
   {painted&&design.includes('sash')&&<polygon points="60,40 130,40 290,300 220,300" fill={b!}/>}
  </g>
  <path d={BODY} fill="none" stroke="var(--mag-ink)" strokeWidth="5" strokeLinejoin="round"/>
  <path d="M120 6 Q170 40 220 6" fill="none" stroke="var(--mag-ink)" strokeWidth="5"/>
  {label&&<text x="170" y="170" textAnchor="middle" fontFamily="var(--mag-mono)" fontSize="22" fontWeight="700" fill={painted?'var(--mag-ink)':'var(--mag-muted)'} stroke={painted?'var(--mag-white)':'none'} strokeWidth="5" paintOrder="stroke">{kit.season}</text>}
 </svg>
}
