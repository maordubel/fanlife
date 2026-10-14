'use client'
import {useEffect,useState,useTransition} from 'react'
import {legendsAction,legendsMarket} from '@/app/all-football/legends/actions'
import type {CardView,CareerView,ResultView} from '@/lib/legends/view'
import {ATTR_LABEL,ROLE_ATTRS,type AttrKey} from '@/lib/legends/ratings'
import {Emblem,Stars} from './Brand'
import {DraftRoom} from './DraftRoom'
import {LegendCard,money,posName,years,GAME_VALUES} from './LegendCard'
import {CareerFriendlies} from './Friendlies'
import type {RumbleWardrobe} from '@/lib/clubs/rumble-kit'
import {Theatre,type TheatreSound} from '@/components/highlights/Theatre'
import {useRumbleSound} from '@/components/clubs/rumble/shared'
import {LiveMatch,type Watch} from './Live'
import {TeamSheet} from './TeamSheet'
import {BoardNews,ClubSheet,WindowSheet} from './Popups'
import {Sheet} from './Sheet'
import {MeetSquad} from './MeetSquad'
import {Thinking} from './Thinking'
import {LeagueCentre,Table} from './Stats'
import {CareerNav,type Tab} from './CareerNav'
import {ClubMark,ShirtProvider} from './Shirts'
import type {CareerShirt} from '@/lib/legends/shirts'
 import {useDressingRoom} from './Talk'

/**
 * One Legends career on one screen, click by click (owner, 12.10.2026). Every change is ONE server action carrying the revision
 * this screen saw and a fresh key; the career that comes back is the one the server now holds (§2.11). The big moments are
 * popups — the board's news, the transfer window, the live match with its three touchline stops, full time — so the page itself
 * stays short: a match card, the next thing to press, the table.
 */
const newKey=()=>(globalThis.crypto?.randomUUID?.()??`${Date.now()}${Math.random()}`).replace(/[^A-Za-z0-9]/g,'').slice(0,32).padEnd(12,'0')
const ordinal=(n:number)=>`${n}${n%10===1&&n!==11?'st':n%10===2&&n!==12?'nd':n%10===3&&n!==13?'rd':'th'}`
type Send=(a:Record<string,unknown>,ok?:string)=>void

export function CareerApp({initial,friendlies=false,decades,wardrobe,shirts=[]}:{initial:CareerView;friendlies?:boolean;decades:number[];wardrobe:RumbleWardrobe;/** the club's documented home kits, drawn on the cards and the team sheet */shirts?:CareerShirt[]}){
 const [v,setV]=useState(initial),[tab,setTab]=useState<Tab>('match'),[msg,setMsg]=useState<{kind:'ok'|'error';text:string}|null>(null),[busy,start]=useTransition()
 // the match being watched: opened by kick-off, kept open through the stops and the final part, closed at "Continue"
 const [watch,setWatch]=useState<Watch|null>(initial.live?{id:initial.live.fixture,from:initial.live.prevStop}:null)
 const [winOpen,setWinOpen]=useState(initial.phase==='window'),[club,setClub]=useState<string|null>(null)
 const send:Send=(a,ok)=>start(async()=>{
  const r=await legendsAction(v.id,{...a,key:newKey(),rev:v.revision})
  if(r.ok){setV(r.view);setMsg(r.note?{kind:'ok',text:r.note}:ok?{kind:'ok',text:ok}:null)}else{if(r.view)setV(r.view);setMsg({kind:'error',text:r.error})}
 })
 // a window that opens (after round 2, at halfway) comes up by itself as soon as the match is over
 useEffect(()=>{if(v.phase==='window'&&!watch)setWinOpen(true)},[v.phase,watch])
 const kickoffNow=()=>{if(!v.next)return;setMsg(null);setWatch({id:v.next.id,from:0});send({kind:'match-start',mode:'interactive'})}
 const watching=watch&&(v.live||v.last?.id===watch.id)
 // the dressing room: kick-off goes through the pre-match talk; the post-match talk follows full time (Talk.tsx)
 const room=useDressingRoom(v,busy,send,!!watching,kickoffNow,()=>setTab('squad')),kickoff=room.kickoff
 const meet=v.cutscene==='meet-squad'&&v.phase!=='draft'
 return <ShirtProvider value={{shirts,wardrobe,colours:v.colours??{}}}><div className="lgm-app tl-app" data-meet={meet||undefined}>
  <header className="lgm-head">
   <Emblem size={56}/>
   <div><p className="lgm-kicker">Legends Manager · season {v.season}</p><h1><ClubMark club={v.clubId} name={v.clubName} size={34}/> {v.clubName}</h1></div>
   <dl className="lgm-meter">
    <div><dt>{v.phase==='draft'?'Draft':'Round'}</dt><dd>{v.phase==='draft'?'Open':<>{Math.min(v.played+1,v.rounds)}<small>/{v.rounds}</small></>}</dd></div>
    <div><dt>Cash</dt><dd>{v.phase==='draft'?money(v.draft?.left??v.draft?.budget??52):money(v.cash)}</dd></div>
    <div><dt>Place</dt><dd>{v.phase==='draft'||!v.played?'—':ordinal(v.table.findIndex(r=>r.mine)+1)}</dd></div>
   </dl>
  </header>
  <p className="lgm-live-msg" role="status" aria-live="polite" data-kind={msg?.kind}>{watching?'':msg?.text??''}</p>
  {v.cutscene==='board-grant'?<BoardNews v={v} busy={busy} send={send}/>:v.cutscene==='season-end'&&!watching&&!room.open?<SeasonEnd v={v} busy={busy} send={send}/>:null}
  {v.status==='archived'?<p className="lgm-error">This career is archived. Restore it from the Legends front page to play on.</p>:null}
  {v.phase==='draft'?<DraftRoom v={v} busy={busy} send={send} wardrobe={wardrobe}/>:meet?<MeetSquad v={v} busy={busy} send={send}/>:<>
   <CareerNav tab={tab} setTab={t=>{setTab(t);setMsg(null)}} windowOpen={!!v.window} matchLabel={v.phase==='window'?'Window':'Match'}/>
   {tab==='match'?<Matchday v={v} busy={busy} send={send} go={setTab} kickoff={kickoff} resume={()=>v.live&&setWatch({id:v.live.fixture,from:v.live.prevStop})} openWindow={()=>setWinOpen(true)} openClub={setClub}/>:null}
   {tab==='squad'?<TeamSheet v={v} busy={busy} send={send}/>:null}
   {tab==='market'?<Market v={v} busy={busy} send={send} decades={decades}/>:null}
   {tab==='league'?<LeagueCentre v={v} openClub={setClub}/>:null}
   {tab==='club'?<Club v={v} friendlies={friendlies?<CareerFriendlies careerId={v.id} ready={!v.lineup.error}/>:null}/>:null}
  </>}
  {watching?<LiveMatch v={v} busy={busy} send={send} watch={watch} setWatch={setWatch}/>:null}
  {room.sheet}
 <Thinking active={busy&&!watching&&v.phase!=='draft'}/>
  {!watching&&!room.open&&winOpen&&v.window&&!v.cutscene?<WindowSheet v={v} busy={busy} send={send} onMarket={()=>{setWinOpen(false);setTab('market')}} onClose={()=>setWinOpen(false)}/>:null}
  {club?<ClubSheet v={v} club={club} onClose={()=>setClub(null)}/>:null}
 </div></ShirtProvider>
}

/* ───────── the season's end ───────── */
function SeasonEnd({v,busy,send}:{v:CareerView;busy:boolean;send:Send}){
 const e=v.seasonEnd;if(!e)return null
 return <Sheet id="lgm-end" tone="night" locked kicker={`Season ${v.season} · the final table`} title={e.champion?`Champions${e.playoff?' — after a play-off':''}`:`${ordinal(e.place)} of ${e.of}`}>
  <div className="lgm-news">
   {e.champion?<div className="lgm-confetti" aria-hidden="true">{Array.from({length:18},(_,i)=><span key={i} style={{animationDelay:`${i*60}ms`,insetInlineStart:`${(i*37)%100}%`}}/>)}</div>:null}
   {e.topScorer?<p>Top scorer: <b>{e.topScorer.name}</b> · {e.topScorer.goals} goal{e.topScorer.goals===1?'':'s'}</p>:null}
   <dl className="lgm-sum">{e.bonuses.map(b=><div key={b.why}><dt>{b.why}</dt><dd className="lgm-plus">+ {money(b.amount)}</dd></div>)}<div data-total><dt>Board grant for next season</dt><dd>+ {money(e.grant)}</dd></div></dl>
   {e.reputation.length?<ul className="lgm-scene-list">{e.reputation.map(r=><li key={r.why}><span>{r.why}</span><b>+{r.points} reputation</b></li>)}</ul>:null}
   <p className="lgm-actions"><button type="button" className="lgm-go lgm-go-big min-h-tap" disabled={busy} onClick={()=>send({kind:'next-season'},`Season ${v.season+1} begins.`)}>Start season {v.season+1}</button><button type="button" className="lgm-link min-h-tap" disabled={busy} onClick={()=>send({kind:'ack'})}>Stay a while</button></p>
  </div>
 </Sheet>
}

/* ───────── matchday: one card, one button ───────── */
function Matchday({v,busy,send,go,kickoff,resume,openWindow,openClub}:{v:CareerView;busy:boolean;send:Send;go:(t:Tab)=>void;kickoff:()=>void;resume:()=>void;openWindow:()=>void;openClub:(c:string)=>void}){
 const me=v.table.findIndex(r=>r.mine),[replay,setReplay]=useState(false),n=v.next
 return <div className="lgm-grid lgm-matchday">
  {v.phase==='window'?<section className="lgm-panel lgm-window"><p className="lgm-kicker">The transfer window is open</p><p className="lgm-actions"><button type="button" className="lgm-go lgm-go-big min-h-tap" onClick={openWindow}>Open the window · {money(v.cash)}</button></p></section>:null}
  {v.phase==='season-end'?<section className="lgm-panel"><p className="lgm-kicker">Season {v.season} is over</p><h2>{v.history.at(-1)?.champion?'Champions':`${ordinal(v.history.at(-1)?.place??0)} place`}</h2><p className="lgm-actions"><button type="button" className="lgm-go lgm-go-big min-h-tap" disabled={busy} onClick={()=>send({kind:'next-season'},`Season ${v.season+1} begins.`)}>Start season {v.season+1}</button></p></section>:null}
  {v.live?<section className="lgm-ticket" data-live><p className="lgm-kicker"><span className="lgm-onair" aria-hidden="true"/>Your match is waiting at {v.live.minute}′</p><p className="lgm-actions"><button type="button" className="lgm-go lgm-go-big min-h-tap" onClick={resume}>Back to the touchline</button></p></section>
  :n&&v.phase!=='window'&&v.phase!=='season-end'?<section className="lgm-ticket" aria-labelledby="lgm-next-h">
   <p className="lgm-ticket-top" id="lgm-next-h"><span>{n.playoff?'Title play-off · neutral ground':`Round ${n.round} of ${v.rounds}`}</span><span>{n.playoff?'':n.atHome?'Home':'Away'}</span></p>
   <div className="lgm-ticket-vs">
    <button type="button" className="lgm-ticket-side" onClick={()=>n.home===v.clubId?go('squad'):openClub(n.home)}><ClubMark club={n.home} name={n.homeName} size={48}/><b>{n.homeName}</b></button>
    <span className="lgm-ticket-v">v</span>
    <button type="button" className="lgm-ticket-side" onClick={()=>n.away===v.clubId?go('squad'):openClub(n.away)}><ClubMark club={n.away} name={n.awayName} size={48}/><b>{n.awayName}</b></button>
   </div>
   <p className="lgm-fine">{n.opponent.name} · {n.opponent.formation} · their eleven <Stars value={n.opponent.stars} size="sm"/>{n.opponent.xi?` · scouted: ${n.opponent.xi.slice(0,4).join(', ')}…`:''}</p>
   {v.lineup.error?<p className="lgm-error" role="alert">{v.lineup.error} <button type="button" className="lgm-link min-h-tap" onClick={()=>send({kind:'auto'},'Best fit eleven picked.')}>Pick the best fit eleven</button></p>:null}
   <p className="lgm-ticket-go"><button type="button" className="lgm-go lgm-go-big min-h-tap" disabled={busy||!!v.lineup.error} onClick={kickoff} data-testid="legends-kickoff">▶ Kick off · watch live</button><button type="button" className="lgm-ghost min-h-tap" onClick={()=>go('squad')}>Team sheet</button></p>
   <p className="lgm-fine">Before kick-off, the dressing room. Half-time is the only break — the Tactics button is yours whenever you want it.</p>
  </section>:null}
  {v.bye?<section className="lgm-ticket"><p className="lgm-ticket-top"><span>Round {v.played+1}</span><span>Free week</span></p><p>{v.clubName} sit this round out. The others play.</p><p className="lgm-actions"><button type="button" className="lgm-go lgm-go-big min-h-tap" disabled={busy} onClick={()=>send({kind:'play-round'},'The round is played.')}>Play the round</button></p></section>:null}
  {v.last?<section className="lgm-panel lgm-lastres"><p className="lgm-kicker">Last result · round {v.last.round>v.rounds?'play-off':v.last.round}</p>
   <button type="button" className="lgm-res lgm-res-big min-h-tap" onClick={()=>v.last?.reel&&setReplay(true)}><span className="tl-res-side"><ClubMark club={v.last.homeClub} size={28}/><span>{v.last.home}</span></span><b>{v.last.goals[0]}–{v.last.goals[1]}</b><span className="tl-res-side" data-end><span>{v.last.away}</span><ClubMark club={v.last.awayClub} size={28}/></span></button>
   {v.last.reel?<p className="lgm-actions"><button type="button" className="lgm-link min-h-tap" onClick={()=>setReplay(true)}>▶ Watch the highlights</button></p>:null}</section>:null}
  <section className="lgm-panel"><p className="lgm-kicker">The table</p><Table v={v} rows={v.table.slice(0,Math.max(4,me+1))} openClub={openClub}/><p className="lgm-actions"><button type="button" className="lgm-link min-h-tap" onClick={()=>go('league')}>Full table and results →</button>{v.nextWindow&&v.phase==='season'?<span className="lgm-fine">Window opens after round {v.nextWindow}.</span>:null}</p></section>
  {replay&&v.last?.reel?<Replay r={v.last} onClose={()=>setReplay(false)}/>:null}
 </div>
}
function Replay({r,onClose}:{r:ResultView;onClose:()=>void}){
 const snd=useRumbleSound(),sound:TheatreSound=n=>snd.play(n==='whistle'?'kickoff':n==='save'?'roar':n,n==='save'?.35:.6)
 return <Sheet id="lgm-replay" tone="night" wide kicker={`Highlights · round ${r.round}`} title={`${r.home} ${r.goals[0]}–${r.goals[1]} ${r.away}`} onClose={onClose}><Theatre reel={r.reel!} sound={sound}/></Sheet>
}
function Market({v,busy,send,decades}:{v:CareerView;busy:boolean;send:(a:Record<string,unknown>,ok?:string)=>void;decades:number[]}){
 const [pos,setPos]=useState(''),[dec,setDec]=useState(''),[price,setPrice]=useState(''),[q,setQ]=useState(''),[res,setRes]=useState<{cards:CardView[];total:number}|null>(null),[swapOut,setSwapOut]=useState(''),[loading,load]=useTransition()
 const search=()=>load(async()=>{const r=await legendsMarket(v.id,{pos:pos||null,decade:dec?Number(dec):null,price:price?Number(price):null,q:q||null});if(r.ok)setRes({cards:r.cards,total:r.total})})
 useEffect(()=>{if(v.window)search()},[v.window?.which,v.revision]) // eslint-disable-line react-hooks/exhaustive-deps
 if(!v.window)return <section className="lgm-panel"><p className="lgm-kicker">The market</p><h2>The window is shut</h2><p>Two windows a season: after round 2 and at the halfway mark. {v.nextWindow?`The next opens after round ${v.nextWindow}.`:'The next opens next season, after round 2.'}</p></section>
 const full=v.squad.length>=v.rules.maxSquad
 const buy=(c:CardView)=>full?(swapOut?send({kind:'swap',sell:swapOut,buy:c.id},`${c.name} in, ${v.squad.find(s=>s.id===swapOut)?.name} out.`):null):send({kind:'buy',card:c.id},`${c.name} signed for ${money(c.price)}.`)
 const row=(c:CardView,compact=false)=><LegendCard key={c.id} c={c} compact={compact} shirt><p className="lgm-actions"><button type="button" className="lgm-sign min-h-tap" disabled={busy||c.price>v.cash+(full&&swapOut?v.squad.find(s=>s.id===swapOut)?.sale?.net??0:0)||(full&&!swapOut)} onClick={()=>buy(c)}>{full?'Swap him in':`Sign · ${money(c.price)}`}</button></p></LegendCard>
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

/* ───────── the club: honours, the ledger, the manager's standing ───────── */
function Club({v,friendlies}:{v:CareerView;friendlies?:import('react').ReactNode}){
 return <div className="lgm-grid">
  {friendlies??null}
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
