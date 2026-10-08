'use client'
import {useMemo,useRef,useState,useTransition,type ReactNode} from 'react'
import {SlideSheet} from '@/components/stage/SlideSheet'
import {firePickFxAt} from '@/components/stage/PickFx'
import {ClubShirt} from '@/components/clubs/stage/ClubShirt'
import {tr,shortName} from '@/components/clubs/rumble/shared'
import {clubGoalCount} from '@/app/clubs/[slug]/[gate]/gate-actions'
import {ShareComposer} from '@/components/share/v3/ShareComposer'
import {goalShare} from '@/lib/clubs/goal-share'
import {completeRun} from '@/lib/clubs/completion'
import {markStep} from '@/lib/analytics/meter'
import type {GameCopy} from '@/lib/clubs/game-copy'
import type {UiLocale} from '@/lib/clubs/locale'
import type {RumbleWardrobe} from '@/lib/clubs/rumble-kit'
import {MAX_TOUCHES,MIN_TOUCHES,HINT_COST,VIEW,addTouch,buildTimeline,isFull,moveTouch,pointsFor,removeAt,removeLast,runIndices,setVerb,suggestVerb,tierOf,totals,wire,type Draft,type GoalResult} from '@/lib/clubs/goal-model'
import {cameraFor,pushFor} from '@/lib/game/replay/motion'
import {REPLAY_ACTIONS,type ReplayAction} from '@/lib/game/replay/vocab'
import {gradeGoalReplay,type GoalVerdict} from './goal-actions'
import {GoalPitch,type Layer,type PitchLabels,type Tok} from './GoalPitch'
import {GoalBench,VerbRow} from './GoalBench'
import {useBallRun} from './useBallRun'
import css from './goal.module.css'

export type GoalItem={id:string;title:string;subtitle:string;competition:string;opponent:string;score:string;on:string|null;year:number|null;pool:string[]}
export type ClubGoalProps={items:GoalItem[];club:string;clubName:string;version:string;seed:number;locale:UiLocale;contentLocale:string;wardrobe:RumbleWardrobe;copy:GameCopy}
type Phase='build'|'yours'|'archive'|'done'
type Sheet=null|'info'|'result'
type Say=(k:string,v?:Record<string,string|number>)=>string
const reducedNow=()=>{try{return window.matchMedia('(prefers-reduced-motion: reduce)').matches}catch{return false}}

/** Gate 8 · Rebuild the Goal: a run of up to three goals, each rebuilt touch by touch on a drawn pitch and replayed against the archive. */
export function ClubGoal(props:ClubGoalProps){
 const {items}=props
 const [run,setRun]=useState(0),[pos,setPos]=useState(0),[results,setResults]=useState<GoalResult[]>([]),[summary,setSummary]=useState(false),[started,setStarted]=useState(false)
 const idx=useMemo(()=>runIndices(items.length,run),[items.length,run]),g=items[idx[pos]!]
 if(!g)return <section className={css.stage} data-testid="goal-board" lang={props.locale}><p role="alert" className={css.status} data-testid="goal-empty">{props.copy.unavailable}</p></section>
 const record=(r:GoalResult)=>setResults(x=>x.some(y=>y.id===r.id)?x:[...x,r])
 const next=()=>{if(pos>=idx.length-1)setSummary(true);else setPos(pos+1)}
 const again=()=>{setRun(r=>r+1);setPos(0);setResults([]);setSummary(false)}
 return <section className={css.stage} data-testid="goal-board" lang={props.locale}>
  {!started
   ?<Intro g={g} of={idx.length} onStart={()=>setStarted(true)} {...props}/>
   :summary
   ?<RunSummary results={results} {...props} onAgain={again}/>
   :<Round key={`${run}:${pos}:${g.id}`} g={g} run={run} pos={pos} of={idx.length} onResult={record} onNext={next} {...props}/>}
 </section>
}

function Intro({g,of,onStart,copy,contentLocale}:ClubGoalProps&{g:GoalItem;of:number;onStart:()=>void}){
 const tx:Say=(k,v)=>tr(copy,k,v)
 return <div className={css.intro} data-testid="goal-intro">
  <p className={css.modeChip}>{tx('gl.mode.zone')}</p>
  <h2 className={css.introTitle}>{tx('gl.intro.title')}</h2>
  <p className={css.introMatch} lang={contentLocale} dir="auto"><b>{g.title}</b><span>{[g.competition,g.on].filter(Boolean).join(' · ')}</span></p>
  <p>{tx('gl.intro.body',{m:of})}</p>
  <ul className={css.rules}><li>{tx('gl.intro.rule1',{min:MIN_TOUCHES,max:MAX_TOUCHES})}</li><li>{tx('gl.intro.rule2',{cost:HINT_COST})}</li><li>{tx('gl.intro.rule3')}</li></ul>
  <button type="button" className={`min-h-tap ${css.btn} ${css.btnMain}`} onClick={onStart} data-testid="goal-start">{tx('gl.intro.start')} →</button>
 </div>
}

function RunSummary({results,onAgain,club,copy,contentLocale}:ClubGoalProps&{results:GoalResult[];onAgain:()=>void}){
 const tx:Say=(k,v)=>tr(copy,k,v),tot=totals(results),pct=Math.round(tot.quality*100)
 return <div className={css.summary} data-testid="goal-run">
  <div className={css.score}>
   <p className={css.scoreKicker}>{tx('gl.run.title')} · {tx('gl.mode.zone')}</p>
   <p className={css.scoreNum}>{pct}%</p>
   <p className={css.scoreLine}>{tx(`gl.tier.${tierOf(tot.quality,tot.perfect)}`)} · {tot.points}/{tot.max}</p>
  </div>
  <ol className={css.runRows} lang={contentLocale}>{results.map(r=><li key={r.id}><span dir="auto">{r.title}</span><b>{Math.round(r.quality*100)}%</b></li>)}</ol>
  <div className={css.actionsGrid}>
   <button type="button" className={`min-h-tap ${css.btn} ${css.btnMain}`} onClick={onAgain} data-testid="goal-run-again">{tx('gl.run.again')} →</button>
   <ShareComposer label={tx('gl.share')} draft={goalShare(club,{percent:pct,goalId:null,zonePractice:true,forbidden:[]})}/>
  </div>
 </div>
}

function Round({g,run,pos,of,onResult,onNext,club,clubName,version,seed,locale,contentLocale,wardrobe,copy}:ClubGoalProps&{g:GoalItem;run:number;pos:number;of:number;onResult:(r:GoalResult)=>void;onNext:()=>void}){
 const tx:Say=(k,v)=>tr(copy,k,v)
 const [draft,setDraft]=useState<Draft>([]),[actor,setActor]=useState<string|null>(null),[verb,setVerbPick]=useState<ReplayAction|null>(null),[active,setActive]=useState<number|null>(null)
 const [phase,setPhase]=useState<Phase>('build'),[verdict,setVerdict]=useState<GoalVerdict|null>(null),[sheet,setSheet]=useState<Sheet>(null)
 const [hintN,setHintN]=useState<number|null>(null),[hinted,setHinted]=useState(false),[err,setErr]=useState(false),[notice,setNotice]=useState(''),[warn,setWarn]=useState(false),[pending,start]=useTransition()
 const ball=useBallRun(),opener=useRef<HTMLElement|null>(null)
 const unnamed=tx('gl.unnamed'),verbWord=(a:string)=>tx(`gl.verb.${a}`)
 const say=(text:string,bad=false)=>{setNotice(text);setWarn(bad)}
 const full=isFull(draft),building=phase==='build'
 const armed=building&&!full&&active===null&&actor!==null&&verb!==null

 // ---- shirts: one era for the whole room; the report's side decides which colours a man wears
 const shirtFor=(name:string,side:'us'|'them')=><ClubShirt player={{id:name||'x',fromYear:g.year,toYear:g.year}} wardrobe={wardrobe} side={side} className="h-full w-full"/>
 const unknownShirt=<span className={css.unknown} aria-hidden="true">?</span>
 const shirtOf=(t:Tok):ReactNode=>t.side==='unnamed'?unknownShirt:shirtFor(t.actor,t.side)
 const labelOf=(name:string)=>name?shortName(name):unnamed

 // ---- building
 function add(zone:string,who:string,what:ReplayAction){
  if(full){say(tx('gl.full'),true);return}
  const prev=draft[draft.length-1]
  const next=addTouch(draft,{actor:who,action:what,zone});if(next===draft)return
  setDraft(next);setActor(null);setVerbPick(null);setActive(null);markStep(next.length)
  say(tx('gl.placed',{n:next.length,name:`⁨${labelOf(who)}⁩`,verb:verbWord(what)}))
  window.requestAnimationFrame(()=>firePickFxAt(document.querySelector(`[data-zone="${zone}"]`),{label:labelOf(who)}))
  if(prev)ball.play(buildTimeline([{zone:prev.zone,action:prev.action},{zone,action:'pass'}],2.4))
 }
 function tapZone(zone:string){
  if(!building)return
  if(active!==null){setDraft(d=>moveTouch(d,active,zone));setActive(null);say(tx('gl.moved'));return}
  if(full){say(tx('gl.full'),true);return}
  if(actor===null){say(tx(verb?'gl.needWho':'gl.start0',{n:draft.length+1,min:MIN_TOUCHES,max:MAX_TOUCHES}),true);return}
  if(verb===null){say(tx('gl.needVerb'),true);return}
  add(zone,actor,verb)
 }
 const zoneOf=(zone:string)=>zone.startsWith('zone-')?zone.slice(5):null
 function dropBench(zone:string,name:string){
  const z=zoneOf(zone);if(!z||!building)return
  if(active!==null){setActive(null)}
  add(z,name,verb??suggestVerb(draft[draft.length-1]?.zone??null,z))
 }
 function dropToken(i:number,zone:string){const z=zoneOf(zone);if(!z||!building)return;setDraft(d=>moveTouch(d,i,z));setActive(i);say(tx('gl.moved'))}
 const tapToken=(i:number)=>{if(!building)return;setActive(a=>a===i?null:i);say('')}
 const pickVerb=(a:ReplayAction)=>{if(active!==null){setDraft(d=>setVerb(d,active,a));say('')}else setVerbPick(v=>v===a?null:a)}
 const removeActive=()=>{if(active===null)return;setDraft(d=>removeAt(d,active));setActive(null);say(tx('gl.removed'))}
 const undo=()=>{setDraft(removeLast);setActive(null);say('')}

 // ---- hint: how many touches the report describes — never who, what or where
 function hint(){if(hinted)return;setHinted(true);start(async()=>{try{const n=await clubGoalCount(club,version,g.id);setHintN(n);if(n===null)setErr(true)}catch{setErr(true)}})}

 // ---- whistle, replay, result
 function whistle(){
  const w=wire(draft);if(!w||w.length<MIN_TOUCHES)return
  setActive(null)
  start(async()=>{
   try{
    const r=await gradeGoalReplay(club,version,g.id,seed,w,hinted)
    if(!r){setErr(true);return}
    setErr(false);setVerdict(r);say('')
    onResult({id:g.id,title:g.title,points:r.points,max:r.max,quality:r.quality,perfect:r.perfect})
    completeRun(club,'goal',`goal:${version}:${seed}:${run}:${pos}:${g.id}`,r.points)
    replay(r,w)
   }catch{setErr(true)}
  })
 }
 function replay(r:GoalVerdict,mine:Draft){
  setPhase('yours')
  ball.play(buildTimeline(mine),()=>{
   setPhase('archive')
   ball.play(buildTimeline(r.truth.map(s=>({zone:s.zone,action:s.action as ReplayAction}))),()=>{setPhase('done');setSheet('result')})
  })
 }
 const openSheet=(s:Sheet)=>(e?:React.SyntheticEvent)=>{opener.current=(e?.currentTarget as HTMLElement)??null;setSheet(s)}
 const closeSheet=()=>{setSheet(null);opener.current?.focus?.()}
 // ---- what the board shows
 const fr=ball.frame,n=draft.length
 const mineToks:Tok[]=draft.map(t=>({actor:t.actor,label:labelOf(t.actor),side:t.actor?'us':'unnamed',action:t.action,zone:t.zone}))
 const minePts=pointsFor(draft.map(t=>t.zone))
 const truthToks:Tok[]=verdict?verdict.truth.map(s=>({actor:s.actor??'',label:labelOf(s.actor??''),side:s.side==='unnamed'?'unnamed':s.side==='opponent'?'them':'us',action:s.action as ReplayAction,zone:s.zone})):[]
 const truthPts=pointsFor(truthToks.map(t=>t.zone))
 const layers:Layer[]=[]
 if(phase==='build')layers.push({id:'yours',toks:mineToks,pts:minePts,reached:n,tone:'yours',compact:false,goal:false})
 else if(phase==='yours')layers.push({id:'yours',toks:mineToks,pts:minePts,reached:fr?fr.reached:n,tone:'yours',compact:false,goal:true})
 else{
  layers.push({id:'yours',toks:mineToks,pts:minePts,reached:n,tone:'yours',compact:true,goal:true})
  layers.push({id:'archive',toks:truthToks,pts:truthPts,reached:phase==='archive'&&fr?fr.reached:truthToks.length,tone:'archive',compact:false,goal:true})
 }
 const restPt=building&&n>0?minePts[n-1]!:null
 const shownBall=fr&&(ball.playing||phase!=='build')?{pt:fr.ball,lift:fr.lift}:restPt?{pt:restPt,lift:0}:null
 const cam=ball.playing&&fr&&!reducedNow()?(()=>{const s=pushFor(fr.ball,1.4);return cameraFor(fr.ball,s,{top:VIEW.y,height:VIEW.h,width:VIEW.w})})():null
 const goalHit=!!fr?.goal&&phase!=='build'
 const pitchLabels:PitchLabels=useMemo(()=>({zone:z=>z?tx('gl.zone',{zone:z}):tx('gl.zones'),token:(k,label,v)=>tx('gl.tokenAria',{n:k,name:label,verb:verbWord(v)}),goal:tx('gl.goalMouth')}),
 // eslint-disable-next-line react-hooks/exhaustive-deps -- `tx` only closes over `copy`
 [copy])

 const replaying=phase==='yours'||phase==='archive'
 const prompt=phase==='yours'?tx('gl.replay.yours'):phase==='archive'?tx('gl.replay.archive'):phase==='done'?tx('gl.replay.done')
  :active!==null?tx('gl.prompt.touch',{n:active+1,name:`⁨${labelOf(draft[active]?.actor??'')}⁩`})
  :full?tx('gl.full')
  :actor===null&&verb===null?tx('gl.start0',{n:n+1,min:MIN_TOUCHES,max:MAX_TOUCHES})
  :actor!==null&&verb===null?tx('gl.needVerb')
  :actor===null?tx('gl.needWho'):tx('gl.tapZone')
 const dateLine=[g.competition,g.on,g.score].filter(Boolean).join(' · ')

 return <>
  <div className={css.layout}>
   <div className={css.pitchCol}>
    <header className={css.plate}>
     <span className={css.plateNo}>{tx('gl.goalOf',{n:pos+1,m:of})}</span>
     <span className={css.plateText}><h2 className={css.plateTitle} lang={contentLocale} dir="auto">{g.title}</h2><p className={css.plateMeta} lang={contentLocale} dir="auto">{dateLine}</p></span>
     <button type="button" className={`min-h-tap ${css.plateBtn}`} onClick={openSheet('info')} aria-label={tx('gl.info')} title={tx('gl.info')}>i</button>
    </header>
    <p className={css.modeChip} data-testid="goal-mode" title={tx('gl.approx')}>{tx('gl.mode.zone')}</p>
    <div className={css.counters} aria-hidden="true">
     <span className={css.total} data-done={full}>{tx('gl.touches',{n,min:MIN_TOUCHES,max:MAX_TOUCHES})}</span>
     {hintN!==null&&<span className={css.count}>{tx('gl.hint.is',{n:hintN})}</span>}
    </div>
    <div className={css.pitchBox}><div className={css.pitchIn}>
     <GoalPitch layers={layers} ball={shownBall?.pt??null} lift={shownBall?.lift??0} goalHit={goalHit} interactive={building} armed={armed} active={active} cam={cam} shirtOf={shirtOf} labels={pitchLabels} contentLocale={contentLocale} onZone={tapZone} onToken={tapToken} onMove={dropToken}/>
    </div></div>
   </div>

   <div className={css.dock}>
    <p className={css.prompt} data-tone={warn?'warn':undefined} data-testid="goal-prompt">{prompt}</p>
    {building&&active===null&&<div className={css.wall}>
     <p className={css.wallHead}>{tx('gl.who')}</p>
     <GoalBench pool={g.pool} selected={actor} disabled={full} shirtOf={name=>shirtFor(name,'us')} unnamedShirt={unknownShirt} unnamed={unnamed} ariaOf={name=>tx('gl.benchAria',{name:name||unnamed})} listLabel={tx('gl.who')} contentLocale={contentLocale} onPick={name=>{setActor(a=>a===name?null:name);say('')}} onDrop={dropBench}/>
    </div>}
    {building&&<div className={css.what}>
     <p className={css.wallHead}>{active!==null?tx('gl.verb.edit',{n:active+1}):tx('gl.what')}</p>
     <VerbRow value={active!==null?draft[active]?.action??null:verb} label={verbWord} onPick={pickVerb} disabled={full&&active===null} listLabel={tx('gl.what')}/>
    </div>}
    <div className={css.actions}>
     {building
      ?(active!==null
        ?<><button type="button" className={`min-h-tap ${css.btn} ${css.btnWide}`} onClick={removeActive} data-testid="goal-remove">{tx('gl.remove')}</button>
          <button type="button" className={`min-h-tap ${css.btn} ${css.btnMain}`} onClick={()=>setActive(null)}>{tx('gl.done')}</button></>
        :<><button type="button" className={`min-h-tap ${css.btn}`} onClick={undo} disabled={!n} data-testid="goal-undo">{tx('gl.undo')}</button>
          <button type="button" className={`min-h-tap ${css.btn}`} onClick={hint} disabled={hinted||pending} data-testid="goal-hint">{hinted?tx('gl.hint.used'):tx('gl.hint',{cost:HINT_COST})}</button>
          <button type="button" className={`min-h-tap ${css.btn} ${css.btnMain}`} onClick={whistle} disabled={n<MIN_TOUCHES||pending} data-testid="goal-whistle">{pending?tx('gl.checking'):tx('gl.whistle')}<span aria-hidden="true">→</span></button></>)
      :replaying
       ?<><button type="button" className={`min-h-tap ${css.btn} ${css.btnWide}`} onClick={ball.paused?ball.resume:ball.pause} aria-pressed={ball.paused} data-testid="goal-pause">{ball.paused?tx('gl.play'):tx('gl.pause')}</button>
         <button type="button" className={`min-h-tap ${css.btn} ${css.btnMain}`} onClick={ball.skip} data-testid="goal-skip">{tx('gl.skip')} →</button></>
       :<><button type="button" className={`min-h-tap ${css.btn} ${css.btnWide}`} onClick={openSheet('result')} data-testid="goal-result-open">{tx('gl.result.open')}</button>
         <button type="button" className={`min-h-tap ${css.btn} ${css.btnMain}`} onClick={onNext} data-testid="goal-next">{pos<of-1?tx('gl.next'):tx('gl.finish')} →</button></>}
    </div>
    <p className={css.status} role="status" data-testid="goal-status">{err?copy.unavailable:notice}</p>
   </div>

   <aside className={css.info} aria-label={tx('gl.rules.title')}>
    <div className={css.infoCard}><h3>{tx('gl.rules.title')}</h3><ol className={css.rules}>{[1,2,3,4].map(i=><li key={i}>{tx(`gl.rules.${i}`)}</li>)}</ol></div>
   </aside>
  </div>

  <SlideSheet open={sheet==='info'} onClose={closeSheet} title={tx('gl.info')} closeLabel={copy['play.close']}>
   <div className={css.sheetBody}>
    <dl className={css.kv}><dt>{tx('gl.info.match')}</dt><dd lang={contentLocale} dir="auto">{g.title}</dd>{g.on&&<><dt>{tx('gl.info.date')}</dt><dd><bdi>{g.on}</bdi></dd></>}{g.competition&&<><dt>{tx('gl.info.competition')}</dt><dd lang={contentLocale} dir="auto">{g.competition}</dd></>}{g.score&&<><dt>{tx('gl.info.score')}</dt><dd><bdi>{g.score}</bdi></dd></>}</dl>
    <h3 className={css.fine}>{tx('gl.rules.title')}</h3>
    <ol className={css.rules}>{[1,2,3,4].map(i=><li key={i}>{tx(`gl.rules.${i}`)}</li>)}</ol>
    <p className={css.fine}>{tx('gl.approx')}</p>
   </div>
  </SlideSheet>

  <SlideSheet open={sheet==='result'&&verdict!==null} onClose={closeSheet} title={tx('gl.result.title')} size="full" closeLabel={copy['play.close']}
   footer={<div className={css.actionsGrid}>
    <button type="button" className={`min-h-tap ${css.btn} ${css.btnMain}`} onClick={()=>{setSheet(null);onNext()}} data-testid="goal-sheet-next">{pos<of-1?tx('gl.next'):tx('gl.finish')} →</button>
    <button type="button" className={`min-h-tap ${css.btn}`} onClick={closeSheet}>{tx('gl.result.review')}</button>
    {verdict&&<ShareComposer label={tx('gl.share')} draft={goalShare(club,{percent:Math.round(verdict.quality*100),goalId:g.id,zonePractice:true,forbidden:verdict.truth.flatMap(t=>t.actor?[t.actor]:[])})}/>}</div>}>
   {verdict&&<div className={css.sheetBody} data-testid="goal-result">
    <div className={css.score}>
     <p className={css.scoreKicker}>{tx('gl.result.kicker')} · <bdi lang={contentLocale}>{g.title}</bdi></p>
     <p className={css.scoreNum}>{Math.round(verdict.quality*100)}%</p>
     <p className={css.scoreLine}>{tx(`gl.tier.${tierOf(verdict.quality,verdict.perfect)}`)} · {tx(verdict.countRight?'gl.result.countRight':'gl.result.countWrong',{n:verdict.truth.length})}</p>
     <p className={css.scoreKicker}>{verdict.points}/{verdict.max} {tx('gl.result.points')}{verdict.hinted?` · ${tx('gl.result.hintCost',{cost:HINT_COST})}`:''}{verdict.extra>0?` · ${tx('gl.result.extraCost',{n:verdict.extra})}`:''}</p>
    </div>
    <ol className={css.rows} lang={contentLocale}>
     {verdict.truth.map((t,i)=>{
      const v=verdict.steps[i]!,mine=draft[i],mark=(ok:boolean)=><span className={css.markOk} data-ok={ok} aria-label={tx(ok?'gl.result.yes':'gl.result.no')}>{ok?'✓':'✗'}</span>
      return <li key={i}><b className={css.rowNo}>{i+1}</b><div>
       <span className={css.rowName} dir="auto">{t.actor||unnamed} · {verbWord(t.action)} · <span className={css.zoneCode}>{t.zone}</span></span>
       <span className={css.rowMeta}>{tx('gl.who')} {v.actor===null?<span className={css.markOk} data-ok="na" aria-label={tx('gl.result.na')}>–</span>:mark(v.actor)} · {tx('gl.what')} {mark(v.action)} · {tx('gl.where')} <span data-zone={v.zone}>{tx(`gl.zone.${v.zone}`)}</span></span>
       <span className={css.rowMine}>{mine?tx('gl.result.yours',{name:mine.actor||unnamed,verb:verbWord(mine.action),zone:mine.zone}):tx('gl.result.missing')}</span>
       {t.note&&<small className={css.rowNote} dir="auto">{t.note}</small>}
      </div></li>})}
     {draft.slice(verdict.truth.length).map((t,j)=><li key={`x${j}`} data-extra="true"><b className={css.rowNo}>{verdict.truth.length+j+1}</b><div><span className={css.rowMine}>{tx('gl.result.extra',{name:t.actor||unnamed,verb:verbWord(t.action),zone:t.zone})}</span></div></li>)}
    </ol>
    {verdict.narrative&&<p className={css.narrative} lang={contentLocale} dir="auto">{verdict.narrative}</p>}
    {verdict.sources.length>0&&<div><h3 className={css.fine}>{tx('gl.result.sources')}</h3>
     <ul className={css.sources}>{verdict.sources.map((s,i)=><li key={i}>{s.url?<a href={s.url} target="_blank" rel="noopener noreferrer">{s.title}</a>:s.title}</li>)}</ul></div>}
    <p className={css.fine}>{tx('gl.approx')}</p>
    <p className={css.status} role="status">{notice}</p>
   </div>}
  </SlideSheet>
 </>
}

// the verbs the board knows, for the catalogue test
export const GOAL_VERBS=REPLAY_ACTIONS
