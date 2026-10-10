import Link from 'next/link'
import {gameCopy} from '@/lib/clubs/game-copy'
import type {UiLocale} from '@/lib/clubs/locale'
import {FORMATION_IDS,slotsOf} from '@/lib/clubs/rumble-xi/formations'
import type {FormationId,XIReadiness} from '@/lib/clubs/rumble-xi/types'
import type {RivalChoice} from '@/lib/clubs/rumble-xi/server'
import {livery,wearLivery} from '@/lib/club-livery'
import {REGISTRY} from '@/lib/master/registry'
import {RivalPicker,type RivalCopy,type RivalOpt} from './RivalPicker'
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

function MiniPitch({f}:{f:FormationId}){
 return <svg className={s.fmPitch} viewBox="0 0 62 76" aria-hidden="true"><rect x="1" y="1" width="60" height="74"/><line x1="1" y1="38" x2="61" y2="38"/>{slotsOf(f).map(sl=><circle key={sl.id} cx={4+(sl.x/100)*54} cy={6+((sl.y-20)/64)*62} r="3.2"/>)}</svg>
}
/** Eleven a side: the rival (a drop-down of club cards) and the shape (three little pitches). Unavailable choices say why. */
export function RumbleXIEntry({club,clubName,locale,formation,vs,rivals,own,sameOk,me}:{club:string;clubName:string;locale:UiLocale;formation:FormationId;vs:string;rivals:RivalChoice[];own:Record<FormationId,XIReadiness>;sameOk:boolean;me:{id:string;name:string;pattern?:string;initials?:string}}){
 const copy=gameCopy(locale),q=(extra:Record<string,string>)=>href(locale,{mode:'xi',f:formation,vs,...extra})
 const dress=(id:string)=>{const l=livery(id);return {style:wearLivery(l),pattern:l?.pattern,initials:l?.initials}}
 const options:RivalOpt[]=[
  {id:'same',kind:'same',name:tr(copy,'rr.xi.rival.same').split(' — ')[0]!,sub:sameOk?tr(copy,'rr.xi.sameSub'):own[formation].reasons[0]??tr(copy,'rr.xi.noSecond'),ok:sameOk,href:q({vs:'same'}),...dress(me.id)},
  ...rivals.filter(r=>r.id!==club).map(r=>({id:r.id,kind:'club' as const,name:r.name,sub:r.ok?(REGISTRY.find(c=>c.id===r.id)?.city??null):r.reason,ok:r.ok,href:q({vs:r.id}),...dress(r.id)})),
  {id:'random',kind:'random',name:tr(copy,'rr.xi.rival.random'),sub:tr(copy,'rr.xi.randomSub'),ok:true,href:q({vs:'random'})},
 ]
 const rc:RivalCopy={label:tr(copy,'rr.xi.rivalKicker'),pick:tr(copy,'rr.xi.pickRival'),unavailable:tr(copy,'rr.xi.unavailable'),close:tr(copy,'rr.close'),same:tr(copy,'rr.xi.rival.same'),random:tr(copy,'rr.xi.rival.random'),vs:'VS'}
 return <section className={s.vsBar} aria-label={tr(copy,'rr.xi.rivalKicker')} data-testid="rumble-xi-entry">
  <RivalPicker me={me} current={vs} options={options} copy={rc}/>
  <p className={`${s.mono} ${s.vsHead}`}>{tr(copy,'rr.xi.formation')}</p>
  <div className={s.fmRow} role="group" aria-label={tr(copy,'rr.xi.formation')}>
   {FORMATION_IDS.map(f=>own[f].ready
    ?<Link key={f} className={`${s.fmCard} min-h-tap`} aria-current={formation===f?'true':undefined} href={href(locale,{mode:'xi',f,vs})} scroll={false}><MiniPitch f={f}/><b>{f}</b><small>{tr(copy,`rr.xi.shapeSub.${f}`)}</small></Link>
    :<span key={f} className={s.fmCard} aria-disabled="true"><MiniPitch f={f}/><b>{f}</b><small>{tr(copy,'rr.xi.unavailable',{reason:own[f].reasons[0]??'—'})}</small></span>)}
  </div>
  <p className={s.mcNoteDark}>{tr(copy,'rr.xi.changeShape')} <bdi>{clubName}</bdi></p>
 </section>
}
