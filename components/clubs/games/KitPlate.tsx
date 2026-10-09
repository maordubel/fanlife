import type {KitPart,KitView} from '@/lib/clubs/gate-content'
import {SWATCH} from '@/lib/clubs/rumble-kit'
/** Colour names the club archive may carry → magazine tokens. Anything unmapped is NOT painted (never guessed). The five club-only colours (yellow, maroon, skyblue, pink, orange) come from the lib swatch, not from a token. */
const TOKEN:Record<string,string>={red:'--mag-vermilion',white:'--mag-white',cream:'--mag-paper',blue:'--mag-navy',navy:'--mag-navy',green:'--mag-green',black:'--mag-ink',purple:'--mag-purple',grey:'--mag-muted',gray:'--mag-muted'}
const CLUB_ONLY=['yellow','maroon','skyblue','pink','orange','brown']
export const paint=(name:string|undefined)=>name&&TOKEN[name]?`var(${TOKEN[name]})`:name&&CLUB_ONLY.includes(name)?SWATCH[name]!:null
const BODY='M82 18 L120 6 Q170 28 220 6 L258 18 L312 74 L282 110 L252 92 L252 300 L88 300 L88 92 L58 110 L28 74 Z'
/**
 * One garment, drawn from the sourced fields only: design (hoops/stripes/checkers/halves/sash/solid) and up to two painted colours.
 * `paints` lets a caller dress it in CSS variables instead (the club livery, when the archive documents no kit);
 * `decorative` hides it from assistive tech where the name beside it already says who wears it.
 */
/** shorts and socks, drawn only when the archive documents them (AEK, 9.10.2026): the same board, a taller frame */
const SHORTS='M10 0H190L200 120Q200 132 186 133L118 133L100 54L82 133L14 133Q0 132 0 120Z',SOCK='M0 0H34V118Q34 148 58 158Q72 168 64 184Q38 190 10 186Q-6 180 2 150Z'
function Shorts({p,id}:{p:KitPart;id:string}){const a=paint(p.colour);if(!a)return null;const t=p.trim?paint(p.trim):null
 return <g transform="translate(70 318)"><clipPath id={`${id}s`}><path d={SHORTS}/></clipPath><g clipPath={`url(#${id}s)`}><rect width="200" height="140" fill={a}/>{t&&<><polygon points="0,0 30,0 26,140 0,140" fill={t}/><polygon points="200,0 170,0 174,140 200,140" fill={t}/></>}<rect width="200" height="12" fill="var(--mag-ink)" opacity=".16"/></g><path d={SHORTS} fill="none" stroke="var(--mag-ink)" strokeWidth="5" strokeLinejoin="round"/></g>}
function Socks({p,id}:{p:KitPart;id:string}){const a=paint(p.colour);if(!a)return null;const t=p.trim?paint(p.trim):null
 return <g transform="translate(336 128)">{[0,24].map(dx=><g key={dx} transform={`translate(${dx} 0)`}><clipPath id={`${id}k${dx}`}><path d={SOCK}/></clipPath><g clipPath={`url(#${id}k${dx})`}><rect x="-10" width="60" height="200" fill={a}/>{t&&<><rect x="-8" y="12" width="52" height="12" fill={t}/><rect x="-8" y="34" width="52" height="12" fill={t}/></>}</g><path d={SOCK} fill="none" stroke="var(--mag-ink)" strokeWidth="5"/></g>)}</g>}
export function KitPlate({kit,label=true,paints,decorative=false,className='kit-plate'}:{kit:Pick<KitView,'id'|'design'|'colours'|'season'>&Partial<Pick<KitView,'shorts'|'socks'>>;label?:boolean;paints?:{a:string;b?:string|null};decorative?:boolean;className?:string}) {
 const a=paints?.a??paint(kit.colours[0]),b=(paints?paints.b:paint(kit.colours[1]))||a,id=`kp-${kit.id.replace(/[^a-z0-9]/gi,'')}`,design=(kit.design||'').toLowerCase()
 const painted=!!a,whole=painted&&!!(kit.shorts||kit.socks)
 return <svg viewBox={whole?'0 0 430 470':'0 0 340 320'} role={decorative?undefined:'img'} aria-hidden={decorative||undefined} aria-label={decorative?undefined:`${kit.season} ${kit.design||''} ${kit.colours.join('/')}`.trim()} className={className} data-painted={painted}>
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
  </g>
  <path d={BODY} fill="none" stroke="var(--mag-ink)" strokeWidth="5" strokeLinejoin="round"/>
  <path d="M120 6 Q170 40 220 6" fill="none" stroke="var(--mag-ink)" strokeWidth="5"/>
  {whole&&kit.shorts&&<Shorts p={kit.shorts} id={id}/>}
  {whole&&kit.socks&&<Socks p={kit.socks} id={id}/>}
  {label&&<text x="170" y="170" textAnchor="middle" fontFamily="var(--mag-mono)" fontSize="22" fontWeight="700" fill={painted?'var(--mag-ink)':'var(--mag-muted)'} stroke={painted?'var(--mag-white)':'none'} strokeWidth="5" paintOrder="stroke">{kit.season}</text>}
 </svg>
}
