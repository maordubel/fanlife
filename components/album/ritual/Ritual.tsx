'use client'
import {useCallback,useState} from 'react'
import {albumSound} from '../sound'
import {StickerFace,livery} from '../Sticker'
import {Pack} from './Pack'
import {StickScene} from './StickScene'
import type {Page,Slot,Variant,WingInfo} from '@/lib/album/view'

/**
 * The daily ritual, start to finish (18.11.2026): the packet on the table → tear it → the stickers come out face down,
 * a small stack of printed backs → you turn the top one over (it flips in your hand, a gold one glints, a stamp says
 * NEW or SPARE) → a new one goes straight into the album (StickScene), a spare goes on the swaps pile at the side →
 * the next one. Every step can be done by touch or by one button, and every step can be skipped.
 */
export type Drawn={envelope:string;stickers:string[];variants:Variant[];fresh:boolean[];pickEarned?:boolean;already?:boolean}

function Back({s}:{s:Slot}){
 return <span className="rk-back" aria-hidden="true">
  <span className="rk-back-print">{Array.from({length:7},(_,i)=><span key={i}>FAN LIFE · THE ALBUM · EDITION ONE · </span>)}</span>
  <span className="rk-back-code">{s.code}</span>
  <span className="rk-back-lift">Lift here ↗</span>
 </span>
}

export function Ritual({draw,wings,slots,pageOf,onStick,onDone,muted,setMuted}:{draw:Drawn;wings:Map<string,WingInfo>;slots:Map<string,Slot>;pageOf:(id:string)=>Page|undefined;onStick:(id:string)=>Promise<boolean>;onDone:()=>void;muted:boolean;setMuted:(m:boolean)=>void}){
 const [stage,setStage]=useState<'pack'|'stack'|'stick'|'end'>('pack'),[i,setI]=useState(0),[flipped,setFlipped]=useState(false),[gone,setGone]=useState<number[]>([]),[stuck,setStuck]=useState<Set<string>>(new Set())
 const ids=draw.stickers,club=wings.get(ids[0]?.split(':')[0]??'')
 const cur=ids[i],s=cur?slots.get(cur):undefined,w=cur?wings.get(cur.split(':')[0]!):undefined
 const opened=useCallback(()=>setTimeout(()=>setStage('stack'),900),[])
 const turn=()=>{if(flipped)return;setFlipped(true);albumSound.flip();if(draw.variants[i]!=='base')setTimeout(()=>albumSound.glint(),380)}
 const next=()=>{setGone(g=>[...g,i]);albumSound.flip();if(i>=ids.length-1){setStage('end');return}setTimeout(()=>{setI(i+1);setFlipped(false)},260)}
 return <div className="rk" style={club?livery(club):undefined}>
  <div className="rk-top">
   <p className="alb-k">{stage==='pack'?(draw.already?'Today’s packet':'A packet for you'):stage==='end'?'All in':`Sticker ${i+1} of ${ids.length}`}</p>
   <button type="button" className="alb-mute min-h-tap" aria-pressed={muted} onClick={()=>setMuted(!muted)}>{muted?'Sound off':'Sound on'}</button>
   {stage!=='stick'&&<button type="button" className="alb-skip min-h-tap" onClick={onDone}>{stage==='end'?'Close':'Skip'}</button>}
  </div>

  {stage==='pack'&&club&&<Pack id={draw.envelope} wing={club} count={ids.length} onOpen={opened}
   peek={<span className="rk-peek">{ids.map((id,k)=>{const x=slots.get(id);return x?<span key={id} className="rk-peek-card" style={{['--k' as string]:k}}><Back s={x}/></span>:null})}</span>}/>}

  {stage==='stack'&&s&&w&&<div className="rk-stack">
   {ids.map((id,k)=>{
    const x=slots.get(id),xw=wings.get(id.split(':')[0]!);if(!x||!xw||gone.includes(k))return null
    const top=k===i
    return <button key={id} type="button" className="rk-card min-h-tap" data-top={top||undefined} data-flipped={top&&flipped||undefined} data-variant={draw.variants[k]}
     style={{['--k' as string]:k-i}} disabled={!top} aria-label={top&&!flipped?'Turn the sticker over':x.name}
     onClick={()=>{if(top)turn()}}>
     <span className="rk-card-in"><span className="rk-face rk-face-back"><Back s={x}/></span><span className="rk-face rk-face-front"><StickerFace s={x} w={xw} variant={draw.variants[k]} big/></span></span>
     {top&&flipped&&<span className="alb-stamp rk-stamp" data-new={draw.fresh[k]||undefined}>{draw.fresh[k]?'New for the album':'Spare to swap'}</span>}
    </button>
   })}
   <div className="rk-stack-say" aria-live="polite">
    {!flipped?<p className="rk-say">Tap to turn it over</p>:<>
     <p className="alb-reveal-name"><b>{s.name}</b><span>{s.code} · {w.name}{s.era?` · ${s.era}`:''}</span></p>
     <div className="alb-reveal-act">
      {draw.fresh[i]&&!stuck.has(cur!)&&pageOf(cur!)&&<button type="button" className="alb-btn min-h-tap" onClick={()=>setStage('stick')}>Stick it in</button>}
      <button type="button" className={`alb-btn ${draw.fresh[i]&&!stuck.has(cur!)?'ghost':''} min-h-tap`} onClick={next}>{i>=ids.length-1?'Done':draw.fresh[i]&&!stuck.has(cur!)?'Keep for later':'Onto the swaps pile'}</button>
     </div>
    </>}
   </div>
  </div>}

  {stage==='stick'&&s&&w&&pageOf(cur!)&&<StickScene s={s} w={w} variant={draw.variants[i]!} page={pageOf(cur!)!} onStick={()=>onStick(cur!)}
   onDone={ok=>{if(ok)setStuck(x=>new Set(x).add(cur!));setStage('stack');if(ok)next()}}/>}

  {stage==='end'&&<div className="rk-end">
   <p className="rk-end-title">That’s today’s packet.</p>
   <p className="rk-say">{stuck.size?`${stuck.size} new in the album.`:'Spares go on the swaps pile: five buy any sticker you miss.'}</p>
   {draw.pickEarned&&<p className="alb-note" role="status">Five collecting days this week — you earned a pick: choose any missing sticker.</p>}
   <button type="button" className="alb-btn min-h-tap" onClick={onDone}>To my album</button>
  </div>}
 </div>
}
