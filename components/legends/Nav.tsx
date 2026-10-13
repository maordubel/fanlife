'use client'
import type {ReactNode} from 'react'
import type {CareerView} from '@/lib/legends/view'
import {Stars} from './Brand'
import {posName,years} from './LegendCard'
import {ClubMark} from './Kit'
import {Portal,Sheet} from './Sheet'

/**
 * The career's navigation (owner, 13.10.2026: "no sliding, horizontally scrolling menus on mobile"). On a phone it is a
 * fixed bar of big doors that always fits — icon over a short word, every door ≥ 48px — sitting ON the site's own tab bar
 * (rule 115), never under it; on a desk the same doors stand as a row of tiles at the top. Nothing scrolls sideways.
 */
export type Tab='match'|'squad'|'market'|'league'|'club'|'friendlies'
const ICON:Record<Tab,ReactNode>={
 match:<><circle cx="12" cy="12" r="8.5"/><path d="M12 7.2l3.6 2.6-1.4 4.2H9.8L8.4 9.8z"/></>,
 squad:<path d="M8 4l-4.5 2.5 1.6 3.4L7 9v11h10V9l1.9.9 1.6-3.4L16 4c-.6 1.6-2.2 2.6-4 2.6S8.6 5.6 8 4z"/>,
 market:<><path d="M4 8h16l-1.4 11H5.4z"/><path d="M9 8V6a3 3 0 016 0v2"/></>,
 league:<><path d="M7 4h10v4a5 5 0 01-10 0z"/><path d="M7 6H4v1a3 3 0 003 3M17 6h3v1a3 3 0 01-3 3M12 13v4M8.5 20h7"/></>,
 club:<><path d="M12 3l8 3v5c0 5-3.4 8.6-8 10-4.6-1.4-8-5-8-10V6z"/><path d="M9 12h6"/></>,
 friendlies:<><path d="M3 12l4-4 4 3 2-2 4 4-3 3"/><path d="M14 16l-2 2-3-3M21 12l-4-4"/></>,
}
export function CareerNav({tabs,tab,onTab}:{tabs:{id:Tab;label:string;dot?:boolean}[];tab:Tab;onTab:(t:Tab)=>void}){
 // one set of doors for each screen size: the desk's stands in the page, the phone's is fixed to the glass from the body
 // (a fixed bar inside the page would sit under the footer's stacking order)
 const doors=(desk:boolean)=><nav className={`lgt-nav ${desk?'lgt-nav-desk':'lgt-nav-phone'}`} aria-label="Career" style={{['--n' as string]:tabs.length}}>
  {tabs.map(t=><button key={t.id} type="button" className="lgt-door min-h-tap" aria-current={tab===t.id?'page':undefined} onClick={()=>onTab(t.id)} data-testid={`legends-${desk?'dtab':'tab'}-${t.id}`}>
   <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">{ICON[t.id]}</svg><span>{t.label}</span>{t.dot?<i aria-label="open"/>:null}
  </button>)}
 </nav>
 return <>{doors(true)}<Portal>{doors(false)}</Portal></>
}

/** any other club's squad, from the table, a ticket or a result — its crest, its lines, its last eleven in bold */
export function ClubSheet({v,club,onClose}:{v:CareerView;club:string;onClose:()=>void}){
 const c=v.clubs.find(x=>x.club===club);if(!c)return null
 const i=v.table.findIndex(r=>r.club===club),row=v.table[i],lines=(['GK','DF','MF','FW'] as const).map(p=>({p,men:c.squad.filter(m=>m.pos===p)}))
 return <Sheet id="lgm-club" kicker={<>{row?`${i+1}${['st','nd','rd'][i]??'th'} · ${row.pts} pts`:'The league'} · {c.formation}</>} title={<span className="lgt-clubtitle"><ClubMark club={club} v={v} size={34}/>{c.name}</span>} onClose={onClose}>
  <p className="lgm-fine">Their eleven averages <Stars value={c.stars} size="sm"/> · {c.squad.length} men · only men who played for {c.name}.</p>
  {lines.map(l=>l.men.length?<div key={l.p} className="lgt-clubline"><h3>{posName(l.p)}s</h3><ul>{l.men.map(m=><li key={m.id} data-xi={m.xi||undefined}><b>{m.name}</b><Stars value={m.stars} size="sm"/><small>{years(m)}{m.apps?` · ${m.apps} apps`:''}{m.goals?` · ${m.goals} goals`:''}</small></li>)}</ul></div>:null)}
  <p className="lgm-fine">Bold: their last eleven. Stars are game values.</p>
 </Sheet>
}
