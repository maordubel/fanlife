'use client'
import {useEffect,useRef,useState} from 'react'
import type {CardView,CareerView} from '@/lib/legends/view'
import {LEGENDS_RULES} from '@/lib/legends/config'
import {useReducedMotion} from '@/components/clubs/rumble/shared'
import {Stars} from './Brand'
import {money,posName,years} from './LegendCard'
import {KitChip,Sheet} from './Sheet'

/**
 * The career's three big moments, each a popup and each one tap from the next thing to do (owner, 12.10.2026):
 *  · the board's news after the draft — the season tickets are sold, here is the money, round 1 is with the drafted squad
 *  · the transfer window — after round 2 and at the halfway mark, a focused market: the offers, your sales, shut it
 *  · any other club's squad, from the table
 */
type Send=(a:Record<string,unknown>,ok?:string)=>void

/**
 * The board's news as a short story with a pulse (owner, 13.10.2026: "an animated story with emotion and excitement"): the
 * gates turn and the queue moves, the season-ticket counter climbs to a full house and the stubs are stamped SOLD OUT, the
 * board signs, and the money falls into the club's strongbox while the budget counts up. Five beats, about six seconds; Skip
 * (or a tap on the picture) goes straight to the sum, reduced motion opens on it, and the story ends on ONE button.
 * Every picture is drawn here — no artwork is copied — in the career's own livery (`--club-primary`, which rule 95 already
 * clears for its own club) on the Legends night: no other club's colour, no yellow coin, no vermilion.
 */
const GRANT=LEGENDS_RULES.firstBoardGrantM
const BEATS=[{at:0,cap:'The gates open. The queue goes round the ground.'},{at:1400,cap:'Season tickets on sale — and they go.'},{at:2800,cap:'Every seat. Sold out.'},{at:3800,cap:'The board meets, and signs.'},{at:5100,cap:'The money comes in.'},{at:6800,cap:'Your transfer budget.'}] as const
const LAST=BEATS.length-1
function useCountUp(from:number,to:number,ms:number,run:boolean,done:boolean){
 const [n,setN]=useState(done?to:from)
 useEffect(()=>{
  if(done){setN(to);return}
  if(!run){setN(from);return}
  let raf=0;const t0=performance.now()
  const tick=(t:number)=>{const k=Math.max(0,Math.min(1,(t-t0)/ms)),e=1-Math.pow(1-k,3);setN(from+(to-from)*e);if(k<1)raf=requestAnimationFrame(tick)}
  raf=requestAnimationFrame(tick);return()=>cancelAnimationFrame(raf)
 },[from,to,ms,run,done])
 return n
}
export function BoardNews({v,busy,send}:{v:CareerView;busy:boolean;send:Send}){
 const reduced=useReducedMotion(),drafted=Math.round((v.cash-GRANT)*10)/10
 const [beat,setBeat]=useState(reduced?LAST:0),end=beat>=LAST,okRef=useRef<HTMLButtonElement>(null)
 useEffect(()=>{if(reduced)setBeat(LAST)},[reduced])
 useEffect(()=>{
  if(end)return
  const next=BEATS[beat+1]!,t=window.setTimeout(()=>setBeat(b=>Math.max(b,beat+1)),next.at-BEATS[beat]!.at)
  return()=>window.clearTimeout(t)
 },[beat,end])
 useEffect(()=>{if(end&&okRef.current&&okRef.current.closest('.lgm-sheet')?.contains(document.activeElement))okRef.current.focus()},[end])
 const pct=useCountUp(0,100,1300,beat>=1,beat>1||reduced)
 const budget=useCountUp(drafted,v.cash,1500,beat>=4,beat>4||reduced)
 const skip=()=>setBeat(LAST)
 return <Sheet id="lgm-board" tone="night" locked kicker="The boardroom · after the draft" title={<span className="lgm-sold"><b>Season tickets</b>{beat>=2?<i>Sold out</i>:null}</span>}>
  <div className="lgm-news lgm-story" data-beat={beat} data-end={end||undefined}>
   <div className="lgm-story-stage" onClick={()=>!end&&setBeat(b=>Math.min(LAST,b+1))} aria-hidden="true">
    <Gates on={beat===0}/>
    <Tickets on={beat===1||beat===2} pct={Math.round(pct)} stamped={beat>=2}/>
    <Signing on={beat===3}/>
    <Strongbox on={beat>=4} budget={budget} rain={beat===4}/>
   </div>
   <div className="lgm-story-bar">
    <ol className="lgm-story-dots" aria-hidden="true">{BEATS.map((_,i)=><li key={i} data-on={i<=beat||undefined}/>)}</ol>
    {!end?<button type="button" className="lgm-story-skip min-h-tap" onClick={skip}>Skip</button>:null}
   </div>
   <p className="lgm-story-cap" aria-live="polite">{BEATS[beat]!.cap}</p>
   {end?<div className="lgm-story-end">
    <dl className="lgm-sum">
     <div><dt>Left from the draft</dt><dd>{money(drafted)}</dd></div>
     <div><dt>Season tickets &amp; sponsors</dt><dd className="lgm-plus">+ {money(GRANT)}</dd></div>
     <div data-total><dt>Your transfer budget</dt><dd>{money(v.cash)}</dd></div>
    </dl>
    <p className="lgm-fine">Rounds 1 and 2 are played with the squad you drafted. {v.nextWindow?`The transfer window opens after round ${v.nextWindow}.`:'The transfer window opens at the halfway mark.'}</p>
    <p className="lgm-actions"><button ref={okRef} type="button" className="lgm-go lgm-go-big min-h-tap" disabled={busy} onClick={()=>send({kind:'ack'})} data-testid="legends-board-ok">To matchday</button></p>
   </div>:null}
  </div>
 </Sheet>
}
/** beat 1 — three turnstiles turning and the queue shuffling up to them */
function Gates({on}:{on:boolean}){
 return <svg className="lgm-scene lgm-gates" data-on={on||undefined} viewBox="0 0 320 170" preserveAspectRatio="xMidYMax meet">
  <path className="lgm-g-stand" d="M0 70 L60 40 L260 40 L320 70 L320 112 L0 112z"/>
  {Array.from({length:14},(_,i)=><rect key={i} className="lgm-g-row" x={18+i*21} y={56+(i%2)*2} width="14" height="3"/>)}
  <rect className="lgm-g-ground" x="0" y="140" width="320" height="30"/>
  {[70,160,250].map((x,i)=><g key={x} transform={`translate(${x} 118)`}>
   <rect className="lgm-g-post" x="-4" y="-6" width="8" height="28"/>
   <g className="lgm-g-arms" style={{animationDelay:`${i*-120}ms`}}><rect x="-20" y="-2" width="40" height="4"/><rect x="-2" y="-20" width="4" height="40"/></g>
   <circle className="lgm-g-hub" r="4"/>
  </g>)}
  <g className="lgm-g-queue">{Array.from({length:9},(_,i)=><g key={i} className="lgm-g-fan" transform={`translate(${-10-i*30} 0)`}><g style={{animationDelay:`${i*-130}ms`}}>
   <circle cx="0" cy="118" r="6"/><path d="M-8 140 C-8 128 -6 125 0 125 C6 125 8 128 8 140z"/></g></g>)}</g>
 </svg>
}
/** beats 2–3 — the counter climbs to a full house, then the stubs are stamped */
function Tickets({on,pct,stamped}:{on:boolean;pct:number;stamped:boolean}){
 return <div className="lgm-scene lgm-tix" data-on={on||undefined}>
  <p className="lgm-tix-count"><b dir="ltr">{pct}%</b><span>of the season tickets sold</span></p>
  <span className="lgm-tix-bar"><i style={{inlineSize:`${pct}%`}}/></span>
  <div className="lgm-tix-stubs">{[0,1,2].map(i=><span key={i} className="lgm-tix-stub" style={{animationDelay:`${i*110}ms`}}><small>Admit one</small><b>Season</b><em data-on={stamped||undefined} style={{animationDelay:`${i*140}ms`}}>Sold out</em></span>)}</div>
 </div>
}
/** beat 3 — the board's resolution, signed and sealed */
function Signing({on}:{on:boolean}){
 return <div className="lgm-scene lgm-sign-scene" data-on={on||undefined}>
  <div className="lgm-paper">
   <p className="lgm-paper-h">Resolution of the board</p>
   <i/><i/><i/>
   <svg viewBox="0 0 200 44" className="lgm-paper-sig"><path d="M6 30 C20 6 30 40 44 22 S64 10 70 28 S92 36 100 18 C108 6 118 34 130 24 S152 14 160 26 L194 22"/></svg>
   <span className="lgm-paper-seal">Approved</span>
  </div>
 </div>
}
/** beats 4–5 — the notes fall into the strongbox while the budget counts up */
function Strongbox({on,budget,rain}:{on:boolean;budget:number;rain:boolean}){
 return <div className="lgm-scene lgm-box-scene" data-on={on||undefined}>
  <p className="lgm-box-total" dir="ltr">{money(Math.round(budget*10)/10)}</p>
  <div className="lgm-rain" data-on={rain||undefined}>{Array.from({length:GRANT},(_,i)=><span key={i} style={{insetInlineStart:`${8+((i*37)%84)}%`,animationDelay:`${i*150}ms`}}>€1M</span>)}</div>
  <svg className="lgm-box" viewBox="0 0 200 70"><path className="lgm-box-lid" d="M20 14 L180 14 L172 4 L28 4z"/><rect className="lgm-box-body" x="16" y="14" width="168" height="54"/><rect className="lgm-box-band" x="16" y="30" width="168" height="8"/><circle className="lgm-box-lock" cx="100" cy="50" r="7"/></svg>
 </div>
}

export function WindowSheet({v,busy,send,onMarket,onClose}:{v:CareerView;busy:boolean;send:Send;onMarket:()=>void;onClose:()=>void}){
 const w=v.window!,full=v.squad.length>=v.rules.maxSquad,[sell,setSell]=useState<string|null>(null),[tab,setTab]=useState<'buy'|'sell'>('buy')
 const when=w.which==='early'?`After round ${v.played}`:w.which==='mid'?'The halfway mark':'Before the season'
 return <Sheet id="lgm-window" tone="night" wide kicker={when} title={<span className="lgm-wintitle"><b>Transfer window</b><i>Open</i></span>} onClose={onClose}>
  <div className="lgm-window-body">
   <dl className="lgm-sum lgm-sum-row"><div data-total><dt>To spend</dt><dd>{money(v.cash)}</dd></div><div><dt>Squad</dt><dd>{v.squad.length}<small>/{v.rules.maxSquad}</small></dd></div><div><dt>Quotas</dt><dd className="lgm-q">GK {v.quotas.GK} · DF {v.quotas.DF} · MF {v.quotas.MF} · FW {v.quotas.FW}</dd></div></dl>
   <div className="lgm-seg lgm-seg-wide" role="tablist" aria-label="The window">
    <button type="button" role="tab" aria-selected={tab==='buy'} className="min-h-tap" onClick={()=>setTab('buy')}>Buy · {w.offers.length}</button>
    <button type="button" role="tab" aria-selected={tab==='sell'} className="min-h-tap" onClick={()=>setTab('sell')}>Sell · {v.squad.length}</button>
   </div>
   {tab==='buy'?<>
    {full?<p className="lgm-fine">The squad is full ({v.rules.maxSquad}). Sell a man first, or swap one in the full market.</p>:null}
    <ul className="lgm-deals">{w.offers.length?w.offers.map((c,i)=><Deal key={c.id} c={c} i={i} disabled={busy||full||c.price>v.cash} onBuy={()=>send({kind:'buy',card:c.id},`${c.name} signed for ${money(c.price)}.`)} cash={v.cash}/>):<li className="lgm-fine">Nothing you can afford today.</li>}</ul>
    <p className="lgm-actions"><button type="button" className="lgm-link min-h-tap" onClick={onMarket}>Search all of {v.clubName}’s history →</button></p>
   </>:<ul className="lgm-cands">{v.squad.map(s=><li key={s.id}><div className="lgm-sellrow"><span className="lgm-pos" data-pos={s.pos}>{s.pos}</span><b>{s.name}</b><Stars value={s.stars} size="sm"/>
     {sell===s.id?<span className="lgm-sellyes"><button type="button" className="lgm-go min-h-tap" disabled={busy||!s.sale} onClick={()=>{send({kind:'sell',card:s.id},`${s.name} sold for ${money(s.sale?.net??0)}.`);setSell(null)}}>Sell · {money(s.sale?.net??0)}</button><button type="button" className="lgm-link min-h-tap" onClick={()=>setSell(null)}>Keep</button></span>
      :<button type="button" className="lgm-ghost min-h-tap" disabled={!s.sale} onClick={()=>setSell(s.id)}>{s.sale?money(s.sale.net):'—'}</button>}</div></li>)}</ul>}
   <p className="lgm-actions lgm-window-shut"><button type="button" className="lgm-go lgm-go-big min-h-tap" disabled={busy} onClick={()=>send({kind:'close-window'},'The window is shut. The season goes on.')} data-testid="legends-shut-window">Shut the window · on to round {v.played+1}</button></p>
   <p className="lgm-fine">The other clubs do their business as the window shuts.</p>
  </div>
 </Sheet>
}
function Deal({c,i,disabled,onBuy,cash}:{c:CardView;i:number;disabled:boolean;onBuy:()=>void;cash:number}){
 return <li className="lgm-deal" style={{animationDelay:`${i*90}ms`}}>
  <div><p className="lgm-deal-pos">{posName(c.pos)} · {years(c)}</p><b>{c.name}</b><Stars value={c.stars} size="sm"/></div>
  <button type="button" className="lgm-sign min-h-tap" disabled={disabled} onClick={onBuy}>{c.price>cash?`${money(c.price)} · short`:`Sign · ${money(c.price)}`}</button>
 </li>
}

export function ClubSheet({v,club,onClose}:{v:CareerView;club:string;onClose:()=>void}){
 const c=v.clubs.find(x=>x.club===club);if(!c)return null
 const row=v.table.find(r=>r.club===club),lines=(['GK','DF','MF','FW'] as const).map(p=>({p,men:c.squad.filter(m=>m.pos===p)}))
 return <Sheet id="lgm-club" kicker={<><KitChip c={v.colours?.[club]}/> {row?`${v.table.indexOf(row)+1}${['st','nd','rd'][v.table.indexOf(row)]??'th'} · ${row.pts} pts`:'The league'} · {c.formation}</>} title={c.name} onClose={onClose}>
  <p className="lgm-fine">Their eleven averages <Stars value={c.stars} size="sm"/> · {c.squad.length} men · only men who played for {c.name}.</p>
  {lines.map(l=>l.men.length?<div key={l.p} className="lgm-clubline"><h3>{posName(l.p)}s</h3><ul>{l.men.map(m=><li key={m.id} data-xi={m.xi||undefined}><b>{m.name}</b><Stars value={m.stars} size="sm"/><small>{years(m)}{m.apps?` · ${m.apps} apps`:''}{m.goals?` · ${m.goals} goals`:''}</small></li>)}</ul></div>:null)}
  <p className="lgm-fine">Bold: their last eleven. Stars are game values.</p>
 </Sheet>
}
