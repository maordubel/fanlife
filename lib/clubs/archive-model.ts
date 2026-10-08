import {fold,newestFirst,precisionOf,type Entry} from './entities'

/**
 * Gate 12 · the Living Archive's rules, kept apart from the screen so they can be tested (8.10.2026).
 * Pure: every function takes its date / seed / storage as an argument, so nothing here reads a clock or a server.
 */
export type Filter='all'|'moment'|'player'
export const passes=(e:Entry,f:Filter)=>f==='all'||e.kind===f

// ------------------------------------------------------------------ today
/** "MM-DD" of a day as the SUPPORTER lives it — the device's own calendar, never the server's UTC clock */
export const localDayKey=(d:Date)=>`${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
export const dayKeyOf=(e:Pick<Entry,'on'>)=>e.on?e.on.slice(5):null
export type DayIndex=Map<string,Entry[]>
/** exact-day moments by calendar day. A year-only or undated entry is NEVER in here: it cannot claim a day. */
export function dayIndex(entries:Entry[]):DayIndex{
 const ix:DayIndex=new Map()
 for(const e of entries){const k=e.kind==='moment'?dayKeyOf(e):null;if(!k)continue;const l=ix.get(k);if(l)l.push(e);else ix.set(k,[e])}
 for(const l of ix.values())l.sort((a,b)=>(a.on!).localeCompare(b.on!)||a.id.localeCompare(b.id))
 return ix
}
/** Day-of-year on a LEAP reference year, so 29 Feb is a day of its own and the cycle has 366 steps */
const REF=2000
const ordinal=(key:string)=>Math.round((Date.UTC(REF,Number(key.slice(0,2))-1,Number(key.slice(3)))-Date.UTC(REF,0,1))/86400000)
export const isDayKey=(k:string|undefined|null):k is string=>!!k&&/^\d{2}-\d{2}$/.test(k)&&new Date(Date.UTC(REF,Number(k.slice(0,2))-1,Number(k.slice(3)))).toISOString().slice(5,10)===k
export function shiftDay(key:string,by:number):string{
 const t=new Date(Date.UTC(REF,0,1+((ordinal(key)+by)%366+366)%366));return t.toISOString().slice(5,10)
}
/** the next days (after `key`, wrapping the year) that have something on file — for a day with nothing */
export function nearestDays(ix:DayIndex,key:string,n=3):{key:string;count:number}[]{
 const from=ordinal(key),out:{key:string;count:number;gap:number}[]=[]
 for(const [k,l] of ix){const gap=(ordinal(k)-from+366)%366;if(gap>0)out.push({key:k,count:l.length,gap})}
 return out.sort((a,b)=>a.gap-b.gap).slice(0,n).map(({key,count})=>({key,count}))
}

// ------------------------------------------------------------------ time
export const decadeOfYear=(y:number)=>Math.floor(y/10)*10
export type Bucket={decade:number|null;count:number}
/** decades a player's documented span covers; none when the span is not documented */
export function playerDecades(e:Entry):number[]{
 const p=e.player;if(!p||(p.from===null&&p.to===null))return []
 const a=p.from??p.to!,b=p.to??p.from!
 if(b<a)return [decadeOfYear(a)]
 const out:number[]=[];for(let d=decadeOfYear(a);d<=decadeOfYear(b);d+=10)out.push(d);return out
}
export const decadesOf=(e:Entry):number[]=>e.kind==='player'?playerDecades(e):e.year!==null?[decadeOfYear(e.year)]:[]
/** counts per decade (`null` = undated), oldest first, undated last */
export function buckets(entries:Entry[],f:Filter='all'):Bucket[]{
 const m=new Map<number|null,number>()
 for(const e of entries){if(!passes(e,f))continue;const ds=decadesOf(e);for(const d of ds.length?ds:[null])m.set(d,(m.get(d)||0)+1)}
 return [...m].map(([decade,count])=>({decade,count})).sort((a,b)=>a.decade===null?1:b.decade===null?-1:a.decade-b.decade)
}
/** one decade's entries: moments by date (newest first), then the players whose documented span reaches it */
export function inDecade(entries:Entry[],decade:number|null,f:Filter='all'):Entry[]{
 const hit=entries.filter(e=>passes(e,f)&&(decade===null?decadesOf(e).length===0:decadesOf(e).includes(decade)))
 return [...hit.filter(e=>e.kind==='moment').sort(newestFirst),...hit.filter(e=>e.kind==='player').sort((a,b)=>(a.player?.from??9999)-(b.player?.from??9999)||a.title.localeCompare(b.title))]
}

// ------------------------------------------------------------------ search
export const normalizeQuery=(q:string)=>fold(q).replace(/\s+/g,' ').trim()
const haystack=(e:Entry)=>fold(`${e.title} ${e.hint} ${e.on??''} ${e.year??''} ${e.player?`${e.player.aliases.join(' ')} ${e.player.positions.join(' ')}`:''}`)
/** every word of the query must appear (case and diacritics folded) — a search, never a fuzzy guess */
export function searchEntries(entries:Entry[],q:string,f:Filter='all'):Entry[]{
 const words=normalizeQuery(q).split(' ').filter(Boolean)
 const hit=entries.filter(e=>passes(e,f)&&words.every(w=>haystack(e).includes(w)))
 return [...hit.filter(e=>e.kind==='moment').sort(newestFirst),...hit.filter(e=>e.kind==='player').sort((a,b)=>a.title.localeCompare(b.title))]
}

// ------------------------------------------------------------------ dig
/** a small deterministic generator — the same seed digs the same box, so a shared round is the same round */
export function mulberry32(seed:number){let a=seed>>>0;return()=>{a=(a+0x6D2B79F5)>>>0;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296}}
/** the box's order: every id exactly once, shuffled by (seed, cursor) */
export function digOrder(ids:string[],seed:number,cursor:number):string[]{
 const rand=mulberry32((seed*2654435761+cursor*40503+ids.length)>>>0),out=[...ids].sort()
 for(let i=out.length-1;i>0;i--){const j=Math.floor(rand()*(i+1));[out[i],out[j]]=[out[j]!,out[i]!]}
 return out
}

// ------------------------------------------------------------------ the rabbit hole and the round
/** entries one step away from this one — only links the data states, nearest-first: named players, then the moments
 *  that name him, then the same day, then the same year. Stable order; never contains the entry itself. */
export function related(entries:Entry[],byId:Map<string,Entry>,e:Entry):{named:Entry[];namedBy:Entry[];sameDay:Entry[];sameYear:Entry[]}{
 const named=e.names.map(id=>byId.get(id)).filter((x):x is Entry=>!!x)
 const namedBy=e.kind==='player'?entries.filter(x=>x.kind==='moment'&&x.names.includes(e.id)).sort(newestFirst):[]
 const k=e.kind==='moment'?dayKeyOf(e):null
 const sameDay=k?entries.filter(x=>x.id!==e.id&&x.kind==='moment'&&dayKeyOf(x)===k).sort(newestFirst):[]
 const sameYear=e.kind==='moment'&&e.year!==null?entries.filter(x=>x.id!==e.id&&x.kind==='moment'&&x.year===e.year&&!sameDay.includes(x)).sort(newestFirst):[]
 return {named,namedBy,sameDay,sameYear}
}
/** the next step of "dig deeper" from `e`: the first related entry not yet visited, or null — a thread always ends */
export function nextStep(entries:Entry[],byId:Map<string,Entry>,e:Entry,seen:ReadonlySet<string>):Entry|null{
 const r=related(entries,byId,e)
 return [...r.named,...r.namedBy,...r.sameDay,...r.sameYear].find(x=>!seen.has(x.id)&&x.id!==e.id)??null
}
/** An exploration is a finished round once it has opened this many DISTINCT entries in one visit. Page views,
 *  searches and a look at the Today deck do not count; saving and "I was there" are separate actions. */
export const ROUND_DEPTH=5
export const roundDone=(trail:readonly string[])=>new Set(trail).size>=ROUND_DEPTH
export const addToTrail=(trail:readonly string[],id:string,max=60)=>trail.includes(id)?[...trail]:[...trail,id].slice(-max)

// ------------------------------------------------------------------ the look of a card (never a fact)
/** a card's drawn object. Heuristic and cosmetic only: it picks a vocabulary (programme / clipping / card / player). */
export type Look='programme'|'clipping'|'card'|'player'
const SCORE=/\d+\s*[–—-]\s*\d+/
export function lookOf(e:Entry):Look{
 if(e.kind==='player')return 'player'
 if(SCORE.test(e.title))return 'programme'
 return precisionOf(e)==='day'?'card':'clipping'
}
