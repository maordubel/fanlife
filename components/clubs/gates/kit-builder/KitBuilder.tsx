'use client'
import {useCallback,useEffect,useMemo,useRef,useState,useTransition} from 'react'
import Link from 'next/link'
import {SlideSheet} from '@/components/stage/SlideSheet'
import {firePickFxAt} from '@/components/stage/PickFx'
import {dropZone,useDragSource} from '@/components/stage/useDrag'
import {tr} from '@/components/clubs/rumble/shared'
import type {GameCopy} from '@/lib/clubs/game-copy'
import type {UiLocale} from '@/lib/clubs/locale'
import {completeRun} from '@/lib/clubs/completion'
import {markStep} from '@/lib/analytics/meter'
import {BLANK,colourHex,type ClothSpec,type SlotKey} from '@/lib/clubs/kit-model'
import {DNA_THRESHOLD,HINT_LIMIT,HINT_PENALTY,MODE_SIZE,PERFECT_BONUS,RULES,STEP_FIELDS,nextCursor,roundScore,type HintReceipt,type KitMode,type Option,type PublicPuzzle,type Step,type Verdict} from '@/lib/clubs/kit-rules'
import {ShareComposer} from '@/components/share/v3/ShareComposer'
import {kitShare} from '@/lib/share/v3/adapters'
import {saveBuilt} from '@/lib/clubs/kit-studio'
import {gradeKitShirt,hintKitShirt,type Fail,type Graded} from './actions'
import {KitCloth} from './KitCloth'
import css from './kit-builder.module.css'
import {KitOwnBar,KitOwnProvider} from '@/components/clubs/KitOwn'

type Phase='intro'|'play'|'reveal'|'summary'
type Placed=Partial<Record<Step,string>>
type HintState={n:number;struck:Partial<Record<Step,string[]>>;receipts:HintReceipt[]}
const ADVANCE_MS=150
const SLOT_OF:Partial<Record<Step,SlotKey>>={maker:'maker',sponsor:'sponsor'}
const noHints=():HintState=>({n:0,struck:{},receipts:[]})
const NO_STEPS:PublicPuzzle['steps']=[],NO_PLACED:Placed={}

export type KitBuilderProps={club:string;clubName:string;version:string;locale:UiLocale;contentLocale:string;copy:GameCopy;seed:number;cursor:number;game:'assembly'|'practice';/** other modes the club can play now, for the intro's links */modes:{recognition:boolean;practice:boolean;assembly:boolean};puzzles:PublicPuzzle[];mode:KitMode|null;monogram:string;drawable:number;/** opened from a link made before the rules marker (KB-R12) */legacy:boolean}

/** Colour names, design names and variants — shared with the studio so a word is spelled once */
export const colourLabel=(copy:GameCopy,patch:Partial<ClothSpec>)=>patch.base?[tr(copy,`kb.colour.${patch.base}`),patch.trim?tr(copy,`kb.colour.${patch.trim}`):null].filter(Boolean).join(' · '):''
export const optionLabel=(copy:GameCopy,o:Option)=>o.step==='body'?colourLabel(copy,o.patch):o.step==='construction'?tr(copy,`kb.pattern.${o.patch.pattern}`):(o.step==='maker'?o.patch.maker:o.patch.sponsor)??''

/** Gate 4 · Build the Kit — one shirt of a season on the glass: place its colours, design, maker and sponsor, check it, see the real one. */
export function KitBuilder(props:KitBuilderProps){
 const {club,clubName,version,locale,contentLocale,copy,seed,cursor,puzzles,monogram,drawable,game,modes,legacy}=props
 const say=useCallback((k:string,v?:Record<string,string|number>)=>tr(copy,k,v),[copy])
 const [mode,setMode]=useState<KitMode|null>(props.mode)
 const [phase,setPhase]=useState<Phase>(props.mode?'play':'intro')
 const size=mode?Math.min(MODE_SIZE[mode],puzzles.length):0
 const [idx,setIdx]=useState(0),[stepIx,setStepIx]=useState(0),[auto,setAuto]=useState(true)
 const [placed,setPlaced]=useState<Record<number,Placed>>({}),[hints,setHints]=useState<Record<number,HintState>>({})
 const [graded,setGraded]=useState<Record<number,Graded>>({}),[error,setError]=useState<Fail['error']|null>(null),[notice,setNotice]=useState('')
 const [pending,startGrade]=useTransition(),[sheet,setSheet]=useState<null|{kind:'info';option:Option}|{kind:'rules'}>(null)
 const [wide,setWide]=useState(false),garmentRef=useRef<HTMLDivElement>(null),opener=useRef<HTMLElement|null>(null),timer=useRef<number|null>(null),reported=useRef(false)

 useEffect(()=>{const q=window.matchMedia('(min-width: 901px)'),on=()=>setWide(q.matches);on();q.addEventListener('change',on);return()=>q.removeEventListener('change',on)},[])
 useEffect(()=>()=>{if(timer.current)window.clearTimeout(timer.current)},[])

 const puzzle=puzzles[idx],steps=puzzle?.steps??NO_STEPS,REVIEW=steps.length
 const mine=placed[idx]??NO_PLACED,hint=hints[idx]??noHints()
 const optionOf=(step:Step,id?:string)=>steps.find(s=>s.step===step)?.options.find(o=>o.id===id)??null
 const cloth=useMemo<ClothSpec>(()=>steps.reduce((spec,{step})=>{const o=optionOf(step,mine[step]);return o?{...spec,...o.patch}:spec},BLANK as ClothSpec),[steps,mine]) // eslint-disable-line react-hooks/exhaustive-deps -- optionOf closes over steps
 const missing=useMemo(()=>steps.flatMap(({step})=>!mine[step]&&SLOT_OF[step]?[SLOT_OF[step]!]:[]),[steps,mine])
 const allPlaced=steps.length>0&&steps.every(s=>mine[s.step])
 const stepName=(s:Step)=>say(`kb.step.${s}`)
 const variantName=puzzle?say(`kb.variant.${puzzle.variant}`):''

 function nextOpen(from:number,m:Placed){for(let i=from+1;i<steps.length;i++)if(!m[steps[i]!.step])return i;for(let i=0;i<=from&&i<steps.length;i++)if(!m[steps[i]!.step])return i;return REVIEW}
 function place(step:Step,id:string){
  if(phase!=='play'||hint.struck[step]?.includes(id))return
  const next={...mine,[step]:id},o=optionOf(step,id)
  setPlaced(p=>({...p,[idx]:next}));setNotice('');setError(null)
  window.requestAnimationFrame(()=>firePickFxAt(garmentRef.current,{label:o?optionLabel(copy,o).slice(0,14):undefined}))
  if(auto){const at=steps.findIndex(s=>s.step===step);if(timer.current)window.clearTimeout(timer.current);timer.current=window.setTimeout(()=>setStepIx(nextOpen(at,next)),ADVANCE_MS)}
 }
 function unplace(step:Step){setPlaced(p=>{const n={...(p[idx]??{})};delete n[step];return {...p,[idx]:n}})}

 function askHint(){
  const row=steps[stepIx];if(!row||hint.n>=HINT_LIMIT||pending)return
  const done=hint.struck[row.step]??[]
  startGrade(async()=>{
   const r=await hintKitShirt(club,version,seed,cursor,game,idx,row.step,done.length)
   if(!r.ok){setError(r.error);return}
   if(!r.optionId){setNotice(say('kb.hint.none'));return}
   setHints(h=>({...h,[idx]:{n:hint.n+1,struck:{...hint.struck,[row.step]:[...done,r.optionId!]},receipts:r.receipt?[...hint.receipts,r.receipt]:hint.receipts}}))
   setPlaced(p=>{const m={...(p[idx]??{})};if(m[row.step]===r.optionId)delete m[row.step];return {...p,[idx]:m}})
   setNotice(say('kb.hint.struck',{n:HINT_LIMIT-hint.n-1}))
  })
 }
 function check(){
  if(!allPlaced||pending)return
  setError(null)
  startGrade(async()=>{
   const r=await gradeKitShirt(club,version,seed,cursor,game,idx,mine as Record<string,string>,hint.receipts)
   if(!r.ok){setError(r.error);return}
   setGraded(g=>({...g,[idx]:r}))
   if(r.unlock)saveBuilt(club,r.unlock.kitId,{t:r.unlock.token,s:r.verdict.score,p:r.verdict.perfect,f:r.unlock.f,o:r.unlock.o,r:r.unlock.r,at:new Date().toISOString()})
   markStep(Object.keys(graded).length+1)
   setPhase('reveal')
  })
 }
 function advance(){
  if(idx+1>=size){setPhase('summary');return}
  setIdx(idx+1);setStepIx(0);setPhase('play');setNotice('')
 }
 const verdicts=Object.values(graded).sort((a,b)=>a.verdict.index-b.verdict.index).map(g=>g.verdict)
 const total=roundScore(verdicts)
 const shareDraft=useMemo(()=>{
  const d=kitShare(club,{right:0,forbidden:verdicts.flatMap(v=>[v.seasonLabel,v.answer.maker,v.answer.sponsor].filter((x):x is string=>!!x&&x.length>3))})
  const perfect=verdicts.filter(v=>v.perfect).length,asked=[...new Set(verdicts.flatMap(v=>v.steps.map(s=>s.step)))]
  const link=new URL(d.data.link);for(const [k,val] of Object.entries({seed,r:cursor,n:size,mode:game,kv:RULES}))link.searchParams.set(k,String(val))
  const avg=verdicts.length?Math.round(verdicts.reduce((n,v)=>n+v.fieldPoints,0)/verdicts.length):0
  return {...d,purpose:'same-run' as const,data:{...d.data,main:`${perfect}/${verdicts.length}`,label:'SHIRTS BUILT PERFECTLY',rows:asked.slice(0,3).map(x=>x.toUpperCase()),detail:`Average field accuracy: ${avg}/100 · Score: ${total}`,statement:perfect===verdicts.length&&verdicts.length>0?'I built every one from memory.':`I built ${perfect} of ${verdicts.length} perfectly.`,link:link.href}}
 // eslint-disable-next-line react-hooks/exhaustive-deps -- verdicts is derived from graded
 },[club,graded,seed,cursor,size,game,total])
 useEffect(()=>{
  if(phase!=='summary'||reported.current||!mode)return
  reported.current=true
  completeRun(club,'kit-builder',`kit-builder:${version}:${seed}:${cursor}:${game}:${mode}`,total)
 },[phase,club,version,seed,cursor,mode,total,game])

 const base=`/clubs/${club}`,q=(o:Record<string,string|number>)=>new URLSearchParams({...Object.fromEntries(Object.entries(o).map(([k,v])=>[k,String(v)])),lang:locale}).toString()
 const againHref=mode?`${base}/kit-builder?${q({seed,r:nextCursor(cursor,size),n:MODE_SIZE[mode],mode:game,kv:RULES})}`:''
 const openSheet=(s:NonNullable<typeof sheet>)=>(e:React.SyntheticEvent)=>{opener.current=e.currentTarget as HTMLElement;setSheet(s)}
 const closeSheet=()=>{setSheet(null);opener.current?.focus?.()}

 if(!puzzle)return <section className={css.stage} data-testid="kit-builder"><p className={css.note}>{say('kb.none')}</p></section>

 // ---------------------------------------------------------------- intro
 if(phase==='intro'){
  const quick=Math.min(MODE_SIZE.quick,puzzles.length),full=Math.min(MODE_SIZE.full,puzzles.length)
  const start=(m:KitMode)=>()=>{setMode(m);setPhase('play')}
  return <section className={css.stage} data-testid="kit-builder" data-phase="intro">
   <div className={css.intro}>
    <div className={css.introShirt}><KitCloth spec={BLANK} missing={['maker','sponsor']} texture={false} monogram={monogram}/></div>
    <div className={css.introText}>
     <p className={css.kicker}>{clubName} · {say(`kb.game.${game}`)}</p>
     <h2 className={css.introTitle}>{say('kb.intro.title')}</h2>
     <p>{say('kb.intro.body')}</p>
     <p className={css.fine} data-testid="kb-game-note">{say(`kb.game.${game}.note`)}</p>
     {legacy&&<p className={css.notice} role="note" data-testid="kb-legacy">{say('kb.legacy')}</p>}
     <ol className={css.partList}>{puzzles[0]!.steps.map(s=><li key={s.step}>{stepName(s.step)}</li>)}</ol>
     <div className={css.modes}>
      {quick===full
       ?<button type="button" className={`min-h-tap ${css.cta} ${css.primary}`} onClick={start('full')} data-testid="kb-start">{say('kb.mode.only',{n:full})}</button>
       :<>
        <button type="button" className={`min-h-tap ${css.cta}`} onClick={start('quick')} data-testid="kb-quick"><b>{say('kb.mode.quick')}</b><small>{say('kb.mode.shirts',{n:quick})}</small></button>
        <button type="button" className={`min-h-tap ${css.cta} ${css.primary}`} onClick={start('full')} data-testid="kb-full"><b>{say('kb.mode.full')}</b><small>{say('kb.mode.shirts',{n:full})}</small></button></>}
     </div>
     <p className={css.fine}>{say('kb.intro.fine',{n:drawable})}</p>
     {modes.recognition&&<p className={css.fine}><Link href={`${base}/kit-builder?${q({mode:'recognition'})}`} data-testid="kb-to-recognition">{say('kb.game.recognition.link')}</Link></p>}
    </div>
   </div>
  </section>
 }

 // ---------------------------------------------------------------- summary (the kit certificate)
 if(phase==='summary'){
  const perfect=verdicts.filter(v=>v.perfect).length
  return <section className={css.stage} data-testid="kit-builder" data-phase="summary">
   <div className={css.cert} data-testid="kb-certificate">
    <header className={css.certHead}><p className={css.kicker}>{clubName} · {say(`kb.game.${game}`)}</p><h2>{say('kb.cert.title')}</h2><p className={css.certScore}><b>{total}</b><span>{say('kb.cert.pts')}</span></p></header>
    <ul className={css.certRows}>{verdicts.map(v=><li key={v.index}>
     <span className={css.certShirt}><KitCloth spec={v.answer} texture={false} monogram={monogram} title={`${v.seasonLabel} ${say(`kb.variant.${v.variant}`)}`}/></span>
     <span className={css.certName}><b><bdi>{v.seasonLabel}</bdi></b><small>{say(`kb.variant.${v.variant}`)} · {say('kb.cert.field',{f:v.fieldPoints})}{v.dna?` · ${say('kb.cert.dna')}`:''}</small></span>
     <span className={css.certPts} data-perfect={v.perfect}>{v.score}{v.perfect&&<i aria-label={say('kb.cert.perfect')}> ★</i>}</span></li>)}</ul>
    <p className={css.fine}>{say('kb.cert.fine',{perfect,n:verdicts.length,dna:DNA_THRESHOLD})}</p>
    <div className={css.actions}>
     <ShareComposer label={say('kb.share')} draft={shareDraft}/>
     <Link className={`min-h-tap ${css.cta}`} href={againHref} data-testid="kb-again"><b>{say('kb.again')}</b></Link>
     <Link className={`min-h-tap ${css.cta}`} href={`${base}/kits?lang=${locale}`}><b>{say('kb.toCollection')}</b></Link>
     <Link className={`min-h-tap ${css.cta}`} href={`${base}?lang=${locale}`}><b>{say('kb.backClub')}</b></Link>
    </div>
    <p className={css.status} role="status">{notice}</p>
   </div>
  </section>
 }

 // ---------------------------------------------------------------- reveal
 if(phase==='reveal'){
  const g=graded[idx]!,v=g.verdict,last=idx+1>=size
  return <section className={css.stage} data-testid="kit-builder" data-phase="reveal">
   <div className={css.reveal}>
    <header className={css.revealHead} data-perfect={v.perfect}>
     <p className={css.kicker}>{say('kb.reveal.kicker',{i:idx+1,n:size})}</p>
     <h2>{v.perfect?say('kb.reveal.perfect'):say('kb.reveal.parts',{r:v.right,n:v.steps.length})}</h2>
     <p className={css.revealScore}><b>{v.score}</b><span>{say('kb.cert.pts')}</span></p>
     <p className={css.fine} data-testid="kb-field-accuracy">{say('kb.reveal.field',{f:v.fieldPoints})}</p>
    </header>
    <div className={css.pair}>
     <figure><figcaption>{say('kb.reveal.real',{season:v.seasonLabel,variant:variantName})}</figcaption><div className={css.pairShirt}><KitCloth spec={v.answer} monogram={monogram} title={say('kb.reveal.real',{season:v.seasonLabel,variant:variantName})}/></div></figure>
     <figure><figcaption>{say('kb.reveal.mine')}</figcaption><div className={css.pairShirt}><KitCloth spec={cloth} monogram={monogram} title={say('kb.reveal.mine')}/></div></figure>
    </div>
    <ul className={css.verdicts}>{v.steps.map(r=><li key={r.step} data-ok={r.ok}>
     <span className={css.mark} aria-hidden="true">{r.ok?'✓':'✕'}</span>
     <span><b>{stepName(r.step)}</b><small>{r.ok?<><span className="sr-only">{say('kb.reveal.right')}: </span><bdi lang={contentLocale}>{optionLabel(copy,r.truth)}</bdi></>:<><span className="sr-only">{say('kb.reveal.wrong')}: </span>{r.chosen?<bdi lang={contentLocale}>{optionLabel(copy,r.chosen)}</bdi>:say('kb.reveal.skipped')} → <b><bdi lang={contentLocale}>{optionLabel(copy,r.truth)}</bdi></b></>}</small></span>
     <span className={css.pts}>{r.points}/{r.max}</span>
     <span className={css.fieldRow}>{v.fields.filter(f=>STEP_FIELDS[r.step].includes(f.field)).map(f=><i key={f.field} data-ok={f.ok}>{say(`kb.field.${f.field}`)} {f.ok?'✓':'✕'} {f.points}/{f.max}</i>)}</span></li>)}</ul>
    <div className={css.fineBlock}>
     {v.perfect&&<p>{say('kb.reveal.bonus',{n:PERFECT_BONUS})}</p>}
     {v.hints>0&&<p>{say('kb.reveal.hints',{n:v.hints,pts:v.hints*HINT_PENALTY})}</p>}
     <p data-testid="kb-dna">{v.dna?say('kb.reveal.dna.yes',{n:DNA_THRESHOLD}):say('kb.reveal.dna.no',{n:DNA_THRESHOLD,f:v.fieldPoints})}</p>
     {v.unknown.length>0&&<p data-testid="kb-unknown">{say('kb.reveal.unknown',{parts:v.unknown.map(f=>say(`kb.field.${f}`)).join(', ')})}</p>}
     <p>{say('kb.reveal.recon')}</p>
     {g.sources.length>0&&<p className={css.sources}>{say('kb.reveal.sources')}: {g.sources.map((s,i)=><span key={i}>{s.url?<a href={s.url} target="_blank" rel="noreferrer noopener"><bdi>{s.title}</bdi></a>:<bdi>{s.title}</bdi>}{i<g.sources.length-1?' · ':''}</span>)}</p>}
     {g.shirtSlug&&<KitOwnProvider slugs={[g.shirtSlug]}><KitOwnBar slug={g.shirtSlug} copy={{have:say('kb.own.have'),haveOn:say('kb.own.haveOn'),want:say('kb.own.want'),wantOn:say('kb.own.wantOn'),closet:say('kb.own.closet'),market:say('kb.own.market'),saved:say('kb.own.saved'),label:say('kb.own.label')}}/></KitOwnProvider>}
     {g.unlock&&<p><Link href={`${base}/kits?lang=${locale}&kit=${encodeURIComponent(g.unlock.kitId)}`}>{say('kb.reveal.unlocked')}</Link></p>}
    </div>
    <div className={css.dockFixed}><button type="button" className={`min-h-tap ${css.cta} ${css.primary}`} onClick={advance} data-testid="kb-next"><b>{last?say('kb.cert.see'):say('kb.next')}</b><span aria-hidden="true">{locale==='he'?'←':'→'}</span></button></div>
   </div>
  </section>
 }

 // ---------------------------------------------------------------- play
 const row=steps[stepIx],inReview=stepIx>=REVIEW
 const struck=row?hint.struck[row.step]??[]:[]
 const canHint=!!row&&hint.n<HINT_LIMIT&&row.options.length-struck.length>2&&!pending
 const progress=Object.keys(mine).length
 return <section className={css.stage} data-testid="kit-builder" data-phase="play" data-step={row?.step??'review'}>
  <div className={css.layout}>
   <div className={css.left}>
    <div className={css.top}>
     <span className={css.pill} data-testid="kb-count">{say('kb.shirtN',{i:idx+1,n:size})}</span>
     <div className={css.plate}><b><bdi>{puzzle.seasonLabel}</bdi></b><span>{variantName}</span></div>
     <button type="button" className={`min-h-tap ${css.tool}`} onClick={askHint} disabled={!canHint||inReview} aria-label={say('kb.hint.aria',{pts:HINT_PENALTY,left:HINT_LIMIT-hint.n})} data-testid="kb-hint"><span aria-hidden="true">?</span><small>{HINT_LIMIT-hint.n}</small></button>
     <button type="button" className={`min-h-tap ${css.tool}`} onClick={openSheet({kind:'rules'})} aria-label={say('kb.rules.open')}><span aria-hidden="true">i</span></button>
    </div>
    <div className={css.garment} ref={garmentRef} {...dropZone('kit-shirt')} data-testid="kb-garment">
     <KitCloth spec={cloth} missing={missing} monogram={monogram} title={say('kb.garment.aria',{season:puzzle.seasonLabel,variant:variantName,done:progress,n:steps.length})}/>
    </div>
   </div>
   <div className={css.right}>
    <ol className={css.rail} role="tablist" aria-label={say('kb.rail')}>
     {steps.map((s,i)=><li key={s.step}><button type="button" role="tab" aria-selected={stepIx===i} data-done={!!mine[s.step]} className={`min-h-tap ${css.railBtn}`} onClick={()=>setStepIx(i)} data-testid={`kb-step-${s.step}`}><i>{mine[s.step]?'✓':i+1}</i><span>{stepName(s.step)}</span></button></li>)}
     <li><button type="button" role="tab" aria-selected={inReview} className={`min-h-tap ${css.railBtn}`} data-done={allPlaced} onClick={()=>setStepIx(REVIEW)} disabled={!allPlaced} data-testid="kb-step-review"><i>{allPlaced?'✓':'★'}</i><span>{say('kb.step.review')}</span></button></li>
    </ol>
    {!inReview&&row?<div className={css.panel} role="tabpanel">
     <p className={css.question}>{say(`kb.q.${row.step}`,{season:puzzle.seasonLabel,variant:variantName})}</p>
     <ul className={css.cards} data-testid="kb-cards">{row.options.map(o=><li key={o.id}><OptionCard o={o} label={optionLabel(copy,o)} copy={copy} selected={mine[row.step]===o.id} struck={struck.includes(o.id)} wide={wide} cloth={cloth} contentLocale={contentLocale} monogram={monogram} onPlace={()=>place(row.step,o.id)} onDropped={()=>place(row.step,o.id)} onInfo={openSheet({kind:'info',option:o})} infoLabel={say('kb.info.open',{name:optionLabel(copy,o)})} struckLabel={say('kb.struck')}/></li>)}</ul>
     <label className={css.autoRow}><input type="checkbox" checked={auto} onChange={e=>setAuto(e.target.checked)}/>{say('kb.auto')}</label>
    </div>
    :<div className={css.panel} role="tabpanel" data-testid="kb-review">
     <p className={css.question}>{say('kb.review.title')}</p>
     <ul className={css.reviewList}>{steps.map((s,i)=>{const o=optionOf(s.step,mine[s.step]);return <li key={s.step}><button type="button" className={`min-h-tap ${css.reviewRow}`} onClick={()=>setStepIx(i)}><small>{stepName(s.step)}</small><b lang={contentLocale} dir="auto">{o?optionLabel(copy,o):'—'}</b><span aria-hidden="true">{say('kb.change')}</span></button></li>})}</ul>
     <button type="button" className={`min-h-tap ${css.cta} ${css.primary}`} onClick={check} disabled={!allPlaced||pending} data-testid="kb-check"><b>{pending?say('kb.checking'):say('kb.check')}</b></button>
    </div>}
    {!inReview&&allPlaced&&<button type="button" className={`min-h-tap ${css.cta} ${css.primary}`} onClick={()=>setStepIx(REVIEW)} data-testid="kb-to-review"><b>{say('kb.toReview')}</b></button>}
    {error&&<div className={css.error} role="alert"><p>{say(`kb.err.${error}`)}</p>{error==='stale'?<button type="button" className={`min-h-tap ${css.tool}`} onClick={()=>location.reload()}>{say('kb.err.reload')}</button>:<button type="button" className={`min-h-tap ${css.tool}`} onClick={check}>{say('kb.err.retry')}</button>}</div>}
    <p className={css.status} role="status">{notice}</p>
   </div>
  </div>

  <SlideSheet open={sheet?.kind==='info'} onClose={closeSheet} title={sheet?.kind==='info'?optionLabel(copy,sheet.option):''} closeLabel={copy['play.close']}>
   {sheet?.kind==='info'&&<div className={css.sheetBody}>
    <p>{say(`kb.info.${sheet.option.step}`,{name:optionLabel(copy,sheet.option),pattern:sheet.option.patch.pattern?say(`kb.patternInfo.${sheet.option.patch.pattern}`):''})}</p>
    <p className={css.fine}>{say('kb.info.seen',{n:sheet.option.seen,of:drawable})}</p></div>}
  </SlideSheet>
  <SlideSheet open={sheet?.kind==='rules'} onClose={closeSheet} title={say('kb.rules.title')} closeLabel={copy['play.close']}>
   <div className={css.sheetBody}><p>{say('kb.rules.body')}</p><ul className={css.rulesList}><li>{say('kb.rules.tap')}</li><li>{say('kb.rules.hint',{pts:HINT_PENALTY,max:HINT_LIMIT})}</li><li>{say('kb.rules.score',{bonus:PERFECT_BONUS})}</li><li>{say('kb.rules.dna',{n:DNA_THRESHOLD})}</li></ul></div>
  </SlideSheet>
 </section>
}

function OptionCard({o,label,copy,selected,struck,wide,cloth,contentLocale,monogram,onPlace,onDropped,onInfo,infoLabel,struckLabel}:{o:Option;label:string;copy:GameCopy;selected:boolean;struck:boolean;wide:boolean;cloth:ClothSpec;contentLocale:string;monogram:string;onPlace:()=>void;onDropped:()=>void;onInfo:(e:React.SyntheticEvent)=>void;infoLabel:string;struckLabel:string}){
 const drag=useDragSource({payload:o.id,disabled:struck,axis:wide?'any':'up',onDrop:zone=>{if(zone==='kit-shirt')onDropped()}})
 // a design card shows the cut on the cloth already chosen — or on neutral cloth if nothing is placed yet
 const preview:ClothSpec={...cloth,maker:null,sponsor:null,crest:false,...o.patch,...(o.step==='construction'?{pattern:o.patch.pattern!}:{})}
 return <div className={css.cardWrap} data-struck={struck}>
  <button type="button" className={css.card} aria-pressed={selected} disabled={struck} aria-label={struck?`${label} — ${struckLabel}`:label} data-testid={`kb-option-${o.step}`} data-option={o.id} onClick={onPlace} {...drag}>
   <span className={css.cardArt}>
    {o.step==='body'&&<span className={css.discs} aria-hidden="true"><i style={{background:colourHex(o.patch.base!)}}/>{o.patch.trim&&<i style={{background:colourHex(o.patch.trim)}}/>}</span>}
    {o.step==='construction'&&<KitCloth spec={{...preview,base:cloth.base??'grey',trim:cloth.trim??(cloth.base?null:'white')}} texture={false} monogram={monogram} viewBox="40 36 240 262"/>}
    {(o.step==='maker'||o.step==='sponsor')&&<span className={css.word} lang={contentLocale} dir="auto" data-kind={o.step}>{(label||'').toUpperCase()}</span>}
   </span>
   <span className={css.cardLabel} lang={o.step==='maker'||o.step==='sponsor'?contentLocale:undefined} dir="auto">{label}</span>
  </button>
  <button type="button" className={css.info} onClick={onInfo} aria-label={infoLabel}>i</button>
 </div>
}
