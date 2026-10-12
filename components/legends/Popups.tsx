'use client'
import {useState} from 'react'
import type {CardView,CareerView} from '@/lib/legends/view'
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

export function BoardNews({v,busy,send}:{v:CareerView;busy:boolean;send:Send}){
 const drafted=Math.round((v.cash-8)*10)/10
 return <Sheet id="lgm-board" tone="night" locked kicker="The boardroom · after the draft" title={<span className="lgm-sold"><b>Season tickets</b><i>Sold out</i></span>}>
  <div className="lgm-news">
   <div className="lgm-turnstile" aria-hidden="true">{Array.from({length:12},(_,i)=><span key={i} style={{animationDelay:`${i*70}ms`}}/>)}</div>
   <p>The supporters have renewed, the sponsors have signed and the board has met. The money is on the table.</p>
   <dl className="lgm-sum">
    <div><dt>Left from the draft</dt><dd>{money(drafted)}</dd></div>
    <div><dt>Season tickets &amp; sponsors</dt><dd className="lgm-plus">+ €8M</dd></div>
    <div data-total><dt>Your transfer budget</dt><dd>{money(v.cash)}</dd></div>
   </dl>
   <p className="lgm-fine">Rounds 1 and 2 are played with the squad you drafted. {v.nextWindow?`The transfer window opens after round ${v.nextWindow}.`:'The transfer window opens at the halfway mark.'}</p>
   <p className="lgm-actions"><button type="button" className="lgm-go lgm-go-big min-h-tap" disabled={busy} onClick={()=>send({kind:'ack'})} data-testid="legends-board-ok">To matchday</button></p>
  </div>
 </Sheet>
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
