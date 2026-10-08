/**
 * Gate 10 · the pure rules around the mystery: the daily's day and pick, the challenge link, the score ledger,
 * the device history. No server, no React — the presenter, the server actions and the tests all read this one file.
 * Nothing here ever holds the answer: a daily or a challenge is a SEED, and only the server maps a seed to a player.
 */
import {scoringConfig,secondsLabel,weightedTimeMs} from '@/lib/game/blind-cow/scoring'

// ------------------------------------------------------------------ the club's day
/** The declared time zone of a club's daily. A club we have no zone for plays on UTC, and the screen says so. */
const ZONES:Record<string,string>={'Israel':'Asia/Jerusalem','Greece':'Europe/Athens','Bosnia and Herzegovina':'Europe/Sarajevo','Cyprus':'Asia/Nicosia','Serbia':'Europe/Belgrade','Croatia':'Europe/Zagreb','Turkey':'Europe/Istanbul'}
export const clubTimeZone=(country:string):string=>ZONES[country]??'UTC'
/** `2026-10-08` in the club's own zone — the day a daily belongs to. */
export function dayKey(at:Date|number,zone:string):string{
 try{return new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit'}).format(at)}
 catch{return new Intl.DateTimeFormat('en-CA',{timeZone:'UTC',year:'numeric',month:'2-digit',day:'2-digit'}).format(at)}
}
export const isDayKey=(v:unknown):v is string=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)
/** The day before `day` — the streak walks back through these. */
export function previousDay(day:string):string{const d=new Date(`${day}T12:00:00Z`);d.setUTCDate(d.getUTCDate()-1);return d.toISOString().slice(0,10)}

// ------------------------------------------------------------------ seed → question
export function fnv1a(text:string):number{let h=2166136261;for(let i=0;i<text.length;i++)h=Math.imul(h^text.charCodeAt(i),16777619);return h>>>0}
/** Which of `n` mysteries a tag (a day or a challenge seed) deals: stable for the same club, content version and tag. */
export const pickIndex=(club:string,version:string,tag:string,n:number):number=>n>0?fnv1a(`${club}|${version}|${tag}`)%n:-1

// ------------------------------------------------------------------ the challenge link
/** What a friend's link carries: the seed of the mystery, and (once they have played it) how they did. Never a name. */
export type Challenge={seed:number;weightedMs:number|null;clues:number|null;solved:boolean}
export const SEED_MAX=999_999
export const newSeed=(rand:number=Math.random()):number=>Math.floor(rand*SEED_MAX)+1
/** `482913` (just the mystery) or `482913.41200.3` (a solved run: weighted ms, clues used) or `482913.x.5` (gave up). */
export function encodeChallenge(c:Challenge):string{
 if(c.weightedMs===null||c.clues===null)return String(c.seed)
 return `${c.seed}.${c.solved?Math.round(c.weightedMs):'x'}.${c.clues}`
}
export function parseChallenge(raw:unknown):Challenge|null{
 if(typeof raw!=='string'||raw.length>40)return null
 const m=/^(\d{1,6})(?:\.(\d{1,9}|x)\.(\d{1,2}))?$/.exec(raw);if(!m)return null
 const seed=Number(m[1]);if(!Number.isInteger(seed)||seed<1||seed>SEED_MAX)return null
 if(m[2]===undefined)return {seed,weightedMs:null,clues:null,solved:false}
 const clues=Number(m[3]);if(clues<1||clues>20)return null
 if(m[2]==='x')return {seed,weightedMs:null,clues,solved:false}
 const ms=Number(m[2]);if(ms<500||ms>6_000_000)return null
 return {seed,weightedMs:ms,clues,solved:true}
}
export type Standing={kind:'win'|'lose'|'tie'|'open';marginMs:number}
/** You against the friend's number — a solver beats a non-solver; two solvers are split by weighted time; two non-solvers: no winner. */
export function standing(mine:{solved:boolean;weightedMs:number},theirs:Challenge):Standing{
 if(!theirs.solved)return mine.solved?{kind:'win',marginMs:0}:{kind:'open',marginMs:0}
 if(!mine.solved)return {kind:'lose',marginMs:0}
 const d=(theirs.weightedMs??0)-mine.weightedMs
 return d>0?{kind:'win',marginMs:d}:d<0?{kind:'lose',marginMs:-d}:{kind:'tie',marginMs:0}
}

// ------------------------------------------------------------------ the score, shown not told
export type Ledger={rawMs:number;clueMs:number;wrongMs:number;totalMs:number;extraClues:number}
/** raw + 15s per extra clue + 5s per wrong guess; null when it does not add up to what the server sealed. */
export function ledger(rawMs:number,clues:number,wrong:number,serverTotalMs:number):Ledger|null{
 const cfg=scoringConfig(),extra=Math.max(0,clues-1),totalMs=weightedTimeMs({rawElapsedMs:rawMs,hintsUsed:clues,wrongGuesses:wrong})
 if(totalMs!==serverTotalMs)return null
 return {rawMs,clueMs:extra*cfg.extraHintPenaltyMs,wrongMs:wrong*cfg.wrongGuessPenaltyMs,totalMs,extraClues:extra}
}
export const penalties=()=>{const c=scoringConfig();return {clue:c.extraHintPenaltyMs/1000,wrong:c.wrongGuessPenaltyMs/1000}}
/** A rank in words, from the clues that were needed — no number the data does not support. */
export type Verdict='first'|'sharp'|'steady'|'long'|'missed'
export const verdictOf=(solved:boolean,clues:number,total:number):Verdict=>!solved?'missed':clues<=1?'first':clues<=Math.max(2,Math.ceil(total*0.3))?'sharp':clues<=Math.ceil(total*0.65)?'steady':'long'

// ------------------------------------------------------------------ share text — it never names the man
export function shareText(o:{club:string;title:string;mode:'solo'|'daily'|'duel';day?:string;solved:boolean;clues:number;total:number;weightedMs:number;url:string;strip:string[]}):string{
 const bar=Array.from({length:o.total},(_,i)=>i<o.clues?(o.solved&&i===o.clues-1?o.strip[0]!:o.strip[1]!):o.strip[2]!).join('')
 const head=`FAN LIFE · ${o.club} · ${o.title}${o.mode==='daily'&&o.day?` · ${o.day}`:''}`
 return `${head}\n${o.solved?`${o.clues}/${o.total} · ${secondsLabel(o.weightedMs)}s`:`— /${o.total}`}\n${bar}\n${o.url}`
}

// ------------------------------------------------------------------ the device's own record (localStorage)
export type DayRecord={solved:boolean;clues:number;wrong:number;weightedMs:number}
export type MysteryHistory={v:1;played:number;solved:number;best:{weightedMs:number;clues:number}|null;days:Record<string,DayRecord>}
export const historyKey=(club:string)=>`fan-life:club:${club}:mystery:v1`
export const emptyHistory=():MysteryHistory=>({v:1,played:0,solved:0,best:null,days:{}})
const int=(v:unknown,lo:number,hi:number):v is number=>typeof v==='number'&&Number.isInteger(v)&&v>=lo&&v<=hi
/** Device saves are untrusted: keep only well-formed numbers and days. */
export function validateHistory(raw:unknown):MysteryHistory{
 if(!raw||typeof raw!=='object')return emptyHistory()
 const r=raw as Record<string,unknown>,out=emptyHistory()
 if(int(r.played,0,1e6))out.played=r.played as number
 if(int(r.solved,0,1e6))out.solved=Math.min(r.solved as number,out.played)
 const b=r.best as Record<string,unknown>|null
 if(b&&typeof b==='object'&&int(b.weightedMs,1,1e8)&&int(b.clues,1,30))out.best={weightedMs:b.weightedMs as number,clues:b.clues as number}
 if(r.days&&typeof r.days==='object')for(const [d,v] of Object.entries(r.days as Record<string,unknown>).slice(0,400)){
  const x=v as Record<string,unknown>
  if(isDayKey(d)&&x&&typeof x==='object'&&typeof x.solved==='boolean'&&int(x.clues,1,30)&&int(x.wrong,0,100)&&int(x.weightedMs,1,1e8))out.days[d]={solved:x.solved,clues:x.clues as number,wrong:x.wrong as number,weightedMs:x.weightedMs as number}
 }
 return out
}
export function recordResult(h:MysteryHistory,r:{solved:boolean;clues:number;wrong:number;weightedMs:number;daily?:string}):MysteryHistory{
 const best=r.solved&&(!h.best||r.weightedMs<h.best.weightedMs)?{weightedMs:r.weightedMs,clues:r.clues}:h.best
 const days=r.daily&&!h.days[r.daily]?{...h.days,[r.daily]:{solved:r.solved,clues:r.clues,wrong:r.wrong,weightedMs:r.weightedMs}}:h.days
 return {v:1,played:h.played+1,solved:h.solved+(r.solved?1:0),best,days}
}
/** Consecutive SOLVED dailies ending today (or yesterday, while today is still open). */
export function streak(h:MysteryHistory,today:string):number{
 let d=h.days[today]?.solved?today:previousDay(today),n=0
 while(h.days[d]?.solved){n++;d=previousDay(d)}
 return n
}
