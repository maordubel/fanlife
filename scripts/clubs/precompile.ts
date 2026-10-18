/**
 * Writes every repository club's compiled base to content/compiled/ (lib/clubs/precompiled.ts says why and when it is read).
 * Runs as the first half of `npm run build`. Compiles with the precompiled reader OFF, so it can never copy an older file.
 */
import {mkdirSync,writeFileSync,rmSync} from 'node:fs'
import path from 'node:path'
import {randomUUID} from 'node:crypto'
process.env.FANLIFE_PRECOMPILED='off'
async function main(){
 const {loadClubBase,CORE_CLUB_IDS}=await import('@/lib/clubs/resolver')
 const {COMPILED_DIR}=await import('@/lib/clubs/precompiled')
 rmSync(COMPILED_DIR,{recursive:true,force:true});mkdirSync(COMPILED_DIR,{recursive:true})
 const {clubLife}=await import('@/lib/clubs/life/pack')
 const life:Record<string,boolean>={}
 const stamp=`${new Date().toISOString()}-${randomUUID().slice(0,8)}`,done:string[]=[]
 for(const id of CORE_CLUB_IDS){const t=Date.now(),r=await loadClubBase(id);if(!r)continue
  writeFileSync(path.join(COMPILED_DIR,`${id}.json`),JSON.stringify({stamp,...r}));done.push(id);life[id]=clubLife(r.data).readiness.playable
  console.log(`precompiled ${id} in ${Date.now()-t} ms`)}
 // the manifest is written last: a build that stopped half-way leaves no manifest, and the server compiles
 writeFileSync(path.join(COMPILED_DIR,'manifest.json'),JSON.stringify({schema:1,stamp,clubs:done,life},null,1)+'\n')
}
main().catch(e=>{console.error(e);process.exit(1)})
