import {useId} from 'react'

/**
 * LEGENDS MANAGER's mark — Maor's badge (13.10.2026): crown, tactics board, the old leather ball, laurels and the FAN LIFE seal.
 * Cut from its paper ground by `scripts/brand/legends-logo.py` (rule 122). `mono` is the greyscale cut for a club's own pages,
 * where the badge's red, green, navy or gold may be a rival's colour (rule 95). Plain <img>: no re-encode of the measured bytes.
 */
const SIZES=[128,256,512,1024] as const
export function Emblem({size=148,label='LEGENDS MANAGER',mono=false,className,eager=false}:{size?:number;label?:string;mono?:boolean;className?:string;eager?:boolean}){
 const sizes=mono?[256,512]:SIZES,file=(n:number)=>`/legends/brand/logo-${mono?'mono-':''}${n}.webp`
 const best=sizes.find(n=>n>=size*2)??sizes[sizes.length-1]!
 return <img className={`lgm-emblem${className?` ${className}`:''}`} src={file(best)} srcSet={sizes.map(n=>`${file(n)} ${n}w`).join(', ')} sizes={`${size}px`}
  width={size} height={size} alt={label} loading={eager?'eager':'lazy'} decoding="async" draggable={false}/>
}
const frac=(n:number)=>{const w=Math.floor(n),f=Math.round((n-w)*4);return `${w}${['','¼','½','¾'][f]}`}
export const starsText=(n:number)=>`${frac(n)} star${n===1?'':'s'}`
/** stars in quarter steps, 1–5 — the only rating a manager ever sees (owner, 12.10.2026) */
export function Stars({value,size='md'}:{value:number;size?:'sm'|'md'|'lg'}){
 const id=useId().replace(/:/g,''),w=Math.max(0,Math.min(5,value))*20
 const star=(x:number)=>`M${x+10} 1.5 l2.6 5.5 6 .8 -4.4 4.2 1.1 6 -5.3 -2.9 -5.3 2.9 1.1 -6 -4.4 -4.2 6 -.8z`
 return <svg className="lgm-stars" data-size={size} viewBox="0 0 100 20" role="img" aria-label={starsText(value)}>
  <defs><clipPath id={`${id}-c`}><rect x="0" y="0" width={w} height="20"/></clipPath></defs>
  {[0,20,40,60,80].map(x=><path key={x} d={star(x)} className="lgm-star-off"/>)}
  <g clipPath={`url(#${id}-c)`}>{[0,20,40,60,80].map(x=><path key={x} d={star(x)} className="lgm-star-on"/>)}</g>
 </svg>
}
