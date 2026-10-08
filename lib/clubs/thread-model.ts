/**
 * Gate 13 · The Thread — the pure half (8.10.2026).
 *
 * A chronological thread of the events a club's archive documents, built from ONE input: the club's eligible archive
 * records. Nothing here invents a fact:
 *   · an event dated to the DAY is ordered by that day; an event dated only to the YEAR sits at the head of its year,
 *     labelled as such, and is never ordered against the other events of that year;
 *   · the gap between two entries is stated only when BOTH carry an exact day;
 *   · an entry with neither a day nor a year is not on the thread at all.
 * Pure TypeScript (no `server-only`, no React): the server plans a window, the client steps through it, the tests hold it.
 */

export type ThreadInput={id:string;title:string;hint:string;on:string|null;year:number|null;sources:readonly string[]}
export type Precision='day'|'year'
/** One entry on the thread, serialisable. `on` is set exactly when `precision` is 'day'. */
export type ThreadEvent={id:string;title:string;hint:string;on:string|null;year:number;precision:Precision;sources:string[]}

const DAY=/^(\d{4})-(\d{2})-(\d{2})$/
const MIN_YEAR=1800,MAX_YEAR=2100

/** A real calendar day, or null — "1999-02-31" is not a date and must not order anything. */
export function validDay(iso:string|null|undefined):{y:number;m:number;d:number}|null{
 const match=iso?DAY.exec(iso):null;if(!match)return null
 const y=+match[1]!,m=+match[2]!,d=+match[3]!
 const t=new Date(Date.UTC(y,m-1,d))
 return t.getUTCFullYear()===y&&t.getUTCMonth()===m-1&&t.getUTCDate()===d&&y>=MIN_YEAR&&y<=MAX_YEAR?{y,m,d}:null
}

/**
 * The thread: every dated event once, oldest first. Within a year, year-only entries come first (they cannot be placed
 * among the days), then the exact days in order; ties keep a stable order by id.
 */
export function threadOf(rows:readonly ThreadInput[]):ThreadEvent[]{
 const seen=new Set<string>(),out:ThreadEvent[]=[]
 for(const r of rows){
  if(!r.id||seen.has(r.id)||!r.title.trim())continue
  const day=validDay(r.on)
  if(day){seen.add(r.id);out.push({id:r.id,title:r.title,hint:r.hint,on:r.on,year:day.y,precision:'day',sources:[...r.sources]});continue}
  if(r.on===null&&r.year!==null&&Number.isInteger(r.year)&&r.year>=MIN_YEAR&&r.year<=MAX_YEAR){
   seen.add(r.id);out.push({id:r.id,title:r.title,hint:r.hint,on:null,year:r.year,precision:'year',sources:[...r.sources]})
  }
 }
 return out.sort((a,b)=>a.year-b.year||(a.precision===b.precision?0:a.precision==='year'?-1:1)||(a.on??'').localeCompare(b.on??'')||a.id.localeCompare(b.id))
}

export const decadeOf=(year:number)=>Math.floor(year/10)*10
export type DecadeRow={decade:number;count:number;exact:number;yearOnly:number}
/** The decades the thread covers, oldest first, each with how many entries it holds. */
export function decadesOf(events:readonly ThreadEvent[]):DecadeRow[]{
 const by=new Map<number,DecadeRow>()
 for(const e of events){
  const d=decadeOf(e.year),row=by.get(d)??{decade:d,count:0,exact:0,yearOnly:0}
  row.count++;if(e.precision==='day')row.exact++;else row.yearOnly++
  by.set(d,row)
 }
 return [...by.values()].sort((a,b)=>a.decade-b.decade)
}

export type Edge={decade:number;id:string}
export type ThreadPlan={
 decades:DecadeRow[]
 decade:number
 /** the entries of the chosen decade, oldest first */
 events:ThreadEvent[]
 /** where the viewer starts inside `events` */
 start:number
 /** the last entry of the previous decade / the first of the next — the thread continues through these */
 prev:Edge|null
 next:Edge|null
 total:number
}

/**
 * Plan what one page shows. A deep link names an entry (`at`) or a decade (`dec`); anything unknown falls back to the
 * start of the thread. Only one decade travels to the browser, so a club with thousands of entries stays light.
 */
export function planThread(events:readonly ThreadEvent[],opts:{at?:string|null;dec?:number|null}={}):ThreadPlan|null{
 if(events.length===0)return null
 const decades=decadesOf(events)
 const hit=opts.at?events.find(e=>e.id===opts.at):undefined
 const asked=opts.dec!=null&&decades.some(d=>d.decade===opts.dec)?opts.dec!:null
 const decade=hit?decadeOf(hit.year):asked??decades[0]!.decade
 const window=events.filter(e=>decadeOf(e.year)===decade)
 const start=hit?Math.max(0,window.findIndex(e=>e.id===hit.id)):0
 const at=decades.findIndex(d=>d.decade===decade)
 const before=at>0?decades[at-1]!.decade:null,after=at<decades.length-1?decades[at+1]!.decade:null
 const lastOf=(d:number)=>[...events].reverse().find(e=>decadeOf(e.year)===d)!
 const firstOf=(d:number)=>events.find(e=>decadeOf(e.year)===d)!
 return {decades,decade,events:window,start,prev:before===null?null:{decade:before,id:lastOf(before).id},next:after===null?null:{decade:after,id:firstOf(after).id},total:events.length}
}

export type Gap={kind:'same'}|{kind:'days'|'months'|'years';n:number}
const DAY_MS=86_400_000
const at=(iso:string)=>{const d=validDay(iso)!;return Date.UTC(d.y,d.m-1,d.d)}

/**
 * How long after the previous entry this one came — stated only when BOTH carry an exact day, null otherwise.
 * Days up to two months, months up to two years, then years.
 */
export function gapBetween(before:ThreadEvent|null|undefined,after:ThreadEvent|null|undefined):Gap|null{
 if(!before||!after||before.precision!=='day'||after.precision!=='day'||!before.on||!after.on)return null
 const days=Math.round((at(after.on)-at(before.on))/DAY_MS)
 if(days<0)return null
 if(days===0)return {kind:'same'}
 if(days<60)return {kind:'days',n:days}
 if(days<730)return {kind:'months',n:Math.max(2,Math.round(days/30.4375))}
 return {kind:'years',n:Math.round(days/365.25)}
}

/** The year groups of a window, oldest first, with the index of each group's first entry — the knots of the thread. */
export function yearKnots(events:readonly ThreadEvent[]):{year:number;first:number;count:number}[]{
 const out:{year:number;first:number;count:number}[]=[]
 events.forEach((e,i)=>{const last=out[out.length-1];if(last&&last.year===e.year)last.count++;else out.push({year:e.year,first:i,count:1})})
 return out
}

/** The step a key or a swipe asks for: +1 toward the newer entry, -1 toward the older one. */
export function stepFor(key:string,rtl:boolean):1|-1|null{
 if(key==='ArrowRight')return rtl?-1:1
 if(key==='ArrowLeft')return rtl?1:-1
 if(key==='ArrowDown'||key==='PageDown')return 1
 if(key==='ArrowUp'||key==='PageUp')return -1
 return null
}
export const clampIndex=(i:number,length:number)=>length<=0?0:Math.max(0,Math.min(length-1,Math.trunc(i)))
