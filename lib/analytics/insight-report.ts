import 'server-only'
import {createClient} from '@supabase/supabase-js'
import {evaluationMode} from '@/lib/master/mode'
import {localStatsClient} from '@/lib/master/evaluation-db'

/**
 * The read side of FAN LIFE INSIGHT (owner session and the morning briefing only). One report per period + filter
 * (`worker_insight_report`) and the live counter (`worker_insight_live`), both granted to service_role alone.
 */
export type Totals={views:number;visitors:number;new:number;returning:number;sessions:number;clicks:number;events?:number;avgSessionSec:number;pagesPerSession:number;bounceRate:number;avgPageSec:number;avgScroll?:number;countries?:number}
export type Row={key:string|number;[k:string]:string|number|null}
export type Report={from:string;to:string;days:number;totals:Totals;previous:Totals;series:{day:string;views:number;visitors:number;new:number;clicks:number}[]
 grid:[number,number,number][];hours:[number,number,number][];weekdays:[number,number,number][]
 pages:Row[];entries:Row[];exits:Row[];clubs:Row[];sources:Row[];mediums:Row[];campaigns:Row[];referrers:Row[];countries:Row[];cities:Row[]
 devices:Row[];os:Row[];browsers:Row[];langs:Row[];screens:Row[];clicks:Row[];events:Row[];depth:Row[];sessionLength:Row[];loyalty:Row[]}
export type Live={now5:number;now30:number;today:number;todayViews:number;allTime:number;pages:Row[];places:Row[]}
export type Filters={from:string;to:string;club?:string|null;country?:string|null;device?:string|null;source?:string|null;path?:string|null}
export type Loaded={state:'ok';report:Report;live:Live|null}|{state:'unconfigured'}|{state:'error';message:string}

type Db={rpc(name:string,args?:Record<string,unknown>):PromiseLike<{data:unknown;error:{message:string}|null}>}
function db():Db|null{
 if(evaluationMode())return localStatsClient() as unknown as Db
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL??'',key=process.env.SUPABASE_SERVICE_ROLE_KEY??''
 return url&&key?createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}}) as unknown as Db:null
}

/** Athens calendar day of a moment */
export const athensDay=(d=new Date())=>new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Athens',year:'numeric',month:'2-digit',day:'2-digit'}).format(d)
export const shiftDay=(day:string,by:number)=>{const t=new Date(`${day}T12:00:00Z`);t.setUTCDate(t.getUTCDate()+by);return t.toISOString().slice(0,10)}

export const PRESETS=[{key:'today',label:'Today'},{key:'yesterday',label:'Yesterday'},{key:'7',label:'7 days'},{key:'30',label:'30 days'},{key:'90',label:'90 days'},{key:'180',label:'180 days'}] as const
/** the period a URL asks for: a preset, or ?from=&to= (Athens days, at most 180 apart) */
export function periodOf(q:{range?:string;from?:string;to?:string}):{from:string;to:string;preset:string|null}{
 const today=athensDay(),iso=/^\d{4}-\d{2}-\d{2}$/
 if(q.from&&q.to&&iso.test(q.from)&&iso.test(q.to)&&q.from<=q.to){const from=q.from<shiftDay(q.to,-179)?shiftDay(q.to,-179):q.from;return {from,to:q.to>today?today:q.to,preset:null}}
 switch(q.range){
  case 'today':return {from:today,to:today,preset:'today'}
  case 'yesterday':{const y=shiftDay(today,-1);return {from:y,to:y,preset:'yesterday'}}
  case '30':case '90':case '180':return {from:shiftDay(today,-(Number(q.range)-1)),to:today,preset:q.range}
  default:return {from:shiftDay(today,-6),to:today,preset:'7'}
 }
}

export async function loadInsight(f:Filters,withLive=true):Promise<Loaded>{
 const c=db();if(!c)return {state:'unconfigured'}
 try{
  const [r,l]=await Promise.all([
   c.rpc('worker_insight_report',{p_from:f.from,p_to:f.to,p_club:f.club||null,p_country:f.country||null,p_device:f.device||null,p_source:f.source||null,p_path:f.path||null}),
   withLive?c.rpc('worker_insight_live'):Promise.resolve({data:null,error:null}),
  ])
  if(r.error||!r.data)return {state:'error',message:r.error?.message||'no answer'}
  return {state:'ok',report:r.data as Report,live:(l.data as Live)??null}
 }catch(e){return {state:'error',message:String((e as Error)?.message||e).slice(0,160)}}
}

/* ------------------------------------------------------------------ the morning digest (Telegram, HTML) */
const pct=(a:number,b:number)=>!b?(a?'new':'—'):`${a>=b?'▲':'▼'}${Math.abs(Math.round((a-b)/b*100))}%`
const mmss=(s:number)=>s>=60?`${Math.floor(s/60)}m ${String(Math.round(s%60)).padStart(2,'0')}s`:`${Math.round(s)}s`
const esc=(s:string)=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
const DAYS=['Mon','Tue','Wed','Thu','Fri','Sat','Sun']
const flag=(cc:string)=>/^[A-Z]{2}$/.test(cc)?String.fromCodePoint(...[...cc].map(c=>0x1f1a5+c.charCodeAt(0))):'🏳'
/** yesterday on FAN LIFE, for the 07:30 briefing: the counters against the day before, the week, and what drove it */
export function composeInsightDigest(day:Report,week:Report|null,site:string):string{
 const t=day.totals,p=day.previous
 const top=(rows:Row[],n:number,fmt:(r:Row)=>string)=>rows.slice(0,n).map(fmt).join(' · ')||'—'
 const peak=[...day.hours].sort((a,b)=>b[1]-a[1])[0]
 const lines=[
  `📊 <b>Yesterday on FAN LIFE</b> · ${day.from}`,
  `👥 <b>${t.visitors}</b> visitors (${pct(t.visitors,p.visitors)}) · 🆕 ${t.new} new · 🔁 ${t.returning} returning`,
  `📄 <b>${t.views}</b> page views (${pct(t.views,p.views)}) · 🖱 ${t.clicks} clicks · ${t.sessions} visits`,
  `⏱ ${mmss(t.avgSessionSec)} a visit · ${t.pagesPerSession} pages a visit · bounce ${t.bounceRate}%`,
  peak?`🕘 busiest hour ${String(peak[0]).padStart(2,'0')}:00 (${peak[1]} views)`:'',
  `🔝 <b>Pages</b> ${esc(top(day.pages,4,r=>`${r.key} ${r.views}`))}`,
  `🏟 <b>Clubs</b> ${esc(top(day.clubs,5,r=>`${r.key} ${r.views}`))}`,
  `🧭 <b>From</b> ${esc(top(day.sources,5,r=>`${r.key} ${r.sessions}`))}`,
  `🌍 ${top(day.countries,6,r=>`${flag(String(r.key))} ${r.visitors}`)}${day.cities.length?` · ${esc(top(day.cities,3,r=>`${r.key} ${r.visitors}`))}`:''}`,
  `📱 ${esc(top(day.devices,3,r=>`${r.key} ${r.visitors}`))}`,
  day.clicks.length?`👆 <b>Most clicked</b> ${esc(top(day.clicks,3,r=>`${String(r.key).slice(0,40)} (${r.n})`))}`:'',
  week?`📅 7 days: <b>${week.totals.visitors}</b> visitors (${pct(week.totals.visitors,week.previous.visitors)}) · ${week.totals.views} views · best day ${[...week.series].sort((a,b)=>b.visitors-a.visitors)[0]?.day.slice(5)??'—'} · busiest weekday ${DAYS[[...week.weekdays].sort((a,b)=>b[2]-a[2])[0]?.[0]??0]}`:'',
  `<a href="${site}/master/admin?section=audience">Open the full report →</a>`,
 ]
 return lines.filter(Boolean).join('\n')
}
