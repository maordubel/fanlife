import Link from 'next/link'
import {SHARED_GATES} from '@/lib/clubs/gates'
import {gateTitleKey} from '@/lib/analytics/stats'
import {t} from '@/lib/i18n'
import {periodOf,shiftDay} from '@/lib/analytics/insight-report'
import {loadGames,rate,type GamesReport,type GateRow} from '@/lib/analytics/games-report'
import {Bars,Breakdown,DAYS,Delta,Heat,Kpi,n,type Q} from './InsightDesk'

/**
 * Audience · GAMES (17.11.2026). The same period and club filters as the site report (one URL), over the measurement every
 * gate has sent since 25.9.2026: opened → started → finished, where players leave, what they share, by game, club and gate.
 * Phone first: cards in one column; 900px+ two columns. SVG drawn here, nothing loaded in the browser.
 */
const EVENT:Record<string,string>={gate_view:'Opened a game',gate_start:'Started',gate_step:'A step inside a game',gate_finish:'Finished',gate_leave:'Left mid-game',
 share_click:'Pressed share',share_created:'Made a share card',share_open:'Opened a shared link',share_joined:'Joined from a share',cross_link_click:'Went to another game',
 run_start:'Started a run',run_complete:'Finished a run',result_view:'Saw the result',archive_open:'Opened the archive',entity_follow:'Followed a link in the archive',
 life_chapter_complete:'LIFE chapter done',challenge_created:'Challenged a friend',challenge_joined:'Accepted a challenge',challenge_complete:'Finished a challenge',
 stand_created:'Started a stand',stand_joined:'Joined a stand',stand_daily_complete:'Stand daily done',daily_open:'Opened the daily',daily_item_complete:'Daily item done',daily_complete:'Daily done',
 rumble_reveal_start:'Rumble reveal started',rumble_reveal_complete:'Rumble reveal watched',rumble_match_start:'Rumble match started',rumble_match_skip:'Skipped a Rumble match',rumble_goal_shown:'Rumble goal shown',rumble_match_complete:'Rumble match finished',
 blind_cow_started:'Blind Cow started',blind_cow_hint_revealed:'Blind Cow hint',blind_cow_guess_wrong:'Blind Cow wrong guess',blind_cow_solved:'Blind Cow solved',blind_cow_gave_up:'Blind Cow gave up',
 blind_cow_duel_created:'Blind Cow duel made',blind_cow_duel_shared:'Blind Cow duel shared',blind_cow_duel_joined:'Blind Cow duel joined',blind_cow_duel_completed:'Blind Cow duel finished',blind_cow_result_shared:'Blind Cow result shared',blind_cow_live_started:'Blind Cow live started'}
const pct=(v:number|null)=>v===null?'—':`${v}%`

/** which game a route is: a club route's gate, else the legacy THE WORKER gate by its title */
function gameOf(gate:string):{game:string;club:string|null}{
 const m=/^\/clubs\/([a-z0-9-]+)\/([a-z-]+)/.exec(gate)
 if(m){const g=SHARED_GATES.find(x=>x.key===m[2]);return {game:g?.name||(m[2]==='life'?'LIFE':m[2]!),club:m[1]!}}
 // a legacy THE WORKER route: the shared gate of the same name, in English (the legacy titles are Hebrew)
 const seg=gate.split('/').filter(Boolean)[0]??'',same=SHARED_GATES.find(x=>x.key===seg||x.key===seg.replace(/s$/,''))
 const key=gateTitleKey(gate),hebrew=key?t(key):''
 return {game:same?.name||(gate==='/away-days'?'Away days':gate==='/life'?'LIFE':/[\u0590-\u05ff]/.test(hebrew)||!hebrew?seg.replace(/-/g,' ').replace(/^./,c=>c.toUpperCase())||gate:hebrew),club:'hapoel-tel-aviv'}
}

function href(club:string|null,q:Q,patch:Partial<Q&{club:string|null}>){
 const p=new URLSearchParams({section:'audience',view:'games'})
 const c=patch.club!==undefined?patch.club:club;if(c)p.set('club',c)
 const all={...q,...patch};for(const k of ['range','from','to'] as const){const v=all[k];if(v)p.set(k,v)}
 return `/master/admin?${p}`
}

/** three nested bars: opened (the whole), started, finished — each labelled with its share of the opened */
function Funnel({row,max}:{row:{opened:number;started:number;finished:number};max:number}){
 const w=(v:number)=>`${Math.max(v?2:0,v/Math.max(1,max)*100)}%`
 return <span className="gm-funnel" aria-label={`opened ${row.opened}, started ${row.started}, finished ${row.finished}`}>
  <span className="gm-bar" data-k="o"><i style={{inlineSize:w(row.opened)}}/><b>{n(row.opened)}</b><small>opened</small></span>
  <span className="gm-bar" data-k="s"><i style={{inlineSize:w(row.started)}}/><b>{n(row.started)}</b><small>started · {pct(rate(row.started,row.opened))}</small></span>
  <span className="gm-bar" data-k="f"><i style={{inlineSize:w(row.finished)}}/><b>{n(row.finished)}</b><small>finished · {pct(rate(row.finished,row.opened))}</small></span>
 </span>
}

function Lines({series}:{series:GamesReport['series']}){
 const W=720,H=220,P={l:40,r:12,t:14,b:28},max=Math.max(1,...series.map(s=>s.opened))
 const x=(i:number)=>P.l+(series.length<=1?(W-P.l-P.r)/2:i*(W-P.l-P.r)/(series.length-1)),y=(v:number)=>P.t+(H-P.t-P.b)*(1-v/max)
 const path=(k:'opened'|'started'|'finished')=>series.map((s,i)=>`${i?'L':'M'}${x(i).toFixed(1)},${y(s[k]).toFixed(1)}`).join(' ')
 const every=Math.max(1,Math.ceil(series.length/8))
 return <svg className="ins-svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Players who opened, started and finished a game, by day">
  {[0,.5,1].map(f=>Math.round(max*f)).map(v=><g key={v}><line x1={P.l} x2={W-P.r} y1={y(v)} y2={y(v)} className="ins-gl"/><text x={P.l-6} y={y(v)+4} textAnchor="end" className="ins-axis">{n(v)}</text></g>)}
  <path d={`${path('opened')} L${x(series.length-1)},${y(0)} L${x(0)},${y(0)} Z`} className="ins-area"/>
  <path d={path('opened')} className="ins-line"/><path d={path('started')} className="ins-line ins-line-b"/><path d={path('finished')} className="ins-line gm-line-f"/>
  {series.map((s,i)=><g key={s.day}><circle cx={x(i)} cy={y(s.opened)} r={series.length>45?1.5:3} className="ins-dot"><title>{`${s.day}: ${s.opened} opened · ${s.started} started · ${s.finished} finished`}</title></circle>
   {i%every===0&&<text x={x(i)} y={H-8} textAnchor="middle" className="ins-axis">{s.day.slice(5).replace('-','.')}</text>}</g>)}
 </svg>
}

export async function GamesFunnelDesk({club,clubNames,q}:{club:string|null;clubNames:Record<string,string>;q:Q}){
 const period=periodOf(q),loaded=await loadGames(period.from,period.to,club)
 const clubName=(id:string|null)=>id?clubNames[id]||id:'—'
 const qs:Q=period.preset?{range:period.preset}:{from:period.from,to:period.to}
 if(loaded.state==='unconfigured')return <div className="desk-state" data-state="unconnected"><b>Not connected.</b> No database is configured for this deployment.</div>
 if(loaded.state==='error')return <div className="desk-state" data-state="error"><b>Unavailable.</b> The games report did not answer ({loaded.message}).</div>
 const r=loaded.report,tt=r.totals,p=r.previous,single=r.days===1
 // by game, across clubs: the same game in eight clubs is one row
 const byGame=new Map<string,{key:string;opened:number;started:number;finished:number;leaves:number;shares:number;clubs:Set<string>}>()
 for(const g of r.gates){const {game,club:c}=gameOf(g.gate),row=byGame.get(game)??byGame.set(game,{key:game,opened:0,started:0,finished:0,leaves:0,shares:0,clubs:new Set()}).get(game)!
  row.opened+=g.opened;row.started+=g.started;row.finished+=g.finished;row.leaves+=g.leaves;row.shares+=g.shares;if(c)row.clubs.add(c)}
 const games=[...byGame.values()].sort((a,b)=>b.opened-a.opened||b.started-a.started)
 const maxGame=Math.max(1,...games.map(g=>g.opened)),maxGate=Math.max(1,...r.gates.map(g=>g.opened))
 const played=r.gates.filter(g=>g.started>=3),best=[...played].sort((a,b)=>(rate(b.finished,b.started)??0)-(rate(a.finished,a.started)??0))[0]
 const worst=[...r.gates].filter(g=>g.leaves>=3).sort((a,b)=>b.leaves-a.leaves)[0]
 const top=games[0],busiestHour=[...r.hours].sort((a,b)=>b[1]-a[1])[0]
 return <section className="desk-panel ins gm" aria-labelledby="gm-h">
  <p className="ins-span">{r.from===r.to?r.from:`${r.from} → ${r.to}`} · compared with {single?'the day before':`the ${r.days} days before`} · recorded since {r.since??'—'}</p>
  <ul className="ins-kpis" aria-label="Games — key numbers">
   <Kpi label="Players" value={n(tt.players)} now={tt.players} before={p.players} note="one device, one day"/>
   <Kpi label="Opened a game" value={n(tt.opened)} now={tt.opened} before={p.opened}/>
   <Kpi label="Started" value={n(tt.started)} now={tt.started} before={p.started}/>
   <Kpi label="Finished" value={n(tt.finished)} now={tt.finished} before={p.finished}/>
   <Kpi label="Start rate" value={pct(rate(tt.started,tt.opened))} now={rate(tt.started,tt.opened)??0} before={rate(p.started,p.opened)??0} note="started ÷ opened"/>
   <Kpi label="Finish rate" value={pct(rate(tt.finished,tt.started))} now={rate(tt.finished,tt.started)??0} before={rate(p.finished,p.started)??0} note="finished ÷ started"/>
   <Kpi label="Left mid-game" value={n(tt.leaves)} now={tt.leaves} before={p.leaves} invert/>
   <Kpi label="Shares" value={n(tt.shares)} now={tt.shares} before={p.shares}/>
   <Kpi label="Went to another game" value={n(tt.cross)} now={tt.cross} before={p.cross}/>
   <Kpi label="Events recorded" value={n(tt.events)} now={tt.events} before={p.events}/>
  </ul>

  {(top||best||worst||busiestHour)&&<section className="ins-card gm-read"><h3>The read</h3><ul>
   {top&&<li><b>{top.key}</b> is the most opened game ({n(top.opened)} players, {pct(rate(top.started,top.opened))} started, {pct(rate(top.finished,top.opened))} finished).</li>}
   {best&&<li>Best finished: <b>{gameOf(best.gate).game}</b>{gameOf(best.gate).club?` · ${clubName(gameOf(best.gate).club)}`:''} — {pct(rate(best.finished,best.started))} of those who start finish.</li>}
   {worst&&<li>Most players leave in <b>{gameOf(worst.gate).game}</b>{gameOf(worst.gate).club?` · ${clubName(gameOf(worst.gate).club)}`:''}{worst.steps[0]?`, mostly at step ${worst.steps[0][0]}`:''} ({n(worst.leaves)} leaves).</li>}
   {busiestHour&&busiestHour[1]>0&&<li>Busiest hour: <b>{String(busiestHour[0]).padStart(2,'0')}:00</b> Athens time.</li>}
  </ul></section>}

  <section className="ins-card ins-span2"><h3>{single?'By hour':'By day'}</h3>
   {single?<Bars rows={r.hours} labels={Array.from({length:24},(_,h)=>String(h).padStart(2,'0'))} aria="Games opened by hour"/>:<>
    <Lines series={r.series}/><p className="ins-legend"><i className="ins-key"/>opened <i className="ins-key ins-key-b"/>started <i className="ins-key gm-key-f"/>finished · hover a dot</p></>}
  </section>

  <div className="ins-grid">
   <section className="ins-card ins-span2"><h3>By game — opened → started → finished</h3><p className="ins-note">Every club’s copy of a game counted together. Tap a club below to see one club.</p>
    {!games.length?<p className="ins-empty">Nothing recorded in this period.</p>:<ol className="ins-rows gm-games">{games.map(g=><li key={g.key} className="ins-row">
     <span className="ins-row-top"><span className="ins-row-name"><b>{g.key}</b></span><small>{g.clubs.size>1?`${g.clubs.size} clubs`:''}</small><small>{g.shares?`${g.shares} share${g.shares===1?'':'s'}`:''}</small></span>
     <Funnel row={g} max={maxGame}/></li>)}</ol>}
   </section>
   {!single&&<section className="ins-card"><h3>Hour of the day</h3><Bars rows={r.hours} labels={Array.from({length:24},(_,h)=>String(h).padStart(2,'0'))} aria="Games opened by hour"/></section>}
   {!single&&<section className="ins-card"><h3>Day of the week</h3><Bars rows={r.weekdays} labels={DAYS} aria="Games opened by weekday"/></section>}
   {!single&&<section className="ins-card ins-span2"><h3>When — weekday × hour</h3><Heat grid={r.grid}/></section>}
   <Breakdown title="Clubs" rows={r.clubs.map(c=>({key:c.key,opened:c.opened,started:c.started,finished:c.finished,sr:rate(c.started,c.opened),fr:rate(c.finished,c.started)}))} metric="opened"
    label={x=>clubName(String(x.key))} link={x=>href(club,qs,{club:String(x.key)})}
    cols={[{k:'started',label:'started'},{k:'finished',label:'finished'},{k:'sr',label:'start rate',fmt:v=>pct(v as number|null)},{k:'fr',label:'finish rate',fmt:v=>pct(v as number|null)}]}/>
   <Breakdown title="What they share to" rows={r.shares} metric="n" empty="No shares in this period."/>
   <Breakdown title="Game modes chosen" rows={r.modes} metric="n" empty="No mode recorded in this period."/>
   <Breakdown title="Everything recorded" rows={r.events.map(e=>({key:EVENT[e.key]??e.key,n:e.n,players:e.players}))} metric="n" limit={12} cols={[{k:'players',label:'players'}]}/>
   <section className="ins-card ins-span2"><h3>Every gate, every club</h3><p className="ins-note">Where they leave: the step numbers players stopped at most, with how many left there.</p>
    <details className="ins-more" open={r.gates.length<=12}><summary className="min-h-tap">Show all {r.gates.length} gates</summary>
     <ol className="ins-rows">{r.gates.map((g:GateRow)=>{const {game,club:c}=gameOf(g.gate);return <li key={g.gate} className="ins-row">
      <span className="ins-row-top"><span className="ins-row-name"><b>{game}</b> <small className="ins-sub">{clubName(c)} · {g.gate}</small></span><small>{g.shares?`${g.shares} share${g.shares===1?'':'s'}`:''}</small><small>{g.cross?`${g.cross} onward`:''}</small></span>
      <Funnel row={g} max={maxGate}/>
      {g.steps.length>0&&<span className="ins-row-cols">left at {g.steps.slice(0,6).map(([s,k])=><span key={s}>step <b>{s}</b> × {k}</span>)}</span>}
     </li>})}</ol></details>
   </section>
  </div>
  <details className="desk-defs"><summary>What these numbers mean</summary><ul>
   <li><b>Player</b> — one device on one day (a hash that changes every day). The same person on two days counts twice.</li>
   <li><b>Opened → started → finished</b> — players who opened the game, pressed start, and reached its end. Start rate = started ÷ opened; finish rate = finished ÷ started.</li>
   <li><b>Left mid-game</b> — a game closed before its end; the step is where it happened.</li>
   <li>The period before is the same length, just earlier ({shiftDay(r.from,-r.days)} → {shiftDay(r.from,-1)}). Browsers that send Do Not Track are not counted.</li>
  </ul></details>
  <p className="ins-note"><Link prefetch={false} href={href(club,qs,{})}>Permalink to this view</Link></p>
 </section>
}
