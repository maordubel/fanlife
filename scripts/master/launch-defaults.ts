/** Writes lib/master/launch-defaults.json: per core club, the gate numbers whose compiled data is playable (owner: "open everything that can open", 8.10.2026). */
import {writeFileSync} from 'node:fs'
import {loadClub,CORE_CLUB_IDS} from '../../lib/clubs/resolver'
import {SHARED_GATES,gateAvailability} from '../../lib/clubs/gates'
async function main(){
 const out:Record<string,number[]>={}
 for(const id of [...CORE_CLUB_IDS].sort()){const c=await loadClub(id);if(!c)continue
  out[id]=SHARED_GATES.filter(g=>gateAvailability(c.data as never,g.key).playable).map(g=>g.number)}
 writeFileSync('lib/master/launch-defaults.json',JSON.stringify(out,null,1)+'\n');console.log(JSON.stringify(out))
}
main()
