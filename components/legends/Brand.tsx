import {useId} from 'react'

/**
 * LEGENDS MANAGER's mark — drawn here, original, not a template: a bronze laurel closed round a night-blue disc, one vermilion
 * star at the crown, the LM monogram struck in the middle and a ribbon across the foot. Colours come from the feature's tokens
 * (`legends.css`), never a hex in a component.
 */
export function Emblem({size=148,label='LEGENDS MANAGER'}:{size?:number;label?:string}){
 const id=useId().replace(/:/g,'')
 const leaves=Array.from({length:9},(_,i)=>i)
 return <svg className="lgm-emblem" width={size} height={size} viewBox="0 0 200 200" role="img" aria-label={label}>
  <defs><path id={`${id}-arc`} d="M40 150 Q100 182 160 150"/></defs>
  <circle cx="100" cy="100" r="74" className="lgm-e-disc"/>
  <circle cx="100" cy="100" r="66" className="lgm-e-ring"/>
  {[-1,1].map(side=><g key={side} transform={`translate(100 100) scale(${side} 1)`}>
   <path d="M-6 74 C-52 62 -78 22 -72 -30" className="lgm-e-stem"/>
   {leaves.map(i=>{const a=(100+i*16)*Math.PI/180,r=78,x=Math.cos(a)*r,y=Math.sin(a)*r*0.98,rot=100+i*16+28
    return <ellipse key={i} cx={x} cy={y} rx="5.2" ry="13" transform={`rotate(${rot} ${x} ${y})`} className="lgm-e-leaf"/>})}
  </g>)}
  <path d="M100 18 l6.5 13.4 14.7 2.1 -10.6 10.4 2.5 14.6 -13.1 -6.9 -13.1 6.9 2.5 -14.6 -10.6 -10.4 14.7 -2.1z" className="lgm-e-star"/>
  <text x="100" y="117" textAnchor="middle" className="lgm-e-mono">LM</text>
  <path d="M28 140 L172 140 L162 156 L172 172 L28 172 L38 156z" className="lgm-e-ribbon"/>
  <text className="lgm-e-word"><textPath href={`#${id}-arc`} startOffset="50%" textAnchor="middle">LEGENDS</textPath></text>
 </svg>
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
