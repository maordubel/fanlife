'use client'
import {useEffect,useMemo,useRef,useState} from 'react'
import Link from 'next/link'
import {ShareComposer} from '@/components/share/v3/ShareComposer'
import {RecordRun} from '@/components/clubs/games/RecordRun'
import {firePickFxAt} from '@/components/stage/PickFx'
import {markStep,startVisit} from '@/lib/analytics/meter'
import {threadShare} from '@/lib/share/v3/adapters'
import {charge,costsIntegrity,exhausted,ruleStates,TIER_SHAPE,type Action,type Ledger,type MoveVerdict,type NodeType,type PublicCard,type PublicLevel,type RuleKey} from '@/lib/clubs/thread-engine'
import type {GameCopy} from '@/lib/clubs/game-copy'
import type {UiLocale} from '@/lib/clubs/locale'
import {makeT} from '../derby/ui'
import {threadClose,threadMove,threadReveal,type CloseAnswer,type ClosedView,type EdgeView,type FailAnswer} from './thread-actions'
import css from './threadgame.module.css'

type Phase='intro'|'play'|'closed'|'failed'|'done'
type Notice={kind:'move';reason:MoveVerdict;costs:boolean}|{kind:'close';reason:string}|{kind:'net';offline:boolean}|null
type Closed=Extract<NonNullable<CloseAnswer>,{ok:true}>
const fresh=(l:PublicLevel):Ledger=>({integrity:l.integrity,seen:[]})

/**
 * Gate 13 · The Thread (TH-R01..R12) — connect the start card to the end card with documented links, one stop at a time.
 * The browser holds cards and rules only: no edge, no optimum, no route. Each stop is asked of the server; a legal
 * stop reveals its link and its sources, an illegal one only says why (and whether it cost integrity).
 * Tap a card to add it as the next stop; Undo takes the last stop back. Nothing is timed and nothing is dragged.
 */
export function ThreadGame({club,clubName,slug,version,seed,cursor,locale,contentLocale,copy,levels,mode,missingTiers,playUrl,fixture=false}:{club:string;clubName:string;slug:string;version:string;seed:number;cursor:number;locale:UiLocale;contentLocale:string;copy:GameCopy;levels:PublicLevel[];mode:'practice'|'full';missingTiers:number[];playUrl:string;fixture?:boolean}){
 const t=useMemo(()=>makeT(copy),[copy])
 const [phase,setPhase]=useState<Phase>('intro'),[li,setLi]=useState(0)
 const [path,setPath]=useState<string[]>([]),[edges,setEdges]=useState<Record<string,EdgeView>>({}),[ledger,setLedger]=useState<Ledger>(()=>levels[0]?fresh(levels[0]):{integrity:0,seen:[]}),[attempts,setAttempts]=useState<Action[]>([])
 const [notice,setNotice]=useState<Notice>(null),[pending,setPending]=useState(false)
 const [closed,setClosed]=useState<Closed|null>(null),[fail,setFail]=useState<NonNullable<FailAnswer>|null>(null)
 const [marks,setMarks]=useState<boolean[]>([]),[points,setPoints]=useState(0)
 const level=levels[li],retry=useRef<(()=>void)|null>(null),nextRef=useRef<HTMLButtonElement>(null)
 useEffect(()=>{startVisit()},[])
 useEffect(()=>{if(phase==='closed'||phase==='failed')nextRef.current?.focus()},[phase])
 const cards=useMemo(()=>{const m=new Map<string,PublicCard>();if(level){m.set(level.start.id,level.start);m.set(level.end.id,level.end);for(const c of level.hand)m.set(c.id,c)}return m},[level])
 if(!level)return <section className={css.card} data-testid="thread-empty"><h2 className={css.h2}>{t('th.title')}</h2><p className={css.body}>{t('th.empty')}</p></section>
 const typeOf=(id:string):NodeType|null=>cards.get(id)?.type??null
 const full=mode==='full'

 const reset=(next:number)=>{const l=levels[next];if(!l)return;setLi(next);setPath([]);setEdges({});setAttempts([]);setLedger(fresh(l));setNotice(null);setClosed(null);setFail(null);setPending(false);setPhase('play')}
 const net=(e:unknown)=>{void e;setNotice({kind:'net',offline:typeof navigator!=='undefined'&&navigator.onLine===false});setPending(false)}

 const lose=(nextLedger:Ledger,nextAttempts:Action[])=>{
  if(!exhausted(nextLedger))return
  threadReveal(slug,version,seed,level.ref,nextAttempts).then(r=>{if(r){setFail(r);setMarks(m=>[...m,false]);setPhase('failed')}else net(null)}).catch(net)
 }
 const add=(card:PublicCard,el:Element|null)=>{
  if(phase!=='play'||pending||exhausted(ledger))return
  if(path.includes(card.id))return
  if(path.length>=level.rules.maxStops){setNotice({kind:'move',reason:'full',costs:false});return}
  const here=path
  setPending(true);setNotice(null);retry.current=()=>add(card,el)
  threadMove(slug,version,seed,level.ref,here,card.id).then(r=>{
   setPending(false)
   if(!r){net(null);return}
   if(r.ok){
    firePickFxAt(el,{tone:'red',haptic:'lock'})
    setPath(p=>p.length===here.length?[...p,card.id]:p);setEdges(e=>({...e,[card.id]:r.edge}));markStep(here.length+1+li*10)
    return
   }
   const costs=costsIntegrity(r.reason)
   setNotice({kind:'move',reason:r.reason,costs})
   if(costs){
    firePickFxAt(el,{tone:'sign',haptic:'miss'})
    const nextAttempts=[...attempts,{path:here,card:card.id}]
    const nextLedger=charge(ledger,here,card.id,r.reason)
    setAttempts(nextAttempts);setLedger(nextLedger);lose(nextLedger,nextAttempts)
   }
  }).catch(net)
 }
 const undo=()=>{if(pending||path.length===0||phase!=='play')return;const last=path[path.length-1] as string;setPath(p=>p.slice(0,-1));setEdges(e=>{const c={...e};delete c[last];return c});setNotice(null)}
 const close=()=>{
  if(phase!=='play'||pending)return
  setPending(true);setNotice(null);retry.current=close
  threadClose(slug,version,seed,level.ref,path,attempts).then(r=>{
   setPending(false)
   if(!r){net(null);return}
   if(r.ok){setClosed(r);setPoints(p=>p+r.score);setMarks(m=>[...m,true]);setPhase('closed');return}
   if(r.exhausted){lose({integrity:0,seen:[]},attempts);return}
   setNotice({kind:'close',reason:r.reason})
  }).catch(net)
 }
 const advance=()=>{if(li+1>=levels.length){setPhase('done');return}reset(li+1)}

 const label=(c:PublicCard)=><><b lang={contentLocale} dir="auto"><bdi>{c.name}</bdi></b><small>{t(`th.type.${c.type}`)}{c.years?<> · <bdi>{c.years}</bdi></>:null}</small></>
 const edgeLine=(e:{kind:string;sources:{title:string;url:string|null;publisher:string}[]})=><span className={css.link}><i>{e.kind}</i>{e.sources.map((s,k)=>s.url?<a key={k} href={s.url} target="_blank" rel="noreferrer noopener"><bdi>{s.title}</bdi></a>:<bdi key={k}>{s.title}</bdi>)}</span>
 const routeList=(rows:ClosedView[])=><ol className={css.proof} data-testid="thread-proof">{rows.map((r,k)=><li key={k}><span className={css.pair}><bdi lang={contentLocale} dir="auto">{r.from.name}</bdi> → <bdi lang={contentLocale} dir="auto">{r.to.name}</bdi></span>{edgeLine(r)}</li>)}</ol>
 const ruleText=(r:RuleKey)=>r.key==='stops'?t(r.exact?'th.rule.stops.exact':'th.rule.stops',{n:r.n}):r.key==='type'?t('th.rule.type',{type:t(`th.type.${r.type}`)}):r.key==='pass'?t('th.rule.pass',{name:level.passNames[r.id]??r.id}):r.key==='time'?t(`th.rule.time.${r.mode}`):t('th.rule.noConsecutive')
 const heading=`${t('th.tier',{n:level.tier})} · ${t('th.level',{n:li+1,total:levels.length})}`

 if(phase==='intro')return <section className={css.card} data-testid="thread-intro" data-mode={mode}>
  <p className={css.kicker}>{t('th.kicker',{club:clubName})}</p>
  <h2 className={css.h2}>{t('th.title')}</h2>
  <p className={css.body}>{t('th.intro')}</p>
  <ul className={css.facts}>
   <li>{t('th.rule.links')}</li>
   <li>{t('th.rule.integrity')}</li>
   <li>{t('th.rule.close')}</li>
   <li>{t('th.rule.tap')}</li>
  </ul>
  <p className={css.tag} data-testid="thread-mode">{full?t('th.mode.full',{n:levels.length}):t('th.mode.practice',{n:levels.length})}</p>
  {!full&&<p className={css.fine}>{t('th.mode.why',{n:levels.length,missing:missingTiers.join(', ')})}</p>}
  <ol className={css.tiers}>{levels.map(l=><li key={l.ref}><b>{t('th.tier',{n:l.tier})}</b><span>{t('th.tier.shape',{stops:TIER_SHAPE[l.tier].stops,integrity:l.integrity})}</span></li>)}</ol>
  <button type="button" className={css.cta} data-testid="thread-start" onClick={()=>reset(0)}>{t('th.start')}</button>
 </section>

 if(phase==='done'){
  const n=marks.filter(Boolean).length
  return <section className={css.card} data-testid="thread-result" aria-live="polite">
   {!fixture&&<RecordRun club={club} gate="timeline" run={`thread:${full?'full':'practice'}${levels.length}:${version}:${seed}:${cursor}`} score={points}/>}
   <p className={css.kicker}>{full?t('th.res.full'):t('th.res.practice')}</p>
   <h2 className={css.h2}>{t('th.res.line',{closed:n,total:levels.length})}</h2>
   <ol className={css.marks} aria-label={t('th.res.line',{closed:n,total:levels.length})}>{marks.map((m,k)=><li key={k} data-ok={m}><span aria-hidden="true">{m?'✓':'×'}</span><span className="sr-only">{m?t('th.res.closed'):t('th.res.torn')}</span></li>)}</ol>
   <p className={css.fine}>{t('th.res.points',{n:points})}</p>
   <div className={css.actions}>
    <ShareComposer draft={threadShare(fixture?'hapoel-tel-aviv':club,{seed,cursor,closed:n,total:levels.length,marks,full})}/>
    <Link prefetch={false} className={css.cta} href={playUrl}>{t('th.res.again')}</Link>
   </div>
  </section>
 }

 if(phase==='closed'&&closed)return <section className={css.card} data-testid="thread-closed" aria-live="polite">
  <p className={css.kicker}>{heading}</p>
  <h2 className={css.h2}>{t('th.closed.title')}</h2>
  <p className={css.body}>{t('th.closed.line',{stops:closed.stops,optimum:closed.optimum})}</p>
  <p className={css.tag}>{t('th.closed.score',{n:closed.score})}</p>
  {routeList(closed.edges)}
  <button ref={nextRef} type="button" className={css.cta} data-testid="thread-next" onClick={advance}>{li+1>=levels.length?t('th.finish'):t('th.next')}</button>
 </section>

 if(phase==='failed'&&fail)return <section className={css.card} data-testid="thread-failed" aria-live="polite">
  <p className={css.kicker}>{heading}</p>
  <h2 className={css.h2}>{t('th.failed.title')}</h2>
  <p className={css.body}>{t('th.failed.line',{optimum:fail.optimum})}</p>
  {routeList(fail.edges)}
  <button ref={nextRef} type="button" className={css.cta} data-testid="thread-next" onClick={advance}>{li+1>=levels.length?t('th.finish'):t('th.next')}</button>
 </section>

 const states=ruleStates(level.rules,path,typeOf,{start:level.start.id,end:level.end.id})
 const msg=notice?.kind==='move'?t(`th.move.${notice.reason}`)+(notice.costs?` ${t('th.move.cost')}`:` ${t('th.move.free')}`):notice?.kind==='close'?t(`th.close.${notice.reason}`):notice?.kind==='net'?(notice.offline?t('th.offline'):t('th.err')):''
 return <section className={css.game} data-testid="thread-play" data-tier={level.tier} data-pending={pending}>
  <div className={css.hud}>
   <p className={css.status}>{heading}</p>
   <span className={css.integrity} role="img" aria-label={t('th.integrity',{n:ledger.integrity,max:level.integrity})} data-testid="thread-integrity" data-n={ledger.integrity}>
    {Array.from({length:level.integrity},(_,k)=><i key={k} data-on={k<ledger.integrity}/>)}
   </span>
  </div>
  <p className={css.goal}>{t('th.goal',{from:level.start.name,to:level.end.name})}</p>
  <ul className={css.rules} aria-label={t('th.rules')}>{states.map((s,k)=><li key={k} data-met={s.met} data-testid="thread-rule"><span aria-hidden="true">{s.met?'✓':'○'}</span> {ruleText(s.rule)}<span className="sr-only"> — {s.met?t('th.rule.met'):t('th.rule.open')}</span></li>)}</ul>
  <div className={css.main}>
   <div className={css.routeCol}>
  <ol className={css.rail} aria-label={t('th.route')} data-testid="thread-route">
   <li data-end="true" className={css.stop}>{label(level.start)}</li>
   {path.map(id=>{const c=cards.get(id)!;return <li key={id} className={css.stop} data-testid="thread-stop">{edges[id]&&<span className={css.tie}>{edges[id]!.kind}</span>}{label(c)}</li>})}
   <li className={css.slot} aria-hidden="true">{t('th.slot',{n:path.length+1})}</li>
   <li data-end="true" className={css.stop}>{label(level.end)}</li>
  </ol>
  <p className={css.say} role={notice&&notice.kind!=='move'?'alert':'status'} data-testid="thread-notice">{pending?t('th.checking'):msg}</p>
  {notice?.kind==='net'&&<button type="button" className={css.ghost} onClick={()=>retry.current?.()}>{t('th.retry')}</button>}
   </div>
   <div className={css.handCol}>
  <ul className={css.hand} aria-label={t('th.hand')}>
   {level.hand.map(c=>{const used=path.includes(c.id);return <li key={c.id}><button type="button" className={css.card2} data-type={c.type} data-used={used} disabled={used||pending} data-testid="thread-card" data-card={c.id} onClick={e=>add(c,e.currentTarget)}>{label(c)}</button></li>})}
  </ul>
  <div className={css.tools}>
   <button type="button" className={css.ghost} data-testid="thread-undo" disabled={path.length===0||pending} onClick={undo}>{t('th.undo')}</button>
   <button type="button" className={css.cta} data-testid="thread-close" disabled={pending} onClick={close}>{t('th.close')}</button>
  </div>
   </div>
  </div>
  <p className={css.fine}>{full?t('th.mode.full',{n:levels.length}):t('th.mode.practice',{n:levels.length})}</p>
 </section>
}
