import type {ClubPlayer} from '@/lib/clubs/contract'
import type {LineupMatch} from '@/lib/clubs/gate-content'

/**
 * Gate 3 · The Dressing Room — the rules of the board, as pure functions.
 *
 * The archive records WHO started a match, not where each man stood, so the four bands (GK / DF / MF / FW) are the
 * player's own arrangement: nothing about a band is graded and no formation is implied or invented (rule 11). The grade
 * is membership only and happens on the server (`gradeLineup`); this module never sees the eleven.
 */
export type Band='GK'|'DF'|'MF'|'FW'
export const BANDS:readonly Band[]=['GK','DF','MF','FW']
export const XI_SIZE=11
export const MAX_LOCKS=3
export const COACH_MAX=2

export type Placed={name:string;band:Band}
/** `men` is in standing order within each band (insertion order); `locks` are the names the player stakes his word on */
export type Board={men:Placed[];locks:string[]}
export const emptyBoard=():Board=>({men:[],locks:[]})

export const isBand=(v:unknown):v is Band=>typeof v==='string'&&(BANDS as readonly string[]).includes(v)
export const bandOf=(b:Board,name:string):Band|null=>b.men.find(m=>m.name===name)?.band??null
export const onBoard=(b:Board,name:string)=>b.men.some(m=>m.name===name)
export const menIn=(b:Board,band:Band)=>b.men.filter(m=>m.band===band)
export const filled=(b:Board)=>b.men.length
export const isComplete=(b:Board)=>b.men.length===XI_SIZE
export const picksOf=(b:Board)=>b.men.map(m=>m.name)
export const counts=(b:Board):Record<Band,number>=>{const c:Record<Band,number>={GK:0,DF:0,MF:0,FW:0};for(const m of b.men)c[m.band]++;return c}

/**
 * Put a man in a band. He leaves wherever he stood and joins the END of the new band; his lock (if any) goes with him.
 * A twelfth man is refused — the board comes back unchanged. Placing a man where he already stands is a no-op.
 */
export function place(b:Board,name:string,band:Band):Board{
 const here=b.men.find(m=>m.name===name)
 if(here?.band===band)return b
 const rest=b.men.filter(m=>m.name!==name)
 if(rest.length>=XI_SIZE)return b
 return {men:[...rest,{name,band}],locks:b.locks}
}
/** Send a man back to the lockers. A man who is not on the pitch cannot hold a lock, so his goes with him. */
export const remove=(b:Board,name:string):Board=>({men:b.men.filter(m=>m.name!==name),locks:b.locks.filter(l=>l!==name)})
export type LockResult={board:Board;ok:boolean;reason?:'absent'|'full'}
/** Lock or unlock a man who is on the pitch. At most {@link MAX_LOCKS} locks at a time. */
export function toggleLock(b:Board,name:string):LockResult{
 if(!onBoard(b,name))return {board:b,ok:false,reason:'absent'}
 if(b.locks.includes(name))return {board:{...b,locks:b.locks.filter(l=>l!==name)},ok:true}
 if(b.locks.length>=MAX_LOCKS)return {board:b,ok:false,reason:'full'}
 return {board:{...b,locks:[...b.locks,name]},ok:true}
}
/** The rail follows the keeper: once he stands, aim at the defence. Everything else is the player's call. */
export const aimAfter=(b:Board,aimed:Band):Band=>aimed==='GK'&&menIn(b,'GK').length>0?'DF':aimed

/** what a client may send to the grader: exactly eleven distinct names, all from this match's pool */
export function wire(b:Board,pool:readonly string[]):string[]|null{
 const names=picksOf(b)
 return names.length===XI_SIZE&&new Set(names).size===XI_SIZE&&names.every(n=>pool.includes(n))?names:null
}

// ---------------------------------------------------------------- the dressing room's candidates
/** 32-bit FNV-1a — a stable, order-free shuffle key. The same match always hangs the same room. */
const fnv=(s:string)=>{let h=2166136261;for(let i=0;i<s.length;i++)h=Math.imul(h^s.charCodeAt(i),16777619);return h>>>0}
const ERA_MARGIN=3
const overlaps=(p:Pick<ClubPlayer,'fromYear'|'toYear'>,year:number)=>p.fromYear!==null&&p.toYear!==null&&p.fromYear-ERA_MARGIN<=year&&p.toYear+ERA_MARGIN>=year
const gap=(p:Pick<ClubPlayer,'fromYear'|'toYear'>,year:number)=>p.fromYear===null||p.toYear===null?Infinity:year<p.fromYear?p.fromYear-year:year>p.toYear?year-p.toYear:0

/**
 * Everyone who hangs in the room for a match: its eleven plus decoys, in ALPHABETICAL order so the order leaks nothing.
 * Decoys, in this order of preference — the source's own (that season's squad / the bench), club players documented
 * in the match's years, club players with no documented years, then the nearest eras. Inside a tier the pick is a
 * stable hash of match + name, so a room is the same every time it is opened. Only documented years are read; nobody
 * is given a position.
 */
export function buildPool(o:{matchId:string;starters:readonly string[];decoys:readonly string[];roster:readonly ClubPlayer[];year:number|null;size?:number}):string[]{
 const size=o.size??22,starters=[...new Set(o.starters)],want=Math.max(0,size-starters.length),taken=new Set(starters),out:string[]=[]
 const take=(names:Iterable<string>)=>{for(const n of names){if(out.length>=want)return;if(taken.has(n)||!n.trim())continue;taken.add(n);out.push(n)}}
 const byHash=(a:string,b:string)=>fnv(`${o.matchId}|${a}`)-fnv(`${o.matchId}|${b}`)||a.localeCompare(b)
 take([...new Set(o.decoys)].sort(byHash))
 const roster=[...new Map(o.roster.map(p=>[p.name,p])).values()]
 if(o.year!==null){
  const y=o.year
  take(roster.filter(p=>overlaps(p,y)).map(p=>p.name).sort(byHash))
  take(roster.filter(p=>p.fromYear===null||p.toYear===null).map(p=>p.name).sort(byHash))
  take(roster.filter(p=>!taken.has(p.name)).sort((a,b)=>gap(a,y)-gap(b,y)||byHash(a.name,b.name)).map(p=>p.name))
 }else take(roster.map(p=>p.name).sort(byHash))
 return [...starters,...out].sort((a,b)=>a.localeCompare(b))
}
/** the match's own year — the one shirt everybody in the room wears. `null` when the date is not documented. */
export const matchYear=(on:string|null)=>{const m=on?/^(\d{4})/.exec(on):null;return m?Number(m[1]):null}

// ---------------------------------------------------------------- the coach: counts, never names
export type CoachKind='stillOut'|'benchOn'
export type CoachNote={kind:CoachKind;n:number;of:number}
/**
 * The coach's note number `index` for this sheet. He counts; he never names a man and never says which band. `stillOut`
 * = how many of the eleven are still not on your sheet; `benchOn` = how many of your men were substitutes, not starters
 * (only where the archive records the bench). A note that has no data behind it does not exist.
 */
export function coachNote(m:Pick<LineupMatch,'starters'|'bench'>,names:readonly string[],index:number):CoachNote|null{
 const kinds:CoachKind[]=m.bench.length?['stillOut','benchOn']:['stillOut']
 if(!Number.isInteger(index)||index<0||index>=kinds.length||index>=COACH_MAX)return null
 const set=new Set(names)
 if(kinds[index]==='stillOut')return {kind:'stillOut',n:m.starters.filter(s=>!set.has(s)).length,of:m.starters.length}
 return {kind:'benchOn',n:[...set].filter(n=>m.bench.includes(n)&&!m.starters.includes(n)).length,of:set.size}
}
/** how many notes this match can give at all */
export const coachBudget=(m:Pick<LineupMatch,'bench'>)=>Math.min(COACH_MAX,m.bench.length?2:1)

// ---------------------------------------------------------------- the result
export type GradeResult={correct:number;missed:string[];wrong:string[]}
export type Mark='right'|'wrong'
export type Sheet={
 /** the player's own sheet, band by band, each man marked */
 rows:{name:string;band:Band;mark:Mark;locked:boolean}[]
 /** starters nobody put on the pitch — named only now */
 missed:string[]
 locksUsed:number
 locksRight:number
 correct:number
}
export function sheetOf(b:Board,g:GradeResult):Sheet{
 const wrong=new Set(g.wrong)
 const rows=b.men.map(m=>({name:m.name,band:m.band,mark:(wrong.has(m.name)?'wrong':'right') as Mark,locked:b.locks.includes(m.name)}))
 const locked=rows.filter(r=>r.locked)
 return {rows,missed:g.missed,locksUsed:locked.length,locksRight:locked.filter(r=>r.mark==='right').length,correct:g.correct}
}
/** plain text for the share sheet: the player's own team sheet and his score — never the answer before it is graded */
export function shareText(o:{club:string;title:string;on:string|null;board:Board;g:GradeResult;bandNames:Record<Band,string>;url:string}):string{
 const lines=BANDS.map(band=>({band,men:menIn(o.board,band)})).filter(x=>x.men.length).map(x=>`${o.bandNames[x.band]}: ${x.men.map(m=>m.name).join(', ')}`)
 return [`${o.club} · ${o.title}${o.on?` · ${o.on}`:''}`,`${o.g.correct}/${XI_SIZE}`,...lines,o.url].join('\n')
}
