import Link from 'next/link'
import {Plate} from '@/components/weekly/Plate'

type Copy={lifeGame:string;wkkLifeShout:string;lifeTitle:string;lifeOpen:string;lifeWorkshop:string;life:string}
/** A club's LIFE door as a banner: used on the club home and on the All gates page, so both say the same thing. */
export function ClubLifeCard({href,state,copy}:{href:string|null;state:string;copy:Copy}){
 return <section className="wkk-life" id="life-block" aria-labelledby="life-h"><div className="wk-panel shadow wkk-life-in" id="life" data-life-entry={state}>
  <span className="wkk-life-art wk-clubplate" aria-hidden="true"><Plate art="fatherson" ink="ink"/></span>
  <div className="wkk-life-text">
   <p className="wk-k red">{copy.lifeGame}</p>
   <p className="wk-shout wkk-life-shout" aria-hidden="true">{copy.wkkLifeShout}</p>
   <h2 id="life-h" className="wk-head">{copy.lifeTitle}</h2>
   <p className="wkk-life-note">{href?copy.lifeOpen:copy.lifeWorkshop}</p>
   {href&&<Link className="wk-btn red wkk-life-cta min-h-tap" href={href}>{copy.life}</Link>}
  </div>
 </div></section>
}
