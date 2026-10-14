'use client'
import Link from 'next/link'
import {useMemo} from 'react'
import type {MemoryVerdict} from '@/lib/game/memory-run'
import type {GameCopy} from '@/lib/clubs/game-copy'
import type {UiLocale} from '@/lib/clubs/locale'
import {clockOf,memoryQuery,verdictKey,type MemoryPlan,type MemoryResult,type PublicPair} from '@/lib/clubs/memory-model'
import type {BoardLabel,MemSize} from '@/lib/clubs/memory-solver'
import type {Best} from '@/lib/clubs/memory-best'
import {ShareComposer} from '@/components/share/v3/ShareComposer'
import {memoryShare,type ShareDraft} from '@/lib/share/v3/adapters'
import {ObjectMark} from '@/components/memory/ObjectMark'
import {Num} from '@/components/ui/Num'
import {Face,RevealLines,type RevealState,type T} from './MemoryParts'
import {modeLabel} from './MemoryReady'
import css from './memory.module.css'
import {Plate} from '@/components/weekly/Plate'
import {sharedGate} from '@/lib/clubs/gates'

/**
 * The share draft for a finished wall. The big number is the BEST STREAK — the recorded score (ME-R10) — with moves,
 * misses and pairs beside it as their own facts; the link deals the SAME wall (seed, cursor, size, theme), and a date
 * wall says so, because a card that read "6 pairs" for a six-event date list would claim a variety it did not have.
 */
export function memoryDraft(input:{club:string;seed:number;cursor:number;size:MemSize;theme:string|null;result:MemoryResult;perfect:boolean[];label:BoardLabel}):ShareDraft{
 const {club,seed,cursor,size,theme,result,perfect,label}=input
 const base=memoryShare(club,{seed,cursor,moves:result.moves,pairs:size})
 const link=new URL(base.data.link)
 link.searchParams.set('size',String(size))
 if(theme)link.searchParams.set('theme',theme)
 const mode=`${size} pairs · ${result.hinted?'hinted':'unhinted'}${label==='date'?' · date memory':label==='narrow'?' · narrow wall':''}`
 return {...base,data:{...base.data,
  main:String(result.bestStreak),label:`BEST STREAK · ${size} PAIRS`,cta:'Same wall. A longer streak?',
  rows:Array.from({length:Math.min(6,size)},(_,i)=>`${String(i+1).padStart(2,'0')}${perfect[i]?' ✓':''}`),
  detail:`${mode} · ${result.moves} moves · ${result.misses} misses`,
  statement:`I found every pair. My best streak was ${result.bestStreak}.`,link:link.href}}
}

type Props={home?:string;
 t:T;copy:GameCopy;club:string;clubName:string;locale:UiLocale;contentLocale:string;seed:number;cursor:number
 plan:MemoryPlan;result:MemoryResult;verdict:MemoryVerdict;label:BoardLabel;pairs:PublicPair[];perfectIds:readonly string[]
 reveals:Record<string,RevealState>;onRetry:(pair:string)=>void;best:Best|undefined;improved:boolean;shelfCount:number;onShelf:()=>void;peek:boolean
}

/** The closing screen: a verdict read from the run's own counters, the numbers kept apart, the wall you built with its sources, and the next door already open. */
export function MemoryReport(p:Props){
 const {t,copy,club,clubName,locale,contentLocale,seed,cursor,plan,result,verdict,label,pairs,perfectIds,reveals,best,improved}=p
 const size=plan.selected.size,theme=plan.selected.theme
 const draft=useMemo(()=>p.home?null:memoryDraft({club,seed,cursor,size,theme,result,perfect:pairs.map(x=>perfectIds.includes(x.id)),label}),[p.home,club,seed,cursor,size,theme,result,pairs,perfectIds,label])
 const again=`?${memoryQuery({seed,cursor:cursor+1,lang:locale,go:true,size,theme,peek:p.peek})}`
 const other=(()=>{
  const open=plan.sizes.filter(s=>s.available&&s.size!==size).map(s=>s.size)
  const up=open.filter(s=>s>size).sort((a,b)=>a-b)[0],down=open.filter(s=>s<size).sort((a,b)=>b-a)[0]
  return verdict==='flawless'||verdict==='sharp'?(up??down):(down??up)
 })()
 const gateNo=String(sharedGate('memory')?.number??6).padStart(2,'0')
 return <section className={css.result} data-testid="memory-result" data-verdict={verdict} data-shout="Full time!" data-category={result.category} data-label={label}>
  <div className={`wk-panel wk-lift wk-sky ${css.resultHead}`}>
   <span className="wk-speed" aria-hidden="true" style={{['--sx' as string]:'74%',['--sy' as string]:'34%'}}/>
   <Plate art="friends" ink="club" className={css.resultArt}/>
   <p className={`wk-banner ${css.readyKicker}`}>{clubName} · {t('mem.result.kicker')}</p>
   <h2 className={`wk-logo red ${css.resultTitle}`}>{t(verdictKey(verdict))}</h2>
   <div className={`wk-burst ${css.resultBurst}`}><p className={css.resultScore} data-testid="memory-score"><span className="sr-only">{t('mem.result.streak')}: </span><b className="wk-num">{result.score}</b></p><small>{t('mem.result.streak')}</small></div>
   <div className={`wk-cap white ${css.resultCap}`}>
    <p className={css.resultLine} data-testid="memory-category">{modeLabel(t,size,result.hinted)}{label==='date'?` · ${t('mem.label.dateShort')}`:label==='narrow'?` · ${t('mem.label.narrowShort')}`:''}{theme?` · ${t('mem.theme.decade',{d:Number(theme.slice(1))})}`:''}</p>
    <p className={css.resultLine}>{t('mem.result.recorded')}</p>
    <p className={css.resultLine} data-testid="memory-best-line">{improved?t('mem.result.newBest',{mode:modeLabel(t,size,result.hinted)}):best?t('mem.best.have',{n:best.score,mode:modeLabel(t,size,result.hinted)}):''}</p>
   </div>
  </div>
  <div className={css.resultMid}>
   <ul className={`wk-night ${css.facts}`}>
    <li><b className="wk-lamp"><Num>{result.moves}</Num></b>{copy.flips}</li>
    <li><b className="wk-lamp red"><Num>{result.misses}</Num></b>{t('mem.result.misses')}</li>
    <li><b className="wk-lamp"><Num>{result.pairs}</Num></b>{t('mem.result.pairs')}</li>
    <li><b className="wk-lamp"><Num>{result.perfect}</Num></b>{t('mem.result.perfect')}</li>
    <li><b className="wk-lamp"><Num>{clockOf(result.seconds)}</Num></b>{t('mem.result.time')}</li>
    <li><b className="wk-lamp"><Num>{p.shelfCount}</Num></b>{t('mem.shelf')}</li>
   </ul>
   <div className={css.card2}>
    <h3 className="wk-logo red sm wk-tilt">{t('mem.result.mural')}</h3>
    <ol className={css.mural}>{pairs.map(x=><li key={x.id} lang={contentLocale} dir="auto" data-perfect={perfectIds.includes(x.id)||undefined}>
     <span className={css.plateIcon}><ObjectMark object={x.object} className={css.obj}/></span>
     <div><p className={css.plateFaces}><b><Face value={x.a} locale={locale}/></b> <span aria-hidden="true">↔</span> <b><Face value={x.b} locale={locale}/></b></p>
      <RevealLines t={t} copy={copy} state={reveals[x.id]} locale={locale} contentLocale={contentLocale} onRetry={()=>p.onRetry(x.id)}/></div>
    </li>)}</ol>
    <p className={css.fine}>{copy.localOnly}</p>
   </div>
  </div>
  <div className={css.actions}>
   {draft&&<div className={css.shareBox}><ShareComposer label={t('mem.result.share')} draft={draft}/></div>}
   {other&&<Link className={css.cta} data-kind="plain" href={`?${memoryQuery({seed,cursor:cursor+1,lang:locale,go:true,size:other as MemSize,theme,peek:p.peek})}`}><span>{t('mem.result.trySize',{n:other})}</span><span aria-hidden="true">→</span></Link>}
   <button type="button" className={`min-h-tap ${css.cta}`} data-kind="plain" onClick={p.onShelf}><span>{t('mem.result.shelf')}</span><span aria-hidden="true">→</span></button>
   {!p.home&&<Link className={css.cta} data-kind="plain" href={`/clubs/${club}/archive?lang=${locale}`}><span>{copy['gate.archive']}</span><span aria-hidden="true">→</span></Link>}
   {p.home?<Link className={css.cta} data-kind="plain" href={p.home}><span>Back to ALL FOOTBALL</span><span aria-hidden="true">→</span></Link>:<Link className={css.cta} data-kind="plain" href={`/clubs/${club}?lang=${locale}`}><span>{copy.backToClub}</span><span aria-hidden="true">→</span></Link>}
   <Link className={`wk-kick ${css.again}`} data-kind="lit" href={again} data-testid="memory-again"><span className="wk-kick-gate" aria-hidden="true"><small>{copy.ticketGate}</small><b>{gateNo}</b></span><span className="wk-kick-go"><span className="wk-speed" aria-hidden="true" style={{['--sx' as string]:'100%',['--sy' as string]:'50%'}}/><span>{copy.replay}</span><svg viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="17" className="wga-ball-fill"/><path d="M20 11l7 5-3 8h-8l-3-8z" className="wga-ball-ink"/></svg></span></Link>
  </div>
 </section>
}
