import {rng,shuffle} from '@/lib/game/random'

/**
 * Gate 11 · Rivalry Wall — the pure half (8.10.2026).
 *
 * Everything the wall, the "Call it" round and the derby record need, from ONE input: the meetings the club's
 * archives document with the club's approved rival. Nothing here invents a fact:
 *   · a meeting whose side the record does not state is listed, but never counted and never asked about;
 *   · an undated meeting is listed, never ordered;
 *   · the round is dealt from the meetings that exist — a club with too few gets no round, not a padded one.
 * Pure TypeScript (no `server-only`, no React) so the client can deal and grade and the tests can hold it.
 */

export type Side='home'|'away'
/** A documented meeting, serialisable. `us` is the asking club's side when the record states it. */
export type WallMeeting={id:string;on:string|null;year:number|null;home:string;away:string;hg:number;ag:number;comp:string;us:Side|null;from:string[]}
/** The shape `lib/fixtures/meetings` returns — structural, so this file needs no server-only import. */
export type MeetingLike={on:string|null;year:number|null;home:string;away:string;homeGoals:number;awayGoals:number;competition:string;from:string[];us:Side|null}
export type Result='W'|'D'|'L'
export type Tally={played:number;won:number;drawn:number;lost:number;for:number;against:number}

/** FNV-1a, base36 — a stable short id for a meeting that does not depend on list order. */
function hash(s:string):string{let h=0x811c9dc5;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,0x01000193)}return (h>>>0).toString(36)}

export function wallOf(ms:readonly MeetingLike[]):WallMeeting[]{
 const used=new Set<string>(),out:WallMeeting[]=[]
 for(const m of ms){
  const key=`${m.on??m.year??'?'}|${m.home}|${m.homeGoals}-${m.awayGoals}`
  let id=`m${hash(key)}`;for(let n=2;used.has(id);n++)id=`m${hash(`${key}#${n}`)}`
  used.add(id)
  out.push({id,on:m.on,year:m.year??(m.on?Number(m.on.slice(0,4)):null),home:m.home,away:m.away,hg:m.homeGoals,ag:m.awayGoals,comp:m.competition,us:m.us,from:[...m.from]})
 }
 return out
}

/** Goals for / against the asking club, or null when the record does not say which side it was. */
export function goalsOf(m:WallMeeting):[number,number]|null{return m.us===null?null:m.us==='home'?[m.hg,m.ag]:[m.ag,m.hg]}
export function resultOf(m:WallMeeting):Result|null{const g=goalsOf(m);return g===null?null:g[0]>g[1]?'W':g[0]===g[1]?'D':'L'}
/** Sortable key: the day when known, else the year; null when neither is stated. */
export const whenKey=(m:WallMeeting):string|null=>m.on??(m.year!==null?String(m.year).padStart(4,'0'):null)
const margin=(m:WallMeeting)=>{const g=goalsOf(m);return g?g[0]-g[1]:0}

export function tallyOf(ms:readonly WallMeeting[]):Tally{
 const t:Tally={played:0,won:0,drawn:0,lost:0,for:0,against:0}
 for(const m of ms){const g=goalsOf(m);if(!g)continue;t.played++;t.for+=g[0];t.against+=g[1];if(g[0]>g[1])t.won++;else if(g[0]===g[1])t.drawn++;else t.lost++}
 return t
}

export type DecadeRow={decade:number;w:number;d:number;l:number}
export type DerbyRecord={tally:Tally;/** listed meetings whose side the archive does not state */unstated:number;/** counted meetings with no date at all */undated:number;best:WallMeeting|null;worst:WallMeeting|null;first:WallMeeting|null;last:WallMeeting|null;decades:DecadeRow[]}

/** The "Derby Record": the club's side of every documented meeting. Counts only what the record states. */
export function recordOf(ms:readonly WallMeeting[]):DerbyRecord{
 const stated=ms.filter(m=>m.us!==null)
 const biggest=(sign:1|-1)=>stated.filter(m=>margin(m)*sign>0).sort((a,b)=>margin(b)*sign-margin(a)*sign||goalsOf(b)![sign===1?0:1]-goalsOf(a)![sign===1?0:1]||(whenKey(b)??'').localeCompare(whenKey(a)??''))[0]??null
 const dated=ms.filter(m=>whenKey(m)!==null).sort((a,b)=>whenKey(a)!.localeCompare(whenKey(b)!)||a.id.localeCompare(b.id))
 const by=new Map<number,DecadeRow>()
 let undated=0
 for(const m of stated){
  if(m.year===null){undated++;continue}
  const decade=Math.floor(m.year/10)*10,row=by.get(decade)??{decade,w:0,d:0,l:0},r=resultOf(m)
  if(r==='W')row.w++;else if(r==='D')row.d++;else row.l++
  by.set(decade,row)
 }
 return {tally:tallyOf(ms),unstated:ms.length-stated.length,undated,best:biggest(1),worst:biggest(-1),first:dated[0]??null,last:dated[dated.length-1]??null,decades:[...by.values()].sort((a,b)=>a.decade-b.decade)}
}

/** Group the wall by decade, newest first; an undated meeting goes in its own group at the end. */
export function decadeGroups(ms:readonly WallMeeting[]):{decade:number|null;items:WallMeeting[]}[]{
 const by=new Map<number|null,WallMeeting[]>()
 for(const m of ms){const k=m.year===null?null:Math.floor(m.year/10)*10;by.set(k,[...(by.get(k)??[]),m])}
 const keys=[...by.keys()].filter((k):k is number=>k!==null).sort((a,b)=>b-a)
 const groups=keys.map(k=>({decade:k as number|null,items:by.get(k)!.sort((a,b)=>(whenKey(b)??'').localeCompare(whenKey(a)??'')||a.id.localeCompare(b.id))}))
 if(by.has(null))groups.push({decade:null,items:by.get(null)!})
 return groups
}

// ------------------------------------------------------------------------------------------ the "Call it" round
export const ROUND_SIZE=8
/** A round needs this many meetings whose side is stated; fewer and the gate keeps the wall and the record only. */
export const MIN_ROUND=3
export type Question=
 |{kind:'result';id:string;meeting:string}
 |{kind:'earlier';id:string;a:string;b:string}
export type Choice=Result|string

export const canPlay=(ms:readonly WallMeeting[])=>ms.filter(m=>m.us!==null).length>=MIN_ROUND

/** Two meetings can be ordered only when their dates actually differ in what the archive states. */
function orderable(a:WallMeeting,b:WallMeeting):boolean{
 if(a.on&&b.on)return a.on!==b.on
 return a.year!==null&&b.year!==null&&a.year!==b.year
}
const earlierOf=(a:WallMeeting,b:WallMeeting)=>(whenKey(a)!<whenKey(b)!?a:b)

/**
 * Deal a round, deterministically from (seed, cursor): the same link is the same round for everybody.
 * Mostly "call the result" (hide the score, name the sides); with enough meetings, a pair or two of "which came first".
 */
export function dealRound(ms:readonly WallMeeting[],seed:number,cursor:number,size=ROUND_SIZE):Question[]{
 const stated=ms.filter(m=>m.us!==null)
 if(stated.length<MIN_ROUND)return []
 const random=rng((Math.imul(seed>>>0||1,2654435761)+Math.imul(cursor+1,40503))>>>0||1)
 const pool=shuffle([...ms].sort((a,b)=>a.id.localeCompare(b.id)),random)
 const results=pool.filter(m=>m.us!==null)
 const wantPairs=stated.length>=10?2:0
 const nResult=Math.min(size-wantPairs,results.length)
 const picked=results.slice(0,nResult),used=new Set(picked.map(m=>m.id))
 const rest=pool.filter(m=>!used.has(m.id)),pairs:Question[]=[]
 for(let i=0;i<rest.length&&pairs.length<wantPairs;i++){
  const a=rest[i]!;if(used.has(a.id))continue
  const j=rest.findIndex((b,k)=>k>i&&!used.has(b.id)&&orderable(a,b))
  if(j<0)continue
  const b=rest[j]!;used.add(a.id);used.add(b.id)
  pairs.push({kind:'earlier',id:`e:${a.id}:${b.id}`,a:a.id,b:b.id})
 }
 const qs:Question[]=[...picked.map(m=>({kind:'result' as const,id:`r:${m.id}`,meeting:m.id})),...pairs]
 return shuffle(qs,random)
}

/** The right answer to a question, from the record: a result letter, or the id of the earlier meeting. */
export function answerOf(q:Question,byId:ReadonlyMap<string,WallMeeting>):Choice|null{
 if(q.kind==='result'){const m=byId.get(q.meeting);return m?resultOf(m):null}
 const a=byId.get(q.a),b=byId.get(q.b);return a&&b&&orderable(a,b)?earlierOf(a,b).id:null
}

export type Step={correct:boolean;points:number}
/** 100 for a right call, +25 for every right call in a row (up to +100). A wrong one resets the run and scores nothing. */
export function scoreStep(correct:boolean,streakBefore:number):Step{
 if(!correct)return {correct:false,points:0}
 return {correct:true,points:100+25*Math.min(streakBefore,4)}
}
export type RoundSummary={score:number;correct:number;total:number;bestStreak:number;trail:boolean[]}
export function summarise(trail:readonly boolean[]):RoundSummary{
 let streak=0,best=0,score=0
 for(const ok of trail){if(ok){score+=scoreStep(true,streak).points;streak++;best=Math.max(best,streak)}else streak=0}
 return {score,correct:trail.filter(Boolean).length,total:trail.length,bestStreak:best,trail:[...trail]}
}

export type ShareInput={club:string;rival:string;summary:RoundSummary;url:string;title:string}
/** What "send to the terrace" carries: the verdict, never a meeting's score — the link replays the same round. */
export function shareText({club,rival,summary,url,title}:ShareInput):string{
 const marks=summary.trail.map(ok=>ok?'■':'□').join('')
 return `${title}\n${club} v ${rival}\n${marks} ${summary.correct}/${summary.total}\n${url}`
}

/** The query string that replays this exact round. */
export const roundQuery=(seed:number,cursor:number)=>`seed=${seed}&r=${cursor}`
