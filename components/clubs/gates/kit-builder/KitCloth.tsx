'use client'
import {useId} from 'react'
import {sponsorLines,SPONSOR_FONT} from '@/lib/clubs/sponsor-type'
import {fitMark,makerMark,sponsorMark} from '@/lib/clubs/marks'
import {SLOTS,colourHex,darken,lightCloth,wordmark,type ClothSpec,type CollarId,type PatternId,type SlotKey} from '@/lib/clubs/kit-model'

/**
 * The FAN LIFE garment — the Worker's `KitPlate` anatomy (curved silhouette, drawn folds, dashed seams, a knit under
 * everything; patterns are full-bleed shapes the garment clips) on the generic `ClothSpec` any club can fill.
 * Paints only the club-safe swatches (rule 95). The marks are LETTERED on the cloth — a maker or sponsor name is a
 * documented fact; its artwork is never ours to redraw (a trademark is not a club's to invent). Used by gates 4 and 5.
 */
const SLEEVE_L='M104 54C84 62 62 92 46 132C54 144 66 152 82 156C88 140 90 126 92 112C94 92 100 74 104 54Z'
const SLEEVE_R='M216 54C236 62 258 92 274 132C266 144 254 152 238 156C232 140 230 126 228 112C226 92 220 74 216 54Z'
const BODY='M136 48C126 49 114 51 104 54C100 74 94 92 92 112C88 150 84 190 86 292C120 300 200 300 234 292C236 190 232 150 228 112C226 92 220 74 216 54C206 51 194 49 184 48C178 68 142 68 136 48Z'
const BODY_BACK='M136 48C126 49 114 51 104 54C100 74 94 92 92 112C88 150 84 190 86 292C120 300 200 300 234 292C236 190 232 150 228 112C226 92 220 74 216 54C206 51 194 49 184 48C178 58 142 58 136 48Z'
const NECK='M136 48C142 70 178 70 184 48'
const NECK_BACK='M136 48C142 58 178 58 184 48'
const CUFFS='M52 125C60 137 70 147 85 152M268 125C260 137 250 147 235 152'

export type ClothProps={spec:ClothSpec;view?:'front'|'back';/** slots still to be filled, drawn as a dashed frame */missing?:SlotKey[];texture?:boolean;title?:string;className?:string;/** letters printed in the crest slot when `spec.crest` is on */monogram?:string;viewBox?:string}

export function KitCloth({spec,view='front',missing=[],texture=true,title,className,monogram='',viewBox='20 30 300 285'}:ClothProps){
 const uid=useId().replace(/:/g,''),id=(n:string)=>`${n}-${uid}`
 const baseHex=spec.base?colourHex(spec.base):null,trimHex=spec.trim?colourHex(spec.trim):null
 const baseFill=baseHex??'var(--mag-card)'
 // a pattern in the second colour; with none, woven tonal into the cloth itself
 const patternInk=trimHex??(baseHex?darken(baseHex):'var(--mag-muted)')
 const inkOf=(w:'base'|'trim')=>w==='trim'?(trimHex??(baseHex?darken(baseHex,0.3):'var(--mag-muted)')):baseFill
 const sleeve=inkOf(spec.sleeveInk),collar=inkOf(spec.collarInk)
 const light=lightCloth(spec.base),text=light?'var(--mag-ink)':'var(--mag-white)'
 const gone=new Set(missing),back=view==='back'
 return <svg viewBox={viewBox} preserveAspectRatio="xMidYMid meet" className={className} role={title?'img':'presentation'} aria-label={title} aria-hidden={title?undefined:true} data-cloth-view={view} data-cloth-base={spec.base??'blank'} data-cloth-pattern={spec.pattern}>
  <defs>
   <clipPath id={id('cut')}><path d={back?BODY_BACK:BODY}/><path d={SLEEVE_L}/><path d={SLEEVE_R}/></clipPath>
   <filter id={id('weave')} x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="4" stitchTiles="stitch" result="n"/><feColorMatrix type="saturate" values="0" in="n"/></filter>
   <filter id={id('soft')} x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="7"/></filter>
  </defs>
  <path d={SLEEVE_L} fill={sleeve} stroke="var(--mag-ink)" strokeWidth="2" strokeLinejoin="round"/>
  <path d={SLEEVE_R} fill={sleeve} stroke="var(--mag-ink)" strokeWidth="2" strokeLinejoin="round"/>
  <path d={back?BODY_BACK:BODY} fill={baseFill} stroke="var(--mag-ink)" strokeWidth="2" strokeLinejoin="round" strokeDasharray={spec.base?undefined:'6 4'}/>
  <g clipPath={`url(#${id('cut')})`}>
   <Pattern id={spec.pattern} ink={patternInk}/>
   <g filter={`url(#${id('soft')})`}>
    <path d="M92 112C104 118 112 128 118 140C110 176 106 220 106 292H92C90 220 88 158 92 112Z" fill="var(--mag-ink)" opacity="0.16"/>
    <path d="M228 112C216 118 208 128 202 140C210 176 214 220 214 292H228C230 220 232 158 228 112Z" fill="var(--mag-ink)" opacity="0.16"/>
    <path d="M136 210C150 206 172 206 186 210C184 250 184 274 186 296H136C138 272 138 248 136 210Z" fill="var(--mag-ink)" opacity="0.07"/>
    <path d="M128 92C142 86 178 86 192 92C190 122 190 158 192 194C178 188 142 188 128 194C130 158 130 122 128 92Z" fill="var(--mag-white)" opacity="0.12"/>
    <path d="M46 132C56 104 74 76 96 60C90 82 86 100 84 118C70 122 56 128 46 132Z" fill="var(--mag-ink)" opacity="0.13"/>
    <path d="M274 132C264 104 246 76 224 60C230 82 234 100 236 118C250 122 264 128 274 132Z" fill="var(--mag-ink)" opacity="0.13"/>
    <path d="M86 280C120 292 200 292 234 280C234 288 234 292 234 292C200 300 120 300 86 292Z" fill="var(--mag-ink)" opacity="0.1"/>
   </g>
   {texture&&<rect x="20" y="20" width="300" height="290" filter={`url(#${id('weave')})`} style={{mixBlendMode:'multiply'}} opacity="0.13"/>}
   <g fill="none" stroke="var(--mag-ink)" strokeOpacity="0.3" strokeWidth="1" strokeDasharray="3 2.5">
    <path d="M96 112C98 90 102 72 106 56"/><path d="M224 112C222 90 218 72 214 56"/><path d="M88 285C122 294 198 294 232 285"/><path d="M56 128C64 140 74 149 88 154"/><path d="M264 128C256 140 246 149 232 154"/>
   </g>
  </g>
  <Collar id={spec.collar} colour={collar} back={back}/>
  <path d={CUFFS} fill="none" stroke={sleeve} strokeWidth="7"/>
  <path d={CUFFS} fill="none" stroke="var(--mag-ink)" strokeWidth="1.2" opacity="0.7"/>
  {back?<Back name={spec.name} number={spec.number} ink={text} halo={baseFill}/>:<g clipPath={`url(#${id('cut')})`}>
   {gone.has('maker')?<Gap slot="maker"/>:<Word slot="maker" text={spec.maker} ink={text} halo={baseFill} size={12}/>}
   {gone.has('crest')?<Gap slot="crest"/>:spec.crest?<Crest letters={monogram} ink={lightCloth(spec.trim??spec.base)?'var(--mag-ink)':'var(--mag-white)'} fill={trimHex??baseFill} halo={baseFill}/>:null}
   {gone.has('sponsor')?<Gap slot="sponsor"/>:<Word slot="sponsor" text={spec.sponsor} ink={text} halo={baseFill} size={26}/>}
  </g>}
 </svg>
}

function Gap({slot}:{slot:SlotKey}){const b=SLOTS[slot];return <rect x={b.x} y={b.y} width={b.w} height={b.h} fill="var(--mag-navy)" fillOpacity="0.1" stroke="var(--mag-navy)" strokeWidth="2" strokeDasharray="5 4" data-gap={slot}/>}

/** a documented name, lettered on the cloth and condensed (never overflowing) into its slot; a halo cuts it out of any pattern */
function Word({slot,text,ink,halo,size}:{slot:SlotKey;text:string|null;ink:string;halo:string;size:number}){
 if(!text)return null
 const b=SLOTS[slot]
 // the sponsor slot takes the documented lettering (weight, case, tracking, line breaks); the maker stays plain capitals
 if(slot==='sponsor'){
  const sm=sponsorMark(text)
  if(sm&&['siemens','lg'].includes(text.toLowerCase().trim())){const f=fitMark(sm,b.x+b.w/2,b.y+b.h/2,text.toLowerCase().trim()==='lg'?34:b.w-6,26);return <g data-mark="sponsor" data-logo={text.toLowerCase()} transform={f.transform}><path d={sm.d} fill={halo} fillOpacity="0.5" stroke={halo} strokeOpacity="0.5" strokeWidth={2/f.k} strokeLinejoin="round"/><path d={sm.d} fill={ink}/></g>}
  const ls=sponsorLines(text),n=ls.length,cx=b.x+b.w/2,sz0=n>1?size*0.86:size*1.1
  let y=b.y+(n>1?-1:b.h/2+sz0*0.34)+(n>1?sz0*0.8:0)
  return <g data-mark={slot}>{ls.map((l,i)=>{
   let sz=sz0*l.scale;const est=l.t.length*sz*(l.fam==='cond'?0.42:0.6)*(1+l.track),over=est>b.w
   const yy=y;y+=sz0*l.scale*0.98
   return <text key={i} x={cx} y={yy} textAnchor="middle" fill={ink} stroke={halo} strokeWidth="4" strokeLinejoin="round" paintOrder="stroke" textLength={over?b.w:undefined} lengthAdjust="spacingAndGlyphs" fontStyle={l.italic?'italic':undefined} style={{fontFamily:SPONSOR_FONT[l.fam],fontWeight:l.weight,fontSize:sz,letterSpacing:over?0:l.track*sz}} data-w={Math.round(Math.min(est,b.w))}>{l.t}</text>})}</g>
 }
 if(slot==='maker'){
  const m=makerMark(text)
  if(m){const f=fitMark(m,b.x+b.w/2,b.y+b.h/2,m.kind==='stroke'?30:26,16);return <g data-mark="maker" data-logo={text.toLowerCase()} transform={f.transform}>{m.kind==='stroke'?<><path d={m.d} fill="none" stroke={halo} strokeOpacity="0.5" strokeWidth={(m.strokeWidth??8)+5} strokeLinejoin="round"/><path d={m.d} fill="none" stroke={ink} strokeWidth={m.strokeWidth} strokeLinejoin="round"/></>:<><path d={m.d} fill={halo} fillOpacity="0.5" stroke={halo} strokeOpacity="0.5" strokeWidth={1.6/f.k} strokeLinejoin="round"/><path d={m.d} fill={ink}/></>}</g>}
 }
 const s=wordmark(text),est=s.length*size*0.66,w=Math.min(est,b.w)
 return <text x={b.x+b.w/2} y={b.y+b.h/2+size*0.36} textAnchor="middle" fill={ink} stroke={halo} strokeWidth="4" strokeLinejoin="round" paintOrder="stroke" textLength={est>b.w?b.w:undefined} lengthAdjust="spacingAndGlyphs" style={{fontFamily:'var(--mag-body)',fontWeight:800,fontSize:size,letterSpacing:est>b.w?0:1}} data-mark={slot} data-w={Math.round(w)}>{s}</text>
}
function Crest({letters,ink,fill,halo}:{letters:string;ink:string;fill:string;halo:string}){
 const b=SLOTS.crest,cx=b.x+b.w/2,cy=b.y+b.h/2
 return <g data-mark="crest"><circle cx={cx} cy={cy} r={19} fill={fill} stroke={halo} strokeWidth="3" paintOrder="stroke"/><circle cx={cx} cy={cy} r={19} fill="none" stroke={ink} strokeWidth="1.5"/><text x={cx} y={cy+5} textAnchor="middle" fill={ink} style={{fontFamily:'var(--mag-display)',fontSize:14,fontWeight:700}}>{letters.slice(0,3)}</text></g>
}
function Back({name,number,ink,halo}:{name:string|null;number:number|null;ink:string;halo:string}){
 return <g data-mark="back">
  {name&&<text x="160" y="112" textAnchor="middle" fill={ink} stroke={halo} strokeWidth="4" paintOrder="stroke" textLength={name.length>9?120:undefined} lengthAdjust="spacingAndGlyphs" style={{fontFamily:'var(--mag-body)',fontWeight:800,fontSize:20,letterSpacing:2}}>{wordmark(name)}</text>}
  {number!==null&&<text x="160" y="210" textAnchor="middle" fill={ink} stroke={halo} strokeWidth="5" paintOrder="stroke" style={{fontFamily:'var(--mag-display)',fontWeight:700,fontSize:number>9?96:112}}>{number}</text>}
 </g>
}

function Collar({id,colour,back}:{id:CollarId;colour:string;back:boolean}){
 const neck=back?NECK_BACK:NECK
 if(id==='v-neck'&&!back)return <><path d="M136 48L160 88L184 48" fill="none" stroke={colour} strokeWidth="11" strokeLinejoin="round"/><path d="M136 48L160 88L184 48" fill="none" stroke="var(--mag-ink)" strokeWidth="1.5"/></>
 if(id==='polo'&&!back)return <><path d="M132 44L160 82L188 44" fill="none" stroke={colour} strokeWidth="16" strokeLinejoin="round"/><path d={neck} fill="none" stroke={colour} strokeWidth="11"/><path d="M158 52V86" stroke="var(--mag-ink)" strokeWidth="1.4"/><path d={neck} fill="none" stroke="var(--mag-ink)" strokeWidth="1.5"/></>
 return <><path d={neck} fill="none" stroke={colour} strokeWidth="11"/><path d={neck} fill="none" stroke="var(--mag-ink)" strokeWidth="1.5"/></>
}

/** Fifteen cuts, each a full-bleed shape the garment clips — a hoop is a rectangle across the whole board and the shirt decides what it looks like on a sleeve. */
function Pattern({id,ink}:{id:PatternId;ink:string}){
 switch(id){
  case 'solid':return null
  case 'hoops':return <g fill={ink}>{[44,96,148,200,252].map(y=><rect key={y} x="20" y={y} width="300" height="26"/>)}</g>
  case 'hoop-tonal':return <g fill={ink}>{[120,186,252].map(y=><rect key={y} x="20" y={y} width="300" height="26"/>)}</g>
  case 'stripe-wide':return <g fill={ink}>{[92,140,188,236,284].map(x=><rect key={x} x={x} y="20" width="24" height="300"/>)}</g>
  case 'twin-stripe':return <g fill={ink}><rect x="146" y="20" width="10" height="300"/><rect x="166" y="20" width="10" height="300"/></g>
  case 'pinstripe':return <g fill={ink}>{[106,133,160,187,214,241].map(x=><rect key={x} x={x} y="20" width="4" height="300"/>)}</g>
  case 'sash':return <path d="M20 250L250 30H310L70 300Z" fill={ink}/>
  case 'diagonal':return <g fill={ink} opacity="0.85">{[-120,-80,-40,0,40,80,120,160,200,240].map(o=><path key={o} d={`M${o} 320L${o+120} 20H${o+132}L${o+12} 320Z`}/>)}</g>
  case 'quarters':return <g fill={ink}><rect x="160" y="20" width="180" height="150"/><rect x="20" y="170" width="140" height="150"/></g>
  case 'halves':return <rect x="160" y="20" width="180" height="300" fill={ink}/>
  case 'chest-band':return <g fill={ink}><rect x="20" y="152" width="300" height="52"/><rect x="20" y="144" width="300" height="4"/><rect x="20" y="210" width="300" height="4"/></g>
  case 'shoulder-panel':return <g fill={ink}><path d="M100 50C120 42 200 42 220 50C224 80 229 102 233 120C206 110 114 110 87 120C91 102 96 80 100 50Z"/><path d="M90 128C88 190 87 250 87 300H98C98 248 97 190 101 130Z"/><path d="M230 128C232 190 233 250 233 300H222C222 248 223 190 219 130Z"/></g>
  case 'side-panel':return <g fill={ink}><path d="M86 112C96 118 104 130 108 146C102 190 100 240 100 300H86C84 230 84 170 86 112Z"/><path d="M234 112C224 118 216 130 212 146C218 190 220 240 220 300H234C236 230 236 170 234 112Z"/></g>
  case 'checks':return <g fill={ink}>{Array.from({length:9*9},(_,i)=>{const x=i%9,y=Math.floor(i/9);return (x+y)%2===0?<rect key={i} x={20+x*34} y={20+y*34} width="34" height="34"/>:null})}</g>
  case 'chevron':return <g fill="none" stroke={ink} strokeWidth="11">{[130,162,194,226].map(y=><path key={y} d={`M80 ${y}L160 ${y+34}L240 ${y}`}/>)}</g>
  default:return null
 }
}
