/**
 * One-off (13.11.2026): the archive refresh corrected and grew the data under six editorial trivia selections —
 *  · Celtic: the 1888 Exhibition Cup final is dated 6 September (was 6 August; content/manual/archive-corrections-2026-11-13.json),
 *    and St Mirren is now written as the two season publishers write it ("St Mirren"), so two explanations follow;
 *  · St. Pauli: three "order of arrival" trios were re-dealt because the roster's fame order moved with the new club careers.
 * The Celtic rows take the current question's wording (their curated wording was the base wording); the St. Pauli rows are replaced
 * by the next three order questions no editorial row holds yet. Nothing else in the file changes.
 *   node --require ./scripts/master/server-only.cjs --import tsx scripts/trivia/refresh-editorial-2026-11-13.ts
 */
import {readFileSync,writeFileSync} from 'node:fs'
process.env.FANLIFE_PRECOMPILED='off'
async function main(){
 const {loadClub}=await import('@/lib/clubs/resolver'),{clubBank}=await import('@/lib/clubs/trivia-deck')
 const path='content/manual/trivia-editorial-2026-10-21.json',raw=readFileSync(path,'utf8'),file=JSON.parse(raw)
 for(const club of ['celtic','st-pauli']){
  const bank=clubBank((await loadClub(club))!.data as never) as unknown as {byId:Map<string,any>;all?:any[]}
  const all=[...bank.byId.values()],rows=file.clubs[club] as any[],taken=new Set(rows.map(r=>r.questionId))
  for(let i=0;i<rows.length;i++){
   const e=rows[i],q=bank.byId.get(e.questionId)
   const row=(q:any)=>({questionId:q.id,answer:q.answer,factIds:q.factIds,sourceUrl:q.source.url,prompt:q.prompt,explanation:q.explanation,basePrompt:q.prompt,baseExplanation:q.explanation})
   // only a row whose overlay the new data withdrew (the question is there, untagged): an untouched row keeps its curated wording
   if(q&&!q.facets.includes('editorial:2026-10-21')&&JSON.stringify(q.factIds)===JSON.stringify(e.factIds)&&q.source.url===e.sourceUrl){rows[i]=row(q);console.log(club,'refreshed',e.questionId);continue}
   if(!q){
    const sameTemplate=all.filter(x=>!taken.has(x.id)&&x.prompt===e.basePrompt).sort((a,b)=>a.id.localeCompare(b.id))[0]
    if(sameTemplate){taken.add(sameTemplate.id);rows[i]=row(sameTemplate);console.log(club,'replaced',e.questionId,'→',sameTemplate.id)}
    else console.log(club,'NO REPLACEMENT for',e.questionId)
   }
  }
 }
 writeFileSync(path,JSON.stringify(file,null,raw.startsWith('{\n "')?1:2)+'\n')
}
main().catch(e=>{console.error(e);process.exit(1)})
