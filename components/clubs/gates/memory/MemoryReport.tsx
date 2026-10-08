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

type Props={
 t:T;copy:GameCopy;club:string;clubName:string;locale:UiLocale;contentLocale:string;seed:number;cursor:number
 plan:MemoryPlan;result:MemoryResult;verdict:MemoryVerdict;label:BoardLabel;pairs:PublicPair[];perfectIds:readonly string[]
 reveals:Record<string,RevealState>;onRetry:(pair:string)=>void;best:Best|undefined;improved:boolean;shelfCount:number;onShelf:()=>void;peek:boolean
}

/** The closing screen: a verdict read from the run's own counters, the numbers kept apart, the wall you built with its sources, and the next door already open. */
export function MemoryReport(p:Props){
 const {t,copy,club,clubName,locale,contentLocale,seed,cursor,plan,result,verdict,label,pairs,perfectIds,reveals,best,improved}=p
 const size=plan.selected.size,theme=plan.selected.theme
 const draft=useMemo(()=>memoryDraft({club,seed,cursor,size,theme,result,perfect:pairs.map(x=>perfectIds.includes(x.id)),label}),[club,seed,cursor,size,theme,result,pairs,perfectIds,label])
 const again=`?${memoryQuery({seed,cursor:cursor+1,lang:locale,go:true,size,theme,peek:p.peek})}`
 const other=(()=>{
  const open=plan.sizes.filter(s=>s.available&&s.size!==size).map(s=>s.size)
  const up=open.filter(s=>s>size).sort((a,b)=>a-b)[0],down=open.filter(s=>s<size).sort((a,b)=>b-a)[0]
  return verdict==='flawless'||verdict==='sharp'?(up??down):(down??up)
 })()
 return <section className={css.result} data-testid="memory-result" data-verdict={verdict} data-category={result.category} data-label={label}>
  <div className={css.resultHead}>
   <p className={css.readyKicker}>{clubName} · {t('mem.result.kicker')}</p>
   <h2 className={css.resultTitle}>{t(verdictKey(verdict))}</h2>
   <p className={css.resultScore} data-testid="memory-score"><span className="sr-only">{t('mem.result.streak')}: </span>{result.score}</p>
   <p className={css.resultLine}>{t('mem.result.recorded')}</p>
   <p className={css.resultLine} data-testid="memory-category">{modeLabel(t,size,result.hinted)}{label==='date'?` · ${t('mem.label.dateShort')}`:label==='narrow'?` · ${t('mem.label.narrowShort')}`:''}{theme?` · ${t('mem.theme.decade',{d:Number(theme.slice(1))})}`:''}</p>
   <ul className={css.facts}>
    <li><b><Num>{result.moves}</Num></b>{copy.flips}</li>
    <li><b><Num>{result.misses}</Num></b>{t('mem.result.misses')}</li>
    <li><b><Num>{result.pairs}</Num></b>{t('mem.result.pairs')}</li>
    <li><b><Num>{result.perfect}</Num></b>{t('mem.result.perfect')}</li>
    <li><b><Num>{clockOf(result.seconds)}</Num></b>{t('mem.result.time')}</li>
    <li><b><Num>{p.shelfCount}</Num></b>{t('mem.shelf')}</li>
   </ul>
   <p className={css.resultLine} data-testid="memory-best-line">{improved?t('mem.result.newBest',{mode:modeLabel(t,size,result.hinted)}):best?t('mem.best.have',{n:best.score,mode:modeLabel(t,size,result.hinted)}):''}</p>
  </div>
  <div className={css.card2}>
   <h3>{t('mem.result.mural')}</h3>
   <ol className={css.mural}>{pairs.map(x=><li key={x.id} lang={contentLocale} dir="auto" data-perfect={perfectIds.includes(x.id)||undefined}>
    <span className={css.plateIcon}><ObjectMark object={x.object} className={css.obj}/></span>
    <div><p className={css.plateFaces}><b><Face value={x.a} locale={locale}/></b> <span aria-hidden="true">↔</span> <b><Face value={x.b} locale={locale}/></b></p>
     <RevealLines t={t} copy={copy} state={reveals[x.id]} locale={locale} contentLocale={contentLocale} onRetry={()=>p.onRetry(x.id)}/></div>
   </li>)}</ol>
   <p className={css.fine}>{copy.localOnly}</p>
  </div>
  <div className={css.actions}>
   <Link className={css.cta} data-kind="lit" href={again} data-testid="memory-again"><span>{copy.replay}</span><span aria-hidden="true">→</span></Link>
   {other&&<Link className={css.cta} data-kind="plain" href={`?${memoryQuery({seed,cursor:cursor+1,lang:locale,go:true,size:other as MemSize,theme,peek:p.peek})}`}><span>{t('mem.result.trySize',{n:other})}</span><span aria-hidden="true">→</span></Link>}
   {draft&&<ShareComposer label={t('mem.result.share')} draft={draft}/>}
   <button type="button" className={`min-h-tap ${css.cta}`} data-kind="plain" onClick={p.onShelf}><span>{t('mem.result.shelf')}</span><span aria-hidden="true">→</span></button>
   <Link className={css.cta} data-kind="plain" href={`/clubs/${club}/archive?lang=${locale}`}><span>{copy['gate.archive']}</span><span aria-hidden="true">→</span></Link>
   <Link className={css.cta} data-kind="plain" href={`/clubs/${club}?lang=${locale}`}><span>{copy.backToClub}</span><span aria-hidden="true">→</span></Link>
  </div>
 </section>
}
