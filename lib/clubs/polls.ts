import 'server-only'
import type {ClubData} from './contract'
import type {Debate} from '@/lib/polls/debates'
import {debateRound} from '@/lib/polls/debate-engine'
import {gameCopy} from './game-copy'
import type {UiLocale} from './locale'
import {yearOfOn} from './polls-duel/pool'
/** `from`/`to` are the recorded years of a choice (a player's span, an event's year) — optional, null when the record has none; the duel's period filter reads them */
export type ClubPollChoice={id:string;name:string;from?:number|null;to?:number|null}
export type ClubPoll={id:string;prompt:string;choices:ClubPollChoice[]}
/** Opinion prompts make no new historical or culture claims. Options are eligible records. */
export function clubPolls(data:ClubData,locale:UiLocale):ClubPoll[]{
 const copy=gameCopy(locale),events=data.timeline.slice(-100).map(f=>{const y=yearOfOn(f.value.on);return {id:f.id,name:`${f.value.title} · ${f.value.on}`,from:y,to:y}}),players=(data.players||[]).map(f=>({id:f.value.id,name:f.value.name,from:f.value.fromYear,to:f.value.toYear}))
 return [...(events.length>=2?['pollReplay','pollStory','pollCalendar'] as const:[]).map(id=>({id,prompt:copy[id],choices:events})),...(players.length>=2?['pollCaptain','pollMeet','pollFirstXI'] as const:[]).map(id=>({id,prompt:copy[id],choices:players}))]
}
export function clubPollRound(data:ClubData,locale:UiLocale,seed:number,cursor:number):ClubPoll[]{
 const pool=clubPolls(data,locale),byId=new Map(pool.map(p=>[p.id,p]))
 return debateRound(seed,cursor,pool.map(p=>({id:p.id,promptHe:p.prompt,kind:'match'} as Debate))).debates.map(p=>byId.get(p.id)!)
}
