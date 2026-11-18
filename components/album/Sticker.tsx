'use client'
import type {CSSProperties} from 'react'
import Link from 'next/link'
import type {Slot,Variant,WingInfo} from '@/lib/album/view'

/** THE ALBUM's sticker: its front (pressed image, or the drawn frame), the drawn figure, and its back with the credit */
export const livery=(w:WingInfo):CSSProperties=>({['--club-primary' as string]:w.primary,['--club-on-primary' as string]:w.on})

/** a sticker's front. A pressed image when the press has one; otherwise the same frame drawn in CSS (flat club colour,
 * a drawn figure, the ivory name plate, the code). Gold and silver keep the club's colours and add a metal edge + stamp. */
export function StickerFace({s,w,variant='base',big=false}:{s:Pick<Slot,'slot'|'name'|'image'|'code'|'era'|'kit'>;w:WingInfo;variant?:Variant;big?:boolean}){
 const parts=s.name.split(' '),first=parts.length>1?parts.slice(0,-1).join(' '):'',last=parts.at(-1)??s.name
 return <span className="alb-stk" data-variant={variant} data-big={big||undefined} style={livery(w)}>
  {s.image?/* eslint-disable-next-line @next/next/no-img-element -- a pressed sticker ships exactly as pressed */<img className="alb-stk-img" src={s.image} alt="" loading="lazy" decoding="async"/>:<span className="alb-stk-draw" aria-hidden="true">
   <span className="alb-stk-win"><Figure kit={s.kit}/>
    <span className="alb-stk-logo"/></span>
   <span className="alb-stk-plate">{first&&<small>{first}</small>}<b style={{['--len' as string]:String(Math.max(6,last.length))}}>{last}</b></span>
   <span className="alb-stk-foot"><i>{s.code}</i><em>{w.name}{s.era?` · ${s.era}`:''}</em></span>
  </span>}
  <span className="sr-only">{s.name}, {s.code}</span>
  {variant!=='base'&&<span className="alb-stk-tag" aria-hidden="true"><b>{variant==='gold'?'Gold':'Silver'}</b>edition</span>}
 </span>
}

/** the drawn figure for a man with no free photo: an ink-lined head (no likeness invented) wearing the club's measured
 * shirt of his years, framed on the shirt exactly as every club game frames it (rule club-shirt-only) — same as the press */
export function Figure({kit}:{kit:string|null}){
 return <svg viewBox="0 0 208 206" preserveAspectRatio="xMidYMax slice" className="alb-stk-fig" aria-hidden="true">
  <g className="alb-fig">
   <rect x="92" y="106" width="24" height="30" className="skin"/><ellipse cx="104" cy="85" rx="26" ry="33" className="skin"/>
   <path d="M77 78C75 42 133 42 131 78 124 60 84 60 77 78Z" className="hair"/>
   {kit?<image href={`${kit}#svgView(viewBox(0,20,336,298))`} x="-4" y="106.6" width="216.3" height="191.9" preserveAspectRatio="xMidYMin meet"/>
    :<path d="M-4 210C0 152 30 138 80 132h48c50 6 80 20 84 78Z" className="shirt"/>}
  </g>
 </svg>
}

/** the back of a sticker: the facts that do not fit the front, and the photograph's credit, readable (licence terms) */
export function StickerBack({s,w,profiles}:{s:Slot;w:WingInfo;profiles:boolean}){
 const c=s.credit
 return <div className="alb-back" style={livery(w)}>
  <p className="alb-back-code">{s.code}</p>
  <h3>{s.name}</h3>
  <dl><div><dt>Club</dt><dd>{w.name}</dd></div><div><dt>Album page</dt><dd>{s.era||'—'}</dd></div></dl>
  <p className="alb-back-photo">{c?<>Photo: {c.author} · {c.licenseUrl?<a href={c.licenseUrl} target="_blank" rel="noopener noreferrer">{c.license}</a>:c.license} · <a href={c.page} target="_blank" rel="noopener noreferrer">Wikimedia Commons</a>{s.archive?' · archive photo, not from his years at the club':''}</>:'No free photograph of him has been found yet. The drawing stands in until one is.'}</p>
  {profiles&&<Link className="alb-btn min-h-tap" href={`/players/${s.person}`}>His profile — every club</Link>}
 </div>
}

