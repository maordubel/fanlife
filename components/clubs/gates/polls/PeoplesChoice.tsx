'use client'
import {useCallback,useEffect,useMemo,useRef,useState,type ReactNode} from 'react'
import type {ClubPlayer} from '@/lib/clubs/contract'
import type {RumbleWardrobe} from '@/lib/clubs/rumble-kit'
import {chooseSide,finalize,nextBatch,resume as resumeRun,startDuel,undoLast,viewOf} from '@/lib/clubs/polls-duel/engine'
import {decadesOf,eligibleFor,parseYear} from '@/lib/clubs/polls-duel/pool'
import {dropDuel,loadBirth,loadDuel,newSessionId,saveBirth,saveDuel} from '@/lib/clubs/polls-duel/storage'
import type {DuelPoll} from '@/lib/clubs/polls-duel/adapter'
import {ALL_TIME,BATCH,type DuelFilter,type DuelState,type DuelView,type DuelCandidate,type Side} from '@/lib/clubs/polls-duel/types'
import {DuelLobby,type PeriodKind,type ResumeInfo} from './DuelLobby'
import {DuelConfirm,DuelDone} from './DuelResults'
import {YinYangArena,type Phase} from './YinYangArena'
import css from './duel.module.css'

type T=(k:string,v?:Record<string,string|number>)=>string
type Mode='lobby'|'arena'|'confirm'|'done'
const OUT=260,ENTER=380
const calm=()=>{try{return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches===true}catch{return false}}

/**
 * Gate 7 · THE PEOPLE'S CHOICE. The container: lobby → arena → full time → sealed. It owns timing and persistence only;
 * every rule is the pure engine's. A duel makes ONE confirmed choice, handed to `onConfirm` (the existing ballot / debate
 * sink) exactly once — nothing before "yes" is a vote.
 */
export function PeoplesChoice({club,polls,byId,wardrobe,contentLocale,t,currentPick,onConfirm,onDirect,onCard,renderShare}:{
 club:string;polls:DuelPoll[];byId:ReadonlyMap<string,ClubPlayer>;wardrobe:RumbleWardrobe;contentLocale:string;t:T
 currentPick:(pollId:string)=>string|null
 onConfirm:(poll:DuelPoll,winnerId:string)=>void
 onDirect:()=>void;onCard:()=>void
 renderShare:(poll:DuelPoll,winner:DuelCandidate)=>ReactNode
}){
 const first=polls.find(p=>!p.unavailable)?.pollId??null
 const [mode,setMode]=useState<Mode>('lobby'),[pollId,setPollId]=useState<string|null>(first),[period,setPeriod]=useState<PeriodKind>('all')
 const [birth,setBirth]=useState(''),[decade,setDecade]=useState<number|null>(null)
 const [run,setRun]=useState<DuelState|null>(null),[eligible,setEligible]=useState<DuelCandidate[]>([])
 const [shown,setShown]=useState<DuelView|null>(null),[phase,setPhase]=useState<Phase>({out:null,enter:null}),[locked,setLocked]=useState(false)
 const [crowd,setCrowd]=useState<{key:string;text:string}|null>(null),[live,setLive]=useState(''),[notice,setNotice]=useState('')
 const [resume,setResume]=useState<{info:ResumeInfo;state?:DuelState;eligible?:DuelCandidate[]}>({info:null})
 const [fresh,setFresh]=useState(false)
 const timers=useRef<number[]>([]),lock=useRef(false),sealed=useRef<string|null>(null)
 const poll=polls.find(p=>p.pollId===pollId)??null
 const clear=()=>{timers.current.forEach(clearTimeout);timers.current=[]}
 useEffect(()=>()=>clear(),[])
 useEffect(()=>{const b=loadBirth();if(b)setBirth(String(b))},[])
 useEffect(()=>{const y=parseYear(birth);if(y!==null)saveBirth(y)},[birth])

 // a saved run for this poll, checked against today's pool and prompt version (D7-12)
 useEffect(()=>{
  if(!poll||mode!=='lobby'){return}
  const raw=loadDuel(club,poll.pollId);if(!raw){setResume({info:null});return}
  const r=resumeRun(raw,poll.pool,{pollId:poll.pollId,promptVersion:poll.promptVersion})
  if(!r.ok){setResume({info:r.code==='INVALID'?null:{ok:false,stale:true}});if(r.code==='INVALID')dropDuel(club,poll.pollId);return}
  const v=viewOf(r.state,r.eligible)
  setResume({info:{ok:true,decided:v.decided,cap:v.cap,done:!!r.state.final},state:r.state,eligible:r.eligible})
 },[poll,club,mode])

 const filter:DuelFilter=useMemo(()=>{
  if(period==='since'){const y=parseYear(birth);return y===null?ALL_TIME:{kind:'since',year:y}}
  if(period==='decade')return decade===null?ALL_TIME:{kind:'decade',decade}
  return ALL_TIME
 },[period,birth,decade])
 const decades=useMemo(()=>poll?decadesOf(poll.pool):[],[poll])
 const count=useMemo(()=>poll?eligibleFor(poll.pool,filter).length:0,[poll,filter])
 const view=useMemo(()=>run&&eligible.length?viewOf(run,eligible):null,[run,eligible])

 const persist=(s:DuelState)=>{if(!saveDuel(club,s))setNotice(t('pc.save.fail'))}
 const enter=(s:DuelState,el:DuelCandidate[])=>{
  clear();lock.current=false;setLocked(false);setRun(s);setEligible(el);setPhase({out:null,enter:null});setCrowd(null);setLive('')
  const v=viewOf(s,el);setShown(v);setMode(v.status==='done'?'done':v.status==='confirm'?'confirm':'arena')
 }
 function start(){
  if(!poll)return
  const r=startDuel({pool:poll.pool,seed:Math.floor(Math.random()*2147483647),pollId:poll.pollId,promptVersion:poll.promptVersion,filter,sessionId:newSessionId()})
  if(!r.ok)return
  setNotice('');sealed.current=null;persist(r.state);enter(r.state,r.eligible)
 }
 function continueRun(){if(resume.state&&resume.eligible)enter(resume.state,resume.eligible)}

 const crowdFor=(prev:DuelView,next:DuelView,name:string,won:boolean)=>{
  if(next.status!=='battling')return null
  if(next.holderId&&next.streak>=5)return {key:`l${next.decided}`,text:t('pc.crowd.legend')}
  if(next.holderId&&next.streak>=3)return {key:`s${next.decided}`,text:t('pc.crowd.streak')}
  if(prev.streak>=2&&!won)return {key:`u${next.decided}`,text:t('pc.crowd.upset')}
  if(next.cap-next.decided===1)return {key:`f${next.decided}`,text:t('pc.crowd.final')}
  return {key:`k${next.decided}`,text:t('pc.crowd.stays',{name})}
 }
 // one decision = one call; the lock swallows a second tap, swipe or key until the move has landed
 const choose=useCallback((side:Side)=>{
  if(lock.current||!run||!view||view.status!=='battling')return
  const next=chooseSide(run,eligible,side);if(next===run)return
  lock.current=true;setLocked(true)
  const nv=viewOf(next,eligible),loser:Side=side==='L'?'R':'L',winner=side==='L'?view.left:view.right
  persist(next);setRun(next)
  const finish=()=>{
   setShown(nv);setPhase({out:null,enter:nv.status==='battling'?loser:null})
   setCrowd(winner?crowdFor(view,nv,winner.title,view.holderId===winner.id):null)
   if(winner)setLive(t('pc.live',{name:winner.title,side:t(`pc.side.${side}`),n:nv.index,m:nv.cap}))
   const end=()=>{setPhase({out:null,enter:null});lock.current=false;setLocked(false);if(nv.status==='confirm')setMode('confirm')}
   timers.current.push(window.setTimeout(end,calm()?0:ENTER))
  }
  if(calm()){finish();return}
  setPhase({out:loser,enter:null})
  timers.current.push(window.setTimeout(finish,OUT))
 // eslint-disable-next-line react-hooks/exhaustive-deps -- crowdFor/persist are pure of render state
 },[run,view,eligible])
 const undo=()=>{
  if(!run||lock.current)return
  const next=undoLast(run,eligible);if(next===run)return
  persist(next);setRun(next);const v=viewOf(next,eligible);setShown(v);setCrowd(null);setLive('');setMode('arena')
 }
 const more=()=>{if(!run)return;const next=nextBatch(run,eligible);if(next===run)return;persist(next);enter(next,eligible)}
 function yes(){
  if(!run||!poll)return
  const f=finalize(run,eligible);if(!f.winnerId)return
  persist(f.state);setRun(f.state);setFresh(f.fresh)
  // exactly once per run: a second tap, a re-render or a resume never writes again (D7-11)
  if(f.fresh&&sealed.current!==f.state.sessionId){sealed.current=f.state.sessionId;onConfirm(poll,f.winnerId)}
  setMode('done')
 }
 const backToLobby=()=>{clear();lock.current=false;setLocked(false);setMode('lobby');setNotice('')}
 const again=()=>{if(poll){dropDuel(club,poll.pollId);sealed.current=null;start()}}

 if(mode==='lobby'||!poll||!run||!view||!shown)return <>
  <DuelLobby polls={polls} pollId={pollId} onPoll={setPollId} period={period} onPeriod={p=>{setPeriod(p);setDecade(null)}} birth={birth} onBirth={setBirth} decades={decades} decade={decade} onDecade={setDecade}
   eligible={count} resume={resume.info} onStart={start} onResume={continueRun} onFresh={()=>{if(poll)dropDuel(club,poll.pollId);setResume({info:null});start()}} onDirect={onDirect} t={t}/>
 </>
 const winner=view.holderId?eligible.find(c=>c.id===view.holderId)??null:null
 const prompt=poll.prompt??(poll.labelKey?t(`tv.q.${poll.labelKey}`):'')
 return <div className={css.duel} data-testid="duel" data-mode={mode}>
  {mode==='arena'&&<YinYangArena view={shown} byId={byId} wardrobe={wardrobe} contentLocale={contentLocale} t={t} phase={phase} locked={locked} crowd={crowd} live={live} onChoose={choose} onUndo={undo}/>}
  {mode==='confirm'&&winner&&<DuelConfirm winner={winner} byId={byId} wardrobe={wardrobe} contentLocale={contentLocale} t={t} pollId={poll.pollId} prompt={prompt} isDebate={poll.sink==='debate'}
   decided={view.decided} exhausted={view.exhausted} more={Math.min(BATCH,Math.max(0,view.poolSize-1-view.decided))} replaces={(()=>{const c=currentPick(poll.pollId);return c&&c!==winner.title?c:null})()}
   canUndo={view.canUndo} onYes={yes} onMore={more} onBack={backToLobby} onUndo={undo}/>}
  {mode==='done'&&winner&&<DuelDone winner={winner} byId={byId} wardrobe={wardrobe} contentLocale={contentLocale} t={t} share={renderShare(poll,winner)} fresh={fresh} onAnother={backToLobby} onAgain={again} onCard={onCard}/>}
  {notice&&<p className={css.status} role="status">{notice}</p>}
  {mode==='arena'&&<button type="button" className={`${css.ghost} min-h-tap`} onClick={backToLobby}>{t('pc.back')}</button>}
 </div>
}
