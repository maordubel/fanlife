import 'server-only'
import {CORE_CLUB_IDS} from '@/lib/clubs/resolver'
import {findBase,Refusal,type Actor} from './service'
import {readJson,update} from './store'
/**
 * "They are two different men — keep both." The owner's answer to a suggested duplicate, kept in the players' own durable file
 * (`players/distinct.json`, the same store as every published change) so the pair is never suggested again — not in the merge
 * list and not in the "possible twins" report that feeds the task desk. One click undoes it. Identity is `(club, id, id)`, never a name.
 */
export type DistinctPair={club:string;a:string;b:string;by:string;at:string}
type DistinctFile={pairs:Record<string,DistinctPair>}
const FILE='distinct.json',EMPTY:DistinctFile={pairs:{}}
/** the task desk caches player reports a minute; a decision here should show at once */
const fresh=()=>{(globalThis as typeof globalThis&{crmPlayerSignals?:unknown}).crmPlayerSignals=undefined}
export const pairKey=(club:string,a:string,b:string)=>{const [x,y]=[a,b].sort();return `${club}|${x}|${y}`}
export async function readDistinct():Promise<Set<string>>{const f=await readJson<DistinctFile>(FILE,EMPTY);return new Set(Object.keys(f.pairs??{}))}
export async function distinctPairs():Promise<DistinctPair[]>{const f=await readJson<DistinctFile>(FILE,EMPTY);return Object.values(f.pairs??{}).sort((x,y)=>y.at.localeCompare(x.at))}
async function check(club:string,a:string,b:string){
 if(!CORE_CLUB_IDS.includes(club))throw new Refusal(404,'No such club.')
 if(!a||!b||a===b)throw new Refusal(400,'Choose two different players.')
 if(!(await findBase(club,a))||!(await findBase(club,b)))throw new Refusal(404,'No such player at this club.')
}
export async function keepBoth(club:string,a:string,b:string,who:Actor){
 await check(club,a,b);const [x,y]=[a,b].sort() as [string,string],key=pairKey(club,a,b)
 await update<DistinctFile>(FILE,EMPTY,f=>({pairs:{...(f.pairs??{}),[key]:{club,a:x,b:y,by:who.actor,at:new Date().toISOString()}}}))
 fresh();return {key}
}
export async function forgetKeepBoth(club:string,a:string,b:string){
 const key=pairKey(club,a,b)
 await update<DistinctFile>(FILE,EMPTY,f=>{const n={...(f.pairs??{})};delete n[key];return {pairs:n}})
 fresh();return {key}
}
