/** npm run clubs:report — per club, per gate: eligible/target and why not (compiled pack = the only authority). */
import {loadClub,CORE_CLUB_IDS,REVIEW_CLUB_IDS} from '../../lib/clubs/resolver'
import {SHARED_GATES} from '../../lib/clubs/gates'
async function main(){
 const ids=[...new Set([...CORE_CLUB_IDS,...REVIEW_CLUB_IDS])]
 for(const id of ids){
  const c=await loadClub(id)
  if(!c){console.log(id,'— not loadable');continue}
  const d=c.data as any
  console.log(`\n## ${id}  players ${d.players?.length??0} · matches ${d.matches?.length??0} · kits ${d.kits?.length??0} · entities ${d.entities?.length??0} · mysteries ${d.mysteries?.length??0}`)
  for(const k of Object.keys(d.gates||{})){const g=d.gates?.[k];console.log(`  ${k.padEnd(14)} ${String(g?.state??'?').padEnd(10)} ${g?.eligible??'-'}/${g?.target??'-'} ${g?.playable?'PLAY':''} ${(g?.reason??'').slice(0,90)}`)}
  const dg=c.diagnostics.reduce((m:Record<string,number>,x:any)=>(m[x.code]=(m[x.code]||0)+1,m),{})
  console.log('  diagnostics',JSON.stringify(dg))
 }
}
main()
