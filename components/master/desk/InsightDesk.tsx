import Link from 'next/link'
import {createClient} from '@supabase/supabase-js'
import {PRESETS,loadInsight,periodOf,shiftDay,type Report,type Row,type Totals} from '@/lib/analytics/insight-report'
import {GamesFunnelDesk} from './GamesFunnelDesk'

/**
 * Audience · INSIGHT (17.11.2026). Server-rendered: every filter is a link or a
 * GET form, so a view is a URL that can be bookmarked or sent. Every row of every table is itself a filter — tap a
 * country, a page, a club or a source and the whole report narrows to it. Phone first: one column of cards; 900px+ a
 * grid. Charts are plain SVG drawn here (no chart library, nothing loaded in the browser).
 */
export type Q={view?:string;range?:string;from?:string;to?:string;country?:string;device?:string;source?:string;path?:string}
const BASE='/master/admin'
const nf=new Intl.NumberFormat('en-GB')
export const n=(v:unknown)=>nf.format(Number(v)||0)
const mmss=(s:number)=>!s?'0s':s>=3600?`${Math.floor(s/3600)}h ${Math.round(s%3600/60)}m`:s>=60?`${Math.floor(s/60)}m ${String(Math.round(s%60)).padStart(2,'0')}s`:`${Math.round(s)}s`
const flag=(cc:string)=>/^[A-Z]{2}$/.test(cc)?String.fromCodePoint(...[...cc].map(c=>0x1f1a5+c.charCodeAt(0))):'🏳'
const COUNTRY=(()=>{try{return new Intl.DisplayNames(['en'],{type:'region'})}catch{return null}})()
const countryName=(cc:string)=>{try{return COUNTRY?.of(cc)??cc}catch{return cc}}
const LANG=(()=>{try{return new Intl.DisplayNames(['en'],{type:'language'})}catch{return null}})()
const langName=(l:string)=>{try{return l==='??'?'Unknown':LANG?.of(l)??l}catch{return l}}
export const DAYS=['Mon','Tue','Wed','Thu','Fri','Sat','Sun']
const DEPTH=['','0–25%','25–50%','50–75%','75–100%','100%']
const LENGTH=['','< 10s','10–30s','30s–1m','1–3m','3–10m','10m +']
const LOYAL=['','1 visit','2–3 visits','4–9 visits','10+ visits']

function href(club:string|null,q:Q,patch:Partial<Q&{club:string|null}>){
 const p=new URLSearchParams({section:'audience'})
 const view=patch.view!==undefined?patch.view:q.view;if(view==='games')p.set('view','games')
 const c=patch.club!==undefined?patch.club:club;if(c)p.set('club',c)
 const all={...q,...patch}
 for(const k of ['range','from','to','country','device','source','path'] as const){const v=all[k];if(v)p.set(k,v)}
 return `${BASE}?${p}`
}

export function Delta({now,before,invert=false,unit=''}:{now:number;before:number;invert?:boolean;unit?:string}){
 if(!before&&!now)return <span className="ins-delta" data-dir="flat">—</span>
 if(!before)return <span className="ins-delta" data-dir="up">new</span>
 const d=Math.round((now-before)/before*100),good=invert?d<0:d>0
 return <span className="ins-delta" data-dir={d===0?'flat':good?'up':'down'} title={`before: ${n(before)}${unit}`}>{d>0?'▲':d<0?'▼':'='} {Math.abs(d)}%</span>
}
export function Kpi({label,value,now,before,invert,note}:{label:string;value:string;now:number;before:number;invert?:boolean;note?:string}){
 return <li className="ins-kpi"><span className="ins-kpi-l">{label}</span><b className="ins-kpi-v">{value}</b><Delta now={now} before={before} invert={invert}/>{note&&<small>{note}</small>}</li>
}

/* ------------------------------------------------------------------ charts (SVG) */
function LineChart({series}:{series:Report['series']}){
 const W=720,H=220,P={l:40,r:12,t:14,b:28},max=Math.max(1,...series.map(s=>Math.max(s.views,s.visitors)))
 const x=(i:number)=>P.l+(series.length<=1?(W-P.l-P.r)/2:i*(W-P.l-P.r)/(series.length-1)),y=(v:number)=>P.t+(H-P.t-P.b)*(1-v/max)
 const path=(k:'views'|'visitors')=>series.map((s,i)=>`${i?'L':'M'}${x(i).toFixed(1)},${y(s[k]).toFixed(1)}`).join(' ')
 const area=`${path('visitors')} L${x(series.length-1)},${y(0)} L${x(0)},${y(0)} Z`
 const ticks=[0,.5,1].map(f=>Math.round(max*f)),every=Math.max(1,Math.ceil(series.length/8))
 return <svg className="ins-svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Visitors and page views by day">
  {ticks.map(t=><g key={t}><line x1={P.l} x2={W-P.r} y1={y(t)} y2={y(t)} className="ins-gl"/><text x={P.l-6} y={y(t)+4} textAnchor="end" className="ins-axis">{n(t)}</text></g>)}
  <path d={area} className="ins-area"/>
  <path d={path('views')} className="ins-line ins-line-b"/>
  <path d={path('visitors')} className="ins-line"/>
  {series.map((s,i)=><g key={s.day}>
   <circle cx={x(i)} cy={y(s.visitors)} r={series.length>45?1.5:3.5} className="ins-dot"><title>{`${s.day}: ${s.visitors} visitors · ${s.views} views · ${s.new} new · ${s.clicks} clicks`}</title></circle>
   {i%every===0&&<text x={x(i)} y={H-8} textAnchor="middle" className="ins-axis">{s.day.slice(5).replace('-','.')}</text>}
  </g>)}
 </svg>
}
export function Bars({rows,labels,aria}:{rows:[number,number,number][];labels:string[];aria:string}){
 const by=new Map(rows.map(r=>[r[0],r])),max=Math.max(1,...rows.map(r=>r[1]))
 return <ol className="ins-bars" aria-label={aria} style={{['--cols' as string]:labels.length}}>
  {labels.map((l,i)=>{const r=by.get(i),v=r?.[1]??0;return <li key={l} title={`${l}: ${v} views · ${r?.[2]??0} visitors`}><span className="ins-bar" style={{blockSize:`${Math.max(2,v/max*100)}%`}} data-top={v===max&&v>0||undefined}/><small>{l}</small></li>})}
 </ol>
}
export function Heat({grid}:{grid:Report['grid']}){
 const at=new Map(grid.map(([d,h,v])=>[`${d}:${h}`,v])),max=Math.max(1,...grid.map(g=>g[2]))
 return <div className="ins-heat-wrap" role="region" aria-label="Page views by weekday and hour" tabIndex={0}>
  <table className="ins-heat"><thead><tr><th/>{Array.from({length:24},(_,h)=><th key={h} scope="col">{h%3===0?String(h).padStart(2,'0'):''}</th>)}</tr></thead>
   <tbody>{DAYS.map((d,di)=><tr key={d}><th scope="row">{d}</th>{Array.from({length:24},(_,h)=>{const v=at.get(`${di}:${h}`)??0
    return <td key={h} style={{['--a' as string]:(v/max).toFixed(2)}} title={`${d} ${String(h).padStart(2,'0')}:00 — ${v} views`}><span className="sr-only">{v}</span></td>})}</tr>)}</tbody></table>
  <p className="ins-legend"><span>fewer</span><i/><span>more</span> · Athens time</p>
 </div>
}

/* ------------------------------------------------------------------ breakdowns: every row is a filter */
export type Col={k:string;label:string;fmt?:(v:unknown,r:Row)=>string}
export function Breakdown({title,rows,metric,cols,label,link,empty='Nothing recorded in this period.',limit=10,note}:{
 title:string;rows:Row[];metric:string;cols?:Col[];label?:(r:Row)=>React.ReactNode;link?:(r:Row)=>string|null;empty?:string;limit?:number;note?:string}){
 const max=Math.max(1,...rows.map(r=>Number(r[metric])||0)),total=rows.reduce((s,r)=>s+(Number(r[metric])||0),0)
 const body=(list:Row[])=><ol className="ins-rows">{list.map((r,i)=>{const v=Number(r[metric])||0,to=link?.(r),name=label?label(r):String(r.key)
  const inner=<><span className="ins-row-top"><span className="ins-row-name"><bdi>{name}</bdi></span><b>{n(v)}</b><small>{total?Math.round(v/total*100):0}%</small></span>
   <span className="ins-row-bar"><i style={{inlineSize:`${Math.max(1,v/max*100)}%`}}/></span>
   {cols&&<span className="ins-row-cols">{cols.map(c=><span key={c.k}>{c.label} <b>{c.fmt?c.fmt(r[c.k],r):n(r[c.k])}</b></span>)}</span>}</>
  return <li key={`${r.key}:${i}`}>{to?<Link href={to} className="ins-row" prefetch={false}>{inner}</Link>:<div className="ins-row">{inner}</div>}</li>})}</ol>
 return <section className="ins-card"><h3>{title}</h3>{note&&<p className="ins-note">{note}</p>}
  {!rows.length?<p className="ins-empty">{empty}</p>:<>{body(rows.slice(0,limit))}
   {rows.length>limit&&<details className="ins-more"><summary className="min-h-tap">Show all {rows.length}</summary>{body(rows.slice(limit))}</details>}</>}
 </section>
}

async function registrationCounts(from:string,to:string) {
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL
 const key=process.env.SUPABASE_SERVICE_ROLE_KEY
 if(!url||!key)return null
 try {
  const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}})
  const {data,error}=await db.rpc('fanlife_registration_counts',{p_from:from,p_to:to})
  return error||!data?null:data as {total:number;recent:number}
 } catch {
  return null
 }
}

export async function InsightDesk({club,clubNames,q}:{club:string|null;clubNames:Record<string,string>;q:Q}){
 const games=q.view==='games'
 const period=periodOf(q)
 const f={from:period.from,to:period.to,club,country:q.country||null,device:q.device||null,source:q.source||null,path:q.path||null}
 const [loaded,registrations]=await Promise.all([loadInsight(f),games?null:registrationCounts(period.from,period.to)])
 const clubName=(id:unknown)=>clubNames[String(id)]||String(id)
 const active:[string,string,Partial<Q&{club:string|null}>][]=[
  ...(club?[[`Club: ${clubName(club)}`,'club',{club:null}] as [string,string,Partial<Q&{club:string|null}>]]:[]),
  ...(q.country?[[`Country: ${countryName(q.country)}`,'country',{country:undefined}] as [string,string,Partial<Q>]]:[]),
  ...(q.device?[[`Device: ${q.device}`,'device',{device:undefined}] as [string,string,Partial<Q>]]:[]),
  ...(q.source?[[`Source: ${q.source}`,'source',{source:undefined}] as [string,string,Partial<Q>]]:[]),
  ...(q.path?[[`Page: ${q.path}`,'path',{path:undefined}] as [string,string,Partial<Q>]]:[]),
 ]
 const qs:Q={...q,...(period.preset?{range:period.preset,from:undefined,to:undefined}:{range:undefined,from:period.from,to:period.to})}
 const go=(patch:Partial<Q&{club:string|null}>)=>href(club,qs,patch)
 return <section className="desk-panel ins" aria-labelledby="ins-h">
  <header className="ins-head">
   <p className="desk-kicker">Audience · Insight</p>
   <h1 id="ins-h" className="desk-h1">{games?'Who plays, how far, and where they stop':'Who came, from where, and what they did'}</h1>
   <div className="ins-views" role="group" aria-label="Report">
    <Link prefetch={false} href={href(club,q,{view:'',country:undefined,device:undefined,source:undefined,path:undefined})} aria-current={!games?'page':undefined}><b>The site</b><small>visitors · places · clicks</small></Link>
    <Link prefetch={false} href={href(club,{range:q.range,from:q.from,to:q.to},{view:'games'})} aria-current={games?'page':undefined}><b>The games</b><small>opened · started · finished</small></Link>
   </div>
   {loaded.state==='ok'&&loaded.live&&<ul className="ins-live" aria-label="Live">
    <li data-hot={loaded.live.now5>0||undefined}><b><i aria-hidden="true"/>{n(loaded.live.now5)}</b><span>on the site now</span></li>
    <li><b>{n(loaded.live.now30)}</b><span>in the last 30 min</span></li>
    <li><b>{n(loaded.live.today)}</b><span>visitors today · {n(loaded.live.todayViews)} views</span></li>
    <li><b>{n(loaded.live.allTime)}</b><span>visitors since counting began</span></li>
   </ul>}
  </header>
  {!games&&<section className="ins-card" aria-labelledby="registrations-h">
   <h3 id="registrations-h">Site-wide registrations</h3>
   {registrations?<p><b>{n(registrations.total)}</b> registered accounts · <b>{n(registrations.recent)}</b> created in the selected dates</p>:<p>Registration counts are unavailable.</p>}
  </section>}

  <nav className="ins-periods" aria-label="Period">{PRESETS.map(p=><Link key={p.key} prefetch={false} className="desk-chip" aria-current={period.preset===p.key?'true':undefined} href={href(club,{...q,from:undefined,to:undefined},{range:p.key})}>{p.label}</Link>)}</nav>
  <details className="ins-filters" open={!!(q.from||active.length)}>
   <summary className="min-h-tap">Filters{active.length?` · ${active.length} on`:''} · custom dates</summary>
   <form method="get" action={BASE} className="ins-form">
    <input type="hidden" name="section" value="audience"/>
    {games&&<input type="hidden" name="view" value="games"/>}
    <label>From<input type="date" name="from" defaultValue={period.from} max={period.to}/></label>
    <label>To<input type="date" name="to" defaultValue={period.to}/></label>
    <label>Club<select name="club" defaultValue={club??''}><option value="">All clubs</option>{Object.entries(clubNames).sort((a,b)=>a[1].localeCompare(b[1])).map(([id,name])=><option key={id} value={id}>{name}</option>)}</select></label>
    {!games&&<><label>Device<select name="device" defaultValue={q.device??''}><option value="">All devices</option><option value="mobile">Mobile</option><option value="tablet">Tablet</option><option value="desktop">Desktop</option></select></label>
    <label>Country (2 letters)<input name="country" defaultValue={q.country??''} maxLength={2} placeholder="GR" pattern="[A-Za-z]{2}" autoCapitalize="characters"/></label>
    <label>Source<input name="source" defaultValue={q.source??''} placeholder="instagram, google, direct…"/></label>
    <label className="ins-wide">Page<input name="path" defaultValue={q.path??''} placeholder="/clubs/olympiacos"/></label></>}
    <div className="ins-form-actions"><button className="desk-btn" type="submit">Apply</button><Link className="desk-chip" prefetch={false} href={`${BASE}?section=audience${games?'&view=games':''}`}>Clear all</Link></div>
   </form>
  </details>
  {active.length>0&&<ul className="ins-active" aria-label="Active filters">{active.map(([label,k,patch])=><li key={k}><Link prefetch={false} href={go(patch)} aria-label={`Remove ${label}`}>{label} <span aria-hidden="true">✕</span></Link></li>)}</ul>}

  {!games&&loaded.state==='unconfigured'&&<div className="desk-state" data-state="unconnected"><b>Not connected.</b> No database is configured for this deployment, so there are no numbers — this is not zero traffic.</div>}
  {!games&&loaded.state==='error'&&<div className="desk-state" data-state="error"><b>Unavailable.</b> The report did not answer ({loaded.message}). If this is the first day, the database step in the delivery note has not run yet.</div>}
  {games?<GamesFunnelDesk club={club} clubNames={clubNames} q={q}/>:loaded.state==='ok'&&<Body r={loaded.report} go={go} clubName={clubName}/>}
 </section>
}

function Body({r,go,clubName}:{r:Report;go:(p:Partial<Q&{club:string|null}>)=>string;clubName:(id:unknown)=>string}){
 const t=r.totals,p=r.previous as Totals,single=r.days===1
 const span=r.from===r.to?r.from:`${r.from} → ${r.to}`
 const vs=r.days===1?'the day before':`the ${r.days} days before`
 return <>
  <p className="ins-span">{span} · compared with {vs}</p>
  <ul className="ins-kpis" aria-label="Key numbers">
   <Kpi label="Visitors" value={n(t.visitors)} now={t.visitors} before={p.visitors}/>
   <Kpi label="Page views" value={n(t.views)} now={t.views} before={p.views}/>
   <Kpi label="Visits" value={n(t.sessions)} now={t.sessions} before={p.sessions}/>
   <Kpi label="New visitors" value={n(t.new)} now={t.new} before={p.new}/>
   <Kpi label="Returning" value={n(t.returning)} now={t.returning} before={p.returning}/>
   <Kpi label="Time per visit" value={mmss(t.avgSessionSec)} now={t.avgSessionSec} before={p.avgSessionSec}/>
   <Kpi label="Pages per visit" value={String(t.pagesPerSession)} now={t.pagesPerSession} before={p.pagesPerSession}/>
   <Kpi label="Bounce rate" value={`${t.bounceRate}%`} now={t.bounceRate} before={p.bounceRate} invert note="one page, then gone"/>
   <Kpi label="Clicks" value={n(t.clicks)} now={t.clicks} before={p.clicks}/>
   <Kpi label="Time on a page" value={mmss(t.avgPageSec)} now={t.avgPageSec} before={p.avgPageSec}/>
   <Kpi label="Read depth" value={`${t.avgScroll??0}%`} now={t.avgScroll??0} before={p.avgScroll??0} note="average deepest scroll"/>
   <Kpi label="Countries" value={n(t.countries)} now={t.countries??0} before={p.countries??0}/>
  </ul>

  <section className="ins-card ins-span2"><h3>{single?'By hour':'By day'}</h3>
   {single?<Bars rows={r.hours} labels={Array.from({length:24},(_,h)=>String(h).padStart(2,'0'))} aria="Page views by hour"/>:<>
    <LineChart series={r.series}/><p className="ins-legend"><i className="ins-key"/>visitors <i className="ins-key ins-key-b"/>page views · hover a dot for the day</p></>}
  </section>
  <div className="ins-grid">
   {!single&&<section className="ins-card"><h3>Hour of the day</h3><Bars rows={r.hours} labels={Array.from({length:24},(_,h)=>String(h).padStart(2,'0'))} aria="Page views by hour"/><p className="ins-note">Athens time. The red bar is the busiest hour.</p></section>}
   {!single&&<section className="ins-card"><h3>Day of the week</h3><Bars rows={r.weekdays} labels={DAYS} aria="Page views by weekday"/></section>}
   {!single&&<section className="ins-card ins-span2"><h3>When — weekday × hour</h3><Heat grid={r.grid}/></section>}

   <Breakdown title="Top pages" rows={r.pages} metric="views" link={x=>go({path:String(x.key)})} limit={12}
    cols={[{k:'visitors',label:'visitors'},{k:'avgSec',label:'time',fmt:v=>mmss(Number(v)||0)},{k:'scroll',label:'read',fmt:v=>v==null?'—':`${v}%`},{k:'clicks',label:'clicks'}]}/>
   <Breakdown title="Clubs" rows={r.clubs} metric="views" label={x=>clubName(x.key)} link={x=>go({club:String(x.key)})} cols={[{k:'visitors',label:'visitors'}]}/>
   <Breakdown title="Where visits come from" rows={r.sources} metric="sessions" link={x=>go({source:String(x.key)})}
    cols={[{k:'visitors',label:'visitors'},{k:'pages',label:'pages/visit',fmt:v=>String(v??'—')},{k:'bounce',label:'bounce',fmt:v=>`${v??0}%`}]} note="The site or campaign a visit landed from (utm_source wins)."/>
   <Breakdown title="Campaigns (utm_campaign)" rows={r.campaigns} metric="sessions" cols={[{k:'visitors',label:'visitors'}]} empty="No tagged campaign in this period. Add ?utm_source=…&utm_campaign=… to links you post."/>
   <Breakdown title="Medium (utm_medium)" rows={r.mediums} metric="sessions"/>
   <Breakdown title="Referring sites" rows={r.referrers} metric="sessions"/>
   <Breakdown title="Countries" rows={r.countries} metric="visitors" label={x=><>{flag(String(x.key))} {countryName(String(x.key))}</>} link={x=>go({country:String(x.key)})} cols={[{k:'views',label:'views'}]}/>
   <Breakdown title="Cities" rows={r.cities} metric="visitors" label={x=><>{flag(String(x.country))} {String(x.key)}</>} link={x=>x.country?go({country:String(x.country)}):null} cols={[{k:'views',label:'views'}]} empty="No city yet — the city comes from the edge (see the delivery note)."/>
   <Breakdown title="Devices" rows={r.devices} metric="visitors" link={x=>['mobile','tablet','desktop'].includes(String(x.key))?go({device:String(x.key)}):null}/>
   <Breakdown title="Operating systems" rows={r.os} metric="visitors"/>
   <Breakdown title="Browsers" rows={r.browsers} metric="visitors" note="“In app” = opened inside Instagram or Facebook."/>
   <Breakdown title="Languages" rows={r.langs} metric="visitors" label={x=>langName(String(x.key))}/>
   <Breakdown title="Screen width" rows={r.screens} metric="visitors"/>
   <Breakdown title="First page of a visit" rows={r.entries} metric="n" link={x=>go({path:String(x.key)})}/>
   <Breakdown title="Last page of a visit" rows={r.exits} metric="n" link={x=>go({path:String(x.key)})}/>
   <Breakdown title="Most clicked" rows={r.clicks} metric="n" limit={15} label={x=><>{String(x.key)} <small className="ins-sub">{String(x.path)}</small></>} cols={[{k:'visitors',label:'visitors'}]}/>
   <Breakdown title="Named events" rows={r.events} metric="n" cols={[{k:'visitors',label:'visitors'}]} empty="No named events in this period."/>
   <Breakdown title="How far pages are read" rows={r.depth} metric="n" label={x=>DEPTH[Number(x.key)]??String(x.key)}/>
   <Breakdown title="Length of a visit" rows={r.sessionLength} metric="n" label={x=>LENGTH[Number(x.key)]??String(x.key)}/>
   <Breakdown title="Loyalty — visits per visitor" rows={r.loyalty} metric="n" label={x=>LOYAL[Number(x.key)]??String(x.key)} note="All of their visits so far, for the visitors of this period."/>
  </div>

  <details className="desk-defs"><summary>What these numbers mean</summary><ul>
   <li><b>Visitor</b> — one browser (its own random id, kept on the device). Clearing the browser makes a new visitor.</li>
   <li><b>Visit</b> — one stay on the site; 30 minutes of quiet starts a new one. <b>New</b> = a visitor in their first visit; <b>returning</b> = came back. One person can be both in a long period.</li>
   <li><b>Bounce</b> — a visit with a single page. <b>Time on a page</b> and <b>read depth</b> are measured when the page is left.</li>
   <li><b>Place</b> — country / region / city resolved by the network edge from the connection; the address itself is never stored.</li>
   <li>Not counted: the control room, bots, and browsers that send Global Privacy Control or Do Not Track. Raw records are kept 180 days.</li>
   <li>Every row is a filter: tap it and the whole report narrows. The period before is the same length, just earlier ({shiftDay(r.from,-r.days)} → {shiftDay(r.from,-1)}).</li>
  </ul></details>
 </>
}

/** the Desk's first glance (17.11.2026): who is on the site now and how today compares with yesterday — one tap to the full report */
export async function InsightGlance(){
 const today=periodOf({range:'today'}),loaded=await loadInsight({from:today.from,to:today.to})
 if(loaded.state!=='ok')return null
 const t=loaded.report.totals,p=loaded.report.previous,live=loaded.live
 return <Link href={`${BASE}?section=audience&range=today`} className="ins-glance" prefetch={false} aria-label="Audience today — open the full report">
  <span className="ins-glance-k">Audience · today</span>
  <span><b>{n(live?.now5??0)}</b> on the site now</span>
  <span><b>{n(t.visitors)}</b> visitors <Delta now={t.visitors} before={p.visitors}/></span>
  <span><b>{n(t.views)}</b> page views <Delta now={t.views} before={p.views}/></span>
  <span><b>{n(t.clicks)}</b> clicks</span>
  <span className="ins-glance-go">Full report →</span>
 </Link>
}
