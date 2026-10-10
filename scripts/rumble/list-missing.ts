import {loadClub,CORE_CLUB_IDS} from '@/lib/clubs/resolver'
import {ratedPool} from '@/lib/clubs/rumble'
import {writeFileSync} from 'node:fs'
/** the squad men no pool can deal because no source in the archive names a position — the work list for fill-positions.mjs */
const run=async()=>{
 const out:Record<string,{id:string;name:string}[]>={}
 for(const id of CORE_CLUB_IDS){const d=(await loadClub(id))!.data,ids=new Set(ratedPool(d).map(p=>p.id));out[id]=(d.players||[]).filter(p=>!ids.has(p.value.id)).map(p=>({id:p.value.id,name:p.value.name}))}
 writeFileSync(process.argv[2]!,JSON.stringify(out,null,1));console.log(Object.entries(out).map(([k,v])=>k+':'+v.length).join(' '))
}
run()
