'use client'
import {useEffect,useMemo,useRef,useState,type CSSProperties} from 'react'
import {albumSound} from '../sound'
import type {WingInfo} from '@/lib/album/view'
import {RetroFront} from './RetroFront'

/**
 * The packet (18.11.2026): a foil envelope with crimped ends, printed like a kiosk packet, catching the light as the
 * finger moves over it. You tear it the way you did as a child: put your thumb on the notch and pull across — the strip
 * lifts from where you started and hinges at the point the tear has reached, the torn edge shows white paper fibre,
 * the foil crackles faster the faster you pull, the phone ticks under the thumb, and the last pull rips it away.
 * A tap on "Tear it for me" does the same at a child's speed. Then the stickers' backs peek out of the open packet.
 */
const W=300,H=420,TY=33,CR=30 // the tear runs just under the crimped foil top
function jag(seed:string){
 let h=2166136261;for(const c of seed)h=Math.imul(h^c.charCodeAt(0),16777619)
 const rnd=()=>{h=Math.imul(h^(h>>>15),2246822507);h=Math.imul(h^(h>>>13),3266489909);return ((h^=h>>>16)>>>0)/4294967296}
 return Array.from({length:61},(_,i)=>[i*W/60,TY+(rnd()-0.5)*6+(i%2?1.5:-1.5)] as const)
}
const line=(pts:readonly (readonly [number,number])[])=>pts.map(([x,y])=>`${x.toFixed(1)},${y.toFixed(1)}`).join(' ')

export function Pack({id,wing,count,chips,onOpen,peek}:{id:string;wing:WingInfo;count:number;chips:string[];onOpen:()=>void;peek:React.ReactNode}){
 const pts=useMemo(()=>jag(id),[id])
 const [t,setT]=useState(0),[phase,setPhase]=useState<'sealed'|'ripped'|'open'>('sealed'),[hint,setHint]=useState(false)
 const box=useRef<HTMLDivElement>(null),drag=useRef<{x:number;at:number;last:number}|null>(null),tRef=useRef(0),ticked=useRef(0)
 const [glare,setGlare]=useState({x:0.3,y:0.2})
 const tx=t*W
 const finish=()=>{if(phase!=='sealed')return;tRef.current=1;setT(1);albumSound.rip();setPhase('ripped');setTimeout(()=>setPhase('open'),650)}
 const advance=(nt:number,speed:number)=>{
  if(nt<=tRef.current)return
  tRef.current=nt;setT(nt);albumSound.tear(Math.min(1,speed))
  if(nt-ticked.current>0.07){ticked.current=nt;albumSound.tick()}
  if(nt>=0.96)finish()
 }
 const at=(clientX:number)=>{const r=box.current!.getBoundingClientRect();return Math.max(0,Math.min(1,(clientX-r.left)/r.width))}
 const auto=()=>{if(phase!=='sealed')return;let k=tRef.current;const step=()=>{k+=0.035;advance(Math.min(1,k),0.55);if(k<1&&tRef.current<0.96)requestAnimationFrame(step)};requestAnimationFrame(step)}
 useEffect(()=>{if(phase==='open')onOpen()},[phase,onOpen])
 useEffect(()=>{const i=setInterval(()=>{if(tRef.current===0)setHint(h=>!h)},1800);return()=>clearInterval(i)},[])
 const strip=`0,0 ${W},0 ${W},${TY} ${line([...pts].reverse())}`
 const body=`${line(pts)} ${W},${H} 0,${H}`
 const tornL=pts.filter(([x])=>x<=tx+0.1)
 const angle=phase==='sealed'?Math.min(38,6+t*44):0
 return <div ref={box} className="rk-pack" data-phase={phase} style={{['--club-primary' as string]:wing.primary,['--club-on-primary' as string]:wing.on,['--gx' as string]:glare.x,['--gy' as string]:glare.y} as CSSProperties}
  onPointerMove={e=>{const r=box.current!.getBoundingClientRect();setGlare({x:(e.clientX-r.left)/r.width,y:(e.clientY-r.top)/r.height})}}>
  <div className="rk-pack-peek" aria-hidden={phase!=='open'}>{peek}</div>
  <svg className="rk-pack-svg" viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
   <defs>
    <linearGradient id={`s${id}`} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="white" stopOpacity="0"/><stop offset=".5" stopColor="white" stopOpacity=".55"/><stop offset="1" stopColor="white" stopOpacity="0"/></linearGradient>
    <clipPath id={`b${id}`}><polygon points={body}/></clipPath>
    <clipPath id={`t${id}`}><polygon points={strip}/></clipPath>
    <clipPath id={`l${id}`}><rect x="-20" y="-40" width={tx+20} height={TY+60}/></clipPath>
    <clipPath id={`r2${id}`}><rect x={tx} y="-40" width={W-tx+20} height={TY+60}/></clipPath>
   </defs>
   {/* the inside of the packet, seen once it is open */}
   <rect className="rk-f-ink" x="6" y={TY} width={W-12} height="40" opacity={t>0?.55:0}/>
   <g clipPath={`url(#b${id})`} className="rk-pack-front">
    <RetroFront kind="pack" wing={wing.name} count={count} chips={chips}/>
    <rect className="rk-pack-sheen" x="-160" y="0" width="160" height={H} fill={`url(#s${id})`}/>
    <polyline className="rk-s-ivory" points={line(tornL)} fill="none" strokeWidth="2.2" strokeLinejoin="round"/>
   </g>
   {/* the strip: the torn part lifts, hinged where the tear has reached; the rest still holds */}
   <g className="rk-pack-strip">
    <g clipPath={`url(#r2${id})`}><g clipPath={`url(#t${id})`}><rect width={W} height={TY+6} className="rk-f-ink"/><image href="/album/art/foil-top.webp" width={W} height={CR} preserveAspectRatio="none"/><image href="/album/art/foil-side.webp" x="0" y={CR-2} width={W} height={TY-CR+8} preserveAspectRatio="none"/></g></g>
    <g clipPath={`url(#l${id})`} transform={`rotate(${angle} ${tx} ${TY})`}><g clipPath={`url(#t${id})`}>
     <rect width={W} height={TY+6} className="rk-f-ink"/><image href="/album/art/foil-top.webp" width={W} height={CR} preserveAspectRatio="none"/><image href="/album/art/foil-side.webp" x="0" y={CR-2} width={W} height={TY-CR+8} preserveAspectRatio="none"/>
     <polyline className="rk-s-ivory" points={line(tornL)} fill="none" strokeWidth="2.2"/></g></g>
    <line className="rk-s-ivory" x1="10" y1={TY} x2={W-10} y2={TY} strokeWidth="1.4" strokeDasharray="5 4" opacity={1-t}/>
    <g transform={`translate(10 ${TY-22})`} opacity={1-t} className="rk-pack-notch" data-hint={hint||undefined}><polygon className="rk-f-ivory" points="0,10 10,16 0,22"/><text x="15" y="20" className="rk-pack-tearhere">TEAR HERE</text></g>
   </g>
  </svg>
  {phase==='sealed'&&<>
   <button type="button" className="rk-pack-grip min-h-tap" aria-label="Tear the packet open: drag along the top from the left"
    onPointerDown={e=>{const x=at(e.clientX);if(x>0.4&&tRef.current===0){setHint(true);return}(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);drag.current={x,at:performance.now(),last:x}}}
    onPointerMove={e=>{const d=drag.current;if(!d)return;const x=at(e.clientX),now=performance.now(),speed=Math.abs(x-d.last)/Math.max(1,now-d.at)*40;d.at=now;d.last=x;advance(Math.max(tRef.current,x),speed)}}
    onPointerUp={()=>{drag.current=null}} onPointerCancel={()=>{drag.current=null}}
    onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();auto()}}}/>
   <button type="button" className="rk-pack-auto min-h-tap" onClick={auto}>Tear it for me</button>
  </>}
 </div>
}
