import {createHash} from 'node:crypto'
import {hash} from '@/lib/clubs/rumble-rng'
import {ENGINE_VERSION,RULE_VERSION} from './config'
import {cardOf,me} from './career'
import {run} from './engine'
import {fieldable,lineupError} from './squad'
import type {Career,MatchEventRow,SideSnapshot} from './types'

/**
 * Friendlies between real managers (rulebook §1.7.38–40, §2.10) — asynchronous:
 *  sent → (the invitee accepts with one of THEIR careers) → completed, played once on the server
 *  declined · cancelled · expired (48 hours)
 * The inviter's eleven is LOCKED when the invitation is made and the invitee's when they accept (F02). Neither career is written —
 * no table, money, cards, injuries, morale or appearances (F03) — and an accepted invitation answers the same result however often
 * it is asked (F04). A rematch is a new invitation with a new seed.
 */
export const FRIENDLY_TTL_MS=48*3600_000,MAX_OPEN=5
export type LockedSide=SideSnapshot&{owner:string;careerId:string;lockedAt:string;digest:string}
export type FriendlyStatus='sent'|'completed'|'declined'|'cancelled'|'expired'
export type Friendly={v:2;id:string;tokenHash:string;status:FriendlyStatus;createdAt:string;expiresAt:string;inviter:LockedSide;invitee:LockedSide|null;result:{goals:[number,number];events:MatchEventRow[];seed:number;engine:typeof ENGINE_VERSION;rules:typeof RULE_VERSION}|null;closedAt:string|null}
export const tokenHash=(t:string)=>createHash('sha256').update(`legends-friendly:${t}`).digest('hex')
export function lockSide(c:Career,now:string):LockedSide|{error:string}{
 if(c.phase==='draft')return {error:'Finish your draft first.'}
 const t=me(c),men=fieldable(t,id=>cardOf(c,t,id)),err=lineupError(t.lineup,men);if(err)return {error:`Set your eleven first: ${err}`}
 const m=(id:string)=>{const x=cardOf(c,t,id)!;return {id:x.id,name:x.name,pos:x.pos,stars:x.stars,attrs:x.attrs}}
 const side:SideSnapshot={club:c.clubId,name:c.clubName,formation:t.lineup.formation,tactics:{...t.lineup.tactics},xi:t.lineup.xi.map(m),bench:t.lineup.bench.map(m),morale:1,home:null}
 const digest=createHash('sha256').update(JSON.stringify([c.id,c.catalog.digest,side.formation,side.tactics,t.lineup.xi,t.lineup.bench])).digest('hex').slice(0,16)
 return {...side,owner:c.owner,careerId:c.id,lockedAt:now,digest}
}
export const statusAt=(f:Friendly,now:number):FriendlyStatus=>f.status==='sent'&&now>Date.parse(f.expiresAt)?'expired':f.status
export const createFriendly=(id:string,token:string,side:LockedSide,now:Date):Friendly=>({v:2,id,tokenHash:tokenHash(token),status:'sent',createdAt:now.toISOString(),expiresAt:new Date(now.getTime()+FRIENDLY_TTL_MS).toISOString(),inviter:side,invitee:null,result:null,closedAt:null})
export type Answer={ok:true;friendly:Friendly}|{ok:false;error:string}
export function acceptFriendly(f:Friendly,token:string,side:LockedSide,now:Date):Answer{
 if(f.tokenHash!==tokenHash(token))return {ok:false,error:'This invitation link is not valid.'}
 // a repeat after the match answers the same match, never a second one (F04)
 if(f.status==='completed'&&f.invitee?.careerId===side.careerId)return {ok:true,friendly:f}
 const st=statusAt(f,now.getTime());if(st!=='sent')return {ok:false,error:st==='completed'?'This friendly has been played.':`This invitation is ${st}.`}
 if(side.owner===f.inviter.owner)return {ok:false,error:'You cannot play a friendly against yourself — send the link to someone else.'}
 const seed=hash(`friendly:${f.id}:${f.inviter.digest}:${side.digest}`)
 const strip=(s:LockedSide):SideSnapshot=>({club:s.club,name:s.name,formation:s.formation,tactics:s.tactics,xi:s.xi,bench:s.bench,morale:1,home:null})
 const r=run({id:`friendly-${f.id}`,seed,engine:ENGINE_VERSION,rules:RULE_VERSION,sides:[strip(f.inviter),strip(side)],knockout:false},[],false)
 if(!r.done)return {ok:false,error:'The friendly could not be played.'}
 return {ok:true,friendly:{...f,status:'completed',invitee:side,result:{goals:r.outcome.goals,events:r.outcome.events,seed,engine:ENGINE_VERSION,rules:RULE_VERSION},closedAt:now.toISOString()}}
}
export function closeFriendly(f:Friendly,by:'decline'|'cancel',now:Date):Answer{
 const st=statusAt(f,now.getTime());if(st!=='sent')return {ok:false,error:`This invitation is already ${st}.`}
 return {ok:true,friendly:{...f,status:by==='decline'?'declined':'cancelled',closedAt:now.toISOString()}}
}
/** before the match a guest sees the inviter's club only — never the eleven; after it, both elevens and the log */
export type FriendlyView={id:string;status:FriendlyStatus;expiresAt:string;role:'inviter'|'invitee'|'guest';home:{name:string;formation:string|null;xi:string[]|null};away:{name:string;formation:string|null;xi:string[]|null}|null;goals:[number,number]|null;log:{minute:number;side:0|1;kind:string;text:string}[]}
export function friendlyView(f:Friendly,viewer:string|null,now:number):FriendlyView{
 const role=viewer&&viewer===f.inviter.owner?'inviter':viewer&&viewer===f.invitee?.owner?'invitee':'guest',done=f.status==='completed'&&!!f.result
 const sides=[f.inviter,f.invitee] as const,nm=(s:0|1,id?:string)=>[...(sides[s]?.xi??[]),...(sides[s]?.bench??[])].find(x=>x.id===id)?.name??'—'
 const side=(s:LockedSide)=>({name:s.name,formation:done?s.formation:null,xi:done?s.xi.map(x=>x.name):null})
 return {id:f.id,status:statusAt(f,now),expiresAt:f.expiresAt,role,home:side(f.inviter),away:f.invitee?side(f.invitee):null,goals:done?f.result!.goals:null,
  log:done?f.result!.events.flatMap(e=>e.side===null||!['goal','red','sub'].includes(e.kind)?[]:[{minute:e.minute,side:e.side,kind:e.kind,text:e.kind==='goal'?`${nm(e.side,e.player)}${e.other?` (${nm(e.side,e.other)})`:''}`:e.kind==='sub'?`${nm(e.side,e.player)} on for ${nm(e.side,e.other)}`:nm(e.side,e.player)}]):[]}
}
