'use client'
import type {CareerView} from '@/lib/legends/view'
import {LegendCard,money,posName,GAME_VALUES} from './LegendCard'

/**
 * The draft room (rulebook §1.2): choose a position group, then one of three men — premium, squad, bargain. Locked cards say why.
 * Seventeen are required, an eighteenth is optional, three rerolls in all. Everything is decided on the server; this screen
 * only sends the choice.
 */
type Send=(a:Record<string,unknown>,ok?:string)=>void
export function DraftRoom({v,busy,send}:{v:CareerView;busy:boolean;send:Send}){
 const d=v.draft!,done=d.picks.length>=d.required&&!d.optionalOpen
 const quota=(['GK','DF','MF','FW'] as const).map(p=>({p,have:d.picks.filter(x=>x.pos===p).length,need:v.rules.minimums[p]}))
 return <section className="lgm-draft" aria-labelledby="lgm-draft-h">
  <header className="lgm-draft-head">
   <p className="lgm-kicker">The founding draft · {v.clubName}</p>
   <h2 id="lgm-draft-h">{done?'Your seventeen are chosen':d.optionalOpen?'One more, if you want him':`Pick ${Math.min(d.slot,d.required)} of ${d.required}`}</h2>
   <dl className="lgm-meter">
    <div><dt>Budget left</dt><dd>{money(d.left)}</dd></div>
    <div><dt>To finish</dt><dd>{d.picks.length<d.required?`≥ ${money(d.minToFinish)}`:'—'}</dd></div>
    <div><dt>Rerolls</dt><dd>{d.rerollsLeft}<small>/3</small></dd></div>
   </dl>
   <ol className="lgm-quota" aria-label="Quotas">{quota.map(q=><li key={q.p} data-met={q.have>=q.need||undefined}><b>{q.p}</b><span>{q.have}/{q.need}</span></li>)}</ol>
  </header>
  {!done?<>
   <fieldset className="lgm-groups"><legend>{d.optionalOpen?'The eighteenth — any line':'Choose the line for this pick'}</legend>
    {d.groups.map(g=><button key={g.group} type="button" className="min-h-tap" aria-pressed={d.group===g.group} disabled={busy||!g.open} title={g.reason??undefined} onClick={()=>send({kind:'draft',move:{kind:'group',group:g.group}})}>
     <b>{posName(g.group)}</b><small>{g.open?(g.need?`${g.need} still needed`:'Open'):g.reason}</small></button>)}
   </fieldset>
   {d.group&&d.offers.length?<div className="lgm-offers" aria-live="polite">
    {d.offers.map(o=><LegendCard key={o.id} c={o} tier={o.tier} locked={o.locked}>
     <button type="button" className="lgm-sign min-h-tap" disabled={busy||!!o.locked} onClick={()=>send({kind:'draft',move:{kind:'pick',id:o.id}},`${o.name} signed for ${money(o.price)}.`)}>Sign {o.name.split(' ').slice(-1)[0]}</button>
    </LegendCard>)}
   </div>:<p className="lgm-fine">Choose a line to see the three men on the table.</p>}
   <p className="lgm-actions">
    <button type="button" className="lgm-ghost min-h-tap" disabled={busy||!d.group||d.rerollsLeft<=0} onClick={()=>send({kind:'draft',move:{kind:'reroll'}},'Three new men on the table.')}>Reroll these three ({d.rerollsLeft} left)</button>
    {d.optionalOpen?<button type="button" className="lgm-ghost min-h-tap" disabled={busy} onClick={()=>send({kind:'draft',move:{kind:'skip'}},'Seventeen it is.')}>Keep seventeen</button>:null}
   </p>
  </>:null}
  {done||d.optionalOpen?<div className="lgm-confirm">
   <p><b>Spent {money(d.spent)} of €52M.</b> On confirming, the board adds a one-off <b>€8M</b>: your window starts with {money(52-d.spent+8)}.</p>
   {d.canConfirm&&done?<p className="lgm-error" role="alert">{d.canConfirm}</p>:null}
   <button type="button" className="lgm-go min-h-tap" disabled={busy||!!d.canConfirm} onClick={()=>send({kind:'draft-confirm'},'The squad is registered.')}>Register the squad</button>
  </div>:null}
  <section className="lgm-picks" aria-labelledby="lgm-picks-h"><h3 id="lgm-picks-h">Signed so far · {d.picks.length}</h3>
   {d.picks.length?<ol>{d.picks.map(p=><li key={p.id}><span className="lgm-pos" data-pos={p.pos}>{p.pos}</span><b>{p.name}</b><small>{money(p.price)}</small></li>)}</ol>:<p className="lgm-fine">Nobody yet. Every man here played for {v.clubName} — and only for {v.clubName}.</p>}
  </section>
  <p className="lgm-fine">{GAME_VALUES}</p>
 </section>
}
