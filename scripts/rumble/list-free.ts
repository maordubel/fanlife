import {loadClub,CORE_CLUB_IDS} from '@/lib/clubs/resolver'
import {rawPool} from '@/lib/clubs/rumble'
import {extraPositions} from '@/lib/clubs/rumble-xi/positions'
import {writeFileSync} from 'node:fs'
/** the men dealt as "free" (no source names a position) — the work list for fill-positions.mjs. Uses the archive name (the Wikipedia title for wave men), not the English display name. */
const run=async()=>{const out:Record<string,{id:string;name:string}[]>={}
 for(const id of CORE_CLUB_IDS){const d=(await loadClub(id))!.data,free=new Set(rawPool(d,{extra:extraPositions(id)}).filter(p=>p.free).map(p=>p.id));out[id]=(d.players||[]).filter(p=>free.has(p.value.id)).map(p=>({id:p.value.id,name:p.value.name}))}
 writeFileSync(process.argv[2]!,JSON.stringify(out,null,1));console.log(Object.entries(out).map(([k,v])=>k+':'+v.length).join(' '))}
run()
