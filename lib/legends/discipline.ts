import type {Status} from './types'

/**
 * Cards, suspensions and injuries after an official match (rulebook §1.5, §2.6, §2.7). Pure. The ORDER inside `afterMatch`
 * is the rule: a man who was out this round serves one round first, and only then is anything new added.
 *  · a second yellow in a match = a red, one match out; both yellows count toward the running total
 *  · a direct red = 1–3 matches by severity
 *  · every 5th, 10th, 15th… yellow = one match out, recorded once (`thresholds` counts the ones already processed)
 *  · a second yellow and a threshold crossed in the SAME match are served together — one match (round 7)
 *  · a direct red and a threshold in the same match: the yellow match is served AFTER the red's (round 9) — length + 1
 *  · a round his club plays counts for a ban AND an injury at once — an injured man serves his ban too (§2.6)
 *  · an injury keeps a man out for whole rounds his club plays; the round he was hurt in does not count
 */
/** a ban every five yellow cards */
export const YELLOWS_PER_BAN=5
export const fresh=():Status=>({yellows:0,thresholds:0,suspension:0,injury:0,injuryKind:null})
export const available=(s:Status|undefined)=>!s||(s.suspension<=0&&s.injury<=0)
export type MatchBook={yellows:number;red:{second:boolean;length:number}|null;injury:{kind:'minor'|'moderate'|'severe';rounds:number}|null}
export function afterMatch(prev:Status|undefined,book:MatchBook|null,servedThisRound:boolean):Status{
 const s={...(prev??fresh())}
 // serving first: a man who sat this round out because of a ban or an injury has one round fewer to go
 if(servedThisRound){if(s.suspension>0)s.suspension--;if(s.injury>0){s.injury--;if(!s.injury)s.injuryKind=null}}
 if(!book)return s
 s.yellows+=book.yellows
 const crossed=Math.floor(s.yellows/YELLOWS_PER_BAN)-s.thresholds
 if(crossed>0)s.thresholds+=crossed
 let ban=0
 if(book.red&&!book.red.second)ban=book.red.length+(crossed>0?crossed:0)
 else if(book.red?.second)ban=Math.max(1,crossed)
 else ban=crossed>0?crossed:0
 s.suspension+=ban
 if(book.injury){s.injury=Math.max(s.injury,book.injury.rounds);s.injuryKind=book.injury.kind}
 return s
}
/** a round the club did NOT play (a BYE): a setting decides whether it counts toward an absence */
export function afterBye(prev:Status|undefined,counts:boolean):Status{
 const s={...(prev??fresh())};if(!counts)return s
 if(s.suspension>0)s.suspension--;if(s.injury>0){s.injury--;if(!s.injury)s.injuryKind=null}
 return s
}
/** a new season: injuries and bans carry over; yellows reset when the setting says so (inside a season they never do) */
export const newSeason=(s:Status,reset:boolean):Status=>reset?{...s,yellows:0,thresholds:0}:{...s}
