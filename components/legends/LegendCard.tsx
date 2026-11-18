import type {ReactNode} from 'react'
import {ATTR_LABEL,ROLE_ATTRS,type AttrKey} from '@/lib/legends/ratings'
import type {CardView} from '@/lib/legends/view'
import {Stars} from './Brand'
import {LegendShirt} from './Shirts'
import {FmSheet,HIDDEN_RATINGS} from './FmSheet'

/**
 * One man as a collector's card: tier ribbon, name, line, years at the club, his stars and his role's attributes. The years
 * are the archive's; the stars and attributes are GAME values and the card says so in its small print.
 */
const POS:Record<string,string>={GK:'Goalkeeper',DF:'Defender',MF:'Midfielder',FW:'Forward'}
export const posName=(p:string)=>POS[p]??p
export const years=(c:{from:number|null;to:number|null})=>c.from&&c.to?(c.from===c.to?`${c.from}`:`${c.from}–${c.to}`):'Years not recorded'
export const money=(m:number)=>`€${Number.isInteger(m)?m:m.toFixed(1)}M`
const TIER:Record<string,string>={premium:'Premium',mid:'Squad',budget:'Bargain'}
/** exact positions (17.11.2026) — the role a source states, in the words a fan uses */
export const ROLE_LABEL:Record<string,string>={GK:'Goalkeeper',CB:'Centre-back',FB:'Full-back',DM:'Holding midfielder',CM:'Central midfielder',AM:'Attacking midfielder',W:'Winger',ST:'Striker'}
export const ROLE_SHORT:Record<string,string>={GK:'GK',CB:'CB',FB:'FB',DM:'DM',CM:'CM',AM:'AM',W:'W',ST:'ST'}
export function LegendCard({c,tier,locked,children,compact=false,shirt=false}:{c:CardView;tier?:string;locked?:string|null;children?:ReactNode;compact?:boolean;/** draw his era's shirt beside the name (the career's documented kits) */shirt?:boolean}){
 return <article className="lgm-card" data-pos={c.pos} data-tier={tier} data-locked={locked?'true':undefined} data-compact={compact||undefined} data-shirt={shirt||undefined}>
  {tier?<p className="lgm-card-tier">{TIER[tier]??tier}</p>:null}
  {shirt?<LegendShirt man={c} className="lgm-card-shirt"/>:null}
  <header><p className="lgm-card-pos">{c.role?ROLE_LABEL[c.role]:posName(c.pos)}{c.alt?.length?<small> · also {c.alt.join(', ')}</small>:null}</p><h3>{c.name}</h3><p className="lgm-card-years">{years(c)}</p></header>
  <div className="lgm-card-rate"><Stars value={c.stars} size={compact?'sm':'md'}/><b className="lgm-price">{money(c.price)}</b></div>
  {compact?null:Object.keys(c.attrs).length?<dl className="lgm-attrs">{(ROLE_ATTRS[c.pos]??[]).map(k=><div key={k}><dt>{ATTR_LABEL[k as AttrKey]}</dt><dd><Stars value={c.attrs[k]??c.stars} size="sm"/></dd></div>)}</dl>:<p className="lgm-card-hidden" data-testid="legends-ratings-hidden">{HIDDEN_RATINGS}</p>}
  {!compact&&c.fm?<FmSheet fm={c.fm} name={c.name} pos={c.pos} {...(c.role?{role:c.role}:{})} {...(c.alt?{alt:c.alt}:{})}/>:null}
  {locked?<p className="lgm-card-lock" role="note">{locked}</p>:null}
  {children}
 </article>
}
export const GAME_VALUES='Stars and attributes are game values, not historical statistics: each club’s men are measured against their own club’s archive.'
