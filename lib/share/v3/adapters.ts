import {checkShare,type ShareSurface} from '@/lib/share/contract'
import {templateById,type ShareTemplate} from './templates'
import {clubOrigin,shareClub,PORTAL_ORIGIN} from './theme'
import type {ShareData} from './render'

/**
 * PUBLIC SHARE ADAPTERS (V3 handoff §6–§7). Each builder takes only what may be printed — a finished result, the
 * person's own picks, an approved archive record — and returns the card's data plus the link. Answers never enter:
 * a builder has no parameter for them. `validateDraft` is the final guard (The Worker's `checkShare` plus the link
 * rules of §8.4) before anything is drawn.
 */
export type LinkPurpose='same-run'|'prompt'|'record'|'entry'|'invite'
export type ShareDraft={template:ShareTemplate;data:ShareData;surface:ShareSurface|'hub'|'daily';purpose:LinkPurpose;forbidden:string[];resultOrigin:'device-reported'|'server-verified'|null}
type Run={seed:number;cursor:number}

const T=(id:string)=>templateById(id)!
function clubUrl(clubId:string,path:string,params:Record<string,string|number|undefined|null>={}){
 const c=shareClub(clubId);if(!c)throw new Error('Unknown club')
 const u=new URL(path,clubOrigin(c));for(const [k,v] of Object.entries(params))if(v!==undefined&&v!==null&&v!=='')u.searchParams.set(k,String(v))
 return u.href
}
function draft(id:string,clubId:string,surface:ShareDraft['surface'],purpose:LinkPurpose,fields:Partial<ShareData>&{link:string},opts:{forbidden?:string[];origin?:ShareDraft['resultOrigin']}={}):ShareDraft{
 const t=T(id)
 return {template:t,surface,purpose,forbidden:opts.forbidden||[],resultOrigin:opts.origin??null,
  data:{club:clubId,headline:t.headline,context:t.context,main:t.main,label:t.label,detail:t.detail,cta:t.cta,rows:[...t.rows],statement:'',alias:'',showAlias:false,inkMode:'club',photoMode:'monochrome',sample:false,...fields}}
}
const up=(s:string)=>s.toUpperCase()

/** 01 — the club itself; only activities actually open are named */
export function coverShare(clubId:string,openGames:string[]){
 const rows=openGames.slice(0,3).map(up)
 return draft('01-club-cover',clubId,'hub','entry',{rows:rows.length?rows:['PLAY','COLLECT','REMEMBER'],detail:'History lives in the people who remember it.',link:clubUrl(clubId,`/clubs/${clubId}`,{lang:'en'})})
}
/** 03 — a finished trivia round: marks from this run, the same seed and cursor, the same filters */
export function triviaShare(clubId:string,r:Run&{correct:number;answered:number;marks:boolean[];score:number;bestCombo:number;topic?:string;era?:string;hard?:string}){
 return draft('03-trivia-report',clubId,'trivia','same-run',{main:`${r.correct}/${r.answered}`,rows:r.marks.slice(0,20).map(m=>m?'✓':'×'),detail:`Best combo: ${r.bestCombo} · Score: ${r.score}`,statement:`I remembered ${r.correct} of ${r.answered}.`,
  link:clubUrl(clubId,`/clubs/${clubId}/trivia`,{seed:r.seed,r:r.cursor,topic:r.topic,era:r.era,hard:r.hard,lang:'en'})},{origin:'device-reported'})
}
/** 02 — the person's eleven, back line first, left to right; a creation, not an answer */
export function xiShare(clubId:string,x:{formation:string;lines:string[][];captain:string|null}){
 const rows=x.lines.flat()
 return draft('02-all-time-xi',clubId,'xi','prompt',{main:x.formation,rows,detail:x.captain?`Captain: ${x.captain}`:'One fan’s eleven.',statement:'These are the eleven I’d pick.',link:clubUrl(clubId,`/clubs/${clubId}/xi`,{lang:'en'})})
}
/** 04 — the match the round named (already disclosed) and how many starters were found; never the eleven */
export function lineupShare(clubId:string,x:{title:string;on:string|null;competition:string;correct:number;forbidden:string[]}){
 return draft('04-lineup-programme',clubId,'lineup','prompt',{main:`${x.correct}/11`,rows:['MATCH PROGRAMME',x.title,[x.competition,x.on].filter(Boolean).join(' · ')],detail:'How many of that team can you name?',statement:`I remembered ${x.correct} of the eleven.`,link:clubUrl(clubId,`/clubs/${clubId}/lineup`,{lang:'en'})},{forbidden:x.forbidden,origin:'server-verified'})
}
/** 05 — how many of the three details were right; never the shirt's season, maker or design */
export function kitShare(clubId:string,x:{right:number;forbidden:string[]}){
 return draft('05-kit-memory',clubId,'kit','prompt',{main:`${x.right}/3`,rows:['SEASON','MAKER','DESIGN'],statement:x.right===3?'I built it from memory.':`I got ${x.right} of 3 details.`,link:clubUrl(clubId,`/clubs/${clubId}/kit-builder`,{lang:'en'})},{forbidden:x.forbidden,origin:'server-verified'})
}
/** 07 — turns and pairs, anonymous ticks; the same board for the next person */
export function memoryShare(clubId:string,r:Run&{moves:number;pairs:number}){
 return draft('07-memory-contact',clubId,'memory','same-run',{main:String(r.moves),label:`TURNS · ${r.pairs} PAIRS`,rows:Array.from({length:Math.min(6,r.pairs)},(_,i)=>String(i+1).padStart(2,'0')),statement:`I found every pair in ${r.moves} turns.`,link:clubUrl(clubId,`/clubs/${clubId}/memory`,{seed:r.seed,r:r.cursor,lang:'en'})},{origin:'device-reported'})
}
/** 08 — one question and the person's own pick; no crowd numbers */
export function terraceShare(clubId:string,x:{question:string;pick:string}){
 return draft('08-terrace-vote',clubId,'terrace','prompt',{rows:[x.pick,x.question],detail:x.question,statement:`My pick: ${x.pick}.`,link:clubUrl(clubId,`/clubs/${clubId}/polls`,{lang:'en'})})
}
/** 11 — clues and wrong guesses only; the hidden man stays hidden (forbidden: his name) */
export function blindCowShare(clubId:string,x:{clues:number;total:number;wrong:number;solved:boolean;seconds:number|null;forbidden:string[]}){
 return draft('11-blind-cow',clubId,'blindcow','entry',{main:String(x.clues),label:x.solved?'CLUES USED':'CLUES SEEN',rows:Array.from({length:Math.min(2,x.clues)},(_,i)=>`CLUE ${String(i+1).padStart(2,'0')}`).concat('IDENTITY HIDDEN'),detail:`${x.seconds!==null?`Time: ${x.seconds.toFixed(1)}s · `:''}Wrong guesses: ${x.wrong}`,statement:x.solved?`I needed ${x.clues} clue${x.clues===1?'':'s'}.`:'This one beat me.',link:clubUrl(clubId,`/clubs/${clubId}/blind-cow`,{lang:'en'})},{forbidden:x.forbidden,origin:'server-verified'})
}
/** 13 — an approved archive record, its own link and its source credit */
export function archiveShare(clubId:string,x:{eventId:string;title:string;when:string|null;source:string}){
 return draft('13-archive-clipping',clubId,'archive','record',{rows:[x.title,`Source: ${x.source}`],label:x.when||'A RECORD FROM MY CLUB',detail:'Open the full record for context.',statement:'This is the story I passed on.',link:clubUrl(clubId,`/clubs/${clubId}/archive`,{event:x.eventId,lang:'en'})})
}
/** 22 — only for a record with an exact day that matches today */
export function onThisDayShare(clubId:string,x:{eventId:string;title:string;on:string;source:string}){
 const d=new Date(x.on+'T12:00:00Z'),day=d.toLocaleDateString('en-GB',{day:'numeric',month:'short',timeZone:'UTC'}).toUpperCase()
 return draft('22-on-this-day',clubId,'archive','record',{main:day,label:x.on.slice(0,4),rows:[x.title,`Source: ${x.source}`],statement:'This day stayed with us.',link:clubUrl(clubId,`/clubs/${clubId}/archive`,{event:x.eventId,lang:'en'})})
}
/** 14 — how many were placed right; anonymous ticks, no dates */
export function timelineShare(clubId:string,r:Run&{correct:number;total:number;marks:boolean[]}){
 return draft('14-timeline-strip',clubId,'timeline','same-run',{main:`${r.correct}/${r.total}`,rows:r.marks.slice(0,5).map(m=>m?'✓':'×'),statement:'I put the memories in place.',link:clubUrl(clubId,`/clubs/${clubId}/timeline`,{seed:r.seed,r:r.cursor,lang:'en'})},{origin:'device-reported'})
}
/** 23 — an open invitation to a mode (no result, no answers) */
export function dailyShare(clubId:string,gate:{slug:string;name:string}){
 return draft('23-daily-challenge',clubId,'daily','entry',{label:up(gate.name),rows:['PLAY','COMPARE','PASS IT ON'],statement:'Same questions. Your turn.',link:clubUrl(clubId,`/clubs/${clubId}/${gate.slug}`,{lang:'en'})})
}

export type DraftProblem=ReturnType<typeof checkShare>[number]|'link-foreign'|'link-club-mismatch'
/** The last gate before drawing: the six-part contract, no secret anywhere, and a link on the club's own host. */
export function validateDraft(x:ShareDraft):DraftProblem[]{
 const d=x.data,statement=String(d.statement||'').trim()||d.detail
 const surface:ShareSurface=x.surface==='hub'||x.surface==='daily'?'stand':x.surface
 const problems:DraftProblem[]=checkShare({surface,statement,context:d.context,cta:d.cta,link:d.link,texts:[d.headline,d.main,d.label,d.detail,...d.rows,d.alias||'']},x.forbidden).filter(p=>p!=='link-not-same-run'||x.purpose==='same-run')
 if(x.purpose==='same-run'&&!/[?&]seed=\d+/.test(d.link))problems.push('link-not-same-run')
 try{const u=new URL(d.link),c=shareClub(d.club)!;if(u.protocol!=='https:'||(u.origin!==clubOrigin(c)&&u.origin!==PORTAL_ORIGIN))problems.push('link-foreign');const seg=u.pathname.split('/');if(seg[1]==='clubs'&&seg[2]!==d.club)problems.push('link-club-mismatch')}catch{problems.push('no-link')}
 return [...new Set(problems)]
}
