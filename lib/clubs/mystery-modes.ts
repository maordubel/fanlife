import 'server-only'
import {cookies} from 'next/headers'
import type {ClubData} from './contract'
import {clubMystery,type MysteryView} from './mystery'
import {open,seal} from '@/lib/game/blind-cow/token'
import type {RunState} from '@/lib/game/blind-cow/solo-engine'
import {clubTimeZone,dayKey,isDayKey,parseChallenge,pickIndex} from './mystery-model'
import {duelLimitMs,pastDeadline} from './mystery-rules'

/**
 * Daily and challenge runs (gate 10). Same sealed-cookie engine as the solo run, one cookie per mode so a daily never
 * clobbers a solo run in progress. The cookie holds the TAG that dealt the mystery (a day, or a challenge seed); the
 * server maps tag → mystery with `pickIndex`, so a link or a date carries no answer.
 */
export type Mode='daily'|'duel'
export type ModeSession={club:string;version:string;mode:Mode;tag:string;run:RunState}
export const modeKey=(mode:Mode,club:string)=>`fanlife-mystery-${mode}-${club}`
type Game=ReturnType<typeof clubMystery>

export function readModeSession(mode:Mode,club:string,version:string,game:Game):ModeSession|null{
 const value=open<ModeSession>(cookies().get(modeKey(mode,club))?.value)
 return value&&value.club===club&&value.version===version&&value.mode===mode&&typeof value.tag==='string'&&value.tag.length<=12&&game.valid(value.run)?value:null
}
export function saveModeSession(session:ModeSession){
 cookies().set(modeKey(session.mode,session.club),seal(session),{httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production',path:'/',maxAge:60*60*24*30})
}
/** the day a daily belongs to, on the SERVER's clock, in the club's declared zone */
export const todayFor=(data:ClubData,now=Date.now())=>dayKey(now,clubTimeZone(data.identity.country))
/** Is `tag` a legal tag for this mode right now? A daily only for today; a duel for any well-formed seed. */
export function legalTag(mode:Mode,tag:unknown,data:ClubData,now=Date.now()):tag is string{
 if(typeof tag!=='string')return false
 return mode==='daily'?isDayKey(tag)&&tag===todayFor(data,now):/^\d{1,6}$/.test(tag)&&!!parseChallenge(tag)
}
/**
 * The duel's 120 s hard limit (BC-R13), enforced where the run is READ and where it is MOVED, never by the client's clock:
 * a run still playing past its deadline becomes a timeout stamped AT the deadline, so a late guess can never win it.
 */
export function settle(mode:Mode,run:RunState,now:number):RunState{
 if(mode!=='duel'||run.status!=='playing'||!pastDeadline(run.started,now,run.sv))return run
 return {...run,status:'timeout',finished:run.started+duelLimitMs(run.sv)}
}
/** The run this tag deals — resumed from the cookie when it is the same tag, otherwise a fresh deal. */
export function dealMode(data:ClubData,game:Game,mode:Mode,tag:string,now=Date.now()):{run:RunState;fresh:boolean}|null{
 const have=readModeSession(mode,data.identity.id,data.version,game)
 if(have&&have.tag===tag){const run=settle(mode,have.run,now);return {run,fresh:run!==have.run}}
 const run=game.startAt(now,pickIndex(data.identity.id,data.version,tag,game.competitiveSize))
 return run?{run,fresh:true}:null
}

// ------------------------------------------------------------------ the lobby, read once on the server
export type Summary={solved:boolean;clues:number;wrong:number;weightedMs:number;rawMs:number}
export type ModeGate={open:boolean;/** mysteries that clear the mode, of those the club has */count:number;of:number;/** why the rest do not (rulebook §16.5 codes) */codes:{code:string;count:number}[]}
export type LobbyState={
 poolSize:number
 /** per-mode eligibility: practice (5+ clues), daily and duel (10 typed clues narrowing to one) */
 modes:{practice:ModeGate;daily:ModeGate;duel:ModeGate;/** a proven-unique puzzle exists, or practice is exploration only */unique:number;limitMs:number}
 /** the solo run still in progress on this device, or null */
 solo:{shown:number;total:number;wrong:number}|null
 daily:{day:string;zone:string;status:'new'|'playing'|'solved'|'gave_up'|'timeout';shown:number;total:number;summary:Summary|null}
 /** the challenge run on this device, if any — enough to offer "resume", never the mystery */
 duel:{seed:number;status:'playing'|'solved'|'gave_up'|'timeout';summary:Summary|null}|null
}
const summaryOf=(v:MysteryView|null):Summary|null=>v?.result?{solved:v.status==='solved',clues:v.shown,wrong:v.wrong,weightedMs:v.result.weightedTimeMs,rawMs:v.result.rawElapsedMs}:null
/** Device state for the lobby. Numbers only: a finished daily's preview never carries the player's name. */
export function lobbyState(data:ClubData,solo:RunState|null,now=Date.now()):LobbyState{
 const game=clubMystery(data),club=data.identity.id,day=todayFor(data)
 const view=(s:RunState|null)=>s?game.view(s,now):null
 const sv=view(solo),d=readModeSession('daily',club,data.version,game),dv=d&&d.tag===day?view(d.run):null,u=readModeSession('duel',club,data.version,game),uv=view(u?settle('duel',u.run,now):null)
 const m=game.modes(),gate=(t:{open:number;of:number;codes:{code:string;count:number}[]},size:number):ModeGate=>({open:size>0,count:size,of:t.of,codes:t.codes})
 const state=(v:MysteryView)=>v.status==='playing'?'playing' as const:v.status
 const comp=gate(m.competitive,game.competitiveSize)
 return {
  poolSize:game.poolSize,
  modes:{practice:gate(m.practice,game.poolSize),daily:comp,duel:comp,unique:game.uniqueSize,limitMs:duelLimitMs(1)},
  solo:sv&&sv.status==='playing'?{shown:sv.shown,total:sv.total,wrong:sv.wrong}:null,
  daily:{day,zone:clubTimeZone(data.identity.country),status:dv?state(dv):'new',shown:dv?.shown??0,total:dv?.total??0,summary:summaryOf(dv)},
  duel:u&&uv?{seed:Number(u.tag),status:state(uv),summary:summaryOf(uv)}:null,
 }
}

/** the solo run cookie (written by `startMystery`/`moveMystery`, key `fanlife-mystery-<club>`) — read here only to offer Resume */
export function soloRun(data:ClubData):RunState|null{
 const game=clubMystery(data),v=open<{club:string;version:string;run:RunState}>(cookies().get(`fanlife-mystery-${data.identity.id}`)?.value)
 return v&&v.club===data.identity.id&&v.version===data.version&&game.valid(v.run)?v.run:null
}
