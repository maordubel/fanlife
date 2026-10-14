'use client'
import type {DuelPoll} from '@/lib/clubs/polls-duel/adapter'
import {MIN_BIRTH,parseYear} from '@/lib/clubs/polls-duel/pool'
import css from './duel.module.css'

type T=(k:string,v?:Record<string,string|number>)=>string
export type PeriodKind='all'|'since'|'decade'
export type ResumeInfo={ok:true;decided:number;cap:number;done:boolean}|{ok:false;stale:true}|null

/** The lobby: choose a poll, choose the years, start. Presentational — the container owns every decision. */
export function DuelLobby({polls,pollId,onPoll,period,onPeriod,birth,onBirth,decades,decade,onDecade,eligible,resume,onStart,onResume,onFresh,onDirect,t}:{
 polls:DuelPoll[];pollId:string|null;onPoll:(id:string)=>void;period:PeriodKind;onPeriod:(p:PeriodKind)=>void
 birth:string;onBirth:(v:string)=>void;decades:number[];decade:number|null;onDecade:(d:number)=>void
 eligible:number;resume:ResumeInfo;onStart:()=>void;onResume:()=>void;onFresh:()=>void;onDirect:()=>void;t:T
}){
 const max=new Date().getFullYear(),by=parseYear(birth),badBirth=period==='since'&&birth.length>0&&by===null
 const needBirth=period==='since'&&by===null,needDecade=period==='decade'&&decade===null
 const canStart=!!pollId&&eligible>=2&&!needBirth&&!needDecade
 return <div className={css.duel} data-testid="duel-lobby">
  <section className={css.programme}>
   <div className={css.head}><p className={css.kicker}>{t('pc.kicker')}</p><h2 className={css.title}>{t('pc.title')}</h2><p className={css.fine}>{t('pc.sub')}</p></div>
   <div className={css.block}>
    <p className={css.label} id="pc-poll">{t('pc.poll.label')}</p>
    <ul className={css.pollGrid} aria-labelledby="pc-poll">{polls.map(p=><li key={p.pollId}>
     <button type="button" className={`${css.pollBtn} min-h-tap`} aria-pressed={pollId===p.pollId} disabled={!!p.unavailable} data-testid={`duel-poll-${p.pollId}`} onClick={()=>onPoll(p.pollId)}>
      <span>{p.prompt??t(`tv.q.${p.labelKey}`)}</span>
      {p.unavailable&&<small>{t('pc.poll.unavailable',{have:p.unavailable.have})}</small>}
     </button></li>)}</ul>
   </div>
   <div className={css.block}>
    <p className={css.label}>{t('pc.period.label')}</p>
    <div className="wk-seg" role="group" aria-label={t('pc.period.label')}>
     {(['all','since','decade'] as const).map(k=><button key={k} type="button" aria-pressed={period===k} data-testid={`duel-period-${k}`} onClick={()=>onPeriod(k)}>{t(`pc.period.${k}`)}</button>)}
    </div>
    {period==='since'&&<div className={css.birth}>
     <label className={css.label} htmlFor="pc-birth">{t('pc.birth.label')}</label>
     <input id="pc-birth" inputMode="numeric" autoComplete="off" maxLength={4} placeholder={t('pc.birth.ph')} value={birth} onChange={e=>onBirth(e.target.value.replace(/\D/g,'').slice(0,4))} aria-invalid={badBirth} data-testid="duel-birth"/>
     {badBirth&&<p className={css.bad} role="alert">{t('pc.birth.bad',{min:MIN_BIRTH,max})}</p>}
     <p className={css.fine}>{t('pc.birth.note')}</p>
    </div>}
    {period==='decade'&&(decades.length===0
     ?<p className={css.fine}>{t('pc.decade.none')}</p>
     :<ul className={css.decades} aria-label={t('pc.decade.label')}>{decades.map(d=><li key={d}><button type="button" className={`${css.chip} min-h-tap`} aria-pressed={decade===d} onClick={()=>onDecade(d)}>{t('pc.decade.item',{a:d,b:d+9})}</button></li>)}</ul>)}
   </div>
   <div className={css.block}>
    {resume&&resume.ok&&<div className={css.resume} data-testid="duel-resume"><b>{t('pc.resume.title')}</b><p className={css.fine}>{t('pc.resume.body',{n:resume.decided,m:resume.cap})}</p>
     <div className={css.row2}><button type="button" className={`${css.ghost} min-h-tap`} onClick={onResume}>{t(resume.done?'pc.resume.done':'pc.resume.go')}</button><button type="button" className={`${css.ghost} min-h-tap`} onClick={onFresh}>{t('pc.resume.new')}</button></div></div>}
    {resume&&!resume.ok&&<p className={css.stale} role="status" data-testid="duel-stale">{t('pc.stale')}</p>}
    <div className={css.pool}><span className={css.poolN} data-testid="duel-pool">{pollId?eligible:0}</span><span className={css.poolT}>{pollId&&eligible<2?t('pc.pool.short'):t('pc.pool',{n:pollId?eligible:0}).replace(/^\d+\s*/,'')}</span></div>
    <div className={css.actions}>
     <button type="button" className={`wk-btn red block lg min-h-tap`} disabled={!canStart} onClick={onStart} data-testid="duel-start">{t('pc.start')}</button>
     <button type="button" className={`${css.ghost} min-h-tap`} onClick={onDirect}>{t('pc.direct')}</button>
    </div>
   </div>
  </section>
 </div>
}
