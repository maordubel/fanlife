import {allCatalogs} from '@/lib/fan-league/server'
import {seasonLab} from '@/lib/fan-league/lab'
import {readinessOf} from '@/lib/fan-league/readiness'
/** `npm run fan-league:lab` — every ready club's readiness, then N seeded seasons (SEASONS=200): goals, draws, the home edge, title spread */
async function main(){
 const cats=await allCatalogs(),n=Number(process.env.SEASONS??200)
 for(const c of cats){const r=readinessOf(c);console.log(r.verdict.padEnd(6),c.club.padEnd(22),'men',String(r.men).padStart(5),'GK',r.byLine.GK,'home decades',r.homeDecades.join(' '),r.reasons.length?`| ${r.reasons.join(' ')}`:'')}
 const t=Date.now(),rep=seasonLab(cats,n)
 console.log(`\n${rep.seasons} seasons · ${rep.matches} matches · ${(Date.now()-t)}ms`)
 console.log(`goals/match ${rep.goalsPerMatch.toFixed(2)} · draws ${(100*rep.draws/rep.matches).toFixed(1)}% · 0-0 ${(100*rep.nilNil/rep.matches).toFixed(1)}% · home wins ${(100*rep.homeWins/rep.matches).toFixed(1)}% · away wins ${(100*rep.awayWins/rep.matches).toFixed(1)}%`)
 for(const c of rep.clubs)console.log(c.name.padEnd(24),'avg pts',c.avgPoints.toFixed(1),'avg place',c.avgPlace.toFixed(2),'titles',rep.titles[c.club]??0)
 if(rep.failures.length)console.log('FAILURES',rep.failures)
}
main()
