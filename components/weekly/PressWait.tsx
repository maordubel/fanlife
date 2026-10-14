import type {CSSProperties} from 'react'

/**
 * The loading plate: The Weekly's "going to press" (shown by NavPulse over a page that is loading). CSS only (app/weekly/loading.css),
 * so it paints at once with the first byte. Tokens only; the club's own colour inside a club, vermilion elsewhere.
 * `inline` = a smaller plate for a section that loads inside a page that is already on screen.
 */
export function PressWait({label='Going to press',inline=false}:{label?:string;inline?:boolean}){
 const bars=[92,78,86,60]
 return (
  <div className={inline?'wkw wkw-inline':'wkw'} role="progressbar" aria-label={label} aria-busy="true" data-testid="press-wait">
   <div className="wkw-plate">
    <p className="wkw-tag"><span className="wkw-dot" aria-hidden="true"/>{label}…</p>
    <div className="wkw-head" aria-hidden="true"><span className="wkw-ball"/><span className="wkw-sweep"/></div>
    <div className="wkw-lines" aria-hidden="true">
     {bars.map((w,i)=><span key={i} className="wkw-line" style={{'--w':`${w}%`,'--i':i} as CSSProperties}/>)}
    </div>
   </div>
   {inline?null:<div className="wkw-grid" aria-hidden="true">{[0,1,2,3].map(i=><span key={i} className="wkw-card" style={{'--i':i} as CSSProperties}/>)}</div>}
  </div>
 )
}
