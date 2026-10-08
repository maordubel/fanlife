'use client'
import Link from 'next/link'
import {useCallback,useEffect,useMemo,useRef,useState} from 'react'
import type {PublicQuestion,Verdict,SourceRef,QTopic} from '@/lib/game/questions/types'
import {HEAT_START,heatAfter} from '@/lib/game/trivia-report'
import {LIVES,NEW_SESSION,advance,multiplierFor,outcomeOf,type Session} from '@/lib/game/session'
import {answerTrivia} from '@/app/clubs/[slug]/[gate]/actions'
import {hintTrivia} from '@/app/clubs/[slug]/[gate]/trivia-actions'
import {completeRun} from '@/lib/clubs/completion'
import {markStep} from '@/lib/analytics/meter'
import type {GameCopy} from '@/lib/clubs/game-copy'
import type {UiLocale} from '@/lib/clubs/locale'
import {firePickFxAt} from '@/components/stage/PickFx'
import {haptic} from '@/lib/play/haptics'
import {tr,useReducedMotion} from '@/components/clubs/rumble/shared'
import {
 HIT_LINES,MISS_LINES,PACE_KEY,advanceMs,askedOf,breakBefore,capOf,reactionFor,reportedScore,roundQuery,runKey,secondsOf,
 stageCount,stageIndex,staged,streakCall,trailingStreak,HINT_COST,type LogEntry,type PaceMode,type Reaction
} from '@/lib/clubs/trivia-model'
import {Answers,type AnswerLabels} from './TriviaAnswers'
import {TriviaReport} from './TriviaReport'
import css from './trivia.module.css'

export type TopicChip={id:string;label:string;count:number}
export type EraChip={decade:number;count:number}
export type ClubTriviaProps={
 questions:PublicQuestion[];club:string;clubName:string;version:string;seed:number;cursor:number;locale:UiLocale;contentLocale:string
 topic?:string;era?:string;hard?:string;copy:GameCopy
 topics:TopicChip[];eras:EraChip[];autostart:boolean;practice:boolean
}
type Shown={verdict:Verdict&{source:SourceRef};gained:number;combo:number;timeout:boolean;left:number;reaction:Reaction;hinted:boolean;ms:number}
type Hint={kind:'decade';decade:number}|{kind:'context';text:string}|{kind:'strike';strike:string[]}
type Pending={answer:string|string[];timeout:boolean;left:number}

/** Gate 2 · the Quiz Stand: a pregame beat, three stages of questions on one screen, a verdict you can read, a match report. */
export function ClubTrivia(props:ClubTriviaProps){
 const {questions,club,clubName,version,seed,cursor,locale,contentLocale,topic,era,hard,copy}=props
 const t=useCallback((k:string,v?:Record<string,string|number>)=>tr(copy,k,v),[copy])
 const count=questions.length,asked=askedOf(count),reduced=useReducedMotion()
 const [started,setStarted]=useState(props.autostart),[practice,setPractice]=useState(props.practice)
 const [session,setSession]=useState<Session>({...NEW_SESSION}),[shown,setShown]=useState<Shown|null>(null)
 const [log,setLog]=useState<LogEntry[]>([]),[heat,setHeat]=useState(HEAT_START),[call,setCall]=useState<string|null>(null)
 const [busy,setBusy]=useState(false),[error,setError]=useState(false),[hint,setHint]=useState<Hint|null>(null),[hinted,setHinted]=useState(false),[hintBusy,setHintBusy]=useState(false),[hintNone,setHintNone]=useState(false)
 const [secondsLeft,setSecondsLeft]=useState(0),[stageShown,setStageShown]=useState<number|null>(null),[announce,setAnnounce]=useState(''),[pace,setPace]=useState<PaceMode>('auto'),[paused,setPaused]=useState(false)
 const lock=useRef(false),pending=useRef<Pending|null>(null),leftRef=useRef(0),recorded=useRef(false),plate=useRef<HTMLDivElement|null>(null)
 const index=session.index,q=questions[index],over=session.over||index>=count,total=practice?0:secondsOf(index,count),cap=capOf(index,count)
 leftRef.current=secondsLeft
 const locked=busy||!!shown||error

 useEffect(()=>{try{const p=localStorage.getItem(PACE_KEY);if(p==='tap'||p==='auto')setPace(p)}catch{/* the default pace is used */}},[])
 const setPaceSaved=(p:PaceMode)=>{setPace(p);try{localStorage.setItem(PACE_KEY,p)}catch{/* a pace that cannot be kept is still the pace now */}}

 // ---- the clock: only while a question is live; never in practice, never before Start, never behind a card
 const submitRef=useRef<(a:string|string[],timeout?:boolean)=>void>(()=>{})
 useEffect(()=>{
  if(!started||over||stageShown!==null||locked||!q||practice)return
  const opened=Date.now();setSecondsLeft(total)
  const tick=window.setInterval(()=>{
   const left=total-(Date.now()-opened)/1000
   if(left>0){setSecondsLeft(left);return}
   window.clearInterval(tick);setSecondsLeft(0);submitRef.current([],true)
  },100)
  return ()=>window.clearInterval(tick)
 },[started,over,stageShown,locked,q?.id,practice,total]) // eslint-disable-line react-hooks/exhaustive-deps -- q is read by id

 // ---- one answer, from the tap to the verdict
 const settle=useCallback((v:Verdict&{source:SourceRef},p:Pending)=>{
  if(!q)return
  const outcome={correct:v.correct,difficulty:v.difficulty,secondsLeft:p.left,total,hinted,cap}
  const {gained,combo}=outcomeOf(session,outcome)
  const entry:LogEntry={id:q.id,type:q.type,topic:q.topic as QTopic,difficulty:v.difficulty,correct:v.correct,hinted,timeout:p.timeout,elapsed:practice?0:Math.max(0,total-p.left)}
  const streak=v.correct?trailingStreak([...log,entry]):0,reaction=reactionFor(entry,streak,index)
  setShown({verdict:v,gained,combo,timeout:p.timeout,left:p.left,reaction,hinted,ms:advanceMs(v.explanation,!!v.source.url)})
  setLog(cur=>[...cur,entry]);setHeat(h=>heatAfter(h,entry));setCall(v.correct?streakCall(streak):null)
  markStep(index+1)
  setAnnounce(v.correct?t('tq.announce.right',{points:practice?0:gained,lives:session.lives}):t('tq.announce.wrong',{lives:session.lives-1}))
  haptic(v.correct?'lock':'miss')
 },[q,total,hinted,cap,session,log,practice,index,t])
 const settleRef=useRef(settle);settleRef.current=settle

 const attempt=useCallback(async()=>{
  const p=pending.current;if(!p||!q)return
  setBusy(true);setError(false)
  try{
   const v=await answerTrivia(club,version,q.id,seed,cursor,index,p.answer,topic,era,hard)
   if(!v){setError(true);return}
   settleRef.current(v,p)
  }catch{setError(true)}finally{setBusy(false);lock.current=false}
 },[club,version,q,seed,cursor,index,topic,era,hard])
 const submit=useCallback((answer:string|string[],timeout=false)=>{
  if(lock.current||!q||over||shown)return
  lock.current=true;pending.current={answer,timeout,left:practice||timeout?0:leftRef.current}
  void attempt()
 },[q,over,shown,practice,attempt])
 submitRef.current=submit
 // a failed request keeps the dealt question and the answer; Retry sends the same one again
 const retry=()=>{if(lock.current||!pending.current)return;lock.current=true;void attempt()}

 // ---- the verdict plate: it ends on its own, long enough to read; a tap or Enter ends it now; hovering or focus holds it
 const next=useCallback(()=>{
  if(!shown||!q)return
  const after=advance(session,{correct:shown.verdict.correct,difficulty:shown.verdict.difficulty,secondsLeft:shown.left,total,hinted:shown.hinted,cap})
  setSession(after);setShown(null);setHint(null);setHinted(false);setHintNone(false);setPaused(false);setCall(null)
  if(!after.over&&after.index<count&&breakBefore(after.index,count))setStageShown(stageIndex(after.index,count))
 },[shown,q,session,total,cap,count])
 const [progress,setProgress]=useState(1)
 useEffect(()=>{
  if(!shown||pace==='tap'){setProgress(1);return}
  let spent=0,last=Date.now()
  const tick=window.setInterval(()=>{
   const now=Date.now();if(!paused)spent+=now-last;last=now
   setProgress(reduced?1:Math.max(0,1-spent/shown.ms))
   if(spent>=shown.ms){window.clearInterval(tick);next()}
  },50)
  return ()=>window.clearInterval(tick)
 },[shown,pace,paused,reduced,next])
 useEffect(()=>{
  if(!shown)return
  const el=plate.current;if(el)firePickFxAt(el,{label:shown.verdict.correct?(practice?'✓':`+${shown.gained}`):'✗',tone:'ink',big:shown.verdict.correct,haptic:false})
  const onKey=(e:KeyboardEvent)=>{if(e.key==='Enter'&&!(e.target as Element|null)?.closest('a,button,select,input')){e.preventDefault();next()}}
  window.addEventListener('keydown',onKey);return ()=>window.removeEventListener('keydown',onKey)
 },[shown]) // eslint-disable-line react-hooks/exhaustive-deps -- the burst fires once per verdict
 useEffect(()=>{if(!call)return;const off=window.setTimeout(()=>setCall(null),900);return ()=>window.clearTimeout(off)},[call])

 // ---- the paid hint: disclosed before it is used, charged only when one arrives
 async function askHint(){
  if(!q||locked||hinted||hintBusy)return
  setHintBusy(true);haptic('tap')
  try{
   const h=await hintTrivia(club,version,q.id,seed,cursor,index,topic,era,hard)
   if(h){setHint(h);setHinted(true)}else setHintNone(true)
  }catch{setHintNone(true)}finally{setHintBusy(false)}
 }

 // ---- one finished run is one completion
 useEffect(()=>{
  if(!over||!started||recorded.current)return
  recorded.current=true
  completeRun(club,'trivia',runKey({version,seed,cursor,topic,era,hard,practice}),reportedScore(session.score,practice))
 },[over,started,club,version,seed,cursor,topic,era,hard,practice,session.score])

 const labels:AnswerLabels=useMemo(()=>({
  multiCount:(n,of)=>t('tq.multi.count',{n,of}),order:{yours:t('tq.order.yours'),empty:t('tq.order.empty'),bank:t('tq.order.bank'),truth:t('tq.order.truth'),slot:n=>t('tq.order.slot',{n})},
  match:{left:t('tq.match.left'),right:t('tq.match.right'),was:t('tq.match.was'),help:t('tq.match.help')},year:t('tq.year.label'),right:t('tq.row.right'),wrong:t('tq.row.wrong'),struck:t('tq.row.struck'),confirm:copy.answer,true:copy.true,false:copy.false
 }),[t,copy])
 const label=(v:string)=>q?.type==='tf'?(v==='true'?copy.true:copy.false):v
 const topicLabel=(id:string)=>(copy as Record<string,string>)[`topic.${id}`]??id

 if(!started)return <Ready {...props} t={t} count={count} practice={practice} onPractice={setPractice} pace={pace} onPace={setPaceSaved} topicLabel={topicLabel} onStart={()=>{haptic('lock');setStarted(true)}}/>
 if(over)return <TriviaReport session={session} log={log} count={count} asked={asked} club={club} clubName={clubName} version={version} seed={seed} cursor={cursor} locale={locale} contentLocale={contentLocale} topic={topic} era={era} hard={hard} practice={practice} copy={copy} available={props.topics.map(x=>x.id as QTopic)} topicLabel={topicLabel}/>
 if(!q)return null

 const struck=hint?.kind==='strike'?hint.strike:[],graded=shown?{correct:shown.verdict.correct,correctAnswers:shown.verdict.correctAnswers}:null
 const stage=stageIndex(index,count),mult=multiplierFor(session.combo,cap),fraction=total>0?Math.max(0,secondsLeft/total):1,urgent=!practice&&fraction<=0.28&&!shown
 const reactionLine=shown?(shown.reaction.key==='hit'?t(`tq.react.hit.${shown.reaction.variant%HIT_LINES}`):shown.reaction.key==='miss'?t(`tq.react.miss.${shown.reaction.variant%MISS_LINES}`):t(`tq.react.${shown.reaction.key}`)):''
 return <section className={css.stage} data-testid="trivia-question" data-question-id={q.id} data-question-type={q.type} data-stage={stage+1} aria-busy={busy} data-practice={practice||undefined}>
  {stageShown!==null&&<StageBreak stage={stageShown} t={t} count={count} practice={practice} onDone={()=>setStageShown(null)}/>}
  <p className="sr-only" role="status" aria-live="polite">{announce}</p>
  <div className={css.play}>
   <div className={css.hud} data-testid="trivia-hud">
    <ol className={css.lamps} aria-label={t('tq.hud.lamps',{n:session.lives})}>{Array.from({length:LIVES},(_,i)=><li key={i} data-lit={i<session.lives}/>)}</ol>
    <p className={css.score} aria-label={t('tq.hud.score')}><b>{session.score}</b></p>
    <p className={css.mult} aria-label={t('tq.hud.combo',{n:mult,cap})} data-hot={mult>1||undefined}><bdi dir="ltr">×{mult}<small>/{cap}</small></bdi></p>
    {practice?<p className={css.practice}>{t('tq.hud.practice')}</p>
     :<div className={css.clock} role="timer" aria-label={`${Math.ceil(secondsLeft)}`} data-urgent={urgent||undefined}><i style={{inlineSize:`${fraction*100}%`}}/></div>}
    <ol className={css.ticks} aria-hidden="true">{Array.from({length:count},(_,i)=>{const m=session.history[i];return <li key={i} data-now={i===index||undefined} data-mark={m===undefined?'none':m?'right':'wrong'} data-gap={staged(count)&&i>0&&i%4===0||undefined}/>})}</ol>
    <div className={css.heat}><span>{t('tq.hud.heat')}</span><i aria-hidden="true"><b style={{inlineSize:`${heat}%`}}/></i><span className={css.heatPct}>{heat}%</span>{call&&<em className={css.call} aria-hidden="true">{t(call)}</em>}</div>
    <p className={css.stageTag}>{staged(count)?t('tq.hud.stage',{n:stage+1,of:stageCount(count)}):t('tq.hud.short',{n:index+1,of:asked})}<span aria-hidden="true"> · </span><span>{index+1}/{asked}</span></p>
   </div>
   <div className={css.body}>
    <div className={css.qcard} key={q.id}>
     <p className={css.pills}><span data-strong>{t(`tq.type.${q.type}`)}</span><span>{t('tq.difficulty',{d:q.difficulty})}</span><span>{topicLabel(q.topic)}</span></p>
     {q.quoteHe&&<blockquote lang={contentLocale} dir="auto" className={css.quote}>{q.quoteHe}{q.quoteByHe&&<cite> — {q.quoteByHe}</cite>}</blockquote>}
     <h2 lang={contentLocale} dir="auto" data-long={q.prompt.length>110||undefined}>{q.prompt}</h2>
     <p className={css.how}>{t(`tq.how.${q.type}`)}</p>
    </div>
    <Answers key={`${q.id}:answers`} q={q} locked={locked} graded={graded} struck={struck} contentLocale={contentLocale} labels={labels} onAnswer={a=>submit(a)}/>
   </div>
   <div className={css.dock}>
    {error&&<div className={css.error} role="alert"><p>{t('tq.error')}</p><div><button type="button" className={css.tool} onClick={retry}>{copy.retry}</button><Link className={css.tool} href={`?${roundQuery({seed,cursor,lang:locale,topic,era,hard,practice})}`}>{copy.restart}</Link></div></div>}
    {shown?<div ref={plate} className={css.verdict} data-right={shown.verdict.correct} role="status" onClick={e=>{if(!(e.target as Element).closest('a'))next()}}
      onPointerEnter={e=>{if(e.pointerType==='mouse')setPaused(true)}} onPointerLeave={e=>{if(e.pointerType==='mouse')setPaused(false)}} onFocus={()=>setPaused(true)} onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget))setPaused(false)}}>
     <h3><span className={css.verdictMark} aria-hidden="true">{shown.verdict.correct?'✓':'✗'}</span>{shown.timeout?t('tq.timeup'):shown.verdict.correct?copy.correct:copy.wrong}{shown.verdict.correct&&<b className={css.points}>{practice?'':`+${shown.gained}`}</b>}</h3>
     <p className={css.reaction}>{reactionLine}</p>
     <p className={css.explain} lang={contentLocale} dir="auto">
      {!shown.verdict.correct&&q.type!=='order'&&q.type!=='match'&&<b>{t('tq.answerWas')} <bdi>{shown.verdict.correctAnswers.map(label).join(' · ')}</bdi>. </b>}
      {shown.verdict.explanation}
     </p>
     {shown.hinted&&shown.verdict.correct&&!practice&&<p className={css.fine}>{t('tq.hinted',{cost:HINT_COST})}</p>}
     {shown.verdict.source.url&&<a className={css.source} href={shown.verdict.source.url} target="_blank" rel="noreferrer">{copy.source}: <bdi>{shown.verdict.source.title}</bdi> ↗</a>}
     <div className={css.nextRow}>{pace==='auto'&&<i className={css.drain} aria-hidden="true"><b style={{inlineSize:`${progress*100}%`}}/></i>}
      <button type="button" className={css.next} onClick={e=>{e.stopPropagation();next()}}>{t('tq.next')}</button></div>
    </div>
    :<div className={css.hintRow}>
     <button type="button" className={css.tool} disabled={locked||hinted||hintBusy} onClick={askHint} data-testid="trivia-hint">{practice?t('tq.hint.free'):t('tq.hint.cost',{cost:HINT_COST})}</button>
     <p className={css.hintText} aria-live="polite" lang={hint?.kind==='context'?contentLocale:undefined} dir={hint?.kind==='context'?'auto':undefined}>
      {hint?.kind==='decade'&&t('tq.hint.decade',{decade:hint.decade})}{hint?.kind==='context'&&hint.text}{hint?.kind==='strike'&&t('tq.hint.struck')}{hintNone&&!hint&&t('tq.hint.none')}
     </p>
     <button type="button" className={css.tool} aria-pressed={pace==='tap'} onClick={()=>setPaceSaved(pace==='tap'?'auto':'tap')} title={t('tq.pace.title')}>{pace==='tap'?t('tq.pace.tap'):t('tq.pace.auto')}</button>
    </div>}
   </div>
  </div>
 </section>
}

/** the card between stages: it ends on its own, ends NOW on a tap, and says the stage's rules in one line */
function StageBreak({stage,t,count,practice,onDone}:{stage:number;t:(k:string,v?:Record<string,string|number>)=>string;count:number;practice:boolean;onDone:()=>void}){
 const done=useRef(onDone);done.current=onDone
 useEffect(()=>{const id=window.setTimeout(()=>done.current(),1300);return ()=>window.clearTimeout(id)},[])
 const seconds=secondsOf(stage*4,count),cap=capOf(stage*4,count)
 return <button type="button" className={css.stageBreak} onClick={onDone} aria-label={t('tq.stage.skip')} data-testid="trivia-stage">
  <span className={css.breakKicker}>{t('tq.hud.stage',{n:stage+1,of:3})}</span>
  <span className={css.breakNo} aria-hidden="true">{stage+1}</span>
  <span className={css.breakName}>{t(`tq.stage.${stage+1}`)}</span>
  <span className={css.breakRule}>{practice?t('tq.stage.rulePractice',{cap}):t('tq.stage.rule',{seconds,cap})}</span>
  <span className={css.breakTap}>{t('tq.stage.tap')}</span>
 </button>
}

type ReadyProps=ClubTriviaProps&{t:(k:string,v?:Record<string,string|number>)=>string;count:number;practice:boolean;onPractice:(v:boolean)=>void;pace:PaceMode;onPace:(p:PaceMode)=>void;topicLabel:(id:string)=>string;onStart:()=>void}
/** Quick Pick: choose what to be asked, then ONE explicit Start. Nothing is on a clock until it is pressed. */
function Ready({club,clubName,seed,cursor,locale,topic,era,hard,topics,eras,count,practice,onPractice,pace,onPace,topicLabel,onStart,t,copy}:ReadyProps){
 const href=(next:{topic?:string;era?:string;hard?:string})=>`?${roundQuery({seed,cursor,lang:locale,...next})}`
 const asked=askedOf(count),full=staged(count)
 return <section className={css.stage} data-testid="trivia-ready" data-club={club}>
  <div className={css.ready}>
   <p className={css.readyKicker}>{clubName} · {t('tq.ready.kicker')}</p>
   <p className={css.readyNo} aria-hidden="true">{asked}</p>
   <h2 className={css.readyTitle}>{full?t('tq.ready.full',{n:asked}):t('tq.ready.short',{n:asked})}</h2>
   <p className={css.readyRule}>{practice?t('tq.ready.practice'):full?t('tq.ready.rule',{lives:LIVES}):t('tq.ready.ruleShort',{lives:LIVES})}</p>
   <div className={css.rail} role="group" aria-label={t('tq.pick.topic')}>
    <Link className={css.chip} href={href({era,hard})} aria-current={!topic?'true':undefined}>{copy.anyTopic}</Link>
    {topics.map(x=><Link key={x.id} className={css.chip} href={href({topic:x.id,era,hard})} aria-current={topic===x.id?'true':undefined}>{x.label} <small>{x.count}</small></Link>)}
   </div>
   {eras.length>0&&<div className={css.rail} role="group" aria-label={t('tq.pick.era')}>
    <Link className={css.chip} href={href({topic,hard})} aria-current={!era?'true':undefined}>{copy.anyEra}</Link>
    {eras.map(e=><Link key={e.decade} className={css.chip} href={href({topic,era:String(e.decade),hard})} aria-current={era===String(e.decade)?'true':undefined}>{e.decade}s <small>{e.count}</small></Link>)}
   </div>}
   <div className={css.switches}>
    <Link className={css.switch} href={href({topic,era,hard:hard?undefined:'1'})} aria-current={hard?'true':undefined}>{copy.hard}</Link>
    <button type="button" className={css.switch} aria-pressed={practice} onClick={()=>onPractice(!practice)}>{t('tq.pick.practice')}</button>
    <button type="button" className={css.switch} aria-pressed={pace==='tap'} onClick={()=>onPace(pace==='tap'?'auto':'tap')}>{t('tq.pick.tap')}</button>
   </div>
   <p className={css.fine}>{full?'':t('tq.ready.shortNote',{n:asked})}{topic?` ${topicLabel(topic)}.`:''}</p>
   <button type="button" className={css.start} onClick={onStart} data-testid="trivia-start">{t('tq.start')}</button>
  </div>
 </section>
}
