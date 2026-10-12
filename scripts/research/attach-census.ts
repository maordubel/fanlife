/**
 * research:census — what each repository club's COMPILED data holds, per section and per gate.
 * Read-only: compiles every club with the precompiled reader off and prints one JSON object per club
 * (counts + gate readiness). Used to measure an attach pass before → after (docs/fanlife/50-research-attach-2026-10-12.md).
 *   npm run research:census [-- --out <file.json>]
 */
import {writeFileSync} from 'node:fs'
process.env.FANLIFE_PRECOMPILED='off'
async function main(){
 const {loadClub,CORE_CLUB_IDS}=await import('@/lib/clubs/resolver')
 const out:Record<string,unknown>={}
 for(const id of CORE_CLUB_IDS){
  const r=await loadClub(id);if(!r)continue
  const d=r.data as unknown as Record<string,unknown>
  const n=(k:string)=>Array.isArray(d[k])?(d[k] as unknown[]).length:0
  const matches=(Array.isArray(d.matches)?d.matches:[]) as {value:Record<string,unknown>}[]
  const gates=Object.fromEntries(Object.entries(r.data.gates).map(([k,v])=>[k,v?`${v.state} ${v.eligible}/${v.target}`:null]))
  out[id]={players:n('players'),matches:n('matches'),matchesWithEleven:matches.filter(m=>Array.isArray(m.value.lineup)&&m.value.lineup.length===11).length,matchesWithScorers:matches.filter(m=>Array.isArray(m.value.scorers)&&m.value.scorers.length>0).length,archive:n('archive'),timeline:n('timeline'),kits:n('kits'),trophies:n('trophies'),seasons:n('seasons'),mysteries:n('mysteries'),trivia:Array.isArray((d.trivia as {questions?:unknown[]}|undefined)?.questions)?(d.trivia as {questions:unknown[]}).questions.length:0,sources:n('sources'),gates}
  console.log(id,JSON.stringify(out[id]))
 }
 const i=process.argv.indexOf('--out');if(i>0&&process.argv[i+1])writeFileSync(process.argv[i+1]!,JSON.stringify(out,null,1)+'\n')
}
main().catch(e=>{console.error(e);process.exit(1)})
