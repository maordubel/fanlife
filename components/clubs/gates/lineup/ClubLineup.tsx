'use client'
import {useMemo,useRef,useState,useTransition,type ReactNode} from 'react'
import {flyShirt} from '@/components/roster/PickRail'
import {SlideSheet} from '@/components/stage/SlideSheet'
import {firePickFxAt} from '@/components/stage/PickFx'
import {ClubShirt} from '@/components/clubs/stage/ClubShirt'
import {tr,shortName} from '@/components/clubs/rumble/shared'
import {gradeLineup} from '@/app/clubs/[slug]/[gate]/gate-actions'
import {completeRun} from '@/lib/clubs/completion'
import {markStep} from '@/lib/analytics/meter'
import type {GameCopy} from '@/lib/clubs/game-copy'
import type {UiLocale} from '@/lib/clubs/locale'
import {kitFor,type RumbleWardrobe} from '@/lib/clubs/rumble-kit'
import {BANDS,aimAfter,bandOf,counts,emptyBoard,filled,isBand,isComplete,onBoard,picksOf,place,remove,sheetOf,shareText,toggleLock,wire,type Band,type Board,type CoachNote,type GradeResult,type Mark} from '@/lib/clubs/lineup-model'
import {askLineupCoach} from './coach-action'
import {BandPitch,type PitchLabels} from './BandPitch'
import {LockerRack,type RackLabels} from './LockerRack'
import css from './lineup.module.css'

export type LineupItem={id:string;title:string;competition:string;on:string|null;year:number|null;score:string|null;pool:string[];/** how many coach notes this match can give (0 when the sheet has nothing to count) */coachBudget:number;sources:{title:string;url:string|null}[]}
type Graded=GradeResult&{sources:string[]}
type Sheet=null|'info'|'coach'|'all'|'handin'|'result'
type Say=(k:string,v?:Record<string,string|number>)=>string

export type ClubLineupProps={items:LineupItem[];club:string;clubName:string;version:string;locale:UiLocale;contentLocale:string;wardrobe:RumbleWardrobe;copy:GameCopy}

/** Gate 3 · The Dressing Room: a locker wall under a four-band board, a coach who only counts, and a team sheet that is graded on the server. */
export function ClubLineup(props:ClubLineupProps){
 const [n,setN]=useState(0),{items}=props
 const m=items[n%items.length]!
 return <section className={css.stage} data-testid="lineup-board" lang={props.locale}>
  <Match key={`${n}:${m.id}`} m={m} n={n} total={items.length} onNext={()=>setN(v=>v+1)} {...props}/>
 </section>
}

function Match({m,n,total,onNext,club,clubName,version,locale,contentLocale,wardrobe,copy}:ClubLineupProps&{m:LineupItem;n:number;total:number;onNext:()=>void}){
 const tx:Say=(k,v)=>tr(copy,k,v)
 const [board,setBoard]=useState<Board>(emptyBoard),[aimed,setAimed]=useState<Band>('GK'),[active,setActive]=useState<string|null>(null)
 const [sheet,setSheet]=useState<Sheet>(null),[notes,setNotes]=useState<CoachNote[]>([]),[grade,setGrade]=useState<Graded|null>(null)
 const [err,setErr]=useState(false),[notice,setNotice]=useState(''),[warn,setWarn]=useState(false),[asking,setAsking]=useState(false),[pending,start]=useTransition()
 const opener=useRef<HTMLElement|null>(null)
 const graded=grade!==null,done=isComplete(board),locked=useMemo(()=>new Set(board.locks),[board.locks]),taken=useMemo(()=>new Set(picksOf(board)),[board])
 const bandName=(b:Band)=>tx(`lu.band.${b}`)
 const iso=(name:string)=>`\u2068${name}\u2069`
 const worn=useMemo(()=>kitFor({fromYear:m.year,toYear:m.year},'us',wardrobe),[m.year,wardrobe])
 // one shirt for every man in the room — a shirt can never tell you who started
 const shirtOf=(name:string):ReactNode=><ClubShirt player={{id:name,fromYear:m.year,toYear:m.year}} wardrobe={wardrobe} side="us" className="h-full w-full"/>
 const sheetData=grade?sheetOf(board,grade):null
 const marks=useMemo(()=>sheetData?new Map<string,Mark>(sheetData.rows.map(r=>[r.name,r.mark])):null,[sheetData])

 const say=(text:string,bad=false)=>{setNotice(text);setWarn(bad)}
 function commit(next:Board){setBoard(next);markStep(filled(next))}
 function put(name:string,band:Band,from:Element|null){
  if(graded)return
  const here=bandOf(board,name)
  if(here===band)return
  const next=place(board,name,band)
  if(next===board){say(tx('lu.prompt.full12'),true);return}
  commit(next);setAimed(aimAfter(next,band));setActive(null)
  say(here?tx('lu.moved',{name:iso(name),band:bandName(band)}):tx('lu.placed',{name:iso(name),band:bandName(band),n:filled(next)}))
  if(from)flyShirt(from,`[data-drop="band-${band}"]`,shortName(name))
  else window.requestAnimationFrame(()=>firePickFxAt(document.querySelector(`[data-man="${CSS.escape(name)}"]`),{label:shortName(name)}))
 }
 const zoneBand=(zone:string):Band|null=>{const b=zone.startsWith('band-')?zone.slice(5):'';return isBand(b)?b:null}
 const pickFromRail=(name:string,from:Element|null)=>{
  if(graded)return
  if(onBoard(board,name)){setActive(name);say('');return}
  put(name,aimed,from)
 }
 const dropOnBand=(zone:string,name:string)=>{const b=zoneBand(zone);if(b&&!onBoard(board,name))put(name,b,null)}
 const moveMan=(name:string,zone:string)=>{const b=zoneBand(zone);if(b)put(name,b,null)}
 const tapBand=(b:Band)=>{
  if(graded)return
  if(active&&onBoard(board,active)){put(active,b,null);return}
  setAimed(b);say('')
 }
 const tapMan=(name:string)=>{if(!graded){setActive(a=>a===name?null:name);say('')}}
 const sendBack=(name:string)=>{commit(remove(board,name));setActive(null);say(tx('lu.removed',{name:iso(name),n:filled(board)-1}))}
 const lock=(name:string)=>{
  const r=toggleLock(board,name)
  if(!r.ok){say(r.reason==='full'?tx('lu.lock.full'):'',true);return}
  setBoard(r.board);say('')
 }
 async function ask(){
  if(asking||notes.length>=m.coachBudget)return
  const names=picksOf(board)
  if(!names.length){say(tx('lu.coach.need'),true);return}
  setAsking(true)
  try{const r=await askLineupCoach(club,version,m.id,names,notes.length);if(r)setNotes(x=>[...x,r]);else say(tx('lu.coach.spent'),true)}
  catch{setErr(true)}
  finally{setAsking(false)}
 }
 function handIn(){
  const names=wire(board,m.pool);if(!names)return
  start(async()=>{
   try{
    const r=await gradeLineup(club,version,m.id,names)
    if(!r){setErr(true);return}
    setErr(false);setGrade(r);setActive(null);setSheet('result');say('')
    completeRun(club,'lineup',`lineup:${version}:${n}:${m.id}`,r.correct)
   }catch{setErr(true)}
  })
 }
 async function share(){
  if(!grade)return
  const bandNames=Object.fromEntries(BANDS.map(b=>[b,bandName(b)])) as Record<Band,string>
  const text=shareText({club:clubName,title:m.title,on:m.on,board,g:grade,bandNames,url:`${location.origin}/clubs/${club}/lineup`})
  try{
   if(typeof navigator.share==='function'){await navigator.share({title:tx('lu.share.title'),text});say(tx('lu.result.shared'))}
   else{await navigator.clipboard.writeText(text);say(tx('lu.result.copied'))}
  }catch(e){if((e as Error)?.name!=='AbortError')say(tx('lu.result.shareFail'),true)}
 }
 const open=(s:Sheet)=>(e?:React.SyntheticEvent)=>{opener.current=(e?.currentTarget as HTMLElement)??null;setSheet(s)}
 const close=()=>{setSheet(null);opener.current?.focus?.()}

 const pitchLabels:PitchLabels=useMemo(()=>({band:bandName,short:b=>tx(`lu.short.${b}`),place:(b,k)=>tx('lu.bandPlace',{band:bandName(b),n:k}),man:(name,band,lk)=>`${tx('lu.manAria',{name,band})}${lk?` · ${tx('lu.manLocked')}`:''}`,lock:tx('lu.lockMark'),marks:{right:tx('lu.result.right'),wrong:tx('lu.result.wrong')}}),
 // eslint-disable-next-line react-hooks/exhaustive-deps -- `tx` only closes over `copy`
 [copy])
 const rackLabels:RackLabels={taken:tx('lu.rack.taken'),aria:(name,tk)=>tx(tk?'lu.rack.ariaTaken':'lu.rack.aria',{name})}
 const c=counts(board),left=m.coachBudget-notes.length
 const noteText=(x:CoachNote)=>x.kind==='stillOut'?tx('lu.coach.stillOut',{n:x.n}):tx('lu.coach.benchOn',{n:x.n,of:x.of})
 const prompt=graded?tx('lu.prompt.graded'):active?tx('lu.prompt.man',{name:iso(active)}):done?tx('lu.prompt.full'):tx('lu.prompt.start',{band:bandName(aimed)})
 const shirtLine=worn.source==='archive'?tx('lu.info.shirt',{year:worn.kit.season}):tx('lu.info.shirtPlain')
 const facts=<dl className={css.kv}>
  <dt>{tx('lu.info.date')}</dt><dd>{m.on?<bdi>{m.on}</bdi>:tx('lu.info.unknownDate')}</dd>
  <dt>{tx('lu.info.competition')}</dt><dd><bdi>{m.competition||'—'}</bdi></dd>
  {m.score&&<><dt>{tx('lu.info.score')}</dt><dd><bdi>{m.score}</bdi></dd></>}
 </dl>
 const rules=<ol className={css.rules}>{[1,2,3,4].map(i=><li key={i}>{tx(`lu.rules.${i}`)}</li>)}</ol>
 const activeLocked=active?locked.has(active):false

 return <>
  <div className={css.layout}>
   <div className={css.pitchCol}>
    <header className={css.plate}>
     <span className={css.plateNo}>{tx('lu.matchOf',{n:(n%total)+1,m:total})}</span>
     <span className={css.plateText}><h2 className={css.plateTitle} lang={contentLocale} dir="auto">{m.title}</h2><p className={css.plateMeta} lang={contentLocale} dir="auto">{m.competition}{m.on?` · ${m.on}`:''}</p></span>
     <button type="button" className={`min-h-tap ${css.plateBtn}`} onClick={open('info')} aria-label={tx('lu.info')} title={tx('lu.info')}>i</button>
    </header>
    <div className={css.counters} aria-hidden="true">
     <span className={css.total} data-done={done}>{tx('lu.total',{n:filled(board)})}</span>
     {BANDS.map(b=><span key={b} className={css.count}>{tx(`lu.short.${b}`)}<b>{c[b]}</b></span>)}
     <span className={css.count} title={tx('lu.locks',{n:board.locks.length})}>{tx('lu.lockMark')}<b>{board.locks.length}/3</b></span>
    </div>
    <div className={css.pitchBox}><div className={css.pitchIn}>
     <BandPitch board={board} aimed={graded?null:aimed} active={active} marks={marks} locked={locked} graded={graded} shirtOf={shirtOf} plateOf={shortName} labels={pitchLabels} contentLocale={contentLocale} onBand={tapBand} onMan={tapMan} onMove={moveMan}/>
    </div></div>
   </div>

   <div className={css.dock}>
    <p className={css.prompt} data-tone={warn?'warn':undefined} data-testid="lineup-prompt">{prompt}</p>
    <div className={css.wall}>
     <div className={css.wallHead}>
      <p className={css.wallTarget}>{tx('lu.rack.title')} · {tx('lu.rack.into')} <b>{bandName(aimed)}</b></p>
      <button type="button" className={`min-h-tap ${css.wallBtn} ${css.allBtn}`} onClick={open('all')}>{tx('lu.rack.all')}</button>
     </div>
     <LockerRack pool={m.pool} taken={taken} held={active} shirtOf={shirtOf} labels={rackLabels} contentLocale={contentLocale} onPick={pickFromRail} onDrop={dropOnBand} listLabel={tx('lu.rack.list')}/>
    </div>
    <div className={css.actions}>
     {graded
      ?<><button type="button" className={`min-h-tap ${css.btn} ${css.btnWide}`} onClick={open('result')} data-testid="lineup-result-open">{tx('lu.result.open')}</button>
        <button type="button" className={`min-h-tap ${css.btn} ${css.btnMain}`} onClick={onNext} data-testid="lineup-next">{total>1?tx('lu.next'):tx('lu.again')} →</button></>
      :active
       ?<><button type="button" className={`min-h-tap ${css.btn} ${css.btnWide}`} onClick={()=>lock(active)} aria-pressed={activeLocked} data-testid="lineup-lock">{activeLocked?tx('lu.man.unlock'):tx('lu.man.lock')}</button>
         <button type="button" className={`min-h-tap ${css.btn} ${css.btnWide}`} onClick={()=>sendBack(active)} data-testid="lineup-back">{tx('lu.man.back')}</button>
         <button type="button" className={`min-h-tap ${css.btn} ${css.btnMain}`} onClick={()=>setActive(null)}>{tx('lu.man.done')}</button></>
       :<><button type="button" className={`min-h-tap ${css.btn}`} onClick={open('coach')} disabled={m.coachBudget===0} data-testid="lineup-coach">{tx('lu.coach')}</button>
         <button type="button" className={`min-h-tap ${css.btn} ${css.btnMain}`} onClick={open('handin')} disabled={!done||pending} data-testid="lineup-handin">{pending?tx('lu.checking'):tx('lu.handin')}<span aria-hidden="true">→</span></button></>}
    </div>
    <p className={css.status} role="status" data-testid="lineup-status">{err?copy.unavailable:notice}</p>
   </div>

   <aside className={css.info} aria-label={tx('lu.rules.title')}>
    <div className={css.infoCard}><h3>{tx('lu.info')}</h3>{facts}<p className={css.fine}>{shirtLine}</p></div>
    <div className={css.infoCard}><h3>{tx('lu.rules.title')}</h3>{rules}</div>
   </aside>
  </div>

  <SlideSheet open={sheet==='info'} onClose={close} title={tx('lu.info')} closeLabel={copy['play.close']}>
   <div className={css.sheetBody}>{facts}<p className={css.fine}>{shirtLine}</p><p className={css.fine}>{tx('lu.info.bands')}</p><h3 className={css.fine}>{tx('lu.rules.title')}</h3>{rules}</div>
  </SlideSheet>

  <SlideSheet open={sheet==='coach'} onClose={close} title={tx('lu.coach.title')} closeLabel={copy['play.close']}
   footer={<div className={css.actions}><button type="button" className={`min-h-tap ${css.btn} ${css.btnMain}`} disabled={asking||left<=0||!filled(board)} onClick={ask} data-testid="lineup-coach-ask">{asking?tx('lu.checking'):left>0?tx('lu.coach.ask'):tx('lu.coach.spent')}</button></div>}>
   <div className={css.sheetBody}>
    <p className={css.fine}>{tx('lu.coach.hint')}</p>
    <ul className={css.notes} data-testid="lineup-notes">{notes.map((x,i)=><li key={i}>{noteText(x)}</li>)}</ul>
    <p className={css.fine}>{tx('lu.coach.left',{n:Math.max(0,left)})}</p>
    {!filled(board)&&<p className={css.fine}>{tx('lu.coach.need')}</p>}
   </div>
  </SlideSheet>

  <SlideSheet open={sheet==='all'} onClose={close} title={tx('lu.rack.allTitle')} size="full" closeLabel={copy['play.close']}>
   <LockerRack grid pool={m.pool} taken={taken} held={active} shirtOf={shirtOf} labels={rackLabels} contentLocale={contentLocale} onPick={(name,from)=>{pickFromRail(name,from);close()}} onDrop={dropOnBand} listLabel={tx('lu.rack.list')}/>
  </SlideSheet>

  <SlideSheet open={sheet==='handin'} onClose={close} title={tx('lu.handin.title')} closeLabel={copy['play.close']}
   footer={<div className={css.actions}>
    <button type="button" className={`min-h-tap ${css.btn} ${css.btnWide}`} onClick={close}>{tx('lu.handin.back')}</button>
    <button type="button" className={`min-h-tap ${css.btn} ${css.btnMain}`} disabled={pending||!done} onClick={()=>{setSheet(null);handIn()}} data-testid="lineup-handin-go">{tx('lu.handin.go')}</button></div>}>
   <div className={css.sheetBody}><p className={css.fine}>{tx('lu.handin.body')}</p>{err&&<p role="alert">{copy.unavailable}</p>}</div>
  </SlideSheet>

  <SlideSheet open={sheet==='result'&&graded} onClose={close} title={tx('lu.result.title')} size="full" closeLabel={copy['play.close']}
   footer={<div className={css.actionsGrid}>
    <button type="button" className={`min-h-tap ${css.btn} ${css.btnMain}`} onClick={()=>{setSheet(null);onNext()}} data-testid="lineup-sheet-next">{total>1?tx('lu.next'):tx('lu.again')} →</button>
    <button type="button" className={`min-h-tap ${css.btn}`} onClick={share}>{tx('lu.result.share')}</button>
    <button type="button" className={`min-h-tap ${css.btn}`} onClick={close}>{tx('lu.result.review')}</button></div>}>
   {sheetData&&grade&&<div className={css.sheetBody} data-testid="lineup-result">
    <div className={css.score}>
     <p className={css.scoreKicker}>{tx('lu.result.kicker')} · <bdi lang={contentLocale}>{m.title}</bdi></p>
     <p className={css.scoreNum}>{sheetData.correct}/11</p>
     <p className={css.scoreLine}>{sheetData.correct===11?tx('lu.result.perfect'):sheetData.correct>=8?tx('lu.result.strong'):tx('lu.result.keep')}</p>
    </div>
    <div className={css.sheetBands} aria-label={tx('lu.result.yours')}>
     {[...BANDS].reverse().map(b=>{
      const rows=sheetData.rows.filter(r=>r.band===b)
      return rows.length>0&&<div key={b} className={css.sheetBand}><b>{tx(`lu.short.${b}`)}</b>
       <div className={css.chips} lang={contentLocale}>{rows.map(r=><span key={r.name} className={css.chip} data-mark={r.mark}><span className={css.chipShirt}>{shirtOf(r.name)}</span><span dir="auto">{r.name}</span><span className={css.chipMark} aria-label={tx(r.mark==='right'?'lu.result.right':'lu.result.wrong')}>{r.mark==='right'?'✓':'✗'}{r.locked?` ${tx('lu.lockMark')}`:''}</span></span>)}</div></div>
     })}
    </div>
    {sheetData.missed.length>0&&<div><h3 className={css.fine}>{tx('lu.result.missed')}</h3>
     <div className={css.chips} lang={contentLocale}>{sheetData.missed.map(name=><span key={name} className={css.chip} data-ghost="true"><span className={css.chipShirt}>{shirtOf(name)}</span><span dir="auto">{name}</span></span>)}</div></div>}
    <div className={css.tally}>
     {sheetData.locksUsed>0&&<span>{tx('lu.result.locks',{n:sheetData.locksRight,of:sheetData.locksUsed})}</span>}
     <span>{tx('lu.result.coach',{n:notes.length})}</span>
    </div>
    {m.sources.length>0&&<div><h3 className={css.fine}>{tx('lu.result.sources')}</h3>
     <ul className={css.sources}>{m.sources.map((s,i)=><li key={i}>{s.url?<a href={s.url} target="_blank" rel="noopener noreferrer">{s.title}</a>:s.title}</li>)}</ul></div>}
    {total===1&&<p className={css.fine}>{tx('lu.onlyOne')}</p>}
    <p className={css.status} role="status">{notice}</p>
   </div>}
  </SlideSheet>
 </>
}
