'use client'
import Link from 'next/link'
import {useMemo} from 'react'
import type {QTopic} from '@/lib/game/questions/types'
import type {Session} from '@/lib/game/session'
import type {GameCopy} from '@/lib/clubs/game-copy'
import type {UiLocale} from '@/lib/clubs/locale'
import {tr} from '@/components/clubs/rumble/shared'
import {ShareComposer} from '@/components/share/v3/ShareComposer'
import {triviaShare,type ShareDraft} from '@/lib/share/v3/adapters'
import type {RunMeta} from '@/app/clubs/[slug]/[gate]/trivia-run-actions'
import {MIN_ROUND,nextChallenges,reportOf,roundQuery,type LogEntry} from '@/lib/clubs/trivia-model'
import css from './trivia.module.css'

type Props={
 session:Session;log:LogEntry[];count:number;asked:number;meta:RunMeta;club:string;clubName:string;version:string
 locale:UiLocale;contentLocale:string;copy:GameCopy;available:QTopic[];hardOpen:boolean;topicLabel:(id:string)=>string;missedLeft:number
}

/** the plain-English line a shared card carries for each result category (a share is always English: the card is the club's public face) */
const CATEGORY_EN:Record<string,string>={standard:'Standard run',hard:'Hard run',history:'History run',topic:'Topic run',era:'Era run',short:'Short run',revenge:'Revenge run',practice:'Practice run'}

/**
 * The share draft for a finished run. The link is the SAME deck (seed + cursor + mode + filters), never a practice
 * link; a practice run is shared without a score because it had none (TR-R10); the card's detail names the category so
 * a short or hard run is never read as a standard one.
 */
export function triviaDraft(input:{club:string;meta:RunMeta;log:readonly LogEntry[];session:Pick<Session,'score'|'bestCombo'>}):ShareDraft|null{
 const {club,meta,log,session}=input
 if(log.length===0)return null
 const correct=log.filter(e=>e.correct).length
 const base=triviaShare(club,{seed:meta.seed,cursor:meta.cursor,correct,answered:log.length,marks:log.map(e=>e.correct),score:meta.practice?0:session.score,bestCombo:session.bestCombo,topic:meta.topic||undefined,era:meta.era||undefined})
 const link=new URL(base.data.link)
 if(meta.mode&&meta.mode!=='standard'&&meta.mode!=='revenge')link.searchParams.set('mode',meta.mode)
 const label=CATEGORY_EN[meta.category]??CATEGORY_EN.standard!
 const detail=meta.practice?`${label} · no clock, nothing scored · Best streak: ${session.bestCombo}`:`${label} · Best streak: ${session.bestCombo} · Score: ${session.score}`
 return {...base,data:{...base.data,link:link.href,detail,statement:`I remembered ${correct} of ${log.length}.`}}
}

/** The match report: what the run was, said from the run's own log, with the next door already open. */
export function TriviaReport(p:Props){
 const {session,log,asked,meta,club,clubName,locale,copy,topicLabel,missedLeft}=p
 const t=(k:string,v?:Record<string,string|number>)=>tr(copy,k,v)
 const right=log.filter(e=>e.correct).length,answered=log.length,practice=meta.practice
 const report=useMemo(()=>reportOf(log,p.count,session.lives),[log,p.count,session.lives])
 const category=practice?'practice':meta.category
 const next=nextChallenges({report,share:asked>0?right/asked:0,hard:meta.mode==='hard',topic:meta.topic||undefined,available:p.available,hardOpen:p.hardOpen&&meta.mode==='standard'})
 const draft=useMemo(()=>triviaDraft({club,meta,log,session}),[club,meta,log,session])
 const query=(extra:{mode?:string;topic?:string;era?:string;practice?:boolean;go?:boolean}={})=>`?${roundQuery({seed:meta.seed,cursor:meta.cursor+1,lang:locale,...extra})}`
 const again=meta.mode==='revenge'?query():query({mode:meta.mode,topic:meta.topic||undefined,era:meta.era||undefined,practice,go:true})
 const out=session.lives<=0
 return <section className={css.report} data-testid="trivia-result" data-tier={report.tier} data-category={category}>
  <div className={css.reportHead}>
   <p className={css.reportKicker}>{clubName} · {t('tq.report.kicker')}</p>
   <h2 className={css.reportTitle}>{t(`tq.report.tier.${report.tier}`)}</h2>
   <p className={css.reportCat} data-testid="trivia-category">{t(`tq.cat.${category}`)}</p>
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
    const href=n.kind==='weak'?query({topic:n.topic,go:true}):n.kind==='hard'?query({mode:'hard',go:true}):query({mode:'standard',go:true})
    const label=n.kind==='weak'?t('tq.report.nextWeak',{topic:topicLabel(n.topic)}):n.kind==='hard'?t('tq.report.nextHard'):t('tq.report.nextMix')
    return <Link key={n.kind} className={css.cta} data-kind="plain" href={href}><span>{label}</span><span aria-hidden="true">→</span></Link>
   })}
   {missedLeft>=MIN_ROUND&&meta.mode!=='revenge'&&<Link className={css.cta} data-kind="plain" href={query()} data-testid="trivia-next-revenge"><span>{t('tq.report.nextRevenge',{n:missedLeft})}</span><span aria-hidden="true">→</span></Link>}
   {draft&&<ShareComposer label={t('tq.report.share')} draft={draft}/>}
   <Link className={css.cta} data-kind="plain" href={`/clubs/${club}/archive?lang=${locale}`}><span>{t('tq.report.archive')}</span><span aria-hidden="true">→</span></Link>
   <Link className={css.cta} data-kind="plain" href={`/clubs/${club}?lang=${locale}`}><span>{copy.backToClub}</span><span aria-hidden="true">→</span></Link>
  </div>
 </section>
}
