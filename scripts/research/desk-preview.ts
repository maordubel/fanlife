/**
 * research:desk-preview — for every staged club (lib/research/staged), compile what each owner decision would open and
 * write research-reports/desk-preview.json, so the research desk answers "approving opens …" without compiling on the
 * page. Read-only over the staged files; decides nothing. Run by .github/workflows/research-daily.yml after the pull.
 *   npm run research:desk-preview
 */
import {mkdirSync,writeFileSync} from 'node:fs'
import path from 'node:path'
process.env.FANLIFE_PRECOMPILED='off'
async function main(){
 const {stagedClubIds}=await import('@/lib/research/staged/pack')
 const {previewClub,PREVIEW_FILE}=await import('@/lib/research/staged/preview')
 const clubs:Record<string,unknown>={}
 for(const id of stagedClubIds()){
  const t=Date.now(),p=await previewClub(id);if(!p)continue
  clubs[id]=p
  console.log(`${id}: ${p.base.filter(g=>g.playable).length} playable now · ${p.all.opens.length} more on every yes (${p.all.opens.join(', ')||'none'}) · ${Date.now()-t} ms`)
 }
 const out=path.join(process.cwd(),PREVIEW_FILE);mkdirSync(path.dirname(out),{recursive:true})
 writeFileSync(out,JSON.stringify({generatedAt:new Date().toISOString(),clubs},null,1)+'\n')
}
main().catch(e=>{console.error(e);process.exit(1)})
