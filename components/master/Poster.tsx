import type {CSSProperties} from 'react'
import {Dye,type DyeArt} from './Dye'

/**
 * Poster furniture for a club's own page, after the screen-printed matchday posters Maor pointed to
 * (7.10.2026): a round seal, torn blocks of the club's colours, and a halftone cut-out standing on
 * them with a paper edge. Original drawing — no part of any reference poster is reproduced.
 */
const hash=(s:string)=>{let h=2166136261;for(const c of s)h=Math.imul(h^c.charCodeAt(0),16777619);return h>>>0}

/** A ragged top edge, the same for a club on every visit (seeded by its id). */
export function tornEdge(seed:string,points=22,depth=7):string{
 let h=hash(seed);const step=100/points,top:string[]=[]
 for(let i=0;i<=points;i++){h=Math.imul(h^(h>>>13),1274126177)>>>0;top.push(`${(i*step).toFixed(2)}% ${(h%1000/1000*depth).toFixed(2)}%`)}
 return `polygon(${top.join(',')},100% 100%,0% 100%)`
}

export function Seal({name,city,initials,pattern}:{name:string;city:string;initials:string;pattern?:string}){
 const id=`seal-${hash(name).toString(36)}`
 return <span className="mag-seal" aria-hidden="true">
  <svg viewBox="0 0 200 200" role="presentation">
   <defs><path id={id} d="M100,100 m-74,0 a74,74 0 1,1 148,0 a74,74 0 1,1 -148,0"/></defs>
   <circle cx="100" cy="100" r="96" className="ring-out"/><circle cx="100" cy="100" r="88" className="ring"/><circle cx="100" cy="100" r="60" className="ring-in"/>
   <text className="ring-text"><textPath href={`#${id}`} startOffset="0">{`${name} · ${city} · `.toUpperCase().repeat(2)}</textPath></text>
  </svg>
  <span className="mag-band mag-seal-core" data-livery={pattern}><b>{initials}</b></span>
 </span>
}

export function TornBlocks({seed,pattern,inks}:{seed:string;pattern?:string;inks?:string[]}){
 if(inks)return <span className="mag-torn" aria-hidden="true">{inks.map((ink,i)=><span key={i} style={{background:ink,flex:i===1?1.3:1,clipPath:tornEdge(seed+i,20,8)} as CSSProperties}/>)}</span>
 return <span className="mag-torn" aria-hidden="true">
  <span className="mag-torn-a mag-band" data-livery={pattern} style={{clipPath:tornEdge(seed+'a')} as CSSProperties}/>
  <span className="mag-torn-b" style={{clipPath:tornEdge(seed+'b',18,9)} as CSSProperties}/>
 </span>
}

/** A halftone cut-out with a paper edge, printed in ink on the page (not dyed in a colour). */
export function Cutout({art,className=''}:{art:DyeArt;className?:string}){
 return <span className={`mag-cutout ${className}`} aria-hidden="true"><Dye art={art} ink="var(--mag-paper)" className="halftone"/></span>
}
