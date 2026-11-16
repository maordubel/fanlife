import {loadClubBase,CORE_CLUB_IDS} from '@/lib/clubs/resolver'
import {englishClub,collectMisses,nonLatinLeft} from '@/lib/clubs/english'
import {writeFileSync} from 'node:fs'
async function main(){const m=collectMisses();const all:Record<string,number>={}
 for(const id of CORE_CLUB_IDS){const r=await loadClubBase(id);if(!r)continue;const e=englishClub(r.data);const left=nonLatinLeft(e);console.log(id,'left',left.length,left.slice(0,3))}
 const top=[...m].sort((a,b)=>b[1]-a[1]);console.log('misses',top.length);writeFileSync('/tmp/w/misses.json',JSON.stringify(Object.fromEntries(top),null,0))}
main()
