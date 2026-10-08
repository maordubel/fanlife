'use client'
import {useCallback,useEffect,useMemo,useRef,useState} from 'react'
import {SlideSheet} from '@/components/stage/SlideSheet'
import {firePickFx,firePickFxAt} from '@/components/stage/PickFx'
import {tr} from '@/components/clubs/rumble/shared'
import {startMystery,moveMystery} from '@/app/clubs/[slug]/[gate]/mystery-actions'
import {startMysteryMode,moveMysteryMode} from '@/app/clubs/[slug]/[gate]/mystery-modes'
import type {MysteryView} from '@/lib/clubs/mystery'
import type {LobbyState} from '@/lib/clubs/mystery-modes'
import type {ClubPlayer} from '@/lib/clubs/contract'
import type {GameCopy} from '@/lib/clubs/game-copy'
import type {UiLocale} from '@/lib/clubs/locale'
import type {RumbleWardrobe} from '@/lib/clubs/rumble-kit'
import {completeRun} from '@/lib/clubs/completion'
import {markStep} from '@/lib/analytics/meter'
import {secondsLabel} from '@/lib/game/blind-cow/scoring'
import {emptyHistory,encodeChallenge,historyKey,newSeed,penalties,recordResult,streak,validateHistory,type Challenge,type MysteryHistory} from '@/lib/clubs/mystery-model'
import {MysteryMark} from './MysteryMark'
import {GuessDrawer} from './GuessDrawer'
import {ResultCard} from './ResultCard'
import css from './blind-cow.module.css'

type Mode='solo'|'daily'|'duel'
type Play={mode:Mode;tag:string}
export type ClubMysteryProps={players:ClubPlayer[];club:string;clubName:string;version:string;locale:UiLocale;contentLocale:string;copy:GameCopy;wardrobe:RumbleWardrobe;lobby:LobbyState;challenge:Challenge|null}

/** Gate 10 · Blind Cow: lobby → sealed clues → guess drawer → result. The screen owns no truth: it asks the server for each move. */
export function ClubMystery(props:ClubMysteryProps){
 const {players,club,clubName,version,locale,contentLocale,copy,wardrobe,challenge}=props
 const t=useCallback((k:string,v?:Record<string,string|number>)=>tr(copy,k,v),[copy])
 const [screen,setScreen]=useState<'lobby'|'run'>('lobby'),[play,setPlay]=useState<Play>({mode:'solo',tag:''}),[run,setRun]=useState<MysteryView|null>(null)
 const [lobby,setLobby]=useState(props.lobby),[fresh,setFresh]=useState<number|null>(null),[pending,setPending]=useState(false),[error,setError]=useState(false),[sure,setSure]=useState(false),[online,setOnline]=useState(true)
 const [drawer,setDrawer]=useState(false),[sheet,setSheet]=useState<null|'howto'|'duel'>(null),[notice,setNotice]=useState(''),[history,setHistory]=useState<MysteryHistory>(emptyHistory)
 const busy=useRef(false),recorded=useRef(''),opener=useRef<HTMLElement|null>(null),pen=penalties()
 const byId=useMemo(()=>new Map(players.map(p=>[p.id,p])),[players])
 const open=(s:'howto'|'duel')=>(e:React.SyntheticEvent)=>{opener.current=e.currentTarget as HTMLElement;setSheet(s)}
 const closeSheet=()=>{setSheet(null);opener.current?.focus?.()}

 useEffect(()=>{const up=()=>setOnline(navigator.onLine!==false);up();window.addEventListener('online',up);window.addEventListener('offline',up);return()=>{window.removeEventListener('online',up);window.removeEventListener('offline',up)}},[])
 useEffect(()=>{try{const raw=localStorage.getItem(historyKey(club));if(raw&&raw.length<60000)setHistory(validateHistory(JSON.parse(raw)))}catch{/* a missing record is only a missing streak */}},[club])

 // ---- the one door to the server, whatever the mode
 const api={
  start:(p:Play,next=false)=>p.mode==='solo'?startMystery(club,version,next):startMysteryMode(club,version,p.mode,p.tag),
  move:(p:Play,rid:string,move:'reveal'|'guess'|'give_up',value:string|number)=>p.mode==='solo'?moveMystery(club,version,rid,move,value):moveMysteryMode(club,version,p.mode,p.tag,rid,move,value),
 }
 async function guarded(job:()=>Promise<void>){
  if(busy.current)return
  busy.current=true;setPending(true)
  try{await job()}catch{setError(true)}finally{busy.current=false;setPending(false)}
 }
 const enter=(p:Play,v:MysteryView,isNew:boolean)=>{
  setPlay(p);setRun(v);setError(false);setSure(false);setNotice('');setScreen('run');setFresh(isNew&&v.status==='playing'?1:null);markStep(v.shown)
  if(isNew&&v.status==='playing')window.requestAnimationFrame(()=>firePickFx(window.innerWidth/2,window.innerHeight*0.36,{label:t('bc.clue',{n:1,total:v.total}),tone:'ink'}))
 }
 const begin=(p:Play,opts:{fresh?:boolean}={})=>guarded(async()=>{
  // a solo run in progress is closed (on the server) before a new one is dealt
  if(p.mode==='solo'&&opts.fresh&&lobby.solo){const cur=await startMystery(club,version,false);if(cur&&cur.status==='playing')await moveMystery(club,version,cur.rid,'give_up',0)}
  const v=await api.start(p,opts.fresh===true)
  if(!v){setError(true);return}
  enter(p,v,v.status==='playing'&&v.shown===1&&v.wrong===0)
 })

 // ---- moves
 const reveal=()=>guarded(async()=>{
  if(!run||run.status!=='playing'||run.shown>=run.total)return
  const v=await api.move(play,run.rid,'reveal',run.shown);if(!v){setError(true);return}
  setError(false);if(v.shown>run.shown){setFresh(v.shown);markStep(v.shown)};setRun(v)
 })
 async function guess(id:string):Promise<'right'|'wrong'|'none'>{
  if(!run||run.status!=='playing')return 'none'
  let verdict:'right'|'wrong'|'none'='none'
  await guarded(async()=>{
   const before=run,v=await api.move(play,before.rid,'guess',id);if(!v){setError(true);return}
   setError(false);setRun(v);verdict=v.status==='solved'?'right':v.wrong>before.wrong?'wrong':'none'
   if(v.status!=='playing')setDrawer(false)
  })
  return verdict
 }
 const giveUp=()=>{
  if(!run||pending)return
  if(!sure){setSure(true);window.setTimeout(()=>setSure(false),2800);return}
  setSure(false);void guarded(async()=>{const v=await api.move(play,run.rid,'give_up',0);if(v)setRun(v);else setError(true)})
 }
 const toLobby=()=>{setScreen('lobby');setRun(null);setDrawer(false);setNotice('');setError(false)}
 /** after a failed move: ask the server where the run really is (it keeps the clock), instead of guessing locally */
 const resync=()=>guarded(async()=>{
  const v=await api.start(play);if(!v){setError(true);return}
  setError(false);setRun(v)
 })
 /** the duel's 120 s limit is the SERVER's: when the local clock reaches it, ask for the settled run */
 const expire=()=>{if(run?.status==='playing')void resync()}

 // ---- a finished attempt is reported once: the ticket, the device record, the lobby
 useEffect(()=>{
  if(!run||run.status==='playing'||!run.result)return
  const key=`${play.mode}:${play.tag}:${run.rid}`;if(recorded.current===key)return;recorded.current=key
  const solved=run.status==='solved'
  completeRun(club,'blind-cow',play.mode==='solo'?`blind-cow:${version}:${run.rid}`:`blind-cow:${version}:${play.mode}:${run.rid}`,solved?Math.max(1,11-run.shown):0)
  const next=recordResult(history,{solved,clues:run.shown,wrong:run.wrong,weightedMs:run.result.weightedTimeMs,daily:play.mode==='daily'?play.tag:undefined})
  setHistory(next);try{localStorage.setItem(historyKey(club),JSON.stringify(next))}catch{/* kept for this visit only */}
  const summary={solved,clues:run.shown,wrong:run.wrong,weightedMs:run.result.weightedTimeMs,rawMs:run.result.rawElapsedMs},status=solved?'solved' as const:run.status==='timeout'?'timeout' as const:'gave_up' as const
  setLobby(l=>play.mode==='daily'?{...l,daily:{...l.daily,status,shown:run.shown,total:run.total,summary}}:play.mode==='duel'?{...l,duel:{seed:Number(play.tag),status,summary}}:{...l,solo:null})
  // eslint-disable-next-line react-hooks/exhaustive-deps -- once per finished run
 },[run,play,club,version])
 useEffect(()=>{if(run&&run.status==='playing'&&play.mode==='solo')setLobby(l=>({...l,solo:{shown:run.shown,total:run.total,wrong:run.wrong}}))},[run,play.mode])

 // ---- the challenge link carries the seed (and, once played, the time) — never a name
 const base=()=>`${location.origin}/clubs/${club}/blind-cow`
 async function out(text:string,url?:string){
  try{
   if(typeof navigator.share==='function'){await navigator.share({title:`${clubName} · ${t('bc.share.title')}`,text,...(url?{url}:{})});setNotice(t('bc.share.done'))}
   else{await navigator.clipboard.writeText(url&&!text.includes(url)?`${text}\n${url}`:text);setNotice(t('bc.share.copied'))}
  }catch(e){if((e as Error)?.name!=='AbortError')setNotice(t('bc.share.fail'))}
 }
 function sendChallenge(){
  if(!run?.result||play.mode!=='duel')return
  const solved=run.status==='solved',code=encodeChallenge({seed:Number(play.tag),weightedMs:run.result.weightedTimeMs,clues:run.shown,solved}),url=`${base()}?duel=${code}&lang=${locale}`
  void out(solved?t('bc.share.challengeText',{time:secondsLabel(run.result.weightedTimeMs),club:clubName}):t('bc.share.challengeOpen',{club:clubName}),url)
 }
 const startChallenge=()=>{setSheet(null);void begin({mode:'duel',tag:String(newSeed())},{fresh:true})}
 const versus=play.mode==='duel'&&challenge&&String(challenge.seed)===play.tag?challenge:null

 return <section className={css.stage} data-testid="mystery-board" data-screen={screen} data-mode={play.mode}>
  {!online&&<p className={css.error} role="status" data-testid="mystery-offline">{t('bc.offline')}</p>}
  {error&&<div className={css.error} role="alert" data-testid="mystery-error"><p>{t('bc.error')}</p><div className={css.dockRow}>{screen==='run'&&<button type="button" className={`${css.btn} min-h-tap`} disabled={pending} onClick={()=>void resync()}>{t('bc.retry')}</button>}<button type="button" className={`${css.btn} min-h-tap`} onClick={toLobby}>{t('bc.res.lobby')}</button></div></div>}
  {screen==='lobby'
   ?<Lobby {...{t,lobby,history,challenge,clubName,pending,contentLocale}} onOpen={open} onDaily={()=>void begin({mode:'daily',tag:lobby.daily.day})} onSolo={()=>void begin({mode:'solo',tag:''},{fresh:!lobby.solo})} onSoloNew={()=>void begin({mode:'solo',tag:''},{fresh:true})} onDuelResume={()=>lobby.duel&&void begin({mode:'duel',tag:String(lobby.duel.seed)})} onAccept={()=>challenge&&void begin({mode:'duel',tag:String(challenge.seed)})}/>
   :run&&(run.status==='playing'||!run.result
    ?<RunBoard {...{t,run,play,fresh,pending,sure,pen}} limitMs={lobby.modes.limitMs} onExpire={expire} onReveal={()=>void reveal()} onGuess={()=>setDrawer(true)} onGiveUp={giveUp} onFocusOpener={e=>{opener.current=e.currentTarget as HTMLElement}}/>
    :<ResultCard run={run} mode={play.mode} player={byId.get(run.result.playerId)??null} wardrobe={wardrobe} contentLocale={contentLocale} club={club} locale={locale} versus={versus} t={t} notice={notice} pending={pending} nextDaily={play.mode==='daily'}
      onChallenge={play.mode==='duel'?sendChallenge:null} onAgain={()=>void begin(play.mode==='solo'?play:{mode:'solo',tag:''},{fresh:true})} onLobby={toLobby}/>)}
  <GuessDrawer open={drawer&&screen==='run'&&run?.status==='playing'} onClose={()=>setDrawer(false)} players={players} tried={run?.tried??[]} contentLocale={contentLocale} closeLabel={copy['play.close']} t={t} posLabel={p=>copy[`rr.short.${p}`]??copy[p]??p} allLabel={copy.all} groupLabel={copy.position} onPick={guess}/>
  <SlideSheet open={sheet==='howto'} onClose={closeSheet} title={t('bc.help')} closeLabel={copy['play.close']}>
   <ol className={css.howto}>{[1,2,3,4].map(i=><li key={i}><span aria-hidden="true">{i}</span><span>{t(`bc.howto.${i}`)}</span></li>)}</ol>
   <p className={css.fine}>{t('bc.share.noName')}</p>
  </SlideSheet>
  <SlideSheet open={sheet==='duel'} onClose={closeSheet} title={t('bc.duel.sheet')} closeLabel={copy['play.close']} footer={<button type="button" className={`${css.btn} ${css.primary} ${css.wide} min-h-tap`} disabled={pending} onClick={startChallenge} data-testid="mystery-duel-start">{t('bc.duel.start')}</button>}>
   <p className={css.sheetText}>{t('bc.duel.sub')}</p><p className={css.fine}>{t('bc.duel.note')}</p>
  </SlideSheet>
 </section>
}

// =============================================================== lobby
function Lobby({t,lobby,history,challenge,clubName,pending,onOpen,onDaily,onSolo,onSoloNew,onDuelResume,onAccept}:{
 t:(k:string,v?:Record<string,string|number>)=>string;lobby:LobbyState;history:MysteryHistory;challenge:Challenge|null;clubName:string;pending:boolean;contentLocale:string
 onOpen:(s:'howto'|'duel')=>(e:React.SyntheticEvent)=>void;onDaily:()=>void;onSolo:()=>void;onSoloNew:()=>void;onDuelResume:()=>void;onAccept:()=>void
}){
 const d=lobby.daily,zone=d.zone.split('/').pop()!.replace(/_/g,' '),run=streak(history,d.day),mine=!!challenge&&lobby.duel?.seed===challenge.seed
 const dailySub=d.status==='solved'&&d.summary?t('bc.daily.done',{clues:d.summary.clues,time:secondsLabel(d.summary.weightedMs)}):d.status==='gave_up'?t('bc.daily.over'):d.status==='playing'?t('bc.daily.resume',{n:d.shown,total:d.total}):t('bc.daily.sub',{zone})
 const dailyGo=d.status==='new'?t('bc.daily.play'):d.status==='playing'?t('bc.mode.daily'):t('bc.daily.view')
 const m=lobby.modes,comp=m.daily.open,codes=(g:{codes:{code:string}[]})=>g.codes.map(c=>c.code).join(' ')
 const exploration=m.unique===0&&m.practice.open
 return <div className={css.lobby}>
  <div className={css.poster}>
   <p className={css.kicker}>{clubName} · {t('bc.kicker')}</p>
   <MysteryMark className={css.mark}/>
   <h2 className={css.title}>{t('bc.title')}</h2>
   <p className={css.lede}>{t('bc.lede')}</p>
   <p className={css.stats}>
    <span>{lobby.poolSize<10?t('bc.bank.small',{n:lobby.poolSize}):t('bc.bank',{n:lobby.poolSize})}</span>
    {run>0&&<span>{t('bc.streak',{n:run})}</span>}
    {history.best&&<span>{t('bc.best',{time:secondsLabel(history.best.weightedMs)})}</span>}
   </p>
   <p className={css.costs} data-testid="mystery-costs">{t('bc.costs',{clue:15,wrong:5})}</p>
  </div>
  {!m.practice.open?<div className={css.entries}><p className={css.locked} role="status" data-testid="mystery-empty" data-blockers={codes(m.practice)}>{t('bc.empty')}</p><button type="button" className={`${css.help} min-h-tap`} onClick={onOpen('howto')}>{t('bc.help')}</button></div>
  :<div className={css.entries}>
   {challenge&&comp&&<button type="button" className={`${css.entry} ${css.challenge} min-h-tap`} disabled={pending} onClick={mine&&lobby.duel?.status==='playing'?onDuelResume:onAccept} data-testid="mystery-accept">
    <span className={css.entryTitle}>{t('bc.duel.banner')}</span>
    <span className={css.entrySub}>{challenge.solved&&challenge.weightedMs!==null&&challenge.clues!==null?t('bc.duel.beat',{time:secondsLabel(challenge.weightedMs),clues:challenge.clues}):challenge.clues!==null?t('bc.duel.beatMiss'):t('bc.duel.beatOpen')}</span>
    <span className={css.entryGo}>{mine?(lobby.duel?.status==='playing'?t('bc.duel.resume'):t('bc.duel.seen')):t('bc.duel.accept')}</span>
   </button>}
   {lobby.solo&&<button type="button" className={`${css.entry} ${css.resume} min-h-tap`} disabled={pending} onClick={onSolo} data-testid="mystery-resume">
    <span className={css.entryTitle}>{t('bc.solo.title')}</span>
    <span className={css.entrySub}>{t('bc.solo.resume',{n:lobby.solo.shown,total:lobby.solo.total})}</span>
    <span className={css.entryGo}>▶</span>
   </button>}
   {comp
    ?<button type="button" className={`${css.entry} min-h-tap`} disabled={pending} onClick={onDaily} data-testid="mystery-daily" data-status={d.status}>
     <span className={css.entryTitle}>{t('bc.daily.title')}<small>{d.day}</small></span>
     <span className={css.entrySub}>{dailySub}</span>
     <span className={css.entryGo}>{dailyGo}</span>
    </button>
    :<div className={`${css.entry} ${css.entryLocked}`} data-testid="mystery-daily-locked" data-blockers={codes(m.daily)} aria-disabled="true">
     <span className={css.entryTitle}>{t('bc.daily.title')}</span>
     <span className={css.entrySub}>{t('bc.locked.sub')}</span>
     <span className={css.entryGo}>{t('bc.locked')}</span>
    </div>}
   {lobby.solo
    ?<button type="button" className={`${css.entry} min-h-tap`} disabled={pending} onClick={onSoloNew} data-testid="mystery-new"><span className={css.entryTitle}>{t('bc.solo.title')}</span><span className={css.entrySub}>{exploration?t('bc.solo.explore'):t('bc.solo.sub')}</span><span className={css.entryGo}>{t('bc.solo.new')}</span></button>
    :<button type="button" className={`${css.entry} min-h-tap`} disabled={pending} onClick={onSolo} data-testid="mystery-start"><span className={css.entryTitle}>{t('bc.solo.title')}</span><span className={css.entrySub}>{exploration?t('bc.solo.explore'):t('bc.solo.sub')}</span><span className={css.entryGo}>{t('bc.solo.play')}</span></button>}
   {!challenge&&(comp
    ?<button type="button" className={`${css.entry} min-h-tap`} disabled={pending} onClick={lobby.duel?.status==='playing'?onDuelResume:onOpen('duel')} data-testid="mystery-duel">
     <span className={css.entryTitle}>{t('bc.duel.title')}</span><span className={css.entrySub}>{t('bc.duel.sub')}</span><span className={css.entryGo}>{lobby.duel?.status==='playing'?t('bc.duel.resume'):t('bc.duel.start')}</span></button>
    :<div className={`${css.entry} ${css.entryLocked}`} data-testid="mystery-duel-locked" data-blockers={codes(m.duel)} aria-disabled="true">
     <span className={css.entryTitle}>{t('bc.duel.title')}</span><span className={css.entrySub}>{t('bc.locked.sub')}</span><span className={css.entryGo}>{t('bc.locked')}</span></div>)}
   {challenge&&!comp&&<p className={css.locked} role="status" data-testid="mystery-accept-locked" data-blockers={codes(m.duel)}>{t('bc.duel.unavailable')}</p>}
   <button type="button" className={`${css.help} min-h-tap`} onClick={onOpen('howto')}>{t('bc.help')}</button>
  </div>}
 </div>
}

// =============================================================== the clue table
function Stopwatch({run,limitMs,onExpire}:{run:MysteryView;limitMs:number;onExpire:()=>void}){
 const [ms,setMs]=useState(()=>Math.max(0,run.serverNow-run.startedAt)),fired=useRef(false)
 useEffect(()=>{
  fired.current=false
  if(run.status!=='playing')return
  const began=performance.now(),base=Math.max(0,run.serverNow-run.startedAt);setMs(base)
  const id=window.setInterval(()=>{const now=base+performance.now()-began;setMs(now);if(limitMs&&now>=limitMs&&!fired.current){fired.current=true;onExpire()}},100);return()=>window.clearInterval(id)
  // eslint-disable-next-line react-hooks/exhaustive-deps -- the interval is tied to this run only
 },[run.rid,run.status,run.serverNow,run.startedAt,limitMs])
 const left=limitMs?Math.max(0,limitMs-ms):0
 return limitMs
  ?<span className={css.clock} dir="ltr" aria-hidden="true" data-testid="mystery-clock" data-limit={limitMs} data-low={left<20000}>{secondsLabel(left)}<small>s</small><i className={css.limitBar} style={{inlineSize:`${Math.min(100,(left/limitMs)*100)}%`}}/></span>
  :<span className={css.clock} dir="ltr" aria-hidden="true" data-testid="mystery-clock">{secondsLabel(ms)}<small>s</small></span>
}

function RunBoard({t,run,play,fresh,pending,sure,pen,limitMs,onExpire,onReveal,onGuess,onGiveUp,onFocusOpener}:{
 t:(k:string,v?:Record<string,string|number>)=>string;run:MysteryView;play:Play;fresh:number|null;pending:boolean;sure:boolean;pen:{clue:number;wrong:number};limitMs:number;onExpire:()=>void
 onReveal:()=>void;onGuess:()=>void;onGiveUp:()=>void;onFocusOpener:(e:React.SyntheticEvent)=>void
}){
 const list=useRef<HTMLOListElement>(null),last=useRef<HTMLLIElement>(null),more=run.shown<run.total
 useEffect(()=>{last.current?.scrollIntoView?.({block:'nearest',behavior:window.matchMedia?.('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'})},[run.shown])
 return <div className={css.run}>
  <header className={css.hud}>
   <span className={css.modeTag}>{t(`bc.mode.${play.mode}`)}</span>
   {run.kind==='exploration'&&<span className={css.exploreTag} title={t('bc.explore.note')} data-testid="mystery-explore">{t('bc.explore')}</span>}
   <span className={css.clueCount}>{t('bc.clue',{n:run.shown,total:run.total})}</span>
   {run.wrong>0&&<span className={css.wrongTag}>{t('bc.wrong',{n:run.wrong})}</span>}
   <Stopwatch run={run} limitMs={play.mode==='duel'?limitMs:0} onExpire={onExpire}/>
  </header>
  <ol className={css.rail} role="img" aria-label={t('bc.rail',{n:run.shown,total:run.total})}>{Array.from({length:run.total},(_,i)=><li key={i} data-open={i<run.shown}/>)}</ol>
  {run.kind==='exploration'&&<p className={css.fine} data-testid="mystery-explore-note">{t('bc.explore.note')}</p>}
  <ol className={css.stack} ref={list} aria-label={t('bc.stackLabel')} aria-live="polite">
   {run.clues.map((c,i)=>{const newest=i===run.clues.length-1;return <li key={c.n} ref={newest?last:undefined} className={newest?css.cardNew:css.cardOld} data-clue-n={c.n} data-fresh={fresh===c.n}>
    <span className={css.cardNo} aria-hidden="true">{c.n}</span>
    <span className={css.cardBody}><small>{c.label}{newest&&run.shown>1&&<em>{t('bc.new')}</em>}</small><span dir="auto">{c.value}</span></span></li>})}
   {more
    ?<li className={css.sealedItem}><button type="button" className={`${css.sealed} min-h-tap`} disabled={pending} onClick={onReveal} data-testid="mystery-reveal"><span className={css.cardNo} aria-hidden="true">{run.shown+1}</span><span className={css.sealedText}><b>{t('bc.sealed',{n:run.shown+1})}</b><small>{t('bc.sealed.cost',{s:pen.clue})}</small></span></button></li>
    :<li className={css.lastNote}>{t('bc.sealed.none')}</li>}
  </ol>
  <div className={css.dock}>
   <button type="button" className={`${css.btn} ${css.primary} ${css.big} min-h-tap`} disabled={pending} onClick={e=>{onFocusOpener(e);onGuess()}} data-testid="mystery-guess">{t('bc.guess')}</button>
   <button type="button" className={`${css.giveup} min-h-tap`} data-sure={sure} disabled={pending} onClick={e=>{firePickFxAt(e.currentTarget,{tone:'ink',haptic:false});onGiveUp()}} data-testid="mystery-giveup">{sure?t('bc.giveup.sure'):t('bc.giveup')}</button>
  </div>
 </div>
}
