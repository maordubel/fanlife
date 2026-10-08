import type {KitView} from '@/lib/clubs/gate-content'
/** Colour names the club archive may carry → magazine tokens. Anything unmapped is NOT painted (never guessed, never yellow). */
const TOKEN:Record<string,string>={red:'--mag-vermilion',white:'--mag-white',cream:'--mag-paper',blue:'--mag-navy',navy:'--mag-navy',green:'--mag-green',black:'--mag-ink',purple:'--mag-purple',grey:'--mag-muted',gray:'--mag-muted'}
const NAME_TO_KEY:Record<string,string>={'dark green':'green','light green':'green','sky blue':'blue',maroon:'red',orange:'red',cream:'cream',pink:'red',brown:'black',gold:'cream',grey:'grey'}
export const partPaint=(p:{colour:string;relation?:string}|null|undefined)=>p&&p.relation==='contrast'?paint(NAME_TO_KEY[p.colour]??p.colour):null
export const paint=(name:string|undefined)=>name&&TOKEN[name]?`var(${TOKEN[name]})`:null
const BODY='M82 18 L120 6 Q170 28 220 6 L258 18 L312 74 L282 110 L252 92 L252 300 L88 300 L88 92 L58 110 L28 74 Z'
/**
 * One garment, drawn from the sourced fields only: design (hoops/stripes/checkers/halves/sash/solid) and up to two painted colours.
 * `paints` lets a caller dress it in CSS variables instead (the club livery, when the archive documents no kit);
 * `decorative` hides it from assistive tech where the name beside it already says who wears it.
 */
export function KitPlate({kit,label=true,paints,decorative=false,className='kit-plate'}:{kit:Pick<KitView,'id'|'design'|'colours'|'season'>&{parts?:KitView['parts']};label?:boolean;paints?:{a:string;b?:string|null};decorative?:boolean;className?:string}) {
 const a=paints?.a??paint(kit.colours[0]),b=(paints?paints.b:paint(kit.colours[1]))||a,id=`kp-${kit.id.replace(/[^a-z0-9]/gi,'')}`,design=(kit.design||'').toLowerCase()
 const painted=!!a
 return <svg viewBox="0 0 340 320" role={decorative?undefined:'img'} aria-hidden={decorative||undefined} aria-label={decorative?undefined:`${kit.season} ${kit.design||''} ${kit.colours.join('/')}`.trim()} className={className} data-painted={painted}>
  <defs><clipPath id={id}><path d={BODY}/></clipPath></defs>
  <g clipPath={`url(#${id})`}>
   <rect width="340" height="320" fill={a||'var(--mag-card)'}/>
   {painted&&design.includes('hoop')&&Array.from({length:6},(_,i)=><rect key={i} x="0" y={20+i*48} width="340" height="24" fill={b!}/>)}
   {painted&&design.includes('stripe')&&Array.from({length:6},(_,i)=><rect key={i} x={30+i*52} y="0" width="26" height="320" fill={b!}/>)}
   {painted&&design.includes('check')&&Array.from({length:48},(_,i)=>{const x=i%8,y=Math.floor(i/8);return (x+y)%2===0?<rect key={i} x={28+x*35} y={y*52} width="35" height="52" fill={b!}/>:null})}
   {painted&&design.includes('half')&&<rect x="170" y="0" width="170" height="320" fill={b!}/>}
   {painted&&design.includes('sash')&&<polygon points="60,40 130,40 290,300 220,300" fill={b!}/>}
   {painted&&design.includes('diagonal')&&Array.from({length:7},(_,i)=><polygon key={i} points={`${-60+i*70},0 ${-30+i*70},0 ${150+i*70},320 ${120+i*70},320`} fill={b!}/>)}
   {painted&&design.includes('pinstripe')&&Array.from({length:14},(_,i)=><rect key={i} x={20+i*22} y="0" width="4" height="320" fill={b!}/>)}
   {painted&&design.includes('quarter')&&<><rect x="170" y="0" width="170" height="160" fill={b!}/><rect x="0" y="160" width="170" height="160" fill={b!}/></>}
   {painted&&design.includes('chest band')&&<rect x="0" y="120" width="340" height="56" fill={b!}/>}
   {painted&&design.includes('shoulder')&&<><polygon points="82,18 150,8 120,70 40,90 28,74" fill={b!}/><polygon points="258,18 190,8 220,70 300,90 312,74" fill={b!}/></>}
   {painted&&design.includes('side panel')&&<><rect x="88" y="100" width="22" height="200" fill={b!}/><rect x="230" y="100" width="22" height="200" fill={b!}/></>}
  {partPaint(kit.parts?.sleeves)&&<><polygon points="82,18 28,74 58,110 88,92" fill={partPaint(kit.parts?.sleeves)!}/><polygon points="258,18 312,74 282,110 252,92" fill={partPaint(kit.parts?.sleeves)!}/></>}
  </g>
  <path d={BODY} fill="none" stroke="var(--mag-ink)" strokeWidth="5" strokeLinejoin="round"/>
  {partPaint(kit.parts?.collar)&&<path d="M120 6 Q170 40 220 6" fill="none" stroke={partPaint(kit.parts?.collar)!} strokeWidth="14"/>}
  <path d="M120 6 Q170 40 220 6" fill="none" stroke="var(--mag-ink)" strokeWidth="5"/>
  {label&&<text x="170" y="170" textAnchor="middle" fontFamily="var(--mag-mono)" fontSize="22" fontWeight="700" fill={painted?'var(--mag-ink)':'var(--mag-muted)'} stroke={painted?'var(--mag-white)':'none'} strokeWidth="5" paintOrder="stroke">{kit.season}</text>}
 </svg>
}
