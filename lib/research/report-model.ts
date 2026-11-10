/**
 * The daily report's judgement (10.11.2026), pure so it is tested: what moved this week, which club stopped moving,
 * and which collection is returning nothing. The owner asked why two months of daily research opened no club; the
 * answer was in these numbers all along — 80 matches a club, the same 80, every day — and nobody was told.
 */
export type DayRow={ready:number;playable:number;matches:number;records:number}
export type History=Record<string,Record<string,DayRow>>
export type Alarm={club:string;code:'no-uefa'|'stalled'|'waiting-owner';text:string}

/** Keep the last `keep` days, oldest first. */
export function pushDay(h:History,day:string,rows:Record<string,DayRow>,keep=35):History{
 const next={...h,[day]:rows},days=Object.keys(next).sort()
 return Object.fromEntries(days.slice(-keep).map(d=>[d,next[d]!]))
}
const daysBefore=(day:string,n:number)=>new Date(Date.parse(`${day}T00:00:00Z`)-n*86400000).toISOString().slice(0,10)
/** The row of `club` on the latest day at or before `day`. */
function rowAt(h:History,club:string,day:string){const d=Object.keys(h).filter(x=>x<=day&&h[x]![club]).sort().at(-1);return d?h[d]![club]!:null}

/** Gates that reached READY in the last seven days, per club (0 when the club is new to the history). */
export function weekGains(h:History,day:string):Record<string,number>{
 const out:Record<string,number>={},today=h[day]||{},then=daysBefore(day,7)
 for(const [club,r] of Object.entries(today)){const p=rowAt(h,club,then);out[club]=p?Math.max(0,r.ready-p.ready):0}
 return out
}
/** A club whose records have not changed for `days` days while its gates are not all ready. */
export function stalled(h:History,day:string,days=7):string[]{
 const today=h[day]||{},then=daysBefore(day,days),out:string[]=[]
 for(const [club,r] of Object.entries(today)){
  if(r.ready>=13)continue
  const p=rowAt(h,club,then);if(!p||Object.keys(h).filter(d=>d<=then).length===0)continue
  if(p.records===r.records&&p.matches===r.matches)out.push(club)
 }
 return out.sort()
}
export function alarms(h:History,day:string,opts:{noUefa:string[];waiting:{club:string;gates:number}[];names:Record<string,string>}):Alarm[]{
 const n=(id:string)=>opts.names[id]||id,out:Alarm[]=[]
 for(const w of opts.waiting.filter(x=>x.gates>0))out.push({club:w.club,code:'waiting-owner',text:`${n(w.club)}: ${w.gates} ${w.gates===1?'gate opens':'gates open'} on your approval — nothing more to collect for them first.`})
 for(const c of opts.noUefa)out.push({club:c,code:'no-uefa',text:`${n(c)}: UEFA returned no matches — its UEFA team was not found under the names on file. The next run tries the wider name list.`})
 for(const c of stalled(h,day))out.push({club:c,code:'stalled',text:`${n(c)}: no new records for seven days. Its sources are exhausted; it needs a new source, not more of the same pull.`})
 return out
}
