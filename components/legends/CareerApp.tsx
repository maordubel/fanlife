'use client'
import {useEffect,useMemo,useState,useTransition} from 'react'
import {legendsAction,legendsMarket} from '@/app/all-football/legends/actions'
import type {CardView,CareerView,ResultView,SquadView} from '@/lib/legends/view'
import {ATTR_LABEL,ROLE_ATTRS,type AttrKey} from '@/lib/legends/ratings'
import {Emblem,Stars} from './Brand'
import {DraftRoom} from './DraftRoom'
import {LegendCard,money,posName,years,GAME_VALUES} from './LegendCard'
import {CareerFriendlies} from './Friendlies'

/**
 * One Legends career on one screen. Every change is ONE server action carrying the revision this screen saw and a fresh key; the
 * career that comes back is the one the server now holds (§2.11). Mobile first: one column and a tab strip; the desktop gets the
 * pitch beside the squad and the table beside the match.
 */
type Tab='match'|'squad'|'market'|'league'|'club'|'friendlies'
const FORMATIONS=['4-3-3','4-4-2','3-5-2'] as const
const APPROACH=[['defensive','Defensive'],['balanced','Balanced'],['attacking','Attacking']] as const
const PRESS=[['low','Sit off'],['medium','Press'],['high','High press']] as const
const TEMPO=[['slow','Patient'],['normal','Normal'],['fast','Fast']] as const
const newKey=()=>(globalThis.crypto?.randomUUID?.()??`${Date.now()}${Math.random()}`).replace(/[^A-Za-z0-9]/g,'').slice(0,32).padEnd(12,'0')
const ordinal=(n:number)=>`${n}${n%10===1&&n!==11?'st':n%10===2&&n!==12?'nd':n%10===3&&n!==13?'rd':'th'}`

export function CareerApp({initial,friendlies=false,decades}:{initial:CareerView;friendlies?:boolean;decades:number[]}){
 const [v,setV]=useState(initial),[tab,setTab]=useState<Tab>('match'),[msg,setMsg]=useState<{kind:'ok'|'error';text:string}|null>(null),[busy,start]=useTransition()
 const send=(a:Record<string,unknown>,ok?:string)=>start(async()=>{
  const r=await legendsAction(v.id,{...a,key:newKey(),rev:v.revision})
  if(r.ok){setV(r.view);setMsg(r.note?{kind:'ok',text:r.note}:ok?{kind:'ok',text:ok}:null)}else{if(r.view)setV(r.view);setMsg({kind:'error',text:r.error})}
 })
 useEffect(()=>{if(v.live)setTab('match')},[v.live])
 const tabs:{id:Tab;label:string}[]=[{id:'match',label:v.phase==='window'?'Window':'Matchday'},{id:'squad',label:'Squad'},{id:'market',label:'Market'},{id:'league',label:'League'},{id:'club',label:'The club'},...(friendlies?[{id:'friendlies' as Tab,label:'Friendlies'}]:[])]
 return <div className="lgm-app">
  <header className="lgm-head">
   <Emblem size={64}/>
   <div><p className="lgm-kicker">Legends Manager · season {v.season}</p><h1>{v.clubName}</h1></div>
   <dl className="lgm-meter">
    <div><dt>{v.phase==='draft'?'Draft':'Round'}</dt><dd>{v.phase==='draft'?'Open':<>{Math.min(v.played+1,v.rounds)}<small>/{v.rounds}</small></>}</dd></div>
    <div><dt>Cash</dt><dd>{v.phase==='draft'?money(v.draft?.left??52):money(v.cash)}</dd></div>
    <div><dt>Reputation</dt><dd>{v.reputation}</dd></div>
   </dl>
  </header>
  <p className="lgm-live" role="status" aria-live="polite" data-kind={msg?.kind}>{msg?.text??''}</p>
  {v.cutscene?<Cutscene v={v} busy={busy} send={send}/>:null}
  {v.status==='archived'?<p className="lgm-error">This career is archived. Restore it from the Legends front page to play on.</p>:null}
  {v.phase==='draft'?<DraftRoom v={v} busy={busy} send={send}/>:<>
   <nav className="lgm-tabs" aria-label="Career">{tabs.map(t=><button key={t.id} type="button" className="min-h-tap" aria-current={tab===t.id?'page':undefined} onClick={()=>{setTab(t.id);setMsg(null)}}>{t.label}{t.id==='market'&&v.window?<i aria-label="open"/>:null}</button>)}</nav>
   {tab==='match'?<Matchday v={v} busy={busy} send={send} go={setTab}/>:null}
   {tab==='squad'?<Squad v={v} busy={busy} send={send}/>:null}
   {tab==='market'?<Market v={v} busy={busy} send={send} decades={decades}/>:null}
   {tab==='league'?<League v={v}/>:null}
   {tab==='club'?<Club v={v}/>:null}
   {tab==='friendlies'&&friendlies?<CareerFriendlies careerId={v.id} ready={!v.lineup.error}/>:null}
  </>}
 </div>
}

/* ───────── cutscenes: the board's grant, the season's end ───────── */
function Cutscene({v,busy,send}:{v:CareerView;busy:boolean;send:(a:Record<string,unknown>,ok?:string)=>void}){
 const grant=v.cutscene==='board-grant',e=v.seasonEnd
 return <div className="lgm-scene z-[60]" role="dialog" aria-modal="true" aria-labelledby="lgm-scene-h">
  <div className="lgm-scene-card">
   <Emblem size={120}/>
   {grant?<>
    <p className="lgm-kicker">The boardroom · after the draft</p>
    <h2 id="lgm-scene-h">The club stands behind you</h2>
    <p>The season-ticket holders have renewed, the sponsors have signed and the board has met. To mark the founding of your side, a one-off grant.</p>
    <p className="lgm-scene-sum"><span>Left from the draft</span><b>{money(Math.round((v.cash-8)*10)/10)}</b><span>Board grant</span><b>+ €8M</b><span>Your first window</span><b>{money(v.cash)}</b></p>
   </>:e?<>
    <p className="lgm-kicker">Season {v.season} · the final table</p>
    <h2 id="lgm-scene-h">{e.champion?`Champions${e.playoff?' — after a play-off':''}`:`${ordinal(e.place)} of ${e.of}`}</h2>
    {e.topScorer?<p>Top scorer: <b>{e.topScorer.name}</b> · {e.topScorer.goals} goal{e.topScorer.goals===1?'':'s'}</p>:null}
    <ul className="lgm-scene-list">{e.bonuses.map(b=><li key={b.why}><span>{b.why}</span><b>+ {money(b.amount)}</b></li>)}<li><span>Board grant for next season</span><b>+ {money(e.grant)}</b></li></ul>
    <ul className="lgm-scene-list">{e.reputation.map(r=><li key={r.why}><span>{r.why}</span><b>+{r.points} reputation</b></li>)}</ul>
   </>:null}
   <p className="lgm-actions"><button type="button" className="lgm-go min-h-tap" disabled={busy} onClick={()=>send({kind:'ack'})}>{grant?'To the transfer window':'See the club'}</button>
    {!grant&&v.phase==='season-end'?<button type="button" className="lgm-ghost min-h-tap" disabled={busy} onClick={()=>send({kind:'next-season'},`Season ${v.season+1} begins.`)}>Start season {v.season+1}</button>:null}</p>
  </div>
 </div>
}

/* ───────── matchday ───────── */
function Matchday({v,busy,send,go}:{v:CareerView;busy:boolean;send:(a:Record<string,unknown>,ok?:string)=>void;go:(t:Tab)=>void}){
 if(v.live)return <LiveMatch v={v} busy={busy} send={send}/>
 const me=v.table.findIndex(r=>r.mine)
 return <div className="lgm-grid">
  {v.phase==='window'?<section className="lgm-panel lgm-window" aria-labelledby="lgm-win-h">
   <p className="lgm-kicker">{v.window?.which==='pre'?(v.season===1?'After the draft':`Pre-season · season ${v.season}`):'The halfway window'}</p>
   <h2 id="lgm-win-h">The transfer window is open</h2>
   <p>Buy and sell inside {v.clubName}’s history only. A squad is 17–20 with GK 2 · DF 6 · MF 6 · FW 3. When you are ready, shut the window — the other clubs do their business as it closes.</p>
   <p className="lgm-actions"><button type="button" className="lgm-ghost min-h-tap" onClick={()=>go('market')}>To the market</button><button type="button" className="lgm-go min-h-tap" disabled={busy} onClick={()=>send({kind:'close-window'},'The window is shut. The season goes on.')}>Shut the window</button></p>
  </section>:null}
  {v.phase==='season-end'?<section className="lgm-panel"><p className="lgm-kicker">Season {v.season} is over</p><h2>{v.history.at(-1)?.champion?'Champions':`${ordinal(v.history.at(-1)?.place??0)} place`}</h2><p className="lgm-actions"><button type="button" className="lgm-go min-h-tap" disabled={busy} onClick={()=>send({kind:'next-season'},`Season ${v.season+1} begins.`)}>Start season {v.season+1}</button></p></section>:null}
  {v.next&&v.phase!=='window'?<section className="lgm-panel lgm-next" aria-labelledby="lgm-next-h">
   <p className="lgm-kicker" id="lgm-next-h">{v.next.playoff?'Title play-off · neutral ground':`Round ${v.next.round} · ${v.next.atHome?'home':'away'}`}</p>
   <p className="lgm-fixture"><span>{v.next.homeName}</span><b>v</b><span>{v.next.awayName}</span></p>
   <p className="lgm-fine">{v.next.opponent.name} in a {v.next.opponent.formation} · their eleven averages <Stars value={v.next.opponent.stars} size="sm"/></p>
   {v.next.opponent.xi?<p className="lgm-fine">Scouting report: {v.next.opponent.xi.join(', ')}.</p>:null}
   {v.lineup.error?<p className="lgm-error" role="alert">{v.lineup.error} <button type="button" className="lgm-link min-h-tap" onClick={()=>send({kind:'auto'},'Best fit eleven picked.')}>Pick the best fit eleven</button></p>:null}
   <p className="lgm-actions">
    <button type="button" className="lgm-go min-h-tap" disabled={busy||!!v.lineup.error} onClick={()=>send({kind:'match-start',mode:'interactive'})}>From the touchline</button>
    <button type="button" className="lgm-ghost min-h-tap" disabled={busy||!!v.lineup.error} onClick={()=>send({kind:'match-start',mode:'fast'},'Full time.')}>Quick result</button>
    <button type="button" className="lgm-link min-h-tap" onClick={()=>go('squad')}>Team sheet →</button>
   </p>
   <p className="lgm-fine">From the touchline, the match stops up to three times — a goal, a red card, an injury, or half-time — and you can change tactics or make up to three changes. Both modes play the same match.</p>
  </section>:null}
  {v.bye?<section className="lgm-panel"><p className="lgm-kicker">Round {v.played+1}</p><h2>A free week</h2><p>{v.clubName} sit this round out. The others play.</p><p className="lgm-actions"><button type="button" className="lgm-go min-h-tap" disabled={busy} onClick={()=>send({kind:'play-round'},'The round is played.')}>Play the round</button></p></section>:null}
  {v.last?<section className="lgm-panel"><p className="lgm-kicker">Last result · round {v.last.round}</p><Result r={v.last}/></section>:null}
  <section className="lgm-panel"><p className="lgm-kicker">The table</p><Table rows={v.table.slice(0,Math.max(4,me+1))}/></section>
 </div>
}
function Result({r,full=false}:{r:ResultView;full?:boolean}){
 const lines=r.log.filter(l=>full?l.kind!=='kickoff':['goal','red','injury','penalties'].includes(l.kind))
 return <div className="lgm-result">
  <p className="lgm-fixture"><span>{r.home}</span><b>{r.goals[0]} – {r.goals[1]}{r.pens?<small> ({r.pens[0]}–{r.pens[1]} pens)</small>:null}</b><span>{r.away}</span></p>
  {lines.length?<ol className="lgm-log">{lines.map((l,i)=><li key={i} data-side={l.side??undefined} data-kind={l.kind} data-mine={l.mine||undefined}><b>{l.minute}′</b> {l.text}</li>)}</ol>:<p className="lgm-fine">No goals.</p>}
 </div>
}
function LiveMatch({v,busy,send}:{v:CareerView;busy:boolean;send:(a:Record<string,unknown>,ok?:string)=>void}){
 const L=v.live!,[t,setT]=useState(L.tactics),[subs,setSubs]=useState<{out:string;in:string}[]>([]),[out,setOut]=useState('')
 useEffect(()=>{setT(L.tactics);setSubs([]);setOut('')},[L.minute,L.tactics])
 const used=new Set(subs.flatMap(s=>[s.out,s.in]))
 return <section className="lgm-panel lgm-touchline" aria-labelledby="lgm-tl-h">
  <p className="lgm-kicker" id="lgm-tl-h">From the touchline · {L.minute}′ · stop {v.rules.stops-L.stopsLeft+1} of {v.rules.stops}</p>
  <p className="lgm-fixture lgm-score"><span>{L.home}</span><b>{L.goals[0]} – {L.goals[1]}</b><span>{L.away}</span></p>
  <ol className="lgm-log" aria-live="polite">{L.log.filter(l=>l.kind!=='kickoff').slice(-12).map((l,i)=><li key={i} data-side={l.side??undefined} data-kind={l.kind} data-mine={l.mine||undefined}><b>{l.minute}′</b> {l.text}</li>)}</ol>
  <div className="lgm-decide">
   <fieldset><legend>Approach</legend>{APPROACH.map(([k,l])=><label key={k} data-on={t.approach===k||undefined}><input type="radio" className="sr-only" name="ap" checked={t.approach===k} onChange={()=>setT({...t,approach:k})}/>{l}</label>)}</fieldset>
   <fieldset><legend>Pressing</legend>{PRESS.map(([k,l])=><label key={k} data-on={t.pressing===k||undefined}><input type="radio" className="sr-only" name="pr" checked={t.pressing===k} onChange={()=>setT({...t,pressing:k})}/>{l}</label>)}</fieldset>
   <fieldset><legend>Tempo</legend>{TEMPO.map(([k,l])=><label key={k} data-on={t.tempo===k||undefined}><input type="radio" className="sr-only" name="te" checked={t.tempo===k} onChange={()=>setT({...t,tempo:k})}/>{l}</label>)}</fieldset>
   <fieldset><legend>Changes · {L.subsLeft-subs.length} left</legend>
    <label className="lgm-select">Off<select className="min-h-tap" value={out} onChange={e=>setOut(e.target.value)} disabled={L.subsLeft-subs.length<=0}><option value="">Choose a man on the pitch</option>{L.pitch.filter(p=>!used.has(p.id)).map(p=><option key={p.id} value={p.id}>{p.slot} · {p.name}</option>)}</select></label>
    <label className="lgm-select">On<select className="min-h-tap" value="" disabled={!out} onChange={e=>{if(e.target.value){setSubs([...subs,{out,in:e.target.value}]);setOut('')}}}><option value="">Choose from the bench</option>{L.bench.filter(b=>!used.has(b.id)).map(b=><option key={b.id} value={b.id}>{b.pos} · {b.name}</option>)}</select></label>
    {subs.length?<ul className="lgm-subs">{subs.map(s=><li key={s.out}>{L.bench.find(b=>b.id===s.in)?.name} for {L.pitch.find(p=>p.id===s.out)?.name} <button type="button" className="lgm-link min-h-tap" onClick={()=>setSubs(subs.filter(x=>x!==s))}>undo</button></li>)}</ul>:null}
   </fieldset>
  </div>
  <p className="lgm-actions"><button type="button" className="lgm-go min-h-tap" disabled={busy} onClick={()=>send({kind:'match-decide',decision:{tactics:t,...(subs.length?{subs}:{})}})}>{subs.length||JSON.stringify(t)!==JSON.stringify(L.tactics)?'Make the changes · play on':'Play on'}</button></p>
 </section>
}

/* ───────── the squad and the team sheet ───────── */
function Squad({v,busy,send}:{v:CareerView;busy:boolean;send:(a:Record<string,unknown>,ok?:string)=>void}){
 const [xi,setXi]=useState(v.lineup.xi),[bench,setBench]=useState(v.lineup.bench),[f,setF]=useState(v.lineup.formation),[t,setT]=useState(v.lineup.tactics),[slot,setSlot]=useState<number|null>(null),[open,setOpen]=useState<string|null>(null)
 useEffect(()=>{setXi(v.lineup.xi);setBench(v.lineup.bench);setF(v.lineup.formation);setT(v.lineup.tactics)},[v.revision,v.lineup])
 const by=useMemo(()=>new Map<string,SquadView|{id:string;name:string;pos:string;stars:number}>([...v.squad.map(s=>[s.id,s] as const),...v.emergency.map(e=>[e.id,{id:e.id,name:`${e.name} (emergency)`,pos:e.pos,stars:0}] as const)]),[v.squad,v.emergency])
 const dirty=JSON.stringify([xi,bench,f,t])!==JSON.stringify([v.lineup.xi,v.lineup.bench,v.lineup.formation,v.lineup.tactics])
 const place=(id:string)=>{
  if(slot===null){const i=bench.indexOf(id);setBench(i>=0?bench.filter(x=>x!==id):bench.length<7&&!xi.includes(id)?[...bench,id]:bench);return}
  const next=[...xi],was=next.indexOf(id);if(was>=0)next[was]=next[slot]!;next[slot]=id;setXi(next);setBench(bench.filter(x=>x!==id));setSlot(null)
 }
 const slots=v.lineup.slots
 return <div className="lgm-squad">
  <section className="lgm-panel" aria-labelledby="lgm-sheet-h">
   <p className="lgm-kicker" id="lgm-sheet-h">The team sheet</p>
   <div className="lgm-chips"><span>Formation</span>{FORMATIONS.map(x=><button key={x} type="button" className="min-h-tap" aria-pressed={f===x} onClick={()=>{setF(x);send({kind:'auto',formation:x},`${x} — best fit eleven picked.`)}} disabled={busy}>{x}</button>)}</div>
   <div className="lgm-chips"><span>Approach</span>{APPROACH.map(([k,l])=><button key={k} type="button" className="min-h-tap" aria-pressed={t.approach===k} onClick={()=>setT({...t,approach:k})}>{l}</button>)}</div>
   <div className="lgm-chips"><span>Pressing</span>{PRESS.map(([k,l])=><button key={k} type="button" className="min-h-tap" aria-pressed={t.pressing===k} onClick={()=>setT({...t,pressing:k})}>{l}</button>)}</div>
   <div className="lgm-chips"><span>Tempo</span>{TEMPO.map(([k,l])=><button key={k} type="button" className="min-h-tap" aria-pressed={t.tempo===k} onClick={()=>setT({...t,tempo:k})}>{l}</button>)}</div>
   <div className="lgm-pitch" role="group" aria-label={`${f} — tap a position, then a man`}>
    {slots.map((s,i)=>{const m=by.get(xi[i]??''),off=m&&'quota' in m&&m.quota!==s.family;return <button key={s.id} type="button" className="lgm-spot min-h-tap" style={{insetInlineStart:`${s.x}%`,insetBlockStart:`${s.y}%`}} aria-pressed={slot===i} data-off={off||undefined} onClick={()=>setSlot(slot===i?null:i)}>
     <small>{s.fine}</small><b>{m?m.name.split(' ').slice(-1)[0]:'—'}</b>{m&&m.stars?<Stars value={m.stars} size="sm"/>:null}</button>})}
   </div>
   <p className="lgm-fine">{slot===null?'Tap a position on the pitch, then a man below. With no position chosen, a man goes to the bench (seven at most). Out of position he plays below himself.':`Choose who plays ${slots[slot]!.fine}.`}</p>
   {v.lineup.error?<p className="lgm-error" role="alert">{v.lineup.error}</p>:null}
   <p className="lgm-actions"><button type="button" className="lgm-go min-h-tap" disabled={busy||!dirty} onClick={()=>send({kind:'lineup',formation:f,xi,bench,tactics:t},'Team sheet saved.')}>Save the team sheet</button><button type="button" className="lgm-ghost min-h-tap" disabled={busy} onClick={()=>send({kind:'auto',formation:f},'Best fit eleven picked.')}>Best fit eleven</button></p>
  </section>
  <section className="lgm-panel" aria-labelledby="lgm-men-h">
   <p className="lgm-kicker" id="lgm-men-h">The squad · {v.squad.length} · GK {v.quotas.GK} · DF {v.quotas.DF} · MF {v.quotas.MF} · FW {v.quotas.FW}</p>
   <ul className="lgm-men">{v.squad.map(s=><li key={s.id} data-xi={xi.includes(s.id)||undefined} data-bench={bench.includes(s.id)||undefined} data-out={!s.fit||undefined}>
    <button type="button" className="lgm-man min-h-tap" disabled={!s.fit} onClick={()=>place(s.id)}><span className="lgm-pos" data-pos={s.pos}>{s.pos}</span><b>{s.name}</b><Stars value={s.stars} size="sm"/>
     <small>{xi.includes(s.id)?'XI':bench.includes(s.id)?'Bench':s.injury?`Injured · ${s.injury}`:s.suspension?`Banned · ${s.suspension}`:''}</small></button>
    <button type="button" className="lgm-link min-h-tap" aria-expanded={open===s.id} onClick={()=>setOpen(open===s.id?null:s.id)}>Card</button>
    {open===s.id?<div className="lgm-man-card"><LegendCard c={s}><p className="lgm-fine">{s.appsTotal} appearances · {s.goals} goals this season · {s.yellows} yellows · signed for {money(s.paid)}</p>
     {s.sale?<p className="lgm-actions"><button type="button" className="lgm-ghost min-h-tap" disabled={busy} onClick={()=>send({kind:'sell',card:s.id},`${s.name} sold for ${money(s.sale!.net)}.`)}>Sell · {money(s.sale.net)} <small>({money(s.sale.quoted)} less {money(s.sale.fees)} fees)</small></button></p>:null}</LegendCard></div>:null}
   </li>)}</ul>
   {v.emergency.length?<p className="lgm-fine">Emergency cover from the archive: {v.emergency.map(e=>`${e.name} (${e.pos}, match ${e.games+1} of 3)`).join(', ')}.</p>:null}
  </section>
 </div>
}

/* ───────── the market (§1.3.13): special offers and a free search, this club's history only ───────── */
function Market({v,busy,send,decades}:{v:CareerView;busy:boolean;send:(a:Record<string,unknown>,ok?:string)=>void;decades:number[]}){
 const [pos,setPos]=useState(''),[dec,setDec]=useState(''),[price,setPrice]=useState(''),[q,setQ]=useState(''),[res,setRes]=useState<{cards:CardView[];total:number}|null>(null),[swapOut,setSwapOut]=useState(''),[loading,load]=useTransition()
 const search=()=>load(async()=>{const r=await legendsMarket(v.id,{pos:pos||null,decade:dec?Number(dec):null,price:price?Number(price):null,q:q||null});if(r.ok)setRes({cards:r.cards,total:r.total})})
 useEffect(()=>{if(v.window)search()},[v.window?.which,v.revision]) // eslint-disable-line react-hooks/exhaustive-deps
 if(!v.window)return <section className="lgm-panel"><p className="lgm-kicker">The market</p><h2>The window is shut</h2><p>Two windows a season: before the first round, and at the halfway mark. {v.played<Math.floor(v.rounds/2)?`The next opens after round ${Math.floor(v.rounds/2)}.`:'The next opens before next season.'}</p></section>
 const full=v.squad.length>=v.rules.maxSquad
 const buy=(c:CardView)=>full?(swapOut?send({kind:'swap',sell:swapOut,buy:c.id},`${c.name} in, ${v.squad.find(s=>s.id===swapOut)?.name} out.`):null):send({kind:'buy',card:c.id},`${c.name} signed for ${money(c.price)}.`)
 const row=(c:CardView,compact=false)=><LegendCard key={c.id} c={c} compact={compact}><p className="lgm-actions"><button type="button" className="lgm-sign min-h-tap" disabled={busy||c.price>v.cash+(full&&swapOut?v.squad.find(s=>s.id===swapOut)?.sale?.net??0:0)||(full&&!swapOut)} onClick={()=>buy(c)}>{full?'Swap him in':`Sign · ${money(c.price)}`}</button></p></LegendCard>
 return <div className="lgm-market">
  <section className="lgm-panel" aria-labelledby="lgm-offers-h"><p className="lgm-kicker" id="lgm-offers-h">Special offers · {money(v.cash)} to spend</p>
   {full?<label className="lgm-select">Squad full — who makes way?<select className="min-h-tap" value={swapOut} onChange={e=>setSwapOut(e.target.value)}><option value="">Choose a man to sell</option>{v.squad.map(s=><option key={s.id} value={s.id}>{s.pos} · {s.name} · {money(s.sale?.net??0)}</option>)}</select></label>:null}
   <div className="lgm-offers">{v.window.offers.length?v.window.offers.map(c=>row(c)):<p className="lgm-fine">Nothing you can afford today.</p>}</div>
  </section>
  <section className="lgm-panel" aria-labelledby="lgm-search-h"><p className="lgm-kicker" id="lgm-search-h">Search {v.clubName}’s history</p>
   <form className="lgm-filters" onSubmit={e=>{e.preventDefault();search()}}>
    <label>Line<select className="min-h-tap" value={pos} onChange={e=>setPos(e.target.value)}><option value="">Any</option>{['GK','DF','MF','FW'].map(p=><option key={p} value={p}>{posName(p)}</option>)}</select></label>
    <label>Decade<select className="min-h-tap" value={dec} onChange={e=>setDec(e.target.value)}><option value="">Any</option>{decades.map(d=><option key={d} value={d}>{d}s</option>)}</select></label>
    <label>Price<select className="min-h-tap" value={price} onChange={e=>setPrice(e.target.value)}><option value="">Any</option>{[1,2,3,4,5].map(p=><option key={p} value={p}>€{p}M</option>)}</select></label>
    <label>Name<input className="min-h-tap" value={q} onChange={e=>setQ(e.target.value)} placeholder="Family name"/></label>
    <button type="submit" className="lgm-go min-h-tap" disabled={loading}>Search</button>
   </form>
   {res?<><p className="lgm-fine">{res.total.toLocaleString('en-GB')} men{res.total>res.cards.length?` — the ${res.cards.length} with the most stars`:''}. A “1990s man” means his recorded years at the club touch the 1990s.</p><div className="lgm-offers lgm-offers-wide">{res.cards.map(c=>row(c,true))}</div></>:null}
  </section>
 </div>
}

/* ───────── the league ───────── */
function Table({rows}:{rows:CareerView['table']}){
 return <div className="lgm-table-wrap"><table className="lgm-table"><thead><tr><th scope="col">#</th><th scope="col">Club</th><th scope="col">P</th><th scope="col">W</th><th scope="col">D</th><th scope="col">L</th><th scope="col">GD</th><th scope="col">Pts</th><th scope="col" className="lgm-form-h">Form</th></tr></thead>
  <tbody>{rows.map((r,i)=><tr key={r.club} data-mine={r.mine||undefined}><td>{i+1}</td><th scope="row">{r.name}</th><td>{r.p}</td><td>{r.w}</td><td>{r.d}</td><td>{r.l}</td><td>{r.gd>0?`+${r.gd}`:r.gd}</td><td><b>{r.pts}</b></td><td className="lgm-form">{r.form.map((x,j)=><span key={j} data-r={x}>{x}</span>)}</td></tr>)}</tbody></table></div>
}
function League({v}:{v:CareerView}){
 const rounds=[...new Set(v.results.map(r=>r.round))].sort((a,b)=>b-a),[open,setOpen]=useState<string|null>(null)
 return <div className="lgm-grid">
  <section className="lgm-panel"><p className="lgm-kicker">Season {v.season} · the table</p><Table rows={v.table}/><p className="lgm-fine">{v.tieNote} Points: win {v.settings.points.win}, draw {v.settings.points.draw}, loss {v.settings.points.loss}.</p></section>
  <section className="lgm-panel"><p className="lgm-kicker">Results</p>
   {rounds.length?rounds.map(rd=><div key={rd} className="lgm-round"><h3>{rd>v.rounds?'Play-off':`Round ${rd}`}</h3><ul>{v.results.filter(r=>r.round===rd).map(r=><li key={r.id} data-mine={r.mine||undefined}><button type="button" className="lgm-res min-h-tap" aria-expanded={open===r.id} onClick={()=>setOpen(open===r.id?null:r.id)}><span>{r.home}</span><b>{r.goals[0]}–{r.goals[1]}</b><span>{r.away}</span></button>{open===r.id?<Result r={r} full/>:null}</li>)}</ul></div>):<p className="lgm-fine">No round has been played yet.</p>}
  </section>
 </div>
}

/* ───────── the club: honours, the ledger, the manager's standing ───────── */
function Club({v}:{v:CareerView}){
 return <div className="lgm-grid">
  <section className="lgm-panel"><p className="lgm-kicker">The honours board</p>
   {v.history.length?<ol className="lgm-honours">{v.history.map(h=><li key={h.ordinal} data-champion={h.champion||undefined}><b>Season {h.ordinal}</b><span>{h.champion?'Champions':`${ordinal(h.place)} of ${h.of}`} · {h.points} pts · {h.w}-{h.d}-{h.l}</span>{h.topScorer?<small>Top scorer {h.topScorer.name} ({h.topScorer.goals})</small>:null}</li>)}</ol>:<p className="lgm-fine">The first season is still being written.</p>}
  </section>
  <section className="lgm-panel"><p className="lgm-kicker">The manager · {v.reputation} reputation</p>
   <ul className="lgm-abilities">{v.abilities.map(a=><li key={a.id} data-open={a.open||undefined}><b>{a.label}</b><small>{a.open?a.hint:`Opens at ${a.at} reputation — ${a.hint.toLowerCase()}`}</small></li>)}</ul>
   <p className="lgm-fine">Reputation comes from wins, titles and runs. It opens management tools — never strength on the pitch.</p>
  </section>
  <section className="lgm-panel"><p className="lgm-kicker">The books</p>
   <ul className="lgm-ledger">{v.ledger.map((l,i)=><li key={i} data-in={l.amount>=0||undefined}><span>{LEDGER[l.kind]??l.kind}{l.name?` · ${l.name}`:''}{l.note?<small> · {l.note}</small>:null}</span><b>{l.amount>=0?'+':'−'}{money(Math.abs(l.amount))}</b></li>)}</ul>
  </section>
  <section className="lgm-panel"><p className="lgm-kicker">How a legend is rated</p><p>{GAME_VALUES}</p><dl className="lgm-key">{(['GK','DF','MF','FW'] as const).map(p=><div key={p}><dt>{posName(p)}</dt><dd>{ROLE_ATTRS[p].map(k=>ATTR_LABEL[k as AttrKey]).join(' · ')}</dd></div>)}</dl></section>
 </div>
}
const LEDGER:Record<string,string>={'draft-budget':'Draft budget','draft-buy':'Draft signing','board-grant':'Board grant',buy:'Signing',sell:'Sale','season-grant':'Season grant',bonus:'Bonus',emergency:'Emergency player'}
export {years}
