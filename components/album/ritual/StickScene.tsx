'use client'
import {useCallback,useEffect,useLayoutEffect,useRef,useState,type CSSProperties} from 'react'
import {albumSound} from '../sound'
import {StickerFace,livery} from '../Sticker'
import type {Page,Slot,Variant,WingInfo} from '@/lib/album/view'

/**
 * Sticking it in (18.11.2026) — the moment the album was for. The album lies open at his page, his frame waiting.
 * The sticker sits on its backing at the foot of the table: you pinch the corner and peel — the sticker curls off the
 * silicone paper corner first, the fold shows its pale gummed underside, the paper crackles. Peeled, it lifts off and the
 * backing drops away. You carry it (it tilts with your hand, its shadow grows) over the page; near its frame it is drawn
 * in; let go and it lands — a dull press, a tick in the phone, the thumb smoothing it flat in one shiny sweep.
 * "Stick it for me" plays the same at a careful child's pace. Let go anywhere else and it floats back to the tray.
 */
type Phase='peel'|'carry'|'flying'|'stuck'
const TILT=[-1.6,1.1,-0.7,1.5,-1.2,0.6]

export function StickScene({s,w,variant,page,onStick,onDone}:{s:Slot;w:WingInfo;variant:Variant;page:Page;onStick:()=>Promise<boolean>;onDone:(stuck:boolean)=>void}){
 const [phase,setPhase]=useState<Phase>('peel'),[peel,setPeel]=useState(0),[pos,setPos]=useState<{x:number;y:number;r:number}|null>(null)
 const [near,setNear]=useState(false),[land,setLand]=useState<{x:number;y:number;w:number;h:number}|null>(null),[err,setErr]=useState(false)
 const tray=useRef<HTMLDivElement>(null),target=useRef<HTMLDivElement>(null),card=useRef<HTMLDivElement>(null)
 const grab=useRef<{dx:number;dy:number;lx:number;lt:number}|null>(null),peelStart=useRef<{x:number;y:number}|null>(null),pRef=useRef(0)
 const idx=page.slots.findIndex(x=>x.id===s.id)

 const lifted=useCallback(()=>{
  albumSound.flip();setPhase('carry')
  const r=tray.current!.getBoundingClientRect();setPos({x:r.left+r.width/2,y:r.top+r.height/2,r:0})
 },[])
 const setP=(p:number)=>{if(p<=pRef.current)return;pRef.current=p;setPeel(p);albumSound.peel(p);if(p>=1)lifted()}

 // the frame on the page, in screen coordinates
 const slotRect=()=>target.current?.getBoundingClientRect()??null
 const press=useCallback(async()=>{
  const r=slotRect();if(!r)return
  setPhase('flying');setLand({x:r.left+r.width/2,y:r.top+r.height/2,w:r.width,h:r.height})
  const ok=onStick()
  await new Promise(res=>setTimeout(res,420))
  albumSound.thup()
  const good=await ok
  if(!good){setErr(true);setPhase('carry');setLand(null);return}
  setPhase('stuck');setTimeout(()=>albumSound.smooth(),260)
  if(variant!=='base')setTimeout(()=>albumSound.glint(),700)
 },[onStick,variant])
 const auto=()=>{
  if(phase==='peel'){let k=pRef.current;const step=()=>{k+=0.045;setP(Math.min(1,k));if(k<1)requestAnimationFrame(step);else setTimeout(()=>void press(),520)};requestAnimationFrame(step);return}
  if(phase==='carry')void press()
 }
 useEffect(()=>{if(phase==='stuck'){const t=setTimeout(()=>onDone(true),1700);return()=>clearTimeout(t)}},[phase,onDone])
 useLayoutEffect(()=>{target.current?.scrollIntoView({block:'center',behavior:'smooth'})},[])

 const corner=Math.min(1,peel)*0.9 // the peeled share of the width
 const flying=phase==='flying'||phase==='stuck'
 const style:CSSProperties=phase==='carry'&&pos?{position:'fixed',left:pos.x,top:pos.y,transform:`translate(-50%,-50%) rotate(${pos.r}deg) scale(1.04)`}
  :flying&&land?{position:'fixed',left:land.x,top:land.y,inlineSize:land.w,blockSize:land.h,transform:`translate(-50%,-50%) rotate(${TILT[idx%TILT.length]}deg)`}:{}
 return <div className="rk-scene" style={livery(w)} data-phase={phase}
  onPointerMove={e=>{
   const g=grab.current;if(phase!=='carry'||!g)return
   const now=performance.now(),vx=(e.clientX-g.lx)/Math.max(1,now-g.lt);g.lx=e.clientX;g.lt=now
   setPos({x:e.clientX-g.dx,y:e.clientY-g.dy,r:Math.max(-9,Math.min(9,vx*14))})
   const r=slotRect();if(r){const d=Math.hypot(e.clientX-g.dx-(r.left+r.width/2),e.clientY-g.dy-(r.top+r.height/2));setNear(d<r.width*0.75)}
  }}
  onPointerUp={()=>{
   if(phase!=='carry'||!grab.current)return
   grab.current=null
   if(near)void press()
   else{const r=tray.current!.getBoundingClientRect();setPos({x:r.left+r.width/2,y:r.top+r.height/2,r:0})}
  }}>
  <section className="alb-page rk-scene-page" aria-label={`Page ${page.no}: ${page.era}`}>
   <header className="alb-page-head"><span className="alb-k">Page {page.no}</span><h3>{page.era}</h3><span className="alb-page-done tabular-nums">{page.done}/{page.slots.length}</span></header>
   <ol className="alb-grid">{page.slots.map((x,i)=><li key={x.id} className="alb-slot" data-state={x.stuck?'stuck':'empty'}>
    <div className="alb-frame" ref={x.id===s.id?target:undefined} data-target={x.id===s.id||undefined} data-near={x.id===s.id&&near||undefined}>
     <span className="alb-frame-no" aria-hidden="true">{String(x.slot).padStart(2,'0')}</span>
     {x.stuck&&<span className="alb-stuck rk-static" style={{['--tilt' as string]:`${TILT[i%TILT.length]}deg`}}><StickerFace s={x} w={w} variant={x.best}/></span>}
    </div>
    <p className="alb-cap"><span className="tabular-nums">{x.code}</span> <b dir="auto">{x.name}</b></p>
   </li>)}</ol>
  </section>
  <div className="rk-tray" ref={tray}>
   {/* the backing paper — stays on the table, then drops away */}
   <div className="rk-backing" data-gone={phase!=='peel'||undefined} aria-hidden="true"><span>FAN LIFE · THE ALBUM · {s.code} · PEEL FROM THE CORNER</span></div>
   <div ref={card} className="rk-hold" data-phase={phase} data-near={near||undefined} style={{...style,['--peel' as string]:corner}}
    onPointerDown={e=>{
     if(phase==='peel'){peelStart.current={x:e.clientX,y:e.clientY};(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);return}
     if(phase==='carry'&&pos){grab.current={dx:e.clientX-pos.x,dy:e.clientY-pos.y,lx:e.clientX,lt:performance.now()};(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId)}
    }}
    onPointerMove={e=>{
     const st=peelStart.current;if(phase!=='peel'||!st)return
     const r=card.current!.getBoundingClientRect(),d=((st.x-e.clientX)+(st.y-e.clientY))/(r.width*1.1)
     setP(Math.max(0,Math.min(1,d)))
    }}
    onPointerUp={()=>{peelStart.current=null}}>
    <div className="rk-peeled"><StickerFace s={s} w={w} variant={variant}/>{phase==='stuck'&&<span className="rk-smooth" aria-hidden="true"/>}</div>
    {phase==='peel'&&<span className="rk-flap" aria-hidden="true"/>}
    {phase==='peel'&&peel===0&&<span className="rk-corner-hint" aria-hidden="true">Peel ↖</span>}
   </div>
  </div>
  <div className="rk-scene-act">
   {err&&<p className="alb-err" role="alert">It did not stick — the album is not answering. Try again.</p>}
   {phase==='peel'&&<p className="rk-say">Peel it from the corner</p>}
   {phase==='carry'&&<p className="rk-say">Now carry it to No. {String(s.slot).padStart(2,'0')}</p>}
   {phase==='stuck'&&<p className="rk-say" role="status">In the album ✓</p>}
   {(phase==='peel'||phase==='carry')&&<button type="button" className="alb-btn ghost min-h-tap" onClick={auto}>Stick it for me</button>}
   {phase!=='stuck'&&phase!=='flying'&&<button type="button" className="alb-btn ghost min-h-tap" onClick={()=>onDone(false)}>Later</button>}
  </div>
 </div>
}
