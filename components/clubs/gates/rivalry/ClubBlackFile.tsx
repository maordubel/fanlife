'use client'
import {useEffect,useMemo,useRef,useState} from 'react'
import Link from 'next/link'
import {ShareComposer} from '@/components/share/v3/ShareComposer'
import {RecordRun} from '@/components/clubs/games/RecordRun'
import {firePickFxAt} from '@/components/stage/PickFx'
import {markStep,startVisit} from '@/lib/analytics/meter'
import {blackFileShare} from '@/lib/share/v3/adapters'
import {fileResult} from '@/lib/clubs/blackfile-engine'
import type {CrossingReveal,OrderReveal,PublicFile,SourceRef} from '@/lib/clubs/blackfile-deal'
import type {GameCopy} from '@/lib/clubs/game-copy'
import {localizedDate,type UiLocale} from '@/lib/clubs/locale'
import {makeT} from '../derby/ui'
import {gradeCrossing,gradeOrder} from './file-actions'
import css from './rivalry.module.css'

type Item={module:'binary';n:number}|{module:'order';n:number}
type Phase='intro'|'ask'|'pending'|'reveal'|'done'
type Failure='offline'|'fail'|null

/**
 * Gate 11 · The Black File (BF-R01..R09) — documented crossings and dated order, each answered before it is revealed.
 * The browser holds opaque keys and the question, nothing else: no date, no path, no answer. The reveal says who, what,
 * the path, the date, the source and why — and the result counts what was actually asked, with a subtotal per part.
 */
export function ClubBlackFile({club,clubName,slug,version,seed,cursor,locale,contentLocale,copy,file,playUrl,fixture=false}:{club:string;clubName:string;slug:string;version:string;seed:number;cursor:number;locale:UiLocale;contentLocale:string;copy:GameCopy;file:PublicFile;playUrl:string;fixture?:boolean}){
 const t=useMemo(()=>makeT(copy),[copy])
 const items=useMemo<Item[]>(()=>[...file.binary.map((_,n)=>({module:'binary' as const,n})),...file.pairs.map((_,n)=>({module:'order' as const,n}))],[file])
 const [phase,setPhase]=useState<Phase>('intro'),[i,setI]=useState(0),[answers,setAnswers]=useState<{module:'binary'|'order';correct:boolean}[]>([])
 const [cross,setCross]=useState<CrossingReveal|null>(null),[order,setOrder]=useState<OrderReveal|null>(null),[failure,setFailure]=useState<Failure>(null)
 const last=useRef<(()=>void)|null>(null),nextRef=useRef<HTMLButtonElement>(null)
 useEffect(()=>{startVisit()},[club])
 useEffect(()=>{if(phase==='reveal')nextRef.current?.focus()},[phase])
 const item=items[i],result=useMemo(()=>fileResult(answers),[answers])
 const dateOf=(on:string|null,year:number|null)=>on?localizedDate(on,locale):year!==null?String(year):t('derby.bf.r.dateUnknown')
 const fail=()=>{setFailure(typeof navigator!=='undefined'&&navigator.onLine===false?'offline':'fail');setPhase('ask')}
 const done=(module:'binary'|'order',correct:boolean)=>{setAnswers(a=>[...a,{module,correct}]);setPhase('reveal');markStep(i+1)}

 const askCross=(said:'crossed'|'did_not',el:Element|null)=>{
  if(phase!=='ask'||item?.module!=='binary')return
  const row=file.binary[item.n];if(!row)return
  setFailure(null);setPhase('pending');last.current=()=>askCross(said,el)
  gradeCrossing(slug,version,seed,cursor,row.key,said).then(r=>{
   if(!r){fail();return}
   firePickFxAt(el,{tone:r.correct?'red':'sign',haptic:r.correct?'lock':'miss'})
   setCross(r);setOrder(null);done('binary',r.correct)
  }).catch(fail)
 }
 const askOrder=(pickKey:string,el:Element|null)=>{
  if(phase!=='ask'||item?.module!=='order')return
  const pair=file.pairs[item.n];if(!pair)return
  setFailure(null);setPhase('pending');last.current=()=>askOrder(pickKey,el)
  gradeOrder(slug,version,seed,cursor,pair.key,pickKey).then(r=>{
   if(!r){fail();return}
   firePickFxAt(el,{tone:r.correct?'red':'sign',haptic:r.correct?'lock':'miss'})
   setOrder(r);setCross(null);done('order',r.correct)
  }).catch(fail)
 }
 const next=()=>{if(i+1>=items.length){setPhase('done');return}setI(i+1);setCross(null);setOrder(null);setFailure(null);setPhase('ask')}

 if(items.length===0)return <section className={css.card} data-testid="file-empty"><h2 className={css.h2}>{t('derby.bf.title')}</h2><p className={css.body}>{t('derby.bf.empty')}</p></section>

 if(phase==='intro')return <section className={css.card} data-testid="file-intro">
  <p className={css.kicker}>{t('derby.bf.kicker',{club:clubName})}</p>
  <h2 className={css.h2}>{t('derby.bf.title')}</h2>
  <p className={css.body}>{t('derby.bf.intro',{total:file.total,binary:file.binary.length,pairs:file.pairs.length})}</p>
  <ul className={css.facts}>
   {file.binary.length>0&&<><li>{t('derby.bf.rule.direct')}</li><li>{t('derby.bf.rule.ever')}</li></>}
   {file.pairs.length>0&&<li>{t('derby.bf.rule.order')}</li>}
   <li>{t('derby.bf.rule.denom')}</li>
  </ul>
  <button type="button" className={`${css.cta} min-h-tap`} data-testid="file-start" onClick={()=>{setPhase('ask');markStep(0,undefined,true)}}>{t('derby.bf.start')}</button>
 </section>

 if(phase==='done')return <section className={css.card} data-testid="file-result" aria-live="polite">
  {!fixture&&<RecordRun club={club} gate="derby" run={`derby:file:${version}:${seed}:${cursor}`} score={result.correct}/>}
  <p className={css.kicker}>{t('derby.bf.res.title')}</p>
  <h2 className={css.h2}>{t('derby.bf.res.line',{correct:result.correct,asked:result.asked})}</h2>
  <div className={css.split}>
   {result.binary.asked>0&&<div className={css.cell}><b>{result.binary.correct}/{result.binary.asked}</b><span>{t('derby.bf.mod.cross')}</span></div>}
   {result.order.asked>0&&<div className={css.cell}><b>{result.order.correct}/{result.order.asked}</b><span>{t('derby.bf.mod.order')}</span></div>}
  </div>
  <div className={css.actions}>
   <ShareComposer draft={blackFileShare(fixture?'hapoel-tel-aviv':club,{seed,cursor,correct:result.correct,asked:result.asked,binary:result.binary,order:result.order})}/>
   <Link prefetch={false} className={css.cta} href={playUrl}>{t('derby.bf.res.again')}</Link>
  </div>
 </section>

 if(!item)return null
 const revealed=phase==='reveal',pending=phase==='pending'
 const row=item.module==='binary'?file.binary[item.n]:null,pair=item.module==='order'?file.pairs[item.n]:null
 const ok=answers[answers.length-1]?.correct===true
 const srcs=(list:SourceRef[])=>list.length===0?<span>{t('derby.bf.r.noSource')}</span>:<ul className={css.srcs}>{list.map((s,k)=><li key={`${s.title}${k}`}>{s.url?<a href={s.url} target="_blank" rel="noreferrer noopener"><bdi lang={contentLocale} dir="auto">{s.title}</bdi></a>:<bdi lang={contentLocale} dir="auto">{s.title}</bdi>} · <bdi>{s.publisher}</bdi></li>)}</ul>
 return <section className={css.dossier} data-testid="file-item" data-module={item.module} data-phase={phase}>
  <div className={css.hud}>
   <p className={css.status}>{t('derby.bf.progress',{n:i+1,total:items.length})}</p>
   <span className={css.tag}>{item.module==='binary'?t('derby.bf.mod.cross'):t('derby.bf.mod.order')}</span>
  </div>
  {row&&<>
   <p className={css.q} lang={contentLocale} dir="auto">{t(row.proposition==='direct'?'derby.bf.q.direct':'derby.bf.q.ever',{person:row.person,from:row.from,to:row.to})}</p>
   {!revealed&&<div className={css.answers}>
    <button type="button" className={`${css.answer} min-h-tap`} data-k="crossed" disabled={pending} data-testid="file-crossed" onClick={e=>askCross('crossed',e.currentTarget)}>{t('derby.bf.crossed')}</button>
    <button type="button" className={`${css.answer} min-h-tap`} data-k="did_not" disabled={pending} data-testid="file-didnot" onClick={e=>askCross('did_not',e.currentTarget)}>{t('derby.bf.didNot')}</button>
   </div>}
  </>}
  {pair&&<>
   <p className={css.q}>{t('derby.bf.q.order')}</p>
   {!revealed&&<div className={css.pair}>
    {[pair.a,pair.b].map(x=><button key={x.key} type="button" className={`${css.pairCard} min-h-tap`} disabled={pending} data-testid="file-pick" onClick={e=>askOrder(x.key,e.currentTarget)}><bdi lang={contentLocale} dir="auto">{x.title}</bdi></button>)}
   </div>}
  </>}
  {pending&&<p className={css.notice} role="status">{t('derby.bf.checking')}</p>}
  {failure&&<div className={css.notice} role="alert" data-testid="file-error"><p>{failure==='offline'?t('derby.bf.offline'):t('derby.bf.err')}</p><button type="button" className={`${css.ghost} min-h-tap`} onClick={()=>last.current?.()}>{t('derby.bf.retry')}</button></div>}
  {revealed&&cross&&<div className={css.reveal} data-testid="file-reveal" role="status">
   <span className={css.verdict} data-ok={ok}>{ok?t('derby.bf.right'):t('derby.bf.wrong')}</span>
   <dl className={css.rows}>
    <dt>{t('derby.bf.r.who')}</dt><dd><bdi lang={contentLocale} dir="auto">{cross.person}</bdi></dd>
    <dt>{t('derby.bf.r.what')}</dt><dd><bdi lang={contentLocale} dir="auto">{t(cross.answer==='crossed'?'derby.bf.r.crossed':'derby.bf.r.didNot',{person:cross.person,from:cross.from,to:cross.to})}</bdi></dd>
    <dt>{t('derby.bf.r.path')}</dt><dd><ol className={css.route}>{cross.clubs.map((c,k)=><li key={`${c}${k}`} data-end={k===0||k===cross.clubs.length-1}><bdi lang={contentLocale} dir="auto">{c}</bdi></li>)}</ol></dd>
    <dt>{t('derby.bf.r.date')}</dt><dd>{cross.moves.length===0?t('derby.bf.r.dateUnknown'):<ul className={css.srcs}>{cross.moves.map((m,k)=><li key={k}><bdi lang={contentLocale} dir="auto">{m.from} → {m.to}</bdi> · <bdi>{dateOf(m.on,m.year)}</bdi>{m.loan?` · ${t('derby.bf.r.loan')}`:''}</li>)}</ul>}</dd>
    <dt>{t('derby.bf.r.source')}</dt><dd>{srcs(cross.sources)}</dd>
    <dt>{t('derby.bf.r.why')}</dt><dd>{cross.answer==='crossed'?t(cross.proposition==='direct'?'derby.bf.r.why.direct':'derby.bf.r.why.ever'):t('derby.bf.r.why.no',{person:cross.person})}</dd>
   </dl>
  </div>}
  {revealed&&order&&<div className={css.reveal} data-testid="file-reveal" role="status">
   <span className={css.verdict} data-ok={ok}>{ok?t('derby.bf.right'):t('derby.bf.wrong')}</span>
   <dl className={css.rows}>
    <dt>{t('derby.bf.o.earlier')}</dt><dd><bdi lang={contentLocale} dir="auto">{order.earlier.title}</bdi> · <bdi>{localizedDate(order.earlier.on,locale)}</bdi>{srcs(order.earlier.sources)}</dd>
    <dt>{t('derby.bf.o.later')}</dt><dd><bdi lang={contentLocale} dir="auto">{order.later.title}</bdi> · <bdi>{localizedDate(order.later.on,locale)}</bdi>{srcs(order.later.sources)}</dd>
    <dt>{t('derby.bf.r.why')}</dt><dd>{order.days===1?t('derby.bf.o.gap1'):t('derby.bf.o.gap',{n:order.days})}. {t('derby.bf.o.why',{a:localizedDate(order.earlier.on,locale),b:localizedDate(order.later.on,locale)})}</dd>
   </dl>
  </div>}
  {revealed&&<button ref={nextRef} type="button" className={`${css.cta} min-h-tap`} data-testid="file-next" onClick={next}>{i+1>=items.length?t('derby.bf.finish'):t('derby.bf.next')}</button>}
 </section>
}
