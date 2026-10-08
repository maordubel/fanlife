'use client'
import Link from 'next/link'
import {useMemo,useState} from 'react'
import type {QTopic} from '@/lib/game/questions/types'
import type {Session} from '@/lib/game/session'
import type {GameCopy} from '@/lib/clubs/game-copy'
import type {UiLocale} from '@/lib/clubs/locale'
import {tr} from '@/components/clubs/rumble/shared'
import {nextChallenges,reportOf,roundQuery,shareText,type LogEntry} from '@/lib/clubs/trivia-model'
import css from './trivia.module.css'

type Props={
 session:Session;log:LogEntry[];count:number;asked:number;club:string;clubName:string;version:string;seed:number;cursor:number
 locale:UiLocale;contentLocale:string;topic?:string;era?:string;hard?:string;practice:boolean;copy:GameCopy
 available:QTopic[];topicLabel:(id:string)=>string
}

/** The match report: what the run was, said from the run's own log, with the next door already open. */
export function TriviaReport(p:Props){
 const {session,log,asked,club,clubName,seed,cursor,locale,topic,era,hard,practice,copy,topicLabel}=p
 const t=(k:string,v?:Record<string,string|number>)=>tr(copy,k,v)
 const right=log.filter(e=>e.correct).length,answered=log.length
 const report=useMemo(()=>reportOf(log,p.count,session.lives),[log,p.count,session.lives])
 const next=nextChallenges({report,share:asked>0?right/asked:0,hard:!!hard,topic,available:p.available})
 const [note,setNote]=useState('')
 const query=(extra:{topic?:string;era?:string;hard?:string;practice?:boolean})=>`?${roundQuery({seed,cursor:cursor+1,lang:locale,go:true,...extra})}`
 const again=query({topic,era,hard,practice})
 async function share(){
  const url=`${location.origin}${location.pathname}?${roundQuery({seed,cursor,lang:locale,topic,era,hard,practice})}`
  const text=shareText({club:clubName,title:copy['gate.trivia'],score:practice?0:session.score,correct:right,asked:answered,marks:log.map(e=>e.correct),url})
  try{
   if(typeof navigator.share==='function'){await navigator.share({title:clubName,text,url});return}
   await navigator.clipboard.writeText(text);setNote(t('tq.report.copied'))
  }catch{/* a cancelled share is not an error */}
 }
 const out=session.lives<=0
 return <section className={css.report} data-testid="trivia-result" data-tier={report.tier}>
  <div className={css.reportHead}>
   <p className={css.reportKicker}>{clubName} · {t('tq.report.kicker')}</p>
   <h2 className={css.reportTitle}>{t(`tq.report.tier.${report.tier}`)}</h2>
   {practice?<p className={css.reportLine}>{t('tq.report.practice')}</p>:<p className={css.reportScore}><span className="sr-only">{copy.score}: </span>{session.score}</p>}
   <p className={css.reportLine}>{copy.correct}: {right}/{answered}</p>
   <p className={css.reportLine}>{copy.answered}: {answered}/{asked}{out?` · ${t('tq.report.out')}`:''}</p>
   <ol className={css.reportTicks} aria-label={t('tq.report.run')}>{log.map((e,i)=><li key={i} data-mark={e.correct?'right':'wrong'}><span aria-hidden="true">{e.correct?'✓':'✗'}</span><span className="sr-only">{e.correct?t('tq.row.right'):t('tq.row.wrong')}</span></li>)}</ol>
  </div>
  {report.byTopic.length>0&&<div className={css.card}>
   <h3>{t('tq.report.topics')}</h3>
   <ul className={css.rows}>{report.byTopic.map(r=><li key={r.topic}><span>{topicLabel(r.topic)}</span><span>{r.right}/{r.asked}</span><i aria-hidden="true"><b style={{inlineSize:`${Math.round(100*r.right/r.asked)}%`}}/></i></li>)}</ul>
  </div>}
  <div className={css.card}>
   <h3>{t('tq.report.facts')}</h3>
   <ul className={css.facts}>
    <li><b>{report.bestStreak}</b>{t('tq.report.streak')}</li>
    {report.hardest!==null&&<li><b>{report.hardest}/5</b>{t('tq.report.hardest')}</li>}
    {report.strongest&&<li><b>{topicLabel(report.strongest)}</b>{t('tq.report.strongest')}</li>}
    {report.weakest&&<li><b>{topicLabel(report.weakest)}</b>{t('tq.report.weakest')}</li>}
    {report.timeouts>0&&<li><b>{report.timeouts}</b>{t('tq.report.timeouts')}</li>}
    {report.hinted>0&&<li><b>{report.hinted}</b>{t('tq.report.hinted')}</li>}
   </ul>
   <p className={css.fine}>{copy.localOnly}</p>
  </div>
  <div className={css.actions}>
   <Link className={css.cta} data-kind="lit" href={again}><span>{copy.replay}</span><span aria-hidden="true">→</span></Link>
   {next.map(n=>{
    const href=n.kind==='weak'?query({topic:n.topic}):n.kind==='hard'?query({topic,era,hard:'1'}):query({})
    const label=n.kind==='weak'?t('tq.report.nextWeak',{topic:topicLabel(n.topic)}):n.kind==='hard'?t('tq.report.nextHard'):t('tq.report.nextMix')
    return <Link key={n.kind} className={css.cta} data-kind="plain" href={href}><span>{label}</span><span aria-hidden="true">→</span></Link>
   })}
   <button type="button" className={css.cta} onClick={share}><span>{t('tq.report.share')}</span><span aria-hidden="true">↗</span></button>
   {note&&<p className={css.copied} role="status">{note}</p>}
   <Link className={css.cta} data-kind="plain" href={`/clubs/${club}/archive?lang=${locale}`}><span>{t('tq.report.archive')}</span><span aria-hidden="true">→</span></Link>
   <Link className={css.cta} data-kind="plain" href={`/clubs/${club}?lang=${locale}`}><span>{copy.backToClub}</span><span aria-hidden="true">→</span></Link>
  </div>
 </section>
}
