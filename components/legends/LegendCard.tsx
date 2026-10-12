import type {ReactNode} from 'react'
import {ATTR_LABEL,ROLE_ATTRS,type AttrKey} from '@/lib/legends/ratings'
import type {CardView} from '@/lib/legends/view'
import {Stars} from './Brand'

/**
 * One man as a collector's card: tier ribbon, name, line, years at the club, his stars and his role's attributes. The years
 * are the archive's; the stars and attributes are GAME values and the card says so in its small print.
 */
const POS:Record<string,string>={GK:'Goalkeeper',DF:'Defender',MF:'Midfielder',FW:'Forward'}
export const posName=(p:string)=>POS[p]??p
export const years=(c:{from:number|null;to:number|null})=>c.from&&c.to?(c.from===c.to?`${c.from}`:`${c.from}–${c.to}`):'Years not recorded'
export const money=(m:number)=>`€${Number.isInteger(m)?m:m.toFixed(1)}M`
const TIER:Record<string,string>={premium:'Premium',mid:'Squad',budget:'Bargain'}
export function LegendCard({c,tier,locked,children,compact=false}:{c:CardView;tier?:string;locked?:string|null;children?:ReactNode;compact?:boolean}){
 return <article className="lgm-card" data-pos={c.pos} data-tier={tier} data-locked={locked?'true':undefined} data-compact={compact||undefined}>
  {tier?<p className="lgm-card-tier">{TIER[tier]??tier}</p>:null}
  <header><p className="lgm-card-pos">{posName(c.pos)}{c.alt?.length?<small> · also {c.alt.join(', ')}</small>:null}</p><h3>{c.name}</h3><p className="lgm-card-years">{years(c)}</p></header>
  <div className="lgm-card-rate"><Stars value={c.stars} size={compact?'sm':'md'}/><b className="lgm-price">{money(c.price)}</b></div>
  {compact?null:<dl className="lgm-attrs">{(ROLE_ATTRS[c.pos]??[]).map(k=><div key={k}><dt>{ATTR_LABEL[k as AttrKey]}</dt><dd><Stars value={c.attrs[k]??c.stars} size="sm"/></dd></div>)}</dl>}
  {locked?<p className="lgm-card-lock" role="note">{locked}</p>:null}
  {children}
 </article>
}
export const GAME_VALUES='Stars and attributes are game values, not historical statistics: each club’s men are measured against their own club’s archive.'
