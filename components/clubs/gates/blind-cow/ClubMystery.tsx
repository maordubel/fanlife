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
import {emptyHistory,encodeChallenge,historyKey,newSeed,penalties,recordResult,shareText,streak,validateHistory,type Challenge,type MysteryHistory} from '@/lib/clubs/mystery-model'
import {MysteryMark} from './MysteryMark'
import {GuessDrawer} from './GuessDrawer'
import {ResultCard} from './ResultCard'
import css from './blind-cow.module.css'

type Mode='solo'|'daily'|'duel'
type Play={mode:Mode;tag:string}
export type ClubMysteryProps={players:ClubPlayer[];club:string;clubName:string;version:string;locale:UiLocale;contentLocale:string;copy:GameCopy;wardrobe:RumbleWardrobe;lobby:LobbyState;challenge:Challenge|null}
const GLYPHS=['◉','●','○']

/** Gate 10 · Blind Cow: lobby → sealed clues → guess drawer → result. The screen owns no truth: it asks the server for each move. */
export function ClubMystery(props:ClubMysteryProps){
 const {players,club,clubName,version,locale,contentLocale,copy,wardrobe,challenge}=props
 const t=useCallback((k:string,v?:Record<string,string|number>)=>tr(copy,k,v),[copy])
 const [screen,setScreen]=useState<'lobby'|'run'>('lobby'),[play,setPlay]=useState<Play>({mode:'solo',tag:''}),[run,setRun]=useState<MysteryView|null>(null)
 const [lobby,setLobby]=useState(props.lobby),[fresh,setFresh]=useState<number|null>(null),[pending,setPending]=useState(false),[error,setError]=useState(false),[sure,setSure]=useState(false)
 const [drawer,setDrawer]=useState(false),[sheet,setSheet]=useState<null|'howto'|'duel'>(null),[notice,setNotice]=useState(''),[history,setHistory]=useState<MysteryHistory>(emptyHistory)
 const busy=useRef(false),recorded=useRef(''),opener=useRef<HTMLElement|null>(null),pen=penalties()
 const byId=useMemo(()=>new Map(players.map(p=>[p.id,p])),[players])
 const open=(s:'howto'|'duel')=>(e:React.SyntheticEvent)=>{opener.current=e.currentTarget as HTMLElement;setSheet(s)}
 const closeSheet=()=>{setSheet(null);opener.current?.focus?.()}

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
 const toLobby=()=>{setScreen('lobby');setRun(null);setDrawer(false);setNotice('')}

 // ---- a finished attempt is reported once: the ticket, the device record, the lobby
 useEffect(()=>{
  if(!run||run.status==='playing'||!run.result)return
  const key=`${play.mode}:${play.tag}:${run.rid}`;if(recorded.current===key)return;recorded.current=key
  const solved=run.status==='solved'
  completeRun(club,'blind-cow',play.mode==='solo'?`blind-cow:${version}:${run.rid}`:`blind-cow:${version}:${play.mode}:${run.rid}`,solved?Math.max(1,11-run.shown):0)
  const next=recordResult(history,{solved,clues:run.shown,wrong:run.wrong,weightedMs:run.result.weightedTimeMs,daily:play.mode==='daily'?play.tag:undefined})
  setHistory(next);try{localStorage.setItem(historyKey(club),JSON.stringify(next))}catch{/* kept for this visit only */}
  const summary={solved,clues:run.shown,wrong:run.wrong,weightedMs:run.result.weightedTimeMs,rawMs:run.result.rawElapsedMs},status=solved?'solved' as const:'gave_up' as const
  setLobby(l=>play.mode==='daily'?{...l,daily:{...l.daily,status,shown:run.shown,total:run.total,summary}}:play.mode==='duel'?{...l,duel:{seed:Number(play.tag),status,summary}}:{...l,solo:null})
  // eslint-disable-next-line react-hooks/exhaustive-deps -- once per finished run
 },[run,play,club,version])
 useEffect(()=>{if(run&&run.status==='playing'&&play.mode==='solo')setLobby(l=>({...l,solo:{shown:run.shown,total:run.total,wrong:run.wrong}}))},[run,play.mode])

 // ---- share: the text never names the man
 const base=()=>`${location.origin}/clubs/${club}/blind-cow`
 async function out(text:string,url?:string){
  try{
   if(typeof navigator.share==='function'){await navigator.share({title:`${clubName} · ${t('bc.share.title')}`,text,...(url?{url}:{})});setNotice(t('bc.share.done'))}
   else{await navigator.clipboard.writeText(url&&!text.includes(url)?`${text}\n${url}`:text);setNotice(t('bc.share.copied'))}
  }catch(e){if((e as Error)?.name!=='AbortError')setNotice(t('bc.share.fail'))}
 }
 function shareResult(){
  if(!run?.result)return
  const solved=run.status==='solved',url=`${base()}?lang=${locale}`
  void out(shareText({club:clubName,title:t('bc.share.title'),mode:play.mode,day:play.mode==='daily'?play.tag:undefined,solved,clues:run.shown,total:run.total,weightedMs:run.result.weightedTimeMs,url,strip:GLYPHS}))
 }
 function sendChallenge(){
  if(!run?.result||play.mode!=='duel')return
  const solved=run.status==='solved',code=encodeChallenge({seed:Number(play.tag),weightedMs:run.result.weightedTimeMs,clues:run.shown,solved}),url=`${base()}?duel=${code}&lang=${locale}`
  void out(solved?t('bc.share.challengeText',{time:secondsLabel(run.result.weightedTimeMs),club:clubName}):t('bc.share.challengeOpen',{club:clubName}),url)
 }
 const startChallenge=()=>{setSheet(null);void begin({mode:'duel',tag:String(newSeed())},{fresh:true})}
 const versus=play.mode==='duel'&&challenge&&String(challenge.seed)===play.tag?challenge:null

 return <section className={css.stage} data-testid="mystery-board" data-screen={screen} data-mode={play.mode}>
  {error&&<p className={css.error} role="alert">{t('bc.error')}</p>}
  {screen==='lobby'
   ?<Lobby {...{t,lobby,history,challenge,clubName,pending,contentLocale}} onOpen={open} onDaily={()=>void begin({mode:'daily',tag:lobby.daily.day})} onSolo={()=>void begin({mode:'solo',tag:''},{fresh:!lobby.solo})} onSoloNew={()=>void begin({mode:'solo',tag:''},{fresh:true})} onDuelResume={()=>lobby.duel&&void begin({mode:'duel',tag:String(lobby.duel.seed)})} onAccept={()=>challenge&&void begin({mode:'duel',tag:String(challenge.seed)})}/>
   :run&&(run.status==='playing'||!run.result
    ?<RunBoard {...{t,run,play,fresh,pending,sure,pen}} onReveal={()=>void reveal()} onGuess={()=>setDrawer(true)} onGiveUp={giveUp} onFocusOpener={e=>{opener.current=e.currentTarget as HTMLElement}}/>
    :<ResultCard run={run} mode={play.mode} player={byId.get(run.result.playerId)??null} wardrobe={wardrobe} contentLocale={contentLocale} club={club} locale={locale} versus={versus} t={t} notice={notice} pending={pending} nextDaily={play.mode==='daily'}
      onShare={shareResult} onChallenge={play.mode==='duel'?sendChallenge:null} onAgain={play.mode==='daily'?null:()=>void begin(play.mode==='duel'?{mode:'solo',tag:''}:play,{fresh:true})} onLobby={toLobby}/>)}
  <GuessDrawer open={drawer&&screen==='run'&&run?.status==='playing'} onClose={()=>setDrawer(false)} players={players} tried={run?.tried??[]} contentLocale={contentLocale} closeLabel={copy['play.close']} t={t} posLabel={p=>copy[p]??p} allLabel={copy.all} groupLabel={copy.position} onPick={guess}/>
  <SlideSheet open={sheet==='howto'} onClose={closeSheet} title={t('bc.help')} closeLabel={copy['play.close']}>
   <ol className={css.howto}>{[1,2,3,4].map(i=><li key={i}><span aria-hidden="true">{i}</span><span>{t(`bc.howto.${i}`)}</span></li>)}</ol>
   <p className={css.fine}>{t('bc.share.noName')}</p>
  </SlideSheet>
  <SlideSheet open={sheet==='duel'} onClose={closeSheet} title={t('bc.duel.sheet')} closeLabel={copy['play.close']} footer={<button type="button" className={`${css.btn} ${css.primary} ${css.wide}`} disabled={pending} onClick={startChallenge} data-testid="mystery-duel-start">{t('bc.duel.start')}</button>}>
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
  </div>
  <div className={css.entries}>
   {challenge&&<button type="button" className={`${css.entry} ${css.challenge}`} disabled={pending} onClick={mine&&lobby.duel?.status==='playing'?onDuelResume:onAccept} data-testid="mystery-accept">
    <span className={css.entryTitle}>{t('bc.duel.banner')}</span>
    <span className={css.entrySub}>{challenge.solved&&challenge.weightedMs!==null&&challenge.clues!==null?t('bc.duel.beat',{time:secondsLabel(challenge.weightedMs),clues:challenge.clues}):challenge.clues!==null?t('bc.duel.beatMiss'):t('bc.duel.beatOpen')}</span>
    <span className={css.entryGo}>{mine?(lobby.duel?.status==='playing'?t('bc.duel.resume'):t('bc.duel.seen')):t('bc.duel.accept')}</span>
   </button>}
   {lobby.solo&&<button type="button" className={`${css.entry} ${css.resume}`} disabled={pending} onClick={onSolo} data-testid="mystery-resume">
    <span className={css.entryTitle}>{t('bc.solo.title')}</span>
    <span className={css.entrySub}>{t('bc.solo.resume',{n:lobby.solo.shown,total:lobby.solo.total})}</span>
    <span className={css.entryGo}>▶</span>
   </button>}
   <button type="button" className={css.entry} disabled={pending} onClick={onDaily} data-testid="mystery-daily" data-status={d.status}>
    <span className={css.entryTitle}>{t('bc.daily.title')}<small>{d.day}</small></span>
    <span className={css.entrySub}>{dailySub}</span>
    <span className={css.entryGo}>{dailyGo}</span>
   </button>
   {lobby.solo
    ?<button type="button" className={css.entry} disabled={pending} onClick={onSoloNew} data-testid="mystery-new"><span className={css.entryTitle}>{t('bc.solo.title')}</span><span className={css.entrySub}>{t('bc.solo.sub')}</span><span className={css.entryGo}>{t('bc.solo.new')}</span></button>
    :<button type="button" className={css.entry} disabled={pending} onClick={onSolo} data-testid="mystery-start"><span className={css.entryTitle}>{t('bc.solo.title')}</span><span className={css.entrySub}>{t('bc.solo.sub')}</span><span className={css.entryGo}>{t('bc.solo.play')}</span></button>}
   {!challenge&&<button type="button" className={css.entry} disabled={pending} onClick={lobby.duel?.status==='playing'?onDuelResume:onOpen('duel')} data-testid="mystery-duel">
    <span className={css.entryTitle}>{t('bc.duel.title')}</span><span className={css.entrySub}>{t('bc.duel.sub')}</span><span className={css.entryGo}>{lobby.duel?.status==='playing'?t('bc.duel.resume'):t('bc.duel.start')}</span></button>}
   <button type="button" className={css.help} onClick={onOpen('howto')}>{t('bc.help')}</button>
  </div>
 </div>
}

// =============================================================== the clue table
function Stopwatch({run}:{run:MysteryView}){
 const [ms,setMs]=useState(()=>Math.max(0,run.serverNow-run.startedAt))
 useEffect(()=>{
  if(run.status!=='playing')return
  const began=performance.now(),base=Math.max(0,run.serverNow-run.startedAt);setMs(base)
  const id=window.setInterval(()=>setMs(base+performance.now()-began),100);return()=>window.clearInterval(id)
 },[run])
 return <span className={css.clock} dir="ltr" aria-hidden="true" data-testid="mystery-clock">{secondsLabel(ms)}<small>s</small></span>
}

function RunBoard({t,run,play,fresh,pending,sure,pen,onReveal,onGuess,onGiveUp,onFocusOpener}:{
 t:(k:string,v?:Record<string,string|number>)=>string;run:MysteryView;play:Play;fresh:number|null;pending:boolean;sure:boolean;pen:{clue:number;wrong:number}
 onReveal:()=>void;onGuess:()=>void;onGiveUp:()=>void;onFocusOpener:(e:React.SyntheticEvent)=>void
}){
 const list=useRef<HTMLOListElement>(null),last=useRef<HTMLLIElement>(null),more=run.shown<run.total
 useEffect(()=>{last.current?.scrollIntoView?.({block:'nearest',behavior:window.matchMedia?.('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'})},[run.shown])
 return <div className={css.run}>
  <header className={css.hud}>
   <span className={css.modeTag}>{t(`bc.mode.${play.mode}`)}</span>
   <span className={css.clueCount}>{t('bc.clue',{n:run.shown,total:run.total})}</span>
   {run.wrong>0&&<span className={css.wrongTag}>{t('bc.wrong',{n:run.wrong})}</span>}
   <Stopwatch run={run}/>
  </header>
  <ol className={css.rail} role="img" aria-label={t('bc.rail',{n:run.shown,total:run.total})}>{Array.from({length:run.total},(_,i)=><li key={i} data-open={i<run.shown}/>)}</ol>
  <ol className={css.stack} ref={list} aria-label={t('bc.stackLabel')} aria-live="polite">
   {run.clues.map((c,i)=>{const newest=i===run.clues.length-1;return <li key={c.n} ref={newest?last:undefined} className={newest?css.cardNew:css.cardOld} data-clue-n={c.n} data-fresh={fresh===c.n}>
    <span className={css.cardNo} aria-hidden="true">{c.n}</span>
    <span className={css.cardBody}><small>{c.label}{newest&&run.shown>1&&<em>{t('bc.new')}</em>}</small><span dir="auto">{c.value}</span></span></li>})}
   {more
    ?<li className={css.sealedItem}><button type="button" className={css.sealed} disabled={pending} onClick={onReveal} data-testid="mystery-reveal"><span className={css.cardNo} aria-hidden="true">{run.shown+1}</span><span className={css.sealedText}><b>{t('bc.sealed',{n:run.shown+1})}</b><small>{t('bc.sealed.cost',{s:pen.clue})}</small></span></button></li>
    :<li className={css.lastNote}>{t('bc.sealed.none')}</li>}
  </ol>
  <div className={css.dock}>
   <button type="button" className={`${css.btn} ${css.primary} ${css.big}`} disabled={pending} onClick={e=>{onFocusOpener(e);onGuess()}} data-testid="mystery-guess">{t('bc.guess')}</button>
   <button type="button" className={css.giveup} data-sure={sure} disabled={pending} onClick={e=>{firePickFxAt(e.currentTarget,{tone:'ink',haptic:false});onGiveUp()}} data-testid="mystery-giveup">{sure?t('bc.giveup.sure'):t('bc.giveup')}</button>
  </div>
 </div>
}
