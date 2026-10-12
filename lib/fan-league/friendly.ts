import {createHash} from 'node:crypto'
import {hash} from '@/lib/clubs/rumble-rng'
import {validXI} from './catalog'
import {me} from './career'
import {simulate} from './engine'
import type {Card,Career,MatchResult,Tactic} from './types'
import type {FormationId} from '@/lib/clubs/rumble-xi/types'

/**
 * Friendlies, V1 asynchronous (appendix B §6, FL-08/09). Two careers meet once:
 *  sent      — the inviter LOCKED a snapshot of their eleven when they made the invite; a link with a one-time token goes out
 *  completed — the invitee locked their own snapshot from one of THEIR careers; the server played the match exactly once
 *  declined · cancelled · expired (48 hours)
 * Each side keeps its own club's men — a friendly is two careers meeting, never a transfer. Neither career is written:
 * no table, no money, no window, no squad changes. Later squad changes do not touch a locked side.
 */
export const FRIENDLY_TTL_MS=48*3600_000,MAX_OPEN=5
export type LockedSide={owner:string;careerId:string;clubId:string;clubName:string;decade:number;formation:FormationId;tactic:Tactic;xi:Card[];lockedAt:string;digest:string}
export type FriendlyStatus='sent'|'completed'|'declined'|'cancelled'|'expired'
export type Friendly={v:1;id:string;tokenHash:string;status:FriendlyStatus;createdAt:string;expiresAt:string;inviter:LockedSide;invitee:LockedSide|null;result:MatchResult|null;closedAt:string|null}

export const tokenHash=(t:string)=>createHash('sha256').update(`fan-league-friendly:${t}`).digest('hex')
export function lockSide(c:Career,now:string):LockedSide|{error:string}{
 if(c.status!=='active'&&c.status!=='finished')return {error:'This career cannot play.'}
 const t=me(c),err=validXI(t.xi,t.squad,c.catalog.cards,t.formation);if(err)return {error:`Pick your eleven first: ${err}`}
 const by=new Map(c.catalog.cards.map(x=>[x.id,x])),xi=t.xi.map(id=>by.get(id)!)
 // the side is its own club's men, re-checked here: a card from another catalogue cannot be in it
 if(xi.some(x=>!x||!c.catalog.cards.includes(x)))return {error:'Your eleven is not your club’s.'}
 const digest=createHash('sha256').update(JSON.stringify([c.clubId,c.catalog.digest,t.formation,t.tactic,t.xi])).digest('hex').slice(0,16)
 return {owner:c.owner,careerId:c.id,clubId:c.clubId,clubName:c.clubName,decade:c.homeDecade,formation:t.formation,tactic:t.tactic,xi,lockedAt:now,digest}
}
export const statusAt=(f:Friendly,now:number):FriendlyStatus=>f.status==='sent'&&now>Date.parse(f.expiresAt)?'expired':f.status

export function createFriendly(id:string,token:string,side:LockedSide,now:Date):Friendly{
 return {v:1,id,tokenHash:tokenHash(token),status:'sent',createdAt:now.toISOString(),expiresAt:new Date(now.getTime()+FRIENDLY_TTL_MS).toISOString(),inviter:side,invitee:null,result:null,closedAt:null}
}
export type Answer={ok:true;friendly:Friendly}|{ok:false;error:string}
/** the invitee locks and the match is played in the same step — a repeat finds it completed and changes nothing */
export function acceptFriendly(f:Friendly,token:string,side:LockedSide,now:Date):Answer{
 if(f.tokenHash!==tokenHash(token))return {ok:false,error:'This invitation link is not valid.'}
 const st=statusAt(f,now.getTime())
 if(st!=='sent')return {ok:false,error:st==='completed'?'This friendly has been played.':`This invitation is ${st}.`}
 if(side.owner===f.inviter.owner)return {ok:false,error:'You cannot play a friendly against yourself — send the link to someone else.'}
 if(side.careerId===f.inviter.careerId)return {ok:false,error:'A career cannot meet itself.'}
 if(side.xi.length!==11||f.inviter.xi.length!==11)return {ok:false,error:'An eleven a side.'}
 const result=simulate({xi:f.inviter.xi,formation:f.inviter.formation,tactic:f.inviter.tactic},{xi:side.xi,formation:side.formation,tactic:side.tactic},hash(`friendly:${f.id}:${f.inviter.digest}:${side.digest}`))
 return {ok:true,friendly:{...f,status:'completed',invitee:side,result,closedAt:now.toISOString()}}
}
export function closeFriendly(f:Friendly,by:'decline'|'cancel',now:Date):Answer{
 const st=statusAt(f,now.getTime());if(st!=='sent')return {ok:false,error:`This invitation is already ${st}.`}
 return {ok:true,friendly:{...f,status:by==='decline'?'declined':'cancelled',closedAt:now.toISOString()}}
}

/** what a viewer may see: before the match only the inviter's club and decade — never the eleven; after it, both elevens and the log */
export type FriendlyView={id:string;status:FriendlyStatus;expiresAt:string;role:'inviter'|'invitee'|'guest';home:{club:string;name:string;decade:number;xi:string[]|null;formation:string|null};away:{club:string;name:string;decade:number;xi:string[]|null;formation:string|null}|null;goals:[number,number]|null;goalsLog:{minute:number;side:0|1;scorer:string;assist:string|null}[]}
export function friendlyView(f:Friendly,viewer:string|null,now:number):FriendlyView{
 const role=viewer&&viewer===f.inviter.owner?'inviter':viewer&&viewer===f.invitee?.owner?'invitee':'guest',done=f.status==='completed'&&!!f.result
 const nm=(s:LockedSide,id:string)=>s.xi.find(x=>x.id===id)?.name??'—'
 const side=(s:LockedSide)=>({club:s.clubId,name:s.clubName,decade:s.decade,xi:done?s.xi.map(x=>x.name):null,formation:done?s.formation:null})
 return {id:f.id,status:statusAt(f,now),expiresAt:f.expiresAt,role,home:side(f.inviter),away:f.invitee?side(f.invitee):null,goals:done?f.result!.goals:null,
  goalsLog:done?f.result!.events.flatMap(e=>e.kind==='goal'?[{minute:e.minute,side:e.side,scorer:nm(e.side?f.invitee!:f.inviter,e.scorer),assist:e.assist?nm(e.side?f.invitee!:f.inviter,e.assist):null}]:[]):[]}
}
