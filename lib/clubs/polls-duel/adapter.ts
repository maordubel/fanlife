/**
 * The seam between a duel and the vote that already exists. A duel never makes a vote: it makes ONE confirmed choice,
 * which goes through the line's own sink — `setPick` on the slip for a dealt ballot line, `answerDebate` for a debate
 * poll — and is then counted by the existing `syncVotes` / debate flow. One question, one path, never both (D7-20).
 */
import type {ClubPlayer} from '../contract'
import {answerDebate,choicesFor,debateVersion,setPick,type Ballot,type DebateLike,type DebateState,type Question,type Slip} from '../polls-model'
import type {ClubPoll} from '../polls'
import {candidateOfEvent,candidateOfPlayer} from './pool'
import type {DuelCandidate,DuelDefinition} from './types'

/** one poll the lobby may offer: its definition, who may answer it, and the words that name it */
export type DuelPoll=DuelDefinition&{pool:DuelCandidate[];/** the copy key of the line's label, or the debate's own prompt */labelKey:string|null;prompt:string|null;/** the pool is too short to be a duel: said, never padded */unavailable:{have:number;need:number}|null}
const NEED=2

/** Lines a duel can run on: the dealt ballot's PLAYER lines and the debate polls. `number` and `position` are the voter's own (D7-10). */
export function duelPolls(o:{club:string;players:readonly ClubPlayer[];ballot:Ballot;debates:readonly ClubPoll[]}):DuelPoll[]{
 const out:DuelPoll[]=[],byId=new Map(o.players.map(p=>[p.id,p]))
 for(const q of o.ballot.questions){
  if(q.kind!=='player')continue
  const pool=choicesFor(o.players,q).map(candidateOfPlayer)
  out.push({pollId:q.id,sink:'ballot',promptVersion:q.version,clubId:o.club,pool,labelKey:q.id,prompt:null,unavailable:pool.length>=NEED?null:{have:pool.length,need:NEED}})
 }
 for(const d of o.debates){
  const pool=d.choices.map(c=>{const p=byId.get(c.id);return p?candidateOfPlayer(p):candidateOfEvent(c)})
  out.push({pollId:d.id,sink:'debate',promptVersion:debateVersion(d),clubId:o.club,pool,labelKey:null,prompt:d.prompt,unavailable:pool.length>=NEED?null:{have:pool.length,need:NEED}})
 }
 return out
}

/** the confirmed choice into the dealt slip — refused unless the winner may actually answer the line */
export function applyToBallot(slip:Slip,q:Question,players:readonly ClubPlayer[],winnerId:string,ctx:{club:string;voter:string}):Slip{
 if(q.kind!=='player'||!choicesFor(players,q).some(p=>p.id===winnerId))return slip
 return setPick(slip,q,winnerId,ctx)
}
/** the confirmed choice into the debate state — `answerDebate` already refuses a choice the debate does not offer */
export function applyToDebate(ds:DebateState,d:DebateLike,winnerId:string):DebateState{return answerDebate(ds,d,winnerId)}
