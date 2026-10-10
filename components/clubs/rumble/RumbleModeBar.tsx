import Link from 'next/link'
import {gameCopy} from '@/lib/clubs/game-copy'
import type {UiLocale} from '@/lib/clubs/locale'
import {FORMATION_IDS} from '@/lib/clubs/rumble-xi/formations'
import type {FormationId,XIReadiness} from '@/lib/clubs/rumble-xi/types'
import type {RivalChoice} from '@/lib/clubs/rumble-xi/server'
import {Badge} from '@/components/clubs/Badge'
import s from './rumble.module.css'

const tr=(copy:object,key:string,vars:Record<string,string|number>={})=>((copy as Record<string,string>)[key]??key).replace(/\{(\w+)\}/g,(_,k:string)=>k in vars?String(vars[k]):`{${k}}`)
const href=(locale:UiLocale,q:Record<string,string>)=>{const p=new URLSearchParams(q);if(locale!=='en')p.set('lang',locale);const t=p.toString();return t?`?${t}`:'?'}

/** The first choice of gate 9: five a side (the classic game, untouched) or the full eleven. One row of links, no script. */
export function RumbleModeBar({club,clubName,locale,mode}:{club:string;clubName:string;locale:UiLocale;mode:'five'|'xi'}){
 const copy=gameCopy(locale)
 return <section className={s.modeBar} aria-label={tr(copy,'rr.mode.kicker')} data-testid="rumble-mode">
  <p className={`${s.mono} ${s.vsHead}`}>{tr(copy,'rr.mode.kicker')} · <bdi>{clubName}</bdi></p>
  <div className={s.modeCards} role="group">
   <Link className={`${s.modeCard} min-h-tap`} aria-current={mode==='five'?'true':undefined} href={href(locale,{})}><b>{tr(copy,'rr.mode.five')}</b><small>{tr(copy,'rr.mode.fiveSub')}</small></Link>
   <Link className={`${s.modeCard} min-h-tap`} aria-current={mode==='xi'?'true':undefined} href={href(locale,{mode:'xi'})} data-testid="rumble-mode-xi"><b>{tr(copy,'rr.mode.xi')}</b><small>{tr(copy,'rr.mode.xiSub')}</small></Link>
  </div>
  <span hidden>{club}</span>
 </section>
}

/** Eleven a side: the rival (own club, any club that can field one, or a draw) and the shape. Unavailable choices say why. */
export function RumbleXIEntry({club,clubName,locale,formation,vs,rivals,own,sameOk}:{club:string;clubName:string;locale:UiLocale;formation:FormationId;vs:string;rivals:RivalChoice[];own:Record<FormationId,XIReadiness>;sameOk:boolean}){
 const copy=gameCopy(locale),q=(extra:Record<string,string>)=>href(locale,{mode:'xi',f:formation,vs,...extra})
 return <section className={s.vsBar} aria-label={tr(copy,'rr.xi.rivalKicker')} data-testid="rumble-xi-entry">
  <p className={`${s.mono} ${s.vsHead}`}>{tr(copy,'rr.xi.rivalKicker')}</p>
  <div className={s.vsChips} role="group" aria-label={tr(copy,'rr.xi.rivalKicker')}>
   {sameOk?<Link className={`${s.chip} min-h-tap`} aria-current={vs==='same'?'true':undefined} href={q({vs:'same'})}>{tr(copy,'rr.xi.rival.same')}</Link>:<span className={`${s.chip} ${s.chipOff}`} aria-disabled="true">{tr(copy,'rr.xi.rival.same')} — {tr(copy,'rr.xi.unavailable',{reason:own[formation].reasons[0]??tr(copy,'rr.xi.noSecond')})}</span>}
   {rivals.filter(r=>r.id!==club).map(r=>r.ok
    ?<Link key={r.id} className={`${s.chip} min-h-tap`} aria-current={vs===r.id?'true':undefined} href={q({vs:r.id})}><Badge club={{id:r.id}} className={s.chipBadge}/> {r.name}</Link>
    :<span key={r.id} className={`${s.chip} ${s.chipOff}`} aria-disabled="true"><Badge club={{id:r.id}} className={s.chipBadge}/> {r.name} — {tr(copy,'rr.xi.unavailable',{reason:r.reason??'—'})}</span>)}
   <Link className={`${s.chip} min-h-tap`} aria-current={vs==='random'?'true':undefined} href={q({vs:'random'})}>{tr(copy,'rr.xi.rival.random')}</Link>
  </div>
  <p className={`${s.mono} ${s.vsHead}`} style={{marginTop:8}}>{tr(copy,'rr.xi.formation')}</p>
  <div className={s.vsChips} role="group" aria-label={tr(copy,'rr.xi.formation')}>
   {FORMATION_IDS.map(f=>own[f].ready
    ?<Link key={f} className={`${s.chip} min-h-tap`} aria-current={formation===f?'true':undefined} href={href(locale,{mode:'xi',f,vs})}>{f}</Link>
    :<span key={f} className={`${s.chip} ${s.chipOff}`} aria-disabled="true">{f} — {tr(copy,'rr.xi.unavailable',{reason:own[f].reasons[0]??'—'})}</span>)}
  </div>
  <p className={s.mcNoteDark}>{tr(copy,'rr.xi.changeShape')} <bdi>{clubName}</bdi></p>
 </section>
}
