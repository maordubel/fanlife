'use client'
import Link from 'next/link'
import {useCallback,useEffect,useMemo,useRef,useState} from 'react'
import type {QTopic,PublicQuestion} from '@/lib/game/questions/types'
import {HEAT_START,heatAfter} from '@/lib/game/trivia-report'
import {LIVES,NEW_SESSION,STAGE_CAPS,STAGE_SECONDS,multiplierFor,type Session} from '@/lib/game/session'
import {answerTriviaRun,hintTriviaRun,openTriviaQuestion,resumeTriviaRun,reviewMissedQuestions,startTriviaRun,type AnswerView,type Fail,type RunView} from '@/app/clubs/[slug]/[gate]/trivia-run-actions'
import {completeRun} from '@/lib/clubs/completion'
import {markStep} from '@/lib/analytics/meter'
import type {GameCopy} from '@/lib/clubs/game-copy'
import type {UiLocale} from '@/lib/clubs/locale'
import {firePickFxAt} from '@/components/stage/PickFx'
import {haptic} from '@/lib/play/haptics'
import {tr,useReducedMotion} from '@/components/clubs/rumble/shared'
import {
 HIT_LINES,MISS_LINES,PACE_KEY,advanceMs,askedOf,breakBefore,capOf,reactionFor,reportedScore,roundQuery,secondsOf,
 stageCount,stageIndex,staged,streakCall,trailingStreak,HINT_COST,MIN_ROUND,type LogEntry,type PaceMode,type Reaction
} from '@/lib/clubs/trivia-model'
import {idsOf,readMissed,settleMissed,writeMissed,type Missed} from '@/lib/clubs/trivia-missed'
import {Answers,type AnswerLabels} from './TriviaAnswers'
import {TriviaReport} from './TriviaReport'
import css from './trivia.module.css'

export type BlockerView={code:string;counts:number[];need:number}
export type TriviaPlan={
 modes:{id:string;category:string;available:boolean;size:number;banded:boolean;blocker?:BlockerView}[]
 topics:{id:string;label:string;facts:number;size:number}[]
 eras:{decade:number;facts:number;size:number}[]
 selected:{mode?:string;topic?:string;era?:string;category:string|null;size:number;banded:boolean;blocker?:BlockerView}
 asked?:{mode:string;blocker:BlockerView}
}
export type ClubTriviaProps={club:string;clubName:string;version:string;seed:number;cursor:number;locale:UiLocale;contentLocale:string;copy:GameCopy;plan:TriviaPlan;autostart:boolean;practice:boolean}
type Shown={answer:AnswerView;reaction:Reaction;ms:number}
type Hint={kind:'decade';decade:number}|{kind:'context';text:string}|{kind:'strike';strike:string[]}
type Phase='ready'|'loading'|'play'|'over'
type T=(k:string,v?:Record<string,string|number>)=>string

const blockerVars=(b:BlockerView)=>({counts:b.counts.join(' / '),need:b.need})
const failKey=(e:string)=>['BLOCKED','GATE_CLOSED','VERSION_RETIRED','RUN_MISMATCH','UNAVAILABLE'].includes(e)?`tq.err.${e}`:'tq.err.OTHER'

/** Gate 2 · the Quiz Stand: an explicit start, three stages on one screen with the server keeping the clock, a verdict you can read, a match report. */
export function ClubTrivia(props:ClubTriviaProps){
 const {club,clubName,version,seed,cursor,locale,contentLocale,copy,plan}=props
 const t:T=useCallback((k,v)=>tr(copy,k,v),[copy])
 const reduced=useReducedMotion()
 const [phase,setPhase]=useState<Phase>('ready'),[practice,setPractice]=useState(props.practice)
 const [run,setRun]=useState<RunView|null>(null),[session,setSession]=useState<Session>({...NEW_SESSION}),[index,setIndex]=useState(0),[shown,setShown]=useState<Shown|null>(null)
 const [log,setLog]=useState<LogEntry[]>([]),[heat,setHeat]=useState(HEAT_START),[call,setCall]=useState<string|null>(null)
 const [busy,setBusy]=useState(false),[opening,setOpening]=useState(false),[conn,setConn]=useState<'open'|'answer'|null>(null),[fatal,setFatal]=useState<string|null>(null),[startError,setStartError]=useState<string|null>(null)
 const [hint,setHint]=useState<Hint|null>(null),[hinted,setHinted]=useState(false),[hintBusy,setHintBusy]=useState(false),[hintNone,setHintNone]=useState(false)
 const [secondsLeft,setSecondsLeft]=useState(0),[stageShown,setStageShown]=useState<number|null>(null),[announce,setAnnounce]=useState(''),[pace,setPace]=useState<PaceMode>('auto'),[paused,setPaused]=useState(false)
 const [resume,setResume]=useState<RunView|null>(null),[retired,setRetired]=useState(false),[missed,setMissed]=useState<Missed>({v:1,items:[]}),[review,setReview]=useState<{playable:number;retired:number;withdrawn:number;merged:number}|null>(null)
 const lock=useRef(false),pending=useRef<{answer:string|string[];timeout:boolean}|null>(null),recorded=useRef(false),plate=useRef<HTMLDivElement|null>(null),deadline=useRef<number|null>(null),submitRef=useRef<(a:string|string[],timeout?:boolean)=>void>(()=>{}),started=useRef(false)
 const questions=run?.questions??[],count=questions.length,q:(PublicQuestion&{hint:boolean})|undefined=questions[index]
 const asked=askedOf(count),total=practice?0:secondsOf(index,count),cap=capOf(index,count),over=phase==='over'
 const locked=busy||opening||!!shown||!!fatal||conn==='open'

 useEffect(()=>{try{const p=localStorage.getItem(PACE_KEY);if(p==='tap'||p==='auto')setPace(p)}catch{/* the default pace is used */}},[])
 const setPaceSaved=(p:PaceMode)=>{setPace(p);try{localStorage.setItem(PACE_KEY,p)}catch{/* a pace that cannot be kept is still the pace now */}}

 // ---- on arrival: is there a run of mine in progress, and what has this device missed?
 useEffect(()=>{
  let live=true
  resumeTriviaRun(club,version).then(r=>{if(!live)return;if(r.ok)setResume(r);else if(r.error==='VERSION_RETIRED')setRetired(true)}).catch(()=>{/* offline: no resume offer, the start card still works */})
  const m=readMissed(club);setMissed(m)
  if(m.items.length>0)reviewMissedQuestions(club,version,idsOf(m)).then(r=>{if(live&&r.ok)setReview({playable:r.playable,retired:r.removed.retired,withdrawn:r.removed.withdrawn,merged:r.merged})}).catch(()=>{})
  return ()=>{live=false}
 },[club,version])

 // ---- a run (new or resumed) is on screen
 const begin=useCallback((r:RunView,fromResume:boolean)=>{
  const qs=r.questions,entries:LogEntry[]=r.settled.map((s,i)=>{const x=qs[i]!;return {id:s.id,type:x.type,topic:x.topic as QTopic,difficulty:x.difficulty,correct:s.correct,hinted:s.hinted,timeout:s.timeout,elapsed:0}})
  let h=HEAT_START;for(const e of entries)h=heatAfter(h,e)
  setRun(r);setSession(r.session);setIndex(r.session.index);setLog(entries);setHeat(h);setShown(null);setHint(null);setHinted(false);setHintNone(false);setFatal(null);setConn(null);setStartError(null)
  setPractice(r.meta.practice);recorded.current=false;deadline.current=null;lock.current=false;pending.current=null
  setStageShown(!fromResume&&breakBefore(r.session.index,qs.length)?stageIndex(r.session.index,qs.length):null)
  setPhase(r.session.over?'over':'play')
 },[])
 const start=useCallback(async(mode?:string)=>{
  if(lock.current)return;lock.current=true;setPhase('loading');setStartError(null)
  haptic('lock')
  try{
   const r=await startTriviaRun({slug:club,version,seed,cursor,mode:mode??plan.selected.mode,topic:mode?undefined:plan.selected.topic,era:mode?undefined:plan.selected.era,practice,...(mode==='revenge'?{missed:idsOf(missed)}:{})})
   lock.current=false
   if(r.ok)begin(r,false);else{setPhase('ready');setStartError(failKey(r.error))}
  }catch{lock.current=false;setPhase('ready');setStartError('tq.offline.start')}
 },[club,version,seed,cursor,plan.selected.mode,plan.selected.topic,plan.selected.era,practice,missed,begin])
 useEffect(()=>{if(props.autostart&&!started.current){started.current=true;void start()}},[]) // eslint-disable-line react-hooks/exhaustive-deps -- once on arrival; the link asked for a run

 // ---- the clock starts when the question is on screen and the server has opened it; never behind a card, never in practice
 const openQuestion=useCallback(async()=>{
  if(!run)return
  setOpening(true);setConn(null)
  try{
   const r=await openTriviaQuestion(club,version,run.meta.run,index)
   if(r.ok){deadline.current=r.remainingMs===null?null:Date.now()+r.remainingMs;setSecondsLeft(r.remainingMs===null?0:r.remainingMs/1000)}
   else setFatal(failKey(r.error))
  }catch{setConn('open')}finally{setOpening(false)}
 },[club,version,run,index])
 useEffect(()=>{if(phase==='play'&&run&&!shown&&stageShown===null&&!fatal&&!over)void openQuestion()},[phase,run,index,stageShown]) // eslint-disable-line react-hooks/exhaustive-deps -- one open per question
 useEffect(()=>{
  if(phase!=='play'||shown||stageShown!==null||opening||conn||fatal||practice||deadline.current===null)return
  const tick=window.setInterval(()=>{
   const left=((deadline.current??0)-Date.now())/1000
   if(left>0){setSecondsLeft(left);return}
   window.clearInterval(tick);setSecondsLeft(0);submitRef.current([],true)
  },100)
  return ()=>window.clearInterval(tick)
 },[phase,shown,stageShown,opening,conn,fatal,practice,index])

 // ---- one answer, from the tap to the verdict; the server grades, scores and keeps the lives
 const attempt=useCallback(async()=>{
  const p=pending.current;if(!p||!q||!run)return
  setBusy(true);setConn(null)
  try{
   const r=await answerTriviaRun(club,version,run.meta.run,index,p.answer,p.timeout)
   if(!r.ok){
    if((r as Fail).error==='NOT_OPEN'){setConn('open');return}
    setFatal(failKey((r as Fail).error));return
   }
   const entry:LogEntry={id:q.id,type:q.type,topic:q.topic as QTopic,difficulty:r.verdict.difficulty,correct:r.correct,hinted:r.hinted,timeout:r.timeout,elapsed:practice?0:Math.max(0,total-r.left)}
   const streak=r.correct?trailingStreak([...log,entry]):0,reaction=reactionFor(entry,streak,index)
   setSession(r.session);setLog(cur=>cur.length>index?cur:[...cur,entry]);setHeat(h=>heatAfter(h,entry));setCall(r.correct?streakCall(streak):null)
   setShown({answer:r,reaction,ms:advanceMs(r.verdict.explanation,!!r.verdict.source.url)})
   const nextMissed=settleMissed(missed,q.id,version,r.correct,Date.now());if(nextMissed!==missed){setMissed(nextMissed);writeMissed(club,nextMissed)}
   markStep(index+1)
   setAnnounce(r.correct?t('tq.announce.right',{points:practice?0:r.gained,lives:r.session.lives}):t('tq.announce.wrong',{lives:r.session.lives}))
   haptic(r.correct?'lock':'miss');pending.current=null;deadline.current=null
  }catch{setConn('answer')}finally{setBusy(false);lock.current=false}
 },[club,version,run,q,index,practice,total,log,missed,t])
 const submit=useCallback((answer:string|string[],timeout=false)=>{
  if(lock.current||!q||over||shown||opening||fatal)return
  lock.current=true;pending.current={answer,timeout}
  void attempt()
 },[q,over,shown,opening,fatal,attempt])
 submitRef.current=submit
 // a dropped request keeps the dealt question and the answer; Retry sends the SAME one — the server settles it once
 const retry=()=>{
  if(conn==='open'){void openQuestion();return}
  if(lock.current||!pending.current)return
  lock.current=true;void attempt()
 }

 // ---- the verdict plate: it ends on its own, long enough to read; a tap or Enter ends it now; hovering or focus holds it
 const next=useCallback(()=>{
  if(!shown||!run)return
  const s=shown.answer.session
  setShown(null);setHint(null);setHinted(false);setHintNone(false);setPaused(false);setCall(null)
  if(s.over){setPhase('over');return}
  setIndex(s.index)
  if(breakBefore(s.index,count))setStageShown(stageIndex(s.index,count))
 },[shown,run,count])
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
  const el=plate.current;if(el)firePickFxAt(el,{label:shown.answer.correct?(practice?'✓':`+${shown.answer.gained}`):'✗',tone:'ink',big:shown.answer.correct,haptic:false})
  const onKey=(e:KeyboardEvent)=>{if(e.key==='Enter'&&!(e.target as Element|null)?.closest('a,button,select,input')){e.preventDefault();next()}}
  window.addEventListener('keydown',onKey);return ()=>window.removeEventListener('keydown',onKey)
 },[shown]) // eslint-disable-line react-hooks/exhaustive-deps -- the burst fires once per verdict
 useEffect(()=>{if(!call)return;const off=window.setTimeout(()=>setCall(null),900);return ()=>window.clearTimeout(off)},[call])

 // ---- the paid hint: disclosed before it is used, derived on the server, marked on the ledger before it is shown
 async function askHint(){
  if(!q||!run||locked||hinted||hintBusy||!q.hint)return
  setHintBusy(true);haptic('tap')
  try{
   const r=await hintTriviaRun(club,version,run.meta.run,index)
   if(r.ok){setHint(r.hint);setHinted(true)}else setHintNone(true)
  }catch{setHintNone(true)}finally{setHintBusy(false)}
 }

 // ---- one finished run is one completion, under its own category (a practice run and a standard run are not one bucket)
 useEffect(()=>{
  if(!over||!run||recorded.current)return
  recorded.current=true
  completeRun(club,'trivia',run.meta.run,reportedScore(session.score,run.meta.practice))
 },[over,run,club,session.score])

 const labels:AnswerLabels=useMemo(()=>({
  multiCount:(n,of)=>t('tq.multi.count',{n,of}),order:{yours:t('tq.order.yours'),empty:t('tq.order.empty'),bank:t('tq.order.bank'),truth:t('tq.order.truth'),slot:n=>t('tq.order.slot',{n})},
  match:{left:t('tq.match.left'),right:t('tq.match.right'),was:t('tq.match.was'),help:t('tq.match.help')},year:t('tq.year.label'),right:t('tq.row.right'),wrong:t('tq.row.wrong'),struck:t('tq.row.struck'),confirm:copy.answer,true:copy.true,false:copy.false
 }),[t,copy])
 const label=(v:string)=>q?.type==='tf'?(v==='true'?copy.true:copy.false):v
 const topicLabel=(id:string)=>(copy as Record<string,string>)[`topic.${id}`]??id

 if(phase==='ready'||phase==='loading')return <Ready {...props} t={t} practice={practice} onPractice={setPractice} pace={pace} onPace={setPaceSaved} resume={resume} retired={retired} onResume={()=>resume&&begin(resume,true)}
  missed={missed} review={review} loading={phase==='loading'} error={startError} onStart={mode=>void start(mode)}/>
 if(over&&run)return <TriviaReport session={session} log={log} count={count} asked={asked} meta={run.meta} club={club} clubName={clubName} version={version} locale={locale} contentLocale={contentLocale} copy={copy} available={plan.topics.map(x=>x.id as QTopic)} hardOpen={plan.modes.some(m=>m.id==='hard'&&m.available)} topicLabel={topicLabel} missedLeft={idsOf(missed).length}/>
 if(!q||!run)return null

 const struck=hint?.kind==='strike'?hint.strike:[],graded=shown?{correct:shown.answer.correct,correctAnswers:shown.answer.verdict.correctAnswers}:null
 const stage=stageIndex(index,count),mult=multiplierFor(session.combo,cap),fraction=total>0?Math.max(0,secondsLeft/total):1,urgent=!practice&&fraction<=0.28&&!shown&&!opening
 const reactionLine=shown?(shown.reaction.key==='hit'?t(`tq.react.hit.${shown.reaction.variant%HIT_LINES}`):shown.reaction.key==='miss'?t(`tq.react.miss.${shown.reaction.variant%MISS_LINES}`):t(`tq.react.${shown.reaction.key}`)):''
 return <section className={css.stage} data-testid="trivia-question" data-question-id={q.id} data-question-type={q.type} data-stage={stage+1} data-category={run.meta.category} aria-busy={busy||opening} data-practice={practice||undefined}>
  {stageShown!==null&&<StageBreak stage={stageShown} t={t} count={count} practice={practice} onDone={()=>setStageShown(null)}/>}
  <p className="sr-only" role="status" aria-live="polite">{announce}</p>
  <div className={css.play}>
   <div className={css.hud} data-testid="trivia-hud">
    <ol className={css.lamps} aria-label={t('tq.hud.lamps',{n:session.lives})}>{Array.from({length:LIVES},(_,i)=><li key={i} data-lit={i<session.lives}/>)}</ol>
    <p className={css.score} aria-label={t('tq.hud.score')}><b>{practice?'–':session.score}</b></p>
    <p className={css.mult} aria-label={t('tq.hud.combo',{n:mult,cap})} data-hot={mult>1||undefined}><bdi dir="ltr">×{mult}<small>/{cap}</small></bdi></p>
    {practice?<p className={css.practice}>{t('tq.hud.practice')}</p>
     :<div className={css.clock} role="timer" aria-label={`${Math.ceil(secondsLeft)}`} data-urgent={urgent||undefined}><i style={{inlineSize:`${fraction*100}%`}}/></div>}
    <ol className={css.ticks} aria-hidden="true">{Array.from({length:count},(_,i)=>{const m=session.history[i];return <li key={i} data-now={i===index||undefined} data-mark={m===undefined?'none':m?'right':'wrong'} data-gap={staged(count)&&i>0&&i%4===0||undefined}/>})}</ol>
    <div className={css.heat}><span>{t('tq.hud.heat')}</span><i aria-hidden="true"><b style={{inlineSize:`${heat}%`}}/></i><span className={css.heatPct}>{heat}%</span>{call&&<em className={css.call} aria-hidden="true">{t(call)}</em>}</div>
    <p className={css.stageTag}>{staged(count)?t('tq.hud.stage',{n:stage+1,of:stageCount(count)}):t(`tq.cat.${run.meta.category}`)}<span aria-hidden="true"> · </span><span>{index+1}/{asked}</span></p>
   </div>
   <div className={css.body}>
    <div className={css.qcard} key={q.id}>
     <p className={css.pills}><span data-strong>{t(`tq.type.${q.type}`)}</span><span>{t('tq.difficulty',{d:q.difficulty})}</span><span>{topicLabel(q.topic)}</span></p>
     {q.quoteHe&&<blockquote lang={contentLocale} dir="auto" className={css.quote}>{q.quoteHe}{q.quoteByHe&&<cite> — {q.quoteByHe}</cite>}</blockquote>}
     <h2 lang={contentLocale} dir="auto" data-long={q.prompt.length>110||undefined}>{q.prompt}</h2>
     <p className={css.how}>{opening?t('tq.opening'):t(`tq.how.${q.type}`)}</p>
    </div>
    <Answers key={`${q.id}:answers`} q={q} locked={locked} graded={graded} struck={struck} contentLocale={contentLocale} labels={labels} onAnswer={a=>submit(a)}/>
   </div>
   <div className={css.dock}>
    {(conn||fatal)&&<div className={css.error} role="alert" data-testid="trivia-error"><p>{fatal?t(fatal):t(conn==='open'?'tq.offline.open':'tq.error')}</p><div>{!fatal&&<button type="button" className={css.tool} onClick={retry}>{copy.retry}</button>}<Link className={css.tool} href={`?${roundQuery({seed,cursor,lang:locale,mode:run.meta.mode,topic:run.meta.topic||undefined,era:run.meta.era||undefined,practice})}`}>{copy.restart}</Link></div></div>}
    {shown?<div ref={plate} className={css.verdict} data-right={shown.answer.correct} role="status" onClick={e=>{if(!(e.target as Element).closest('a'))next()}}
      onPointerMove={e=>{if(e.pointerType==='mouse')setPaused(true)}} onPointerLeave={e=>{if(e.pointerType==='mouse')setPaused(false)}} onFocus={()=>setPaused(true)} onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget))setPaused(false)}}>
     <h3><span className={css.verdictMark} aria-hidden="true">{shown.answer.correct?'✓':'✗'}</span>{shown.answer.timeout?t('tq.timeup'):shown.answer.correct?copy.correct:copy.wrong}{shown.answer.correct&&!practice&&<b className={css.points}>{`+${shown.answer.gained}`}</b>}</h3>
     <p className={css.reaction}>{reactionLine}</p>
     <p className={css.explain} lang={contentLocale} dir="auto">
      {!shown.answer.correct&&q.type!=='order'&&q.type!=='match'&&<b>{t('tq.answerWas')} <bdi>{shown.answer.verdict.correctAnswers.map(label).join(' · ')}</bdi>. </b>}
      {shown.answer.verdict.explanation}
     </p>
     {shown.answer.hinted&&shown.answer.correct&&!practice&&<p className={css.fine}>{t('tq.hinted',{cost:HINT_COST})}</p>}
     {shown.answer.verdict.source.url&&<a className={css.source} href={shown.answer.verdict.source.url} target="_blank" rel="noreferrer">{copy.source}: <bdi>{shown.answer.verdict.source.title}</bdi> ↗</a>}
     <div className={css.nextRow}>{pace==='auto'&&<i className={css.drain} aria-hidden="true"><b style={{inlineSize:`${progress*100}%`}}/></i>}
      <button type="button" className={css.next} onClick={e=>{e.stopPropagation();next()}}>{t('tq.next')}</button></div>
    </div>
    :<div className={css.hintRow}>
     <button type="button" className={css.tool} disabled={locked||hinted||hintBusy||!q.hint} onClick={askHint} data-testid="trivia-hint">{!q.hint?t('tq.hint.unavailable'):practice?t('tq.hint.free'):t('tq.hint.cost',{cost:HINT_COST})}</button>
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
function StageBreak({stage,t,count,practice,onDone}:{stage:number;t:T;count:number;practice:boolean;onDone:()=>void}){
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

type ReadyProps=ClubTriviaProps&{t:T;practice:boolean;onPractice:(v:boolean)=>void;pace:PaceMode;onPace:(p:PaceMode)=>void;resume:RunView|null;retired:boolean;onResume:()=>void;missed:Missed;review:{playable:number;retired:number;withdrawn:number;merged:number}|null;loading:boolean;error:string|null;onStart:(mode?:string)=>void}
/**
 * The start card (§18.1): the objective, the count, the clock and the costs are all on it before anything is
 * pressed, and nothing is on a clock until Start. A mode the bank cannot field is shown shut, with its reason.
 */
function Ready({club,clubName,seed,cursor,locale,plan,practice,onPractice,pace,onPace,resume,retired,onResume,missed,review,loading,error,onStart,t,copy}:ReadyProps){
 const sel=plan.selected,href=(next:{mode?:string;topic?:string;era?:string})=>`?${roundQuery({seed,cursor,lang:locale,...next})}`
 const category=practice?'practice':sel.category??'standard',size=sel.size,full=staged(size)
 const startable=!sel.blocker&&size>=MIN_ROUND&&!loading
 const revengeReady=(review?.playable??0)>=MIN_ROUND
 const rules=practice?t('tq.ready.rulesPractice'):full?t('tq.ready.rules',{lives:LIVES,s1:STAGE_SECONDS[0],s2:STAGE_SECONDS[1],s3:STAGE_SECONDS[2],hint:HINT_COST,cap:STAGE_CAPS[2]}):t('tq.ready.rulesShort',{lives:LIVES,s:STAGE_SECONDS[0],hint:HINT_COST})
 return <section className={css.stage} data-testid="trivia-ready" data-club={club} data-category={category}>
  <div className={css.ready}>
   <p className={css.readyKicker}>{clubName} · {t('tq.ready.kicker')}</p>
   <p className={css.readyNo} aria-hidden="true">{size}</p>
   <h2 className={css.readyTitle}>{t(`tq.ready.title.${category}`,{n:size})}</h2>
   <p className={css.readyRule}>{rules}</p>
   {!practice&&category==='history'&&<p className={css.fine}>{t('tq.ready.note.history')}</p>}
   {!practice&&category==='short'&&<p className={css.fine}>{t('tq.ready.note.short',{n:size})}</p>}
   {plan.asked&&<p className={css.fine} role="note" data-blocker={plan.asked.blocker.code} data-counts={plan.asked.blocker.counts.join('/')}>{t(`tq.ready.blocked.${plan.asked.mode}`,blockerVars(plan.asked.blocker))}</p>}
   {sel.blocker&&<p className={css.fine} role="note" data-blocker={sel.blocker.code} data-counts={sel.blocker.counts.join('/')}>{t('tq.ready.blocked.deck',blockerVars(sel.blocker))}</p>}
   {resume&&<div className={css.resume} data-testid="trivia-resume"><p>{t('tq.resume',{n:Math.min(resume.meta.count,(resume.openIndex??resume.session.index)+1),of:resume.meta.count})}</p><button type="button" className={css.tool} onClick={onResume}>{t('tq.resume.go')}</button></div>}
   {retired&&<p className={css.fine} role="note">{t('tq.resume.retired')}</p>}
   <div className={css.rail} role="group" aria-label={t('tq.pick.mode')}>
    {plan.modes.filter(m=>m.available||m.id!=='history').map(m=>m.available
     ?<Link key={m.id} className={css.chip} href={href({mode:m.id})} aria-current={sel.mode===m.id?'true':undefined}>{t(`tq.mode.${m.id}`)} <small>{m.size}</small></Link>
     :<span key={m.id} className={css.chip} aria-disabled="true" data-blocker={m.blocker?.code} data-counts={m.blocker?.counts.join('/')} title={m.blocker?t(`tq.ready.blocked.${m.id}`,blockerVars(m.blocker)):undefined}>{t(`tq.mode.${m.id}`)} <small>—</small></span>)}
    <button type="button" className={css.chip} disabled={!revengeReady||loading} onClick={()=>onStart('revenge')} data-testid="trivia-revenge">{t('tq.mode.revenge')} <small>{revengeReady?review?.playable:missed.items.length===0?0:review?.playable??'…'}</small></button>
   </div>
   {review&&(review.retired+review.withdrawn+review.merged>0)&&<p className={css.fine} role="note">{t('tq.revenge.explain',{retired:review.retired,withdrawn:review.withdrawn,merged:review.merged})}</p>}
   {!revengeReady&&review&&<p className={css.fine}>{t('tq.revenge.need',{n:MIN_ROUND})}</p>}
   {plan.topics.length>0&&<div className={css.rail} role="group" aria-label={t('tq.pick.topic')}>
    <Link className={css.chip} href={href({mode:sel.mode??plan.modes.find(m=>m.available)?.id})} aria-current={!sel.topic?'true':undefined}>{copy.anyTopic}</Link>
    {plan.topics.map(x=><Link key={x.id} className={css.chip} href={href({topic:x.id,era:sel.era})} aria-current={sel.topic===x.id?'true':undefined}>{x.label} <small>{x.size}</small></Link>)}
   </div>}
   {plan.eras.length>0&&<div className={css.rail} role="group" aria-label={t('tq.pick.era')}>
    <Link className={css.chip} href={href({topic:sel.topic,mode:sel.topic?undefined:sel.mode})} aria-current={!sel.era?'true':undefined}>{copy.anyEra}</Link>
    {plan.eras.map(e=><Link key={e.decade} className={css.chip} href={href({topic:sel.topic,era:String(e.decade)})} aria-current={sel.era===String(e.decade)?'true':undefined}>{e.decade}s <small>{e.size}</small></Link>)}
   </div>}
   <div className={css.switches}>
    <button type="button" className={css.switch} aria-pressed={practice} onClick={()=>onPractice(!practice)}>{t('tq.pick.practice')}</button>
    <button type="button" className={css.switch} aria-pressed={pace==='tap'} onClick={()=>onPace(pace==='tap'?'auto':'tap')}>{t('tq.pick.tap')}</button>
   </div>
   {error&&<p className={css.errorLine} role="alert" data-testid="trivia-start-error">{t(error)}</p>}
   <button type="button" className={css.start} disabled={!startable} aria-busy={loading} onClick={()=>onStart()} data-testid="trivia-start">{loading?t('tq.loading'):t('tq.start')}</button>
  </div>
 </section>
}
