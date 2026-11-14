/** Refreshes lib/master/launch-defaults.json: for each club ALREADY in it (one the owner opened), the gate numbers whose compiled data is playable
 * (owner: "open everything that can open", 8.10.2026). It never adds a club, and never touches a held one (owner, 14.11.2026: only he opens a club). */
import {readFileSync,writeFileSync} from 'node:fs'
import HOLD from '../../lib/master/owner-hold.json'
import {loadClub,CORE_CLUB_IDS} from '../../lib/clubs/resolver'
import {SHARED_GATES,gateAvailability} from '../../lib/clubs/gates'
async function main(){
 const out:Record<string,number[]>={},opened=new Set(Object.keys(JSON.parse(readFileSync('lib/master/launch-defaults.json','utf8'))))
 for(const id of [...CORE_CLUB_IDS].sort()){if(!opened.has(id)||HOLD.clubs.includes(id))continue;const c=await loadClub(id);if(!c)continue
  out[id]=SHARED_GATES.filter(g=>gateAvailability(c.data as never,g.key).playable).map(g=>g.number)}
 writeFileSync('lib/master/launch-defaults.json',JSON.stringify(out,null,1)+'\n');console.log(JSON.stringify(out))
}
main()
