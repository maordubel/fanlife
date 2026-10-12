import 'server-only'
import {clubWorld} from '@/lib/clubs/world'
import {FIXTURE_TEAMS} from './teams'
import {teamCardFor,type TeamCard} from './provider'

/**
 * TheSportsDB team cards for the control room (owner, 12.10.2026), cached a day per instance with one shared refresh (rule 104:
 * a page never waits twice). Each card is compared with the club's own sourced `world.json`: the ground's name and the founding
 * year. A difference is a CHECK for the owner — neither side is corrected here (rule 11).
 */
export type CardRow={clubId:string;card:TeamCard|null;error:string|null;checks:{field:'ground'|'founded';ours:string;theirs:string;agree:boolean}[]}
const TTL=24*3600_000
let cache:{at:number;ttl:number;rows:CardRow[]}|null=null,inflight:Promise<CardRow[]>|null=null
const norm=(s:string)=>s.normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim()
async function get(url:string):Promise<unknown>{const r=await fetch(url,{signal:AbortSignal.timeout(8000),next:{revalidate:24*3600},headers:{accept:'application/json'}});if(!r.ok)throw new Error(`provider answered ${r.status}`);return r.json()}
export function compare(clubId:string,card:TeamCard|null):CardRow['checks']{
 const w=clubWorld(clubId),out:CardRow['checks']=[];if(!w||!card)return out
 if(w.ground?.name&&card.stadium){const a=norm(w.ground.name),b=norm(card.stadium);out.push({field:'ground',ours:w.ground.name,theirs:card.stadium,agree:a===b||a.includes(b)||b.includes(a)})}
 const year=w.founded?.line.match(/\b(1[89]\d\d|20[0-2]\d)\b/)?.[1]
 if(year&&card.founded)out.push({field:'founded',ours:year,theirs:String(card.founded),agree:Number(year)===card.founded})
 return out
}
async function load():Promise<CardRow[]>{
 const key=process.env.THESPORTSDB_KEY?.trim()||'123'
 // the free key allows 30 requests a minute: clubs are asked one after another, never all at once
 const rows:CardRow[]=[]
 for(const t of FIXTURE_TEAMS){
  try{const card=await teamCardFor(t,key,get);rows.push({clubId:t.clubId,card,error:card?null:'provider team not identified exactly',checks:compare(t.clubId,card)})}
  catch(e){rows.push({clubId:t.clubId,card:null,error:`unavailable: ${String((e as Error).message).slice(0,100)}`,checks:[]})}
 }
 return rows
}
export async function teamCards(now=Date.now()):Promise<CardRow[]>{
 if(cache&&now-cache.at<cache.ttl)return cache.rows
 const refresh=(inflight??=load().then(rows=>{cache={at:Date.now(),ttl:rows.some(r=>r.card)?TTL:10*60_000,rows};return rows}).finally(()=>{inflight=null}))
 if(cache){refresh.catch(()=>undefined);return cache.rows}
 return refresh
}
