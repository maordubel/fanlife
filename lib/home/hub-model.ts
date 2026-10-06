import {loadClub} from '@/lib/clubs/resolver'
import {SHARED_GATES,gateAvailability} from '@/lib/clubs/gates'
/** Small display model for the hub chooser: club, name, per-gate href or null. No answers, no archive, no state. */
export type HubGate={key:string;href:string|null;state:string}
export type HubClub={id:string;name:string;city:string;gates:Record<string,HubGate>}
export async function hubModel(clubs:readonly {id:string;name:string;city:string;status:string}[],locale:string):Promise<HubClub[]>{
 return Promise.all(clubs.map(async c=>{
  const club=await loadClub(c.id).catch(()=>null),gates:Record<string,HubGate>={}
  for(const g of SHARED_GATES){
   const r=club&&c.status!=='paused'?gateAvailability(club.data,g.key):null
   const ok=!!r?.playable
   const base=`/clubs/${c.id}`
   gates[g.key]={key:g.key,state:r?.state||'LOCKED',href:ok?(g.key==='timeline'?`${base}/timeline?lang=${locale}`:`${base}/${g.key}?lang=${locale}`):null}
  }
  return {id:c.id,name:c.name,city:c.city,gates}
 }))
}
