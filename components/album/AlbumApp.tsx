'use client'
import {useCallback,useEffect,useMemo,useRef,useState,type CSSProperties,type ReactNode} from 'react'
import {createPortal} from 'react-dom'
import Link from 'next/link'
import {daysToPick,spareFive,wingView,type CatalogRow,type Me,type Pressed,type Slot,type Variant,type Wing,type WingInfo} from '@/lib/album/view'

/**
 * THE ALBUM (18.11.2026). An eighties sticker album you can almost touch: ivory pages, a spine and staples, numbered
 * frames with the man's name under them, stickers set at one fixed tilt with a soft shadow. The daily ritual: an envelope
 * waits on the table, you tear the strip, each sticker is turned over on its own (NEW for the album, SPARE to trade), then
 * stuck into its slot. Phone: one page at a time, big enough to read. Desktop: the open spread.
 * Every intent goes to the database's own functions (server authority); this screen only draws what they answer.
 */
type R<T>={ok:true;data:T}|{ok:false;error:string}
export type Drawn={envelope:string;stickers:string[];variants:Variant[];fresh:boolean[];pickEarned?:boolean;already?:boolean}
export type AlbumActions={
 start:(wing:string,name:string)=>Promise<R<Me>>;wing:(wing:string)=>Promise<R<unknown>>;daily:()=>Promise<R<Drawn>>
 opened:(id:string)=>Promise<R<unknown>>;stick:(id:string)=>Promise<R<unknown>>;pick:(id:string)=>Promise<R<unknown>>
 trade:(give:string[],want:string)=>Promise<R<unknown>>;refresh:()=>Promise<R<Me>>;signIn:()=>void
}
export type AlbumProps={wings:WingInfo[];catalog:CatalogRow[];eras:Record<string,string>;kits:Record<string,string>;pressed:Record<string,Pressed>;me:Me|null;signedIn:boolean;profiles:boolean;actions:AlbumActions;error?:string|null}

const TILT=[-1.6,1.1,-0.7,1.5,-1.2,0.6]
const livery=(w:WingInfo):CSSProperties=>({['--club-primary' as string]:w.primary,['--club-on-primary' as string]:w.on})
const since=(iso:string)=>new Date(iso).toLocaleDateString('en-GB',{month:'long',year:'numeric',timeZone:'Europe/Athens'})

/** a short paper tear — synthesised, never a file; off when the fan mutes it (kept on the device) */
function useTear(){
 const [muted,setMuted]=useState(false)
 useEffect(()=>{try{setMuted(localStorage.getItem('alb-mute')==='1')}catch{/* no storage */}},[])
 const toggle=()=>setMuted(m=>{try{localStorage.setItem('alb-mute',m?'0':'1')}catch{/* */}return !m})
 const play=useCallback(()=>{if(muted)return;try{const A=(window.AudioContext||(window as unknown as {webkitAudioContext:typeof AudioContext}).webkitAudioContext),ctx=new A(),len=0.32*ctx.sampleRate,buf=ctx.createBuffer(1,len,ctx.sampleRate),d=buf.getChannelData(0)
  for(let i=0;i<len;i++){const t=i/len;d[i]=(Math.random()*2-1)*Math.pow(1-t,1.6)*(0.55+0.45*Math.sin(t*90))}
  const src=ctx.createBufferSource(),f=ctx.createBiquadFilter(),g=ctx.createGain();f.type='highpass';f.frequency.value=1400;g.gain.value=0.35
  src.buffer=buf;src.connect(f).connect(g).connect(ctx.destination);src.start();src.onended=()=>void ctx.close()}catch{/* no audio */}},[muted])
 return {muted,toggle,play}
}

/** a sticker's front. A pressed image when the press has one; otherwise the same frame drawn in CSS (flat club colour,
 * a drawn figure, the ivory name plate, the code). Gold and silver keep the club's colours and add a metal edge + stamp. */
export function StickerFace({s,w,variant='base',big=false}:{s:Pick<Slot,'slot'|'name'|'image'|'code'|'era'|'kit'>;w:WingInfo;variant?:Variant;big?:boolean}){
 const parts=s.name.split(' '),first=parts.length>1?parts.slice(0,-1).join(' '):'',last=parts.at(-1)??s.name
 return <span className="alb-stk" data-variant={variant} data-big={big||undefined} style={livery(w)}>
  {s.image?/* eslint-disable-next-line @next/next/no-img-element -- a pressed sticker ships exactly as pressed */<img className="alb-stk-img" src={s.image} alt="" loading="lazy" decoding="async"/>:<span className="alb-stk-draw" aria-hidden="true">
   <span className="alb-stk-win"><Figure kit={s.kit}/>
    <span className="alb-stk-logo"/></span>
   <span className="alb-stk-plate">{first&&<small>{first}</small>}<b style={{['--len' as string]:String(Math.max(6,last.length))}}>{last}</b></span>
   <span className="alb-stk-foot"><i>{s.code}</i><em>{w.name}{s.era?` · ${s.era}`:''}</em></span>
  </span>}
  <span className="sr-only">{s.name}, {s.code}</span>
  {variant!=='base'&&<span className="alb-stk-tag" aria-hidden="true"><b>{variant==='gold'?'Gold':'Silver'}</b>edition</span>}
 </span>
}

/** the drawn figure for a man with no free photo: an ink-lined head (no likeness invented) wearing the club's measured
 * shirt of his years, framed on the shirt exactly as every club game frames it (rule club-shirt-only) — same as the press */
function Figure({kit}:{kit:string|null}){
 return <svg viewBox="0 0 208 206" preserveAspectRatio="xMidYMax slice" className="alb-stk-fig" aria-hidden="true">
  <g className="alb-fig">
   <rect x="92" y="106" width="24" height="30" className="skin"/><ellipse cx="104" cy="85" rx="26" ry="33" className="skin"/>
   <path d="M77 78C75 42 133 42 131 78 124 60 84 60 77 78Z" className="hair"/>
   {kit?<image href={`${kit}#svgView(viewBox(0,20,336,298))`} x="-4" y="106.6" width="216.3" height="191.9" preserveAspectRatio="xMidYMin meet"/>
    :<path d="M-4 210C0 152 30 138 80 132h48c50 6 80 20 84 78Z" className="shirt"/>}
  </g>
 </svg>
}

/** the back of a sticker: the facts that do not fit the front, and the photograph's credit, readable (licence terms) */
function StickerBack({s,w,profiles}:{s:Slot;w:WingInfo;profiles:boolean}){
 const c=s.credit
 return <div className="alb-back" style={livery(w)}>
  <p className="alb-back-code">{s.code}</p>
  <h3>{s.name}</h3>
  <dl><div><dt>Club</dt><dd>{w.name}</dd></div><div><dt>Album page</dt><dd>{s.era||'—'}</dd></div></dl>
  <p className="alb-back-photo">{c?<>Photo: {c.author} · {c.licenseUrl?<a href={c.licenseUrl} target="_blank" rel="noopener noreferrer">{c.license}</a>:c.license} · <a href={c.page} target="_blank" rel="noopener noreferrer">Wikimedia Commons</a>{s.archive?' · archive photo, not from his years at the club':''}</>:'No free photograph of him has been found yet. The drawing stands in until one is.'}</p>
  {profiles&&<Link className="alb-btn min-h-tap" href={`/players/${s.person}`}>His profile — every club</Link>}
 </div>
}

function Overlay({children,label}:{children:ReactNode;label:string}){
 const [el,setEl]=useState<HTMLElement|null>(null)
 useEffect(()=>{setEl(document.body);const o=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{document.body.style.overflow=o}},[])
 return el?createPortal(<div className="alb alb-portal z-[60]" dir="ltr" lang="en" role="dialog" aria-modal="true" aria-label={label}>{children}</div>,el):null
}

/** the envelope: drag (or tap) along the strip to tear it, then each sticker one at a time */
function EnvelopeRitual({draw,wings,slots,onStick,onDone,tear}:{draw:Drawn;wings:Map<string,WingInfo>;slots:Map<string,Slot>;onStick:(id:string)=>Promise<boolean>;onDone:()=>void;tear:ReturnType<typeof useTear>}){
 const [torn,setTorn]=useState(0),[open,setOpen]=useState(false),[i,setI]=useState(0),[stuck,setStuck]=useState<Set<string>>(new Set()),[busy,setBusy]=useState(false)
 const strip=useRef<HTMLButtonElement>(null),drag=useRef<number|null>(null)
 const finish=()=>{if(open)return;setTorn(1);tear.play();setTimeout(()=>setOpen(true),420)}
 const move=(x:number)=>{const r=strip.current?.getBoundingClientRect();if(!r||drag.current===null)return;const t=Math.max(0,Math.min(1,(x-r.left)/r.width));setTorn(t);if(t>0.82)finish()}
 const id=draw.stickers[i],s=id?slots.get(id):undefined,w=id?wings.get(id.split(':')[0]!):undefined,last=i>=draw.stickers.length-1
 const club=wings.get(draw.stickers[0]?.split(':')[0]??'')
 return <Overlay label="Your envelope">
  <div className="alb-table">
   <div className="alb-table-top"><p className="alb-k">{draw.already?'Today’s envelope':'An envelope for you'}</p>
    <button type="button" className="alb-mute min-h-tap" aria-pressed={tear.muted} onClick={tear.toggle}>{tear.muted?'Sound off':'Sound on'}</button>
    <button type="button" className="alb-skip min-h-tap" onClick={()=>{if(!open)finish();else onDone()}}>{open?'Close':'Skip'}</button></div>
   {!open?<div className="alb-env" style={club?livery(club):undefined}>
    <div className="alb-env-body"><span className="alb-env-logo" aria-hidden="true"/><p className="alb-env-title">The Album</p><p className="alb-env-sub">{draw.stickers.length} stickers inside</p></div>
    <button ref={strip} type="button" className="alb-env-strip min-h-tap" style={{['--torn' as string]:String(torn)}} aria-label="Tear the envelope open"
     onPointerDown={e=>{drag.current=e.clientX;(e.target as HTMLElement).setPointerCapture?.(e.pointerId);move(e.clientX)}}
     onPointerMove={e=>move(e.clientX)} onPointerUp={()=>{drag.current=null;if(torn<0.82)setTorn(0)}} onClick={()=>{if(torn<0.05)finish()}}
     onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();finish()}}}>
     <span className="alb-env-perf" aria-hidden="true"/><span className="alb-env-hint">Pull to tear ›</span></button>
   </div>:s&&w?<div className="alb-reveal" key={id}>
    <p className="alb-reveal-count tabular-nums">{i+1} of {draw.stickers.length}</p>
    <div className="alb-reveal-card"><StickerFace s={s} w={w} variant={draw.variants[i]} big/>
     <span className="alb-stamp" data-new={draw.fresh[i]||undefined}>{draw.fresh[i]?'New for the album':'Spare to trade'}</span></div>
    <p className="alb-reveal-name"><b>{s.name}</b><span>{s.code} · {w.name}{s.era?` · ${s.era}`:''}</span></p>
    <div className="alb-reveal-act">
     {draw.fresh[i]&&!stuck.has(id!)&&<button type="button" className="alb-btn min-h-tap" disabled={busy} onClick={async()=>{setBusy(true);if(await onStick(id!))setStuck(x=>new Set(x).add(id!));setBusy(false)}}>Stick it in</button>}
     {stuck.has(id!)&&<p className="alb-ok" role="status">In the album ✓</p>}
     <button type="button" className={`alb-btn ${draw.fresh[i]&&!stuck.has(id!)?'ghost':''} min-h-tap`} onClick={()=>last?onDone():setI(i+1)}>{last?'To my album':'Next sticker'}</button>
    </div>
    {draw.pickEarned&&last&&<p className="alb-note" role="status">Five collecting days this week — you earned a pick: choose any missing sticker.</p>}
   </div>:null}
  </div>
 </Overlay>
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
 const tear=useTear()
 const [step,setStep]=useState(1)
 useEffect(()=>{const m=window.matchMedia('(min-width: 64rem)'),f=()=>setStep(m.matches?2:1);f();m.addEventListener('change',f);return()=>m.removeEventListener('change',f)},[])
 const byId=useMemo(()=>new Map(wings.map(w=>[w.id,w])),[wings])
 const views=useMemo(()=>wings.map(w=>wingView(w,catalog,me?.copies??[],pressed,eras,kits)),[wings,catalog,me,pressed,eras,kits])
 const allSlots=useMemo(()=>new Map(views.flatMap(v=>v.pages.flatMap(p=>p.slots)).map(s=>[s.id,s])),[views])
 const wing=views.find(v=>v.info.id===(viewWing??me?.book?.wing))??views[0]
 const reload=async()=>{const r=await actions.refresh();if(r.ok)setMe(r.data)}
 const run=async(f:()=>Promise<R<unknown>>,ok:string)=>{setBusy(true);setErr(null);setNote(null);const r=await f();setBusy(false);if(!r.ok){setErr(r.error);return false}setNote(ok);await reload();return true}

 if(!signedIn)return <main id="main" className="alb alb-front" dir="ltr" lang="en">
  <div className="alb-cover"><span className="alb-cover-logo" aria-hidden="true"/><p className="alb-k">FAN LIFE presents</p><h1 className="alb-title">The Album</h1>
   <p className="alb-lede">A sticker album for every club. An envelope every day you come in, two stickers inside, a wing for your club — from its first season to today.</p>
   <button type="button" className="alb-btn big min-h-tap" onClick={actions.signIn}>Sign in with Google to open your album</button>
   <p className="alb-fine">Free. Your album is kept with your account, on every device.</p></div>
 </main>

 if(!me?.book)return <main id="main" className="alb alb-front" dir="ltr" lang="en">
  <div className="alb-cover"><span className="alb-cover-logo" aria-hidden="true"/><p className="alb-k">Open your album</p><h1 className="alb-title">The Album</h1>
   <fieldset className="alb-wings"><legend>Choose the wing you collect first</legend>
    <div className="alb-wing-grid">{wings.map(w=><label key={w.id} className="alb-wing-pick min-h-tap" data-on={pickWing===w.id||undefined} style={livery(w)}>
     <input type="radio" name="wing" value={w.id} className="sr-only" checked={pickWing===w.id} onChange={()=>setPickWing(w.id)}/>
     {w.crest?/* eslint-disable-next-line @next/next/no-img-element -- a crest ships exactly as recorded */<img src={w.crest} alt="" width="40" height="40"/>:<span className="alb-initials">{w.initials}</span>}<span>{w.name}</span></label>)}</div>
   </fieldset>
   <label className="alb-field"><span>Name on the cover</span><input className="min-h-tap" value={coverName} maxLength={28} onChange={e=>setCoverName(e.target.value)} placeholder="Your name"/></label>
   {err&&<p className="alb-err" role="alert">{err}</p>}
   <button type="button" className="alb-btn big min-h-tap" disabled={busy||!pickWing} onClick={async()=>{setBusy(true);setErr(null);const r=await actions.start(pickWing,coverName);setBusy(false);if(!r.ok){setErr(r.error);return}setMe(r.data);setViewWing(pickWing)}}>Open my album · 3 envelopes inside</button>
   <p className="alb-fine">You can collect another club’s wing at any time.</p></div>
 </main>

 const book=me.book,waiting=me.waiting??[],claimed=!!book.claimedToday
 const act={busy,open:(s:Slot)=>setDetail(s),
  stick:(s:Slot)=>void run(()=>actions.stick(s.id),`${s.name} is in your album.`),
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
    <div><dt>{wing?.info.name}</dt><dd className="tabular-nums">{wing?.stuck??0}/{wing?.total??0}</dd></div>
    <div><dt>Picks</dt><dd className="tabular-nums">{book.picks}</dd></div>
    <div><dt>This week</dt><dd><span className="alb-dots" aria-label={`${book.weekDays} of 5 days — ${daysToPick(book.weekDays)} to a pick`}>{Array.from({length:5},(_,i)=><i key={i} data-on={i<book.weekDays||undefined}/>)}</span></dd></div>
   </dl>
  </header>
  {err&&<p className="alb-err" role="alert">{err}</p>}{note&&<p className="alb-ok" role="status">{note}</p>}
  <section className="alb-desk" aria-label="Your envelope">
   {waiting.length||!claimed?<button type="button" className="alb-env-card min-h-tap" disabled={busy} onClick={()=>void openNext()}>
     <span className="alb-env-mini" aria-hidden="true"/><span><b>{waiting.length?`${waiting.length} envelope${waiting.length===1?'':'s'} waiting`:'Today’s envelope is here'}</b><small>Two stickers from your {byId.get(book.wing)?.name} wing · tap to tear it open</small></span></button>
    :<p className="alb-env-done"><b>Today’s envelope is open.</b> The next one waits for you tomorrow.</p>}
   <details className="alb-change"><summary className="min-h-tap">Collecting: {byId.get(book.wing)?.name} · change wing</summary>
    <div className="alb-wing-grid">{wings.map(w=><button key={w.id} type="button" className="alb-wing-pick min-h-tap" data-on={book.wing===w.id||undefined} style={livery(w)} disabled={busy}
     onClick={()=>void run(()=>actions.wing(w.id),`Your next envelopes come from the ${w.name} wing.`).then(ok=>{if(ok){setViewWing(w.id);setPage(0)}})}>
     {w.crest?/* eslint-disable-next-line @next/next/no-img-element -- a crest ships exactly as recorded */<img src={w.crest} alt="" width="32" height="32"/>:<span className="alb-initials">{w.initials}</span>}<span>{w.name}</span></button>)}</div></details>
  </section>
  <nav className="alb-wing-tabs" aria-label="Wings">{views.filter(v=>v.have>0||v.info.id===book.wing).map(v=><button key={v.info.id} type="button" className="alb-tab min-h-tap" aria-pressed={v.info.id===wing?.info.id} onClick={()=>{setViewWing(v.info.id);setPage(0)}}>{v.info.name} <small className="tabular-nums">{v.stuck}/{v.total}</small></button>)}</nav>
  {wing&&<div className="alb-book" aria-label={`${wing.info.name} wing`}>
   <div className="alb-phone">{pages[page]&&<PageView p={pages[page]!} w={wing.info} act={act}/>}</div>
   <div className="alb-spread">{pages[spread]&&<PageView p={pages[spread]!} w={wing.info} act={act} side="left"/>}<span className="alb-spine" aria-hidden="true"><i/><i/></span>{pages[spread+1]&&<PageView p={pages[spread+1]!} w={wing.info} act={act} side="right"/>}</div>
   <nav className="alb-pager" aria-label="Pages">
    <button type="button" className="alb-btn ghost min-h-tap" disabled={page===0} onClick={()=>setPage(p=>Math.max(0,p-step))}>Back</button>
    <span className="alb-pages">{pages.map((p,i)=><button key={p.no} type="button" className="alb-pg min-h-tap" aria-current={i===page||undefined} aria-label={`Page ${p.no}`} onClick={()=>setPage(i)}>{p.no}</button>)}</span>
    <button type="button" className="alb-btn ghost min-h-tap" disabled={page+step>pages.length-1&&Math.floor(page/step)*step+step>pages.length-1} onClick={()=>setPage(p=>Math.min(pages.length-1,Math.floor(p/step)*step+step))}>Next</button>
   </nav>
  </div>}
  <p className="alb-fine">One envelope a day · every fifth envelope brings a new sticker if you still miss any · five collecting days in a week earn a pick · five spares buy any missing sticker. Photographs are free-licence pictures from Wikimedia Commons; turn a sticker over for its credit.</p>
  {draw&&<EnvelopeRitual draw={draw} wings={byId} slots={allSlots} tear={tear} onStick={async id=>{const r=await actions.stick(id);if(!r.ok)setErr(r.error);return r.ok}} onDone={()=>void closeDraw()}/>}
  {detail&&wing&&<Overlay label={detail.name}><div className="alb-table alb-detail">
   <div className="alb-flip" data-back={back||undefined}>{back?<StickerBack s={detail} w={byId.get(detail.id.split(':')[0]!)!} profiles={profiles}/>:<StickerFace s={detail} w={byId.get(detail.id.split(':')[0]!)!} variant={detail.best} big/>}</div>
   <div className="alb-reveal-act"><button type="button" className="alb-btn min-h-tap" onClick={()=>setBack(b=>!b)}>{back?'Front':'Turn it over'}</button><button type="button" className="alb-btn ghost min-h-tap" onClick={()=>{setDetail(null);setBack(false)}}>Close</button></div>
  </div></Overlay>}
 </main>
}
