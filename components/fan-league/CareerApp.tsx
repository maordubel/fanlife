'use client'
import {useEffect,useMemo,useRef,useState,useTransition} from 'react'
import Link from 'next/link'
import {careerAction,marketAction} from '@/app/all-football/fan-league/actions'
import type {CardView,CareerView,FixtureView,Lines} from '@/lib/fan-league/server'
import {CareerFriendlies} from './Friendlies'

/**
 * One career on one screen: Today · Squad · Market · League. Every change is ONE server action carrying the revision this
 * screen saw and a fresh key; what comes back is the career as the server now holds it. Nothing is decided here.
 */
type Tab='today'|'squad'|'market'|'league'|'friendlies'
const TABS:{id:Tab;label:string}[]=[{id:'today',label:'Today'},{id:'squad',label:'Squad'},{id:'market',label:'Market'},{id:'league',label:'League'}]
const FORMATIONS=['4-3-3','4-4-2','3-5-2'] as const
const TACTIC_TEXT={balanced:'Balanced',attacking:'Attacking',defensive:'Defensive'} as const
const newKey=()=>(globalThis.crypto?.randomUUID?.()??`${Date.now()}${Math.random()}`).replace(/[^A-Za-z0-9]/g,'').slice(0,32).padEnd(12,'0')
const years=(c:{fromYear:number|null;toYear:number|null})=>c.fromYear&&c.toYear?(c.fromYear===c.toYear?`${c.fromYear}`:`${c.fromYear}–${c.toYear}`):'Years not recorded'
const money=(m:number)=>`€${m%1?m.toFixed(1):m}M`
const fits=(c:CardView,fam:string)=>c.free?fam!=='GK':c.position===fam||!!c.alt?.includes(fam as CardView['position'])

export function CareerApp({initial,friendlies=false}:{initial:CareerView;friendlies?:boolean}){
 const [v,setV]=useState(initial),[tab,setTab]=useState<Tab>('today'),[msg,setMsg]=useState<{kind:'ok'|'error';text:string}|null>(null),[busy,start]=useTransition()
 const send=(a:Record<string,unknown>,ok?:string)=>start(async()=>{
  const r=await careerAction(v.id,{...a,key:newKey(),rev:v.revision})
  if(r.ok){setV(r.view);setMsg(ok?{kind:'ok',text:ok}:null)}else{if(r.view)setV(r.view);setMsg({kind:'error',text:r.error})}
 })
 return <div className="flg-app">
  <header className="flg-head">
   <div><p className="af-label">FAN LEAGUE · home decade {v.homeDecade}s</p><h1>{v.clubName}</h1></div>
   <dl className="flg-strip">
    <div><dt>Round</dt><dd>{Math.min(v.played+1,v.rounds)}<small>/{v.rounds}</small></dd></div>
    <div><dt>Budget</dt><dd>{money(v.budget)}</dd></div>
    <div><dt>Window</dt><dd data-open={v.window||undefined}>{v.window?'Open':'Shut'}</dd></div>
   </dl>
  </header>
  <nav className="flg-tabs" aria-label="Career">{[...TABS,...(friendlies?[{id:'friendlies' as Tab,label:'Friendlies'}]:[])].map(t=><button key={t.id} type="button" className="min-h-tap" aria-current={tab===t.id?'page':undefined} onClick={()=>{setTab(t.id);setMsg(null)}}>{t.label}</button>)}</nav>
  <p className="flg-live" role="status" aria-live="polite" data-kind={msg?.kind}>{msg?.text??''}</p>
  {tab==='today'?<Today v={v} busy={busy} play={()=>send({kind:'play'},`Round ${v.played+1} played.`)} go={setTab}/>:null}
  {tab==='squad'?<Squad v={v} busy={busy} send={send}/>:null}
  {tab==='market'?<Market v={v} busy={busy} send={send}/>:null}
  {tab==='league'?<League v={v}/>:null}
  {tab==='friendlies'&&friendlies?<CareerFriendlies careerId={v.id} xiError={v.xiError}/>:null}
 </div>
}

function LinesBar({l,label}:{l:Lines|null;label:string}){
 if(!l)return <p className="flg-fine">{label}: no legal eleven yet.</p>
 return <dl className="flg-lines" aria-label={label}>{(['attack','midfield','defence'] as const).map(k=><div key={k}><dt>{k}</dt><dd><span style={{inlineSize:`${Math.max(4,Math.min(100,l[k]))}%`}}/><b>{l[k]}</b></dd></div>)}</dl>
}
function Score({f}:{f:FixtureView}){
 return <div className="flg-score">
  <p className="flg-score-line"><span>{f.homeName}</span><b>{f.goals?`${f.goals[0]} – ${f.goals[1]}`:'v'}</b><span>{f.awayName}</span></p>
  {f.goals&&f.goalsLog.length?<ol className="flg-goals">{f.goalsLog.map((g,i)=><li key={i} data-side={g.side}><b>{g.minute}′</b> {g.scorer}{g.assist?<small> · assist {g.assist}</small>:null}</li>)}</ol>:f.goals?<p className="flg-fine">No goals.</p>:null}
 </div>
}
function Today({v,busy,play,go}:{v:CareerView;busy:boolean;play:()=>void;go:(t:Tab)=>void}){
 const top=v.table.slice(0,4),me=v.table.findIndex(r=>r.mine)
 if(v.status==='finished'){const pos=me+1;return <section className="flg-card flg-final"><p className="af-label">Full time on the season</p><h2>{pos===1?`Champions — ${v.clubName}`:`${v.clubName} finish ${ordinal(pos)}`}</h2><Table rows={v.table}/><p><Link className="flg-go min-h-tap" href="/all-football/fan-league">Start another career</Link></p></section>}
 return <div className="flg-today">
  {v.window?<p className="flg-banner"><b>The transfer window is open.</b> {v.played===0?'Strengthen the side before the first round.':'The halfway window — it shuts when you play the next round.'} <button type="button" className="flg-link min-h-tap" onClick={()=>go('market')}>To the market →</button></p>:null}
  {v.next?<section className="flg-card flg-next" aria-labelledby="flg-next-h">
   <p className="af-label" id="flg-next-h">Next · round {v.next.round}</p>
   <Score f={v.next}/>
   {v.opponent?<p className="flg-fine">{v.opponent.name} field a {v.opponent.decade}s side in a {v.opponent.formation}.</p>:null}
   <div className="flg-compare"><LinesBar l={v.lines} label={`${v.clubName} · ${v.formation} · ${TACTIC_TEXT[v.tactic]}`}/>{v.opponent?<LinesBar l={v.opponent.lines} label={v.opponent.name}/>:null}</div>
   {v.xiError?<p className="flg-error" role="alert">{v.xiError} <button type="button" className="flg-link min-h-tap" onClick={()=>go('squad')}>Fix the eleven →</button></p>:null}
   <p className="flg-actions"><button type="button" className="flg-go min-h-tap" disabled={busy||!!v.xiError} onClick={play}>{busy?'Playing…':`Play round ${v.played+1}`}</button><button type="button" className="flg-ghost min-h-tap" onClick={()=>go('squad')}>Pick the eleven</button></p>
  </section>:null}
  {v.last?<section className="flg-card" aria-labelledby="flg-last-h"><p className="af-label" id="flg-last-h">Last result · round {v.last.round}</p><Score f={v.last}/></section>:null}
  <section className="flg-card" aria-labelledby="flg-top-h"><p className="af-label" id="flg-top-h">The table</p><Table rows={top.some(r=>r.mine)?top:[...top.slice(0,3),v.table[me]!]} all={v.table}/><button type="button" className="flg-link min-h-tap" onClick={()=>go('league')}>Full table and fixtures →</button></section>
 </div>
}
const ordinal=(n:number)=>`${n}${n%10===1&&n!==11?'st':n%10===2&&n!==12?'nd':n%10===3&&n!==13?'rd':'th'}`
function Table({rows,all}:{rows:CareerView['table'];all?:CareerView['table']}){
 return <div className="flg-table-wrap"><table className="flg-table"><thead><tr><th scope="col">#</th><th scope="col">Club</th><th scope="col">P</th><th scope="col">W</th><th scope="col">D</th><th scope="col">L</th><th scope="col">GD</th><th scope="col">Pts</th></tr></thead>
  <tbody>{rows.map(r=><tr key={r.club} data-mine={r.mine||undefined}><td>{(all??rows).findIndex(x=>x.club===r.club)+1}</td><th scope="row">{r.name}</th><td>{r.p}</td><td>{r.w}</td><td>{r.d}</td><td>{r.l}</td><td>{r.gd>0?`+${r.gd}`:r.gd}</td><td><b>{r.pts}</b></td></tr>)}</tbody></table></div>
}

function Squad({v,busy,send}:{v:CareerView;busy:boolean;send:(a:Record<string,unknown>,ok?:string)=>void}){
 const [xi,setXi]=useState(v.xi),[tactic,setTactic]=useState(v.tactic)
 useEffect(()=>{setXi(v.xi);setTactic(v.tactic)},[v.xi,v.tactic,v.revision])
 const by=useMemo(()=>new Map(v.squad.map(c=>[c.id,c])),[v.squad]),bench=v.squad.filter(c=>!xi.includes(c.id))
 const dirty=xi.join()!==v.xi.join()||tactic!==v.tactic
 return <div className="flg-squad">
  <section className="flg-card" aria-labelledby="flg-xi-h">
   <p className="af-label" id="flg-xi-h">The eleven</p>
   <div className="flg-controls">
    <label>Formation <select value={v.formation} disabled={busy} onChange={e=>send({kind:'auto',formation:e.target.value},`Best ${e.target.value} picked.`)}>{FORMATIONS.map(f=><option key={f}>{f}</option>)}</select></label>
    <label>Tactic <select value={tactic} onChange={e=>setTactic(e.target.value as CareerView['tactic'])}>{Object.entries(TACTIC_TEXT).map(([k,t])=><option key={k} value={k}>{t}</option>)}</select></label>
    <button type="button" className="flg-ghost min-h-tap" disabled={busy} onClick={()=>send({kind:'auto',formation:v.formation},'The strongest eleven is in.')}>Best eleven</button>
   </div>
   <ol className="flg-pitch" aria-label={`${v.formation} — tap a slot to change the man`}>
    {v.slots.map((s,i)=>{const cur=by.get(xi[i]??''),opts=v.squad.filter(c=>fits(c,s.family)&&(c.id===xi[i]||!xi.includes(c.id)))
     return <li key={s.id} style={{insetInlineStart:`${s.x}%`,insetBlockStart:`${(s.y-14)*1.25}%`}}>
      <label><span className="flg-slot">{s.fine}</span><select value={cur?.id??''} onChange={e=>{const n=[...xi];n[i]=e.target.value;setXi(n)}} aria-label={`${s.fine} slot`}>
       {!cur?<option value="">—</option>:null}{opts.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}</select></label></li>})}
   </ol>
   <LinesBar l={v.lines} label="Team lines (saved eleven)"/>
   <p className="flg-actions"><button type="button" className="flg-go min-h-tap" disabled={busy||!dirty} onClick={()=>send({kind:'lineup',formation:v.formation,tactic,xi},'Eleven saved.')}>Save the eleven</button>{dirty?<button type="button" className="flg-ghost min-h-tap" onClick={()=>{setXi(v.xi);setTactic(v.tactic)}}>Undo</button>:null}</p>
  </section>
  <section className="flg-card" aria-labelledby="flg-bench-h">
   <p className="af-label" id="flg-bench-h">Squad · {v.squad.length} of {v.squadMax} {v.window?'· window open':'· window shut'}</p>
   <ul className="flg-men">{v.squad.map(c=><Man key={c.id} c={c} tag={xi.includes(c.id)?'XI':undefined} action={v.window?<button type="button" className="flg-ghost min-h-tap" disabled={busy||v.squad.length<=v.squadMin} onClick={()=>send({kind:'sell',card:c.id},`${c.name} sold for ${money(c.sell)}.`)}>Sell {money(c.sell)}</button>:null}/>)}</ul>
   {bench.length?null:<p className="flg-fine">Everyone is in the eleven.</p>}
  </section>
 </div>
}
function Man({c,tag,action}:{c:CardView;tag?:string;action?:React.ReactNode}){
 return <li className="flg-man"><span className="flg-pos" data-pos={c.position}>{c.free?'—':c.position}</span><div><b>{c.name}{tag?<em>{tag}</em>:null}</b><small>{years(c)}{c.alt?.length?` · also ${c.alt.join('/')}`:''}{c.free?' · position not recorded':''}</small></div><span className="flg-price">{money(c.price)}</span>{action}</li>
}

function Market({v,busy,send}:{v:CareerView;busy:boolean;send:(a:Record<string,unknown>,ok?:string)=>void}){
 const firstDecade=v.rail.find(r=>r.decade===v.homeDecade)?.decade??v.rail[0]?.decade??'archive'
 const [decade,setDecade]=useState<number|'archive'>(firstDecade),[pos,setPos]=useState(''),[q,setQ]=useState('')
 const [page,setPage]=useState<{cards:CardView[];total:number}|null>(null),[err,setErr]=useState<string|null>(null),[loading,load]=useTransition(),ask=useRef(0)
 useEffect(()=>{const n=++ask.current;const t=setTimeout(()=>load(async()=>{const r=await marketAction(v.id,decade,pos||null,q||null);if(n!==ask.current)return;if(r.ok){setPage({cards:r.cards,total:r.total});setErr(null)}else setErr(r.error)}),q?300:0);return ()=>clearTimeout(t)},[v.id,v.revision,decade,pos,q])
 return <div className="flg-market">
  <p className="flg-banner" data-shut={!v.window||undefined}>{v.window?<><b>Window open · {money(v.budget)} to spend.</b> Every man here played for {v.clubName}. Signing one from another decade is a time-machine fantasy, never a transfer that happened.</>:<><b>The window is shut.</b> It opens again {v.played<v.mid?`after round ${v.mid}`:'next season'}. You can still look.</>}</p>
  <nav className="flg-rail" aria-label="Decades">{v.rail.map(r=><button key={String(r.decade)} type="button" className="min-h-tap" aria-pressed={decade===r.decade} onClick={()=>setDecade(r.decade)}><b>{r.decade==='archive'?'Archive':`${r.decade}s`}</b><small>{r.available} free</small></button>)}</nav>
  <div className="flg-controls">
   <label>Line <select value={pos} onChange={e=>setPos(e.target.value)}><option value="">All</option><option value="GK">Goalkeepers</option><option value="DF">Defenders</option><option value="MF">Midfielders</option><option value="FW">Forwards</option></select></label>
   <label className="flg-search">Name <input type="search" value={q} onChange={e=>setQ(e.target.value)} placeholder="Search this decade"/></label>
  </div>
  {decade==='archive'?<p className="flg-fine">Men with no recorded years at the club: signable, in no decade.</p>:<p className="flg-fine">Recorded years at {v.clubName} touch the {decade}s — not “played in” any one season.</p>}
  {err?<p className="flg-error" role="alert">{err}</p>:null}
  <ul className="flg-men" aria-busy={loading||undefined}>{page?.cards.map(c=><Man key={c.id} c={c} action={<button type="button" className="flg-go min-h-tap" disabled={busy||!v.window||c.price>v.budget||v.squad.length>=v.squadMax||v.soldThisWindow.includes(c.id)} onClick={()=>send({kind:'buy',card:c.id},`${c.name} signed — ${decade==='archive'?'from the archive':`a ${decade}s man`} in your ${v.homeDecade}s side.`)}>Sign {money(c.price)}</button>}/>)}</ul>
  {page&&page.total>page.cards.length?<p className="flg-fine">Showing {page.cards.length} of {page.total}. Narrow by line or name.</p>:null}
  {page&&!page.total?<p className="flg-fine">Nobody left here.</p>:null}
  {v.ledger.length?<section className="flg-card" aria-labelledby="flg-led-h"><p className="af-label" id="flg-led-h">Your dealings</p><ul className="flg-ledger">{v.ledger.map((l,i)=><li key={i}>{l.kind==='buy'?'Signed':'Sold'} <b>{l.name}</b> · {money(l.amount)} · {l.round?`after round ${l.round}`:'pre-season'}</li>)}</ul></section>:null}
 </div>
}

function League({v}:{v:CareerView}){
 const rounds=[...new Set(v.fixtures.map(f=>f.round))]
 return <div className="flg-league">
  <section className="flg-card"><p className="af-label">The table · after {v.played} of {v.rounds}</p><Table rows={v.table}/><p className="flg-fine">Three points for a win, one for a draw; level clubs split by goal difference, then goals scored, then name.</p></section>
  <section className="flg-card"><p className="af-label">Fixtures</p>
   {rounds.map(r=><details key={r} open={r===v.played||r===v.played+1}><summary className="min-h-tap">Round {r}{r===v.mid?' · halfway window after this round':''}</summary>
    <ul className="flg-fixtures">{v.fixtures.filter(f=>f.round===r).map(f=><li key={f.id} data-mine={f.mine||undefined}><span>{f.homeName}</span><b>{f.goals?`${f.goals[0]}–${f.goals[1]}`:'v'}</b><span>{f.awayName}</span></li>)}</ul></details>)}
  </section>
 </div>
}
