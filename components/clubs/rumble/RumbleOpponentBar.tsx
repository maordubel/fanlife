import Link from 'next/link'
import {gameCopy} from '@/lib/clubs/game-copy'
import type {UiLocale} from '@/lib/clubs/locale'
import {clubHref} from '@/lib/clubs/club-href'
import s from './rumble.module.css'

/** the same fill as the client `tr`, local because `shared` is a client module */
const tr=(copy:object,key:string,vars:Record<string,string|number>={})=>((copy as Record<string,string>)[key]??key).replace(/\{(\w+)\}/g,(_,k:string)=>k in vars?String(vars[k]):`{${k}}`)
export type RumbleClub={id:string;name:string}
/**
 * Who you face in gate 9 — one row of links, no script. Normally: your own club, or any other club that can field a five.
 * Arriving from a friend's link (`duel`): the same row chooses the club YOU play for (any club, the sender's too), and the link
 * travels with you. Hapoel Tel Aviv v AEK, or AEK v AEK, is just a choice of two chips.
 */
export function RumbleOpponentBar({club,clubs,vs,duel,from,locale}:{club:string;clubs:RumbleClub[];vs:string|null;duel:string|null;from:string|null;locale:UiLocale}){
 const copy=gameCopy(locale),name=(id:string)=>clubs.find(c=>c.id===id)?.name??id
 const q=(extra:Record<string,string>)=>{const p=new URLSearchParams(extra);if(locale!=='en')p.set('lang',locale);const t=p.toString();return t?`?${t}`:''}
 return <section className={s.vsBar} aria-label={tr(copy,'rr.vsKicker')} data-testid="rumble-vs">
  {duel&&from?<p className={s.vsBanner}>{tr(copy,'rr.duelBanner',{club:name(from)})}</p>:<p className={`${s.mono} ${s.vsHead}`}>{tr(copy,'rr.vsKicker')} · {tr(copy,'rr.vsPick')}</p>}
  <div className={s.vsChips} role="group" aria-label={duel?tr(copy,'rr.playFor'):tr(copy,'rr.vsKicker')}>
   {duel
    ?clubs.map(c=><Link key={c.id} className={`${s.chip} min-h-tap`} aria-current={c.id===club?'true':undefined} href={`${clubHref(c.id,'royal-rumble','en')}${q({duel})}`}>{c.name}</Link>)
    :<>
     <Link className={`${s.chip} min-h-tap`} aria-current={!vs?'true':undefined} href={q({})||'?'}>{tr(copy,'rr.vsSelf')}</Link>
     {clubs.filter(c=>c.id!==club).map(c=><Link key={c.id} className={`${s.chip} min-h-tap`} aria-current={vs===c.id?'true':undefined} href={q({vs:c.id})}>{c.name}</Link>)}
    </>}
  </div>
 </section>
}
