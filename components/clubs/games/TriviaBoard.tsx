'use client'
import Link from 'next/link'
import {useEffect,useRef,useState} from 'react'
import type {PublicQuestion,Verdict,SourceRef} from '@/lib/game/questions/types'
import {advance,NEW_SESSION,secondsFor,stageCap} from '@/lib/game/session'
import {answerTrivia} from '@/app/clubs/[slug]/[gate]/actions'
import {gameCopy} from '@/lib/clubs/game-copy'
import {recordActivity} from '@/lib/clubs/activity'
import type {UiLocale} from '@/lib/clubs/locale'
export function TriviaBoard({questions,club,version,seed,cursor,locale,contentLocale,topic,era,hard}:{questions:PublicQuestion[];club:string;version:string;seed:number;cursor:number;locale:UiLocale;contentLocale:string;topic?:string;era?:string;hard?:string}){
 const copy=gameCopy(locale),[session,setSession]=useState({...NEW_SESSION}),[picked,setPicked]=useState<string[]>([]),[verdict,setVerdict]=useState<(Verdict&{source:SourceRef})|null>(null),[seconds,setSeconds]=useState(secondsFor(0)),[error,setError]=useState(false),[busy,setBusy]=useState(false)
 const lock=useRef(false),recorded=useRef(false),submitRef=useRef<(answer:string|string[])=>void>(()=>{}),q=questions[session.index],over=session.over||session.index>=questions.length,total=secondsFor(session.index)
 async function submit(answer:string|string[]){
  if(lock.current||verdict||!q||over)return
  lock.current=true;setBusy(true);setError(false)
  try{const v=await answerTrivia(club,version,q.id,seed,cursor,session.index,answer,topic,era,hard)
   if(!v){setError(true);return}
   setVerdict(v)
  }catch{setError(true)}finally{setBusy(false);lock.current=false}
 }
 submitRef.current=submit
 useEffect(()=>{
  if(over||verdict||busy||error)return
  if(seconds===0){submitRef.current([]);return}
  const timer=setTimeout(()=>setSeconds(n=>Math.max(0,n-1)),1000)
  return ()=>clearTimeout(timer)
 },[seconds,over,verdict,busy,error])
 useEffect(()=>{
  if(!verdict)return
  const timer=setTimeout(()=>{const next=advance(session,{correct:verdict.correct,difficulty:verdict.difficulty,secondsLeft:seconds,total,cap:stageCap(session.index)});setSession(next);setVerdict(null);setPicked([]);setSeconds(secondsFor(next.index));setError(false)},2000)
  return ()=>clearTimeout(timer)
 },[verdict,session,seconds,total])
 useEffect(()=>{if(over&&!recorded.current){recorded.current=true;recordActivity(club,'trivia',`trivia:${version}:${seed}:${cursor}:${topic||''}:${era||''}:${hard||''}`,session.score)}},[over,club,version,seed,cursor,topic,era,hard,session.score])
 const replay=new URLSearchParams({seed:String(seed),r:String(cursor+1),lang:locale,...(topic?{topic}:{}),...(era?{era}:{}),...(hard?{hard}:{})})
 if(over)return <section className="game-panel" data-testid="trivia-result"><p>{copy.report}</p><h2>{copy.complete}</h2><p>{copy.correct}: {session.correct}/{session.index} · {copy.answered}: {session.index}/{questions.length}</p><p>{copy.score}: {session.score} · {copy.combo}: {session.bestCombo}</p><p>{copy.localOnly}</p><Link className="game-button" href={`?${replay}`}>{copy.replay}</Link><Link className="game-button" href={`/clubs/${club}/archive?lang=${locale}`}>{copy['gate.archive']}</Link></section>
 if(!q)return null
 const selected=(option:string)=>{if(['order','multi'].includes(q.type)){setPicked(p=>p.includes(option)?p.filter(s=>s!==option):p.length<(q.type==='multi'?q.pickCount:q.options.length)?[...p,option]:p)}else void submit(option)}
 const label=(value:string)=>q.type==='tf'?(value==='true'?copy.true:copy.false):value
 const canConfirm=q.type==='multi'?picked.length===q.pickCount:q.type==='match'?picked.length===q.left?.length&&picked.every(Boolean)&&new Set(picked).size===picked.length:picked.length===q.options.length
 return <section className="game-panel" data-testid="trivia-question" data-question-id={q.id} data-question-type={q.type} aria-busy={busy}>
  <div className="game-hud"><span>{session.index+1}/{questions.length}</span><span>{copy.lives}: {session.lives}</span><span>{copy.score}: {session.score}</span><span>{copy.combo}: {session.combo}</span><span role="timer">{copy.seconds}: {seconds}</span></div>
  <h2 lang={contentLocale} dir="auto" className="my-5">{q.prompt}</h2>{q.quoteHe&&<blockquote lang={contentLocale} dir="auto">{q.quoteHe}{q.quoteByHe&&<cite> — {q.quoteByHe}</cite>}</blockquote>}
  {q.type==='order'&&<p>{copy.order}</p>}{q.type==='multi'&&<p>{copy.multi}</p>}
  <fieldset disabled={busy||!!verdict||error}><legend className="sr-only">{q.prompt}</legend>
   {q.type==='match'?<><p>{copy.match}</p>{q.left?.map((left,index)=><label key={`${index}:${left}`} className="game-option"><span lang={contentLocale} dir="auto">{left}</span><select aria-label={left} value={picked[index]||''} onChange={e=>setPicked(p=>{const next=Array.from({length:q.left!.length},(_,i)=>p[i]||'');next[index]=e.target.value;return next})}><option value="">—</option>{q.options.map(option=><option key={option}>{option}</option>)}</select></label>)}</>:<div className="game-options">{q.options.map(option=><button type="button" className="game-option min-h-tap" aria-pressed={picked.includes(option)} key={option} onClick={()=>selected(option)}><span lang={q.type==='tf'?locale:contentLocale} dir="auto">{label(option)}</span>{q.type==='order'&&picked.includes(option)&&<b>{picked.indexOf(option)+1}</b>}</button>)}</div>}
   {['multi','order','match'].includes(q.type)&&<button className="game-button min-h-tap" type="button" disabled={!canConfirm} onClick={()=>void submit(picked)}>{copy.answer}</button>}
  </fieldset>
  {verdict&&<div role="status" className="game-feedback" data-verdict={verdict.correct?'right':'wrong'}><h3>{verdict.correct?copy.correct:copy.wrong}</h3><p lang={contentLocale} dir="auto">{verdict.correctAnswers.map(label).join(' · ')}</p><p lang={contentLocale} dir="auto">{verdict.explanation}</p>{verdict.source.url&&<a href={verdict.source.url} target="_blank" rel="noreferrer">{copy.source}: <bdi>{verdict.source.title}</bdi> ↗</a>}</div>}
  {error&&<div role="alert"><p>{copy.unavailable}</p><Link className="game-button" href={`?${new URLSearchParams({seed:String(seed),r:String(cursor),lang:locale,...(topic?{topic}:{}),...(era?{era}:{}),...(hard?{hard}:{})})}`}>{copy.restart}</Link></div>}
 </section>
}
