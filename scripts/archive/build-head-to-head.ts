/**
 * h2h:build — the head-to-head ledger of every open club against every opponent its approved archive records
 * (lib/fixtures/meetings.ts → ledgerOf), written to content/generated/head-to-head.json for the Football Stories studio
 * (scripts read it as plain JSON) and any surface that wants the balance without compiling a club.
 *   npm run h2h:build
 */
import {writeFileSync,mkdirSync} from 'node:fs'
process.env.FANLIFE_PRECOMPILED='off'
async function main(){
 const {CORE_CLUB_IDS}=await import('@/lib/clubs/resolver')
 const {clubMeetings,ledgerOf}=await import('@/lib/fixtures/meetings')
 const slim=(m:{on:string|null;year:number|null;home:string;away:string;homeGoals:number;awayGoals:number;competition:string}|null)=>m?{on:m.on,year:m.year,home:m.home,away:m.away,score:`${m.homeGoals}-${m.awayGoals}`,competition:m.competition||null}:null
 const {REGISTRY}=await import('@/lib/master/registry')
 const {core}=await import('@/lib/fixtures/names')
 const all=new Map<string,Awaited<ReturnType<typeof clubMeetings>>>()
 for(const id of CORE_CLUB_IDS)all.set(id,await clubMeetings(id))
 // two open clubs' archives are two witnesses to the same nights: each club's ledger against the other takes the nights only the
 // other recorded too (side turned round), one row per night
 const key=(m:{on:string|null;year:number|null;homeGoals:number;awayGoals:number})=>`${m.on??m.year??'?'}|${[m.homeGoals,m.awayGoals].sort((a,b)=>a-b).join('-')}`
 for(const a of CORE_CLUB_IDS)for(const b of CORE_CLUB_IDS){
  if(a===b)continue
  const nameA=REGISTRY.find(c=>c.id===a)!.name,nameB=REGISTRY.find(c=>c.id===b)!.name,mine=all.get(a)!,have=new Set(mine.map(key))
  for(const m of all.get(b)!){
   if(core(m.opponent)!==core(nameA)||have.has(key(m)))continue
   mine.push({...m,us:m.us==='home'?'away':'home',opponent:nameB,from:[...m.from]});have.add(key(m))
  }
 }
 const out:Record<string,unknown>={}
 for(const id of CORE_CLUB_IDS){
  const ms=all.get(id)!,led=ledgerOf(ms)
  out[id]={meetings:ms.length,opponents:led.length,ledger:led.map(l=>({...l,first:slim(l.first),last:slim(l.last),biggestWin:slim(l.biggestWin),heaviestDefeat:slim(l.heaviestDefeat)}))}
  console.log(`[${id}] ${ms.length} meetings against ${led.length} opponents; most met: ${led.slice(0,3).map(l=>`${l.opponent} ${l.played} (W${l.won} D${l.drawn} L${l.lost})`).join(', ')}`)
 }
 mkdirSync('content/generated',{recursive:true})
 writeFileSync('content/generated/head-to-head.json',JSON.stringify({generatedAt:new Date().toISOString().slice(0,10),note:'Approved archive rows only; one row per night; side as the record states it. Built by npm run h2h:build.',clubs:out})+'\n')
}
main().catch(e=>{console.error(e);process.exit(1)})
