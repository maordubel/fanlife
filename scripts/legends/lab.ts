/**
 * The Legends Lab from the command line (rulebook §8): `npm run legends:lab` — readiness, generated drafts, 10,000 matches and
 * autopilot seasons, on the real club catalogs. Read-only; nothing is stored.
 */
import {allCatalogs,legendsClubs} from '@/lib/legends/server'
import {draftLab,matchLab,seasonLab} from '@/lib/legends/lab'
;(async()=>{
 const cats=(await allCatalogs()).map(x=>x.catalog)
 for(const x of await legendsClubs())console.log(x.club.padEnd(20),x.verdict,`${x.deadEnds}/${x.drafts} dead ends`,x.reasons.join(' | '))
 for(const c of cats){const d=draftLab(c,250);console.log('draft',c.club.padEnd(20),`${d.deadEnds}/${d.runs} dead ends · average €${d.avgSpent}M`,d.examples[0]??'')}
 console.log('matches engine-2',JSON.stringify(matchLab(cats,10000,'legends-engine-2')))
 console.log('matches engine-3',JSON.stringify(matchLab(cats,10000)))
 console.log('seasons',JSON.stringify(seasonLab(cats,8,4)))
})()
