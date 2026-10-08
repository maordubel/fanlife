'use client'
import {useEffect,useMemo,useRef,useState} from 'react'
import Link from 'next/link'
import {SlideSheet} from '@/components/stage/SlideSheet'
import {ShareComposer} from '@/components/share/v3/ShareComposer'
import {RecordRun} from '@/components/clubs/games/RecordRun'
import {firePickFxAt} from '@/components/stage/PickFx'
import {markStep,startVisit} from '@/lib/analytics/meter'
import {wallShare} from '@/lib/share/v3/adapters'
import {DUEL_COUNT,MAX_DAMAGE,choose,damageOf,dealWall,duelOf,endingOf,over,revenge,revengeChoices,startWall,streakOf,type Wall,type WallCandidate} from '@/lib/clubs/wall-engine'
import type {GameCopy} from '@/lib/clubs/game-copy'
import type {UiLocale} from '@/lib/clubs/locale'
import {makeT} from '../derby/ui'
import css from './rivalry.module.css'

type Phase='intro'|'duel'|'stamp'|'over'
const STAMP_MS=520

/**
 * Gate 11 · The wall (HW-R01..R07) — eight duels between two names; you keep one and the other is torn down.
 * A fan preference, never a correct answer: nothing is graded, nothing is scored, and the ending prints no "hate score".
 */
export function ClubWall({club,clubName,version,seed,cursor,locale,contentLocale,copy,candidates,playUrl,testMode=false,fixture=false}:{club:string;clubName:string;version:string;seed:number;cursor:number;locale:UiLocale;contentLocale:string;copy:GameCopy;candidates:WallCandidate[];playUrl:string;testMode?:boolean;/** the dev-only QA board: synthetic names, shared under a real club's frame, never recorded */fixture?:boolean}){
 const t=useMemo(()=>makeT(copy),[copy])
 const deal=useMemo(()=>dealWall(candidates,seed,cursor),[candidates,seed,cursor])
 const byId=useMemo(()=>new Map(candidates.map(c=>[c.id,c])),[candidates])
 const [phase,setPhase]=useState<Phase>('intro'),[wall,setWall]=useState<Wall|null>(null),[history,setHistory]=useState<Wall[]>([]),[kept,setKept]=useState<string|null>(null),[sheet,setSheet]=useState(false)
 const timer=useRef<number|null>(null),startRef=useRef<HTMLButtonElement>(null)
 useEffect(()=>{startVisit()},[club])
 useEffect(()=>()=>{if(timer.current)window.clearTimeout(timer.current)},[])
 if(!deal)return null
 const name=(id:string)=>byId.get(id)?.name??id
 const curated=deal.curated

 const begin=()=>{setWall(startWall(deal));setHistory([]);setPhase('duel');markStep(1)}
 const pick=(winner:string,el:Element|null)=>{
  if(!wall||phase!=='duel')return
  const next=choose(wall,winner)
  if(next===wall)return
  firePickFxAt(el,{tone:'red',haptic:'lock'})
  setHistory(h=>[...h,wall]);setWall(next);setKept(winner)
  const finish=()=>{setKept(null);setPhase(over(next)?'over':'duel');markStep(next.picks.length+1)}
  if(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches||testMode){finish();return}
  setPhase('stamp');timer.current=window.setTimeout(finish,STAMP_MS)
 }
 const skipStamp=()=>{if(phase==='stamp'){if(timer.current)window.clearTimeout(timer.current);setKept(null);setPhase(wall&&over(wall)?'over':'duel')}}
 const undo=()=>{const back=history[history.length-1];if(!back)return;setHistory(h=>h.slice(0,-1));setWall(back);setPhase('duel');setKept(null)}
 const bringBack=(id:string)=>{if(!wall)return;setHistory(h=>[...h,wall]);setWall(revenge(wall,id));setSheet(false)}

 if(phase==='intro'||!wall)return <section className={css.card} data-testid="wall-intro" data-curated={curated}>
  <p className={css.kicker}>{t('derby.w.kicker',{club:clubName})}</p>
  <h2 className={css.h2}>{t('derby.w.title')}</h2>
  <p className={css.body}>{t('derby.w.intro',{n:DUEL_COUNT})}</p>
  <ul className={css.facts}>
   <li>{t('derby.w.rule.keep')}</li>
   <li>{t('derby.w.rule.special')}</li>
   <li>{t('derby.w.rule.revenge')}</li>
   <li>{t('derby.w.rule.noScore')}</li>
  </ul>
  <p className={css.fine}>{curated?t('derby.w.curated'):t('derby.w.notRanked')}</p>
  <button ref={startRef} type="button" className={`${css.cta} min-h-tap`} data-testid="wall-start" onClick={begin}>{t('derby.w.start')}</button>
 </section>

 if(phase==='over'){
  const end=endingOf(candidates,wall,seed,cursor)
  if(!end)return null
  return <section className={css.card} data-testid="wall-result" aria-live="polite">
   {!fixture&&<RecordRun club={club} gate="derby" run={`derby:wall:${version}:${seed}:${cursor}`} score={0}/>}
   <p className={css.kicker}>{t('derby.w.end.kicker')}</p>
   <div className={css.final} data-damage={damageOf(end.streak)}>
    <small>{t('derby.w.end.holder')}</small>
    <b lang={contentLocale} dir="auto"><bdi>{end.holder.name}</bdi></b>
    <span className={css.pips} aria-label={t('derby.w.streak',{n:end.streak})}>{Array.from({length:MAX_DAMAGE},(_,i)=><i key={i} data-on={i<damageOf(end.streak)}/>)}</span>
   </div>
   <h3 className={css.h3}>{t('derby.w.end.choices',{n:end.choices.length})}</h3>
   <ol className={css.choices}>
    {end.choices.map(c=><li key={c.round} data-special={c.noMercy} data-revenge={c.revenge}><small>{t('derby.w.round',{n:c.round})}{c.noMercy?` · ${t('derby.w.special')}`:''}{c.revenge?` · ${t('derby.w.revengeTag')}`:''}</small><span lang={contentLocale} dir="auto"><b><bdi>{c.winner.name}</bdi></b> <em>{t('derby.w.over')}</em> <bdi>{c.loser.name}</bdi></span></li>)}
   </ol>
   <p className={css.fine}>{end.revengeUsed&&end.revengePick?t('derby.w.end.revengeUsed',{name:end.revengePick.name}):t('derby.w.end.revengeUnused')}</p>
   {end.editorsPick&&<p className={css.fine}>{t('derby.w.end.editors',{name:end.editorsPick.name})}</p>}
   <p className={css.fine} data-testid="wall-code">{t('derby.w.end.code',{code:end.code})} {t('derby.w.end.local')}</p>
   <p className={css.fine}>{t('derby.w.end.preference')}</p>
   <div className={css.actions}>
    <ShareComposer draft={wallShare(fixture?'hapoel-tel-aviv':club,{holder:end.holder.name,rounds:end.choices.length,revenge:end.revengeUsed})}/>
    <Link prefetch={false} className={css.cta} href={playUrl}>{t('derby.w.again')}</Link>
   </div>
  </section>
 }

 const duel=duelOf(wall)
 if(!duel)return null
 const damage=damageOf(streakOf(wall)),choices=revengeChoices(wall)
 const holder=byId.get(duel.holder),challenger=byId.get(duel.challenger)
 if(!holder||!challenger)return null
 const poster=(c:WallCandidate,role:'holder'|'challenger')=>{
  const win=kept===c.id,out=kept!==null&&!win
  return <button type="button" key={c.id} className={`${css.poster} min-h-tap`} data-role={role} data-damage={role==='holder'?damage:0} data-state={win?'kept':out?'out':'idle'} data-testid={`wall-${role}`} data-candidate={c.id} disabled={phase==='stamp'} aria-label={t('derby.w.keep',{name:c.name})} onClick={e=>pick(c.id,e.currentTarget)}>
   <small>{role==='holder'?t('derby.w.onWall'):duel.revenge?t('derby.w.revengeTag'):t('derby.w.nextUp')}</small>
   <b lang={contentLocale} dir="auto"><bdi>{c.name}</bdi></b>
   {c.note&&<em lang={contentLocale} dir="auto"><bdi>{c.note}</bdi></em>}
   {role==='holder'&&damage>0&&<span className={css.pips} aria-hidden="true">{Array.from({length:MAX_DAMAGE},(_,i)=><i key={i} data-on={i<damage}/>)}</span>}
   <span className={css.keep}>{t('derby.w.keepShort')}</span>
   {win&&<span className={css.stamp} data-k="kept" aria-hidden="true">{t('derby.w.kept')}</span>}
   {out&&<span className={css.stamp} data-k="out" aria-hidden="true">{t('derby.w.torn')}</span>}
  </button>
 }
 return <section className={css.duelWrap} data-testid="wall-duel" data-round={duel.round} data-phase={phase} onClick={skipStamp}>
  <div className={css.hud}>
   <ol className={css.rounds} aria-label={t('derby.w.progress',{n:duel.round,total:DUEL_COUNT})}>{Array.from({length:DUEL_COUNT},(_,i)=><li key={i} data-done={i<wall.picks.length} data-now={i===wall.picks.length}/>)}</ol>
   <p className={css.status}>{t('derby.w.progress',{n:duel.round,total:DUEL_COUNT})}</p>
  </div>
  {duel.noMercy&&<p className={css.banner} role="status" data-testid="wall-special">{curated?t('derby.w.special.curated'):t('derby.w.special.plain')}</p>}
  <div className={css.duel}>
   {poster(holder,'holder')}
   <span className={css.vsTape} aria-hidden="true">{t('derby.vs')}</span>
   {poster(challenger,'challenger')}
  </div>
  <div className={css.tools}>
   <button type="button" className={`${css.ghost} min-h-tap`} data-testid="wall-revenge" disabled={choices.length===0||phase==='stamp'} onClick={()=>setSheet(true)}>{wall.revengeUsed?t('derby.w.revenge.used'):t('derby.w.revenge',{n:choices.length})}</button>
   <button type="button" className={`${css.ghost} min-h-tap`} data-testid="wall-undo" disabled={history.length===0||phase==='stamp'} onClick={undo}>{t('derby.w.undo')}</button>
  </div>
  <p className={css.fine}>{t('derby.w.noScore')}</p>
  <SlideSheet open={sheet} onClose={()=>setSheet(false)} title={t('derby.w.revenge.title')} closeLabel={copy['play.close']}>
   <p className={css.fine}>{t('derby.w.revenge.body',{n:choices.length})}</p>
   <ul className={css.list}>{choices.map(id=><li key={id}><button type="button" className={`${css.listBtn} min-h-tap`} data-testid="wall-revenge-pick" onClick={()=>bringBack(id)}><bdi lang={contentLocale} dir="auto">{name(id)}</bdi></button></li>)}</ul>
  </SlideSheet>
 </section>
}
