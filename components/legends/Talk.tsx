'use client'
import {useCallback,useEffect,useRef,useState,type ReactNode} from 'react'
import type {CareerView,TalkView} from '@/lib/legends/view'
import {Sheet} from './Sheet'
import {LineupConfirm,VsCard} from './PreMatch'

/**
 * THE DRESSING ROOM (owner, 13.10.2026: "a talk before and after every match — four answers, and they change the morale").
 * The server picks the situation and keeps the effect; this sheet shows the room, the moment, four lines in four tones, and —
 * once the server has answered — how the room took it and the mood in a WORD. Never a number (tests/legends/match-flow.test.ts
 * reads this file for one). A talk is never skipped (owner, 13.10.2026): one tap on one of the four, and the server refuses a kick-off while the room waits.
 */
type Send=(a:Record<string,unknown>,ok?:string)=>void
type Room=CareerView['talks']
const MOODS=['low','edgy','steady','confident','flying'] as const

/** the room in pictures: lockers in the club's colour, shirts on hooks, a chalk board, the light coming on */
function Scene({when,mood}:{when:'pre'|'post';mood:Room['mood']['word']}){
 return <div className="lgm-dr-scene" data-when={when} data-mood={mood} aria-hidden="true">
  <i className="lgm-dr-lamp"/>
  <div className="lgm-dr-board"><span/><span/><span/><b/></div>
  <div className="lgm-dr-lockers">{Array.from({length:6},(_,i)=><span key={i} style={{animationDelay:`${i*90}ms`}}><i/></span>)}</div>
  <i className="lgm-dr-bench"/>
 </div>
}
export function MoodMeter({mood}:{mood:Room['mood']}){
 const at=MOODS.indexOf(mood.word)
 return <div className="lgm-dr-mood">
  <p className="lgm-dr-mood-row" role="img" aria-label={`Dressing-room mood: ${mood.label}`}>{MOODS.map((m,i)=><i key={m} data-on={i<=at||undefined} data-here={i===at||undefined}/>)}</p>
  <p><b>{mood.label}</b> <span>{mood.line}</span></p>
 </div>
}

export function Talk({talk,room,busy,send,onDone}:{talk:TalkView;room:Room;busy:boolean;send:Send;onDone:(spoke:boolean)=>void}){
 const [chosen,setChosen]=useState<number|null>(null)
 const done=room.last&&room.last.fixture===talk.fixture&&room.last.when===talk.when?room.last:null
 const pre=talk.when==='pre'
 const say=(i:number)=>{if(busy||chosen!==null)return;setChosen(i);send({kind:pre?'talk-pre':'talk-post',fixture:talk.fixture,answer:i})}
 // a refused talk (the moment passed in another tab) lets the manager walk out instead of waiting forever
 const stuck=chosen!==null&&!busy&&!done
 return <Sheet id="lgm-talk" tone="night" locked kicker={talk.kicker} title={pre?'The dressing room':'After the whistle'}>
  <div className="lgm-dr" data-testid="legends-talk" data-when={talk.when}>
   <Scene when={talk.when} mood={room.mood.word}/>
   <p className="lgm-dr-prompt">{talk.prompt}</p>
   {!done?<>
    <p className="lgm-dr-ask">{pre?`What do you tell them before ${talk.opponent}?`:'What do you tell them?'}</p>
    <ol className="lgm-dr-answers">{talk.answers.map((a,i)=><li key={a.tone}>
     <button type="button" className="lgm-dr-answer" data-tone={a.tone} aria-pressed={chosen===i} disabled={busy||(chosen!==null&&chosen!==i)} onClick={()=>say(i)} data-testid={`legends-talk-${i}`}>
      <small>{a.toneLabel}</small><span>{a.line}</span>
     </button></li>)}</ol>
    {stuck?<p className="lgm-actions"><button type="button" className="lgm-link min-h-tap" onClick={()=>onDone(false)} data-testid="legends-talk-close">Close</button></p>:null}
   </>:<div className="lgm-dr-reaction" role="status" data-tone={done.tone}>
    <p className="lgm-dr-said"><small>{done.toneLabel}</small>{done.line}</p>
    <p className="lgm-dr-room">{done.reaction}</p>
    <MoodMeter mood={room.mood}/>
    {room.men.length?<ul className="lgm-dr-men">{room.men.slice(0,6).map(m=><li key={m.id} data-mood={m.mood}><b>{m.name}</b> {m.mood==='lifted'?'lifted':'stung'}</li>)}</ul>:null}
    <p className="lgm-actions"><button type="button" className="lgm-go lgm-go-big min-h-tap" onClick={()=>onDone(true)} data-testid="legends-talk-go">{pre?'To the tunnel':'Continue'}</button></p>
   </div>}
  </div>
 </Sheet>
}

/**
 * The room's place in the career screen, kept here so the screen only wires three lines: the kick-off goes through the
 * pre-match talk, the post-match talk comes up by itself once the full-time card is closed, and `open` holds the other sheets back.
 */
export function useDressingRoom(v:CareerView,busy:boolean,send:Send,watching:boolean,kickoffNow:()=>void,editLineup:()=>void=()=>{}):{kickoff:()=>void;open:boolean;sheet:ReactNode}{
 const [talk,setTalk]=useState<TalkView|null>(null),closed=useRef<string|null>(null)
 // kick-off is three screens in a row: the eleven to confirm, the dressing room, and the VS card with "Send them to the pitch!"
 const [step,setStep]=useState<'lineup'|'vs'|null>(null)
 const post=v.talks?.post
 // the post-match word comes up by itself once the full-time card is closed, and again on a reload until it is given
 useEffect(()=>{
  if(talk||watching||!post||closed.current===`post:${post.fixture}`)return
  setTalk(post)
 },[post,talk,watching])
 const kickoff=useCallback(()=>{const p=v.talks?.post;if(p){closed.current=null;setTalk(p)}else setStep('lineup')},[v.talks?.post])
 const afterLineup=()=>{const pre=v.talks?.pre;if(pre){setStep(null);setTalk(pre)}else setStep('vs')}
 const sheet=<>
  {step==='lineup'?<LineupConfirm v={v} onConfirm={afterLineup} onEdit={()=>{setStep(null);editLineup()}} onClose={()=>setStep(null)}/>:null}
  {step==='vs'?<VsCard v={v} onGo={()=>{setStep(null);kickoffNow()}} onClose={()=>setStep(null)}/>:null}
  {talk&&v.talks?<Talk talk={talk} room={v.talks} busy={busy} send={send} onDone={spoke=>{const t=talk;setTalk(null);if(!spoke){closed.current=`${t.when}:${t.fixture}`;return}if(t.when==='pre')setStep('vs')}}/>:null}
 </>
 return {kickoff,open:!!talk||step!==null,sheet}
}
