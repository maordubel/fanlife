'use client'
import {useId} from 'react'
import {KitCloth} from '@/components/clubs/gates/kit-builder/KitCloth'
import type {ShirtArt} from '@/lib/highlights/board'

/**
 * A shirt on the theatre's boards: the documented garment (`KitCloth` — the cut, the maker, the sponsor, the club's crest) when
 * the archive can draw it, otherwise a plain shirt cut from the pixel kit's own colours and pattern. Colours arrive as data from
 * lib (the kit); nothing here names one.
 */
export function Shirt({art,className,title}:{art:ShirtArt;className?:string;title?:string}){
 if(art.kind==='cloth')return <KitCloth spec={art.spec} view={art.spec.number!==null||art.spec.name?'back':'front'} texture={false} crestSrc={art.crest} monogram="" className={className} title={title} viewBox="40 36 240 268"/>
 return <PixelShirt art={art} className={className} title={title}/>
}
const TEE='M13 5L4 10L7.5 18L11.5 16.2V36H28.5V16.2L32.5 18L36 10L27 5C24.5 8 15.5 8 13 5Z'
function PixelShirt({art,className,title}:{art:Extract<ShirtArt,{kind:'pixel'}>;className?:string;title?:string}){
 const uid=useId().replace(/:/g,''),k=art.kit,two=k.second??k.shirt
 return <svg viewBox="0 0 40 40" className={className} role={title?'img':'presentation'} aria-label={title} aria-hidden={title?undefined:true} data-shirt="pixel">
  <defs><clipPath id={`t${uid}`}><path d={TEE}/></clipPath></defs>
  <path d={TEE} fill={k.shirt}/>
  <g clipPath={`url(#t${uid})`} fill={two}>
   {k.second&&k.pattern==='stripes'?[8,14,20,26,32].map(x=><rect key={x} x={x} y="0" width="3" height="40"/>):null}
   {k.second&&k.pattern==='hoops'?[9,16,23,30].map(y=><rect key={y} x="0" y={y} width="40" height="3.5"/>):null}
   {k.second&&k.pattern==='halves'?<rect x="20" y="0" width="20" height="40"/>:null}
   {k.second&&k.pattern==='sash'?<path d="M6 34L30 4H36L12 38Z"/>:null}
   {k.second&&k.pattern==='band'?<rect x="0" y="15" width="40" height="5"/>:null}
  </g>
  <path d={TEE} fill="none" stroke="var(--hl-ink, var(--mag-ink))" strokeWidth="1.4" strokeLinejoin="round"/>
  {art.number!==null?<text x="20" y="30" textAnchor="middle" fill="var(--hl-white, var(--mag-white))" stroke="var(--hl-ink, var(--mag-ink))" strokeWidth="1.6" paintOrder="stroke" style={{font:'700 13px var(--mag-display)'}}>{art.number}</text>:null}
 </svg>
}
