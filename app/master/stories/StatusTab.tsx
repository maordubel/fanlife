'use client'
import {jobKind,type Job} from '@/lib/stories/jobs'
import {plainError,queueText,type Facts} from '@/lib/stories/banners'
import {filmTitle} from '@/lib/stories/social'
import {HealthStrip,when} from './stories-desk'
import css from './studio.module.css'

/** The engine room: the lights, the queue, the last Drive scans and the recent failures in plain words. */
const KIND_TEXT={film:'Documentary',classified:'CLASSIFIED',vlog:'I WAS THERE',promo:'Marketing film',short:'Animated Short'} as const
const STATE_TEXT:Record<string,string>={queued:'Waiting',running:'In production',paused:'Paused',cancel_requested:'Stopping'}
export function StatusTab({facts,jobs}:{facts:Facts;jobs:Job[]|null}){
 const live=(jobs??[]).filter(j=>STATE_TEXT[j.state])
 const failed=(jobs??[]).filter(j=>j.state==='failed').slice(0,8)
 const drive=(jobs??[]).flatMap(j=>j.log.filter(l=>/^(Drive|drive)/.test(l.text.replace(/^\w+: /,''))).map(l=>({...l,title:filmTitle(j)}))).sort((a,b)=>b.at.localeCompare(a.at)).slice(0,6)
 const pd=facts.pitchDesk
 return <>
  {facts.health?<HealthStrip h={facts.health}/>:<p className={css.alert}>Not connected — the studio&rsquo;s status could not be read.</p>}
  <div className={css.grid}>
   <section className={css.panel} aria-labelledby="st-q"><div className={css.bar}><span id="st-q">The queue</span><span>One at a time</span></div><div className={css.body}>
    <p>{queueText(jobs)}</p>
    {live.length?<ul className={css.checks}>{live.map(j=><li key={j.id}><b>{STATE_TEXT[j.state]}</b> {KIND_TEXT[jobKind(j)]} · {filmTitle(j)}{j.notBefore?` · starts again ${when(j.notBefore)}`:''}{j.stage?` · ${j.stage}`:''}</li>)}</ul>:null}
    <h3 className={css.h3}>Directors&rsquo; pitch run</h3>
    <p className={css.hint}>{pd===null||pd===undefined?'Not connected.':pd.last?`Last run ${when(pd.last.at)}: ${pd.last.state}${pd.last.saved?` · ${pd.last.saved} pitch(es)`:''}${pd.last.retryAt?` · again ${when(pd.last.retryAt)}`:''}${pd.last.note?` · ${pd.last.note}`:''}`:'No run yet. It runs every morning, and when you ask in the Directors tab.'}</p>
    <h3 className={css.h3}>Drive scans</h3>
    {drive.length?<ul className={css.checks}>{drive.map((l,i)=><li key={i}><b>{when(l.at)}</b> {l.title}: {l.text}</li>)}</ul>:<p className={css.hint}>No Drive scan in the recent jobs. A documentary scans your Drive library live on each run.</p>}
   </div></section>
   <section className={css.panel} aria-labelledby="st-f"><div className={css.bar}><span id="st-f">Recent failures</span><span>{failed.length}</span></div><div className={css.body}>
    {failed.length?<ul className={css.checks}>{failed.map(j=><li key={j.id}><b>{KIND_TEXT[jobKind(j)]} · {filmTitle(j)}</b><br/>{plainError(j.error?.code||'INTERNAL',j.error?.message||'')}<br/><span className={css.meta}>[{j.error?.code}] {when(j.updatedAt)} · {j.error?.retryable?'safe to retry':'fix the cause first'}</span></li>)}</ul>:<p className={css.hint}>Nothing failed recently.</p>}
   </div></section>
  </div>
 </>
}
