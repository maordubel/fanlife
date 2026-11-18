'use client'
import {useEffect,useMemo,useState,type ReactNode} from 'react'
import {createPortal} from 'react-dom'
import Link from 'next/link'
import {StickerBack,StickerFace,livery} from './Sticker'
import {albumSound} from './sound'
import {Ritual} from './ritual/Ritual'
import {StickScene} from './ritual/StickScene'
import {Cover} from './ritual/Cover'
import {Swaps,type SwapActions} from './Swaps'
import {daysToPick,spareFive,wingView,type CatalogRow,type Me,type Pressed,type Slot,type Variant,type Wing,type WingInfo} from '@/lib/album/view'

/**
 * THE ALBUM (18.11.2026). An eighties sticker album you can almost touch: ivory pages, a spine and staples, numbered
 * frames with the man's name under them, stickers set at one fixed tilt with a soft shadow. The daily ritual: an envelope
 * waits on the table, you tear the strip, each sticker is turned over on its own (NEW for the album, SPARE to trade), then
 * stuck into its slot. Phone: one page at a time, big enough to read. Desktop: the open spread.
 * Every intent goes to the database's own functions (server authority); this screen only draws what they answer.
 */
type R<T>={ok:true;data:T}|{ok:false;error:string}
import type {Drawn} from './ritual/Ritual'
export type {Drawn}
export type AlbumActions=SwapActions&{
 start:(wing:string,name:string)=>Promise<R<Me>>;wing:(wing:string)=>Promise<R<unknown>>;daily:()=>Promise<R<Drawn>>
 opened:(id:string)=>Promise<R<unknown>>;stick:(id:string)=>Promise<R<unknown>>;pick:(id:string)=>Promise<R<unknown>>
 trade:(give:string[],want:string)=>Promise<R<unknown>>;refresh:()=>Promise<R<Me>>;signIn:()=>void
}
export type AlbumProps={wings:WingInfo[];catalog:CatalogRow[];eras:Record<string,string>;kits:Record<string,string>;pressed:Record<string,Pressed>;me:Me|null;signedIn:boolean;profiles:boolean;actions:AlbumActions;error?:string|null}

const TILT=[-1.6,1.1,-0.7,1.5,-1.2,0.6]
const since=(iso:string)=>new Date(iso).toLocaleDateString('en-GB',{month:'long',year:'numeric',timeZone:'Europe/Athens'})

function Overlay({children,label}:{children:ReactNode;label:string}){
 const [el,setEl]=useState<HTMLElement|null>(null)
 useEffect(()=>{setEl(document.body);const o=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{document.body.style.overflow=o}},[])
 return el?createPortal(<div className="alb alb-portal z-[60]" dir="ltr" lang="en" role="dialog" aria-modal="true" aria-label={label}>{children}</div>,el):null
}

function SlotView({s,w,i,act}:{s:Slot;w:WingInfo;i:number;act:{stick:(s:Slot)=>void;pick:((s:Slot)=>void)|null;trade:((s:Slot)=>void)|null;open:(s:Slot)=>void;busy:boolean}}){
 return <li className="alb-slot" data-state={s.stuck?'stuck':s.have?'held':'empty'}>
  <div className="alb-frame">
   <span className="alb-frame-no" aria-hidden="true">{String(s.slot).padStart(2,'0')}</span>
   {s.stuck?<button type="button" className="alb-stuck" style={{['--tilt' as string]:`${TILT[i%TILT.length]}deg`}} onClick={()=>act.open(s)} aria-label={`${s.name}, ${s.code}`}><StickerFace s={s} w={w} variant={s.best}/></button>
    :s.have?<button type="button" className="alb-peel min-h-tap" disabled={act.busy} onClick={()=>act.stick(s)}><span>Stick</span><small>you hold it</small></button>
    :<span className="alb-empty" aria-hidden="true"><svg viewBox="0 0 84 96"><ellipse cx="42" cy="34" rx="20" ry="25"/><path d="M4 96C8 70 24 62 42 62s34 8 38 34Z"/></svg></span>}
  </div>
  <p className="alb-cap"><span className="tabular-nums">{s.code}</span> <b dir="auto">{s.name}</b>{s.copies>1&&<em className="alb-spares">+{s.copies-1}</em>}</p>
  {!s.have&&(act.pick||act.trade)&&<p className="alb-slot-act">{act.pick&&<button type="button" className="alb-link min-h-tap" disabled={act.busy} onClick={()=>act.pick!(s)}>Use a pick</button>}{act.trade&&<button type="button" className="alb-link min-h-tap" disabled={act.busy} onClick={()=>act.trade!(s)}>Trade 5 spares</button>}</p>}
 </li>
}

function PageView({p,w,act,side}:{p:Wing['pages'][number];w:WingInfo;act:Parameters<typeof SlotView>[0]['act'];side?:'left'|'right'}){
 return <section className="alb-page" data-side={side} aria-label={`Page ${p.no}: ${p.era}`}>
  <header className="alb-page-head"><span className="alb-k">Page {p.no}</span><h3>{p.era}</h3><span className="alb-page-done tabular-nums">{p.done}/{p.slots.length}</span></header>
  <ol className="alb-grid">{p.slots.map((s,i)=><SlotView key={s.id} s={s} w={w} i={i} act={act}/>)}</ol>
  <p className="alb-folio tabular-nums" aria-hidden="true">— {p.no+1} —</p>
 </section>
}

export function AlbumApp({wings,catalog,eras,kits,pressed,me:initial,signedIn,profiles,actions,error:initialError=null}:AlbumProps){
 const [me,setMe]=useState<Me|null>(initial),[err,setErr]=useState<string|null>(initialError),[note,setNote]=useState<string|null>(null),[busy,setBusy]=useState(false)
 const [draw,setDraw]=useState<Drawn|null>(null),[page,setPage]=useState(0),[viewWing,setViewWing]=useState<string|null>(initial?.book?.wing??null),[detail,setDetail]=useState<Slot|null>(null),[back,setBack]=useState(false)
 const [pickWing,setPickWing]=useState<string>(wings[0]?.id??''),[coverName,setCoverName]=useState('')
 const [muted,setMutedS]=useState(false)
 useEffect(()=>{setMutedS(albumSound.muted)},[])
 const setMuted=(m:boolean)=>{albumSound.setMuted(m);setMutedS(m)}
 const [stickOne,setStickOne]=useState<Slot|null>(null),[showSwaps,setShowSwaps]=useState(false)
 const [covered,setCovered]=useState(true)
 useEffect(()=>{try{if(sessionStorage.getItem('alb-cover')==='1')setCovered(false)}catch{/* */}},[])
 const [leaf,setLeaf]=useState<{from:number;dir:1|-1;k:number}|null>(null)
 const turnTo=(n:number,cur:number,max:number)=>{const to=Math.max(0,Math.min(max,n));if(to===cur)return;setLeaf({from:cur,dir:to>cur?1:-1,k:Date.now()});albumSound.page();setPage(to)}
 const [step,setStep]=useState(1)
 useEffect(()=>{const m=window.matchMedia('(min-width: 64rem)'),f=()=>setStep(m.matches?2:1);f();m.addEventListener('change',f);return()=>m.removeEventListener('change',f)},[])
 const byId=useMemo(()=>new Map(wings.map(w=>[w.id,w])),[wings])
 const views=useMemo(()=>wings.map(w=>wingView(w,catalog,me?.copies??[],pressed,eras,kits)),[wings,catalog,me,pressed,eras,kits])
 const allSlots=useMemo(()=>new Map(views.flatMap(v=>v.pages.flatMap(p=>p.slots)).map(s=>[s.id,s])),[views])
 const wing=views.find(v=>v.info.id===(viewWing??me?.book?.wing))??views[0]
 const pageOf=(id:string)=>views.flatMap(v=>v.pages).find(p=>p.slots.some(x=>x.id===id))
 const reload=async()=>{const r=await actions.refresh();if(r.ok)setMe(r.data)}
 const run=async(f:()=>Promise<R<unknown>>,ok:string)=>{setBusy(true);setErr(null);setNote(null);const r=await f();setBusy(false);if(!r.ok){setErr(r.error);return false}setNote(ok);await reload();return true}

 if(!signedIn)return <main id="main" className="alb alb-front" dir="ltr" lang="en">
  <div className="alb-cover"><span className="alb-cover-logo" aria-hidden="true"/><p className="alb-k">FAN LIFE presents</p><h1 className="alb-title">The Album</h1>
   <p className="alb-lede">One sticker album for every FAN LIFE club. A packet every day you come in, two stickers inside — from any club, any era. Stick yours in, swap the rest with other collectors.</p>
   <button type="button" className="alb-btn big min-h-tap" onClick={actions.signIn}>Sign in with Google to open your album</button>
   <p className="alb-fine">Free. Your album is kept with your account, on every device.</p></div>
 </main>

 if(!me?.book)return <main id="main" className="alb alb-front" dir="ltr" lang="en">
  <div className="alb-cover"><span className="alb-cover-logo" aria-hidden="true"/><p className="alb-k">Open your album</p><h1 className="alb-title">The Album</h1>
   <fieldset className="alb-wings"><legend>Your club — its colours go on your cover</legend>
    <div className="alb-wing-grid">{wings.map(w=><label key={w.id} className="alb-wing-pick min-h-tap" data-on={pickWing===w.id||undefined} style={livery(w)}>
     <input type="radio" name="wing" value={w.id} className="sr-only" checked={pickWing===w.id} onChange={()=>setPickWing(w.id)}/>
     {w.crest?/* eslint-disable-next-line @next/next/no-img-element -- a crest ships exactly as recorded */<img src={w.crest} alt="" width="40" height="40"/>:<span className="alb-initials">{w.initials}</span>}<span>{w.name}</span></label>)}</div>
   </fieldset>
   <label className="alb-field"><span>Name on the cover</span><input className="min-h-tap" value={coverName} maxLength={28} onChange={e=>setCoverName(e.target.value)} placeholder="Your name"/></label>
   {err&&<p className="alb-err" role="alert">{err}</p>}
   <button type="button" className="alb-btn big min-h-tap" disabled={busy||!pickWing} onClick={async()=>{setBusy(true);setErr(null);const r=await actions.start(pickWing,coverName);setBusy(false);if(!r.ok){setErr(r.error);return}setMe(r.data);setViewWing(pickWing)}}>Open my album · 3 envelopes inside</button>
   <p className="alb-fine">Every packet comes from the whole album: every club that is open on FAN LIFE, more as new clubs join.</p></div>
 </main>

 const book=me.book,waiting=me.waiting??[],claimed=!!book.claimedToday
 const act={busy,open:(s:Slot)=>setDetail(s),
  stick:(s:Slot)=>setStickOne(s),
  pick:book.picks>0?(s:Slot)=>void run(()=>actions.pick(s.id),`${s.name} — picked. Stick him in.`):null,
  trade:wing&&spareFive(views)?(s:Slot)=>{const five=spareFive(views);if(five)void run(()=>actions.trade(five,s.id),`Five spares for ${s.name}. Stick him in.`)}:null}
 const openNext=async()=>{
  if(waiting.length){const e=waiting[0]!;setDraw({envelope:e.id,stickers:e.stickers,variants:e.variants,fresh:e.fresh});return}
  setBusy(true);setErr(null);const r=await actions.daily();setBusy(false);if(!r.ok){setErr(r.error);return}setDraw(r.data)
 }
 const closeDraw=async()=>{const d=draw;setDraw(null);if(d)await actions.opened(d.envelope);await reload()}
 const pages=wing?.pages??[],spread=Math.floor(page/2)*2
 return <main id="main" className="alb" dir="ltr" lang="en" style={wing?livery(wing.info):undefined}>
  <header className="alb-mast">
   <div className="alb-mast-cover"><span className="alb-cover-logo sm" aria-hidden="true"/><div><p className="alb-k">{book.cover.name?`${book.cover.name}’s album`:'Your album'} · collector since {since(book.since)}</p><h1 className="alb-title sm">The Album</h1></div></div>
   <dl className="alb-stats">
    <div><dt>The album</dt><dd className="tabular-nums">{views.reduce((n,v)=>n+v.stuck,0)}/{views.reduce((n,v)=>n+v.total,0)}</dd></div>
    <div><dt>Picks</dt><dd className="tabular-nums">{book.picks}</dd></div>
    <div><dt>This week</dt><dd><span className="alb-dots" aria-label={`${book.weekDays} of 5 days — ${daysToPick(book.weekDays)} to a pick`}>{Array.from({length:5},(_,i)=><i key={i} data-on={i<book.weekDays||undefined}/>)}</span></dd></div>
   </dl>
  </header>
  {err&&<p className="alb-err" role="alert">{err}</p>}{note&&<p className="alb-ok" role="status">{note}</p>}
  <section className="alb-desk" aria-label="Your envelope">
   {waiting.length||!claimed?<button type="button" className="alb-env-card min-h-tap" disabled={busy} onClick={()=>void openNext()}>
     <span className="alb-env-mini" aria-hidden="true"/><span><b>{waiting.length?`${waiting.length} envelope${waiting.length===1?'':'s'} waiting`:'Today’s envelope is here'}</b><small>Two stickers from the whole album · tap to tear it open</small></span></button>
    :<p className="alb-env-done"><b>Today’s envelope is open.</b> The next one waits for you tomorrow.</p>}
   <details className="alb-change"><summary className="min-h-tap">My club: {byId.get(book.wing)?.name} · change</summary>
    <div className="alb-wing-grid">{wings.map(w=><button key={w.id} type="button" className="alb-wing-pick min-h-tap" data-on={book.wing===w.id||undefined} style={livery(w)} disabled={busy}
     onClick={()=>void run(()=>actions.wing(w.id),`${w.name} is your club — its colours on your cover.`).then(ok=>{if(ok){setViewWing(w.id);setPage(0)}})}>
     {w.crest?/* eslint-disable-next-line @next/next/no-img-element -- a crest ships exactly as recorded */<img src={w.crest} alt="" width="32" height="32"/>:<span className="alb-initials">{w.initials}</span>}<span>{w.name}</span></button>)}</div></details>
  </section>
  <nav className="alb-wing-tabs" aria-label="Clubs in the album"><button type="button" className="alb-tab alb-tab-swaps min-h-tap" aria-pressed={showSwaps} onClick={()=>setShowSwaps(x=>!x)}>⇄ Swaps</button>{views.map(v=><button key={v.info.id} type="button" className="alb-tab min-h-tap" aria-pressed={v.info.id===wing?.info.id} onClick={()=>{setShowSwaps(false);setViewWing(v.info.id);setPage(0)}}>{v.info.name} <small className="tabular-nums">{v.stuck}/{v.total}</small></button>)}</nav>
  {showSwaps&&<Swaps slots={allSlots} wings={byId} actions={actions} onDone={()=>void reload()}/>}
  {!showSwaps&&wing&&covered&&<Cover w={wing.info} name={book.cover.name} total={views.reduce((n,v)=>n+v.total,0)} chips={wings.map(x=>x.primary)} onOpen={()=>{setCovered(false);try{sessionStorage.setItem('alb-cover','1')}catch{/* */}}}/>}
  {!showSwaps&&wing&&!covered&&<div className="alb-book rk-book-in" aria-label={`${wing.info.name} wing`}>
   <div className="alb-phone rk-turn">{pages[page]&&<PageView p={pages[page]!} w={wing.info} act={act}/>}
    {leaf&&step===1&&pages[leaf.from]&&<div key={leaf.k} className="rk-leaf" data-dir={leaf.dir} onAnimationEnd={()=>setLeaf(null)} aria-hidden="true"><PageView p={pages[leaf.from]!} w={wing.info} act={act}/></div>}</div>
   <div className="alb-spread">{pages[spread]&&<PageView p={pages[spread]!} w={wing.info} act={act} side="left"/>}<span className="alb-spine" aria-hidden="true"><i/><i/></span>{pages[spread+1]&&<PageView p={pages[spread+1]!} w={wing.info} act={act} side="right"/>}
    {leaf&&step===2&&<div key={leaf.k} className="rk-leaf rk-leaf-spread" data-dir={leaf.dir} onAnimationEnd={()=>setLeaf(null)} aria-hidden="true">{pages[leaf.dir>0?Math.floor(leaf.from/2)*2+1:Math.floor(leaf.from/2)*2]&&<PageView p={pages[leaf.dir>0?Math.floor(leaf.from/2)*2+1:Math.floor(leaf.from/2)*2]!} w={wing.info} act={act} side={leaf.dir>0?'right':'left'}/>}</div>}</div>
   <nav className="alb-pager" aria-label="Pages">
    <button type="button" className="alb-btn ghost min-h-tap" disabled={page===0} onClick={()=>turnTo(Math.floor(page/step)*step-step,page,pages.length-1)}>Back</button>
    <span className="alb-pages">{pages.map((p,i)=><button key={p.no} type="button" className="alb-pg min-h-tap" aria-current={i===page||undefined} aria-label={`Page ${p.no}`} onClick={()=>turnTo(i,page,pages.length-1)}>{p.no}</button>)}</span>
    <button type="button" className="alb-btn ghost min-h-tap" disabled={page+step>pages.length-1&&Math.floor(page/step)*step+step>pages.length-1} onClick={()=>turnTo(Math.floor(page/step)*step+step,page,pages.length-1)}>Next</button>
   </nav>
  </div>}
  <p className="alb-fine">One envelope a day · every fifth envelope brings a new sticker if you still miss any · five collecting days in a week earn a pick · five spares buy any missing sticker. Photographs are free-licence pictures from Wikimedia Commons; turn a sticker over for its credit.</p>
  {draw&&<Overlay label="Your packet"><Ritual draw={draw} wings={byId} slots={allSlots} pageOf={pageOf} muted={muted} setMuted={setMuted}
   onStick={async id=>{const r=await actions.stick(id);if(!r.ok)setErr(r.error);return r.ok}} onDone={()=>void closeDraw()}/></Overlay>}
  {stickOne&&wing&&pageOf(stickOne.id)&&<Overlay label={`Stick ${stickOne.name}`}><div className="rk" style={livery(byId.get(stickOne.id.split(':')[0]!)!)}>
   <StickScene s={stickOne} w={byId.get(stickOne.id.split(':')[0]!)!} variant={stickOne.best} page={pageOf(stickOne.id)!}
    onStick={async()=>{const r=await actions.stick(stickOne.id);if(!r.ok)setErr(r.error);return r.ok}}
    onDone={ok=>{setStickOne(null);if(ok){setNote(`${stickOne.name} is in your album.`);void reload()}}}/></div></Overlay>}
  {detail&&wing&&<Overlay label={detail.name}><div className="alb-table alb-detail">
   <div className="alb-flip" data-back={back||undefined}>{back?<StickerBack s={detail} w={byId.get(detail.id.split(':')[0]!)!} profiles={profiles}/>:<StickerFace s={detail} w={byId.get(detail.id.split(':')[0]!)!} variant={detail.best} big/>}</div>
   <div className="alb-reveal-act"><button type="button" className="alb-btn min-h-tap" onClick={()=>setBack(b=>!b)}>{back?'Front':'Turn it over'}</button><button type="button" className="alb-btn ghost min-h-tap" onClick={()=>{setDetail(null);setBack(false)}}>Close</button></div>
  </div></Overlay>}
 </main>
}
