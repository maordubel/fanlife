import {readFileSync} from 'node:fs'
import path from 'node:path'
import {createClient} from '@supabase/supabase-js'
import type {EditionFile} from '@/lib/album/curate'
/**
 * `npm run album:sync` — writes the curated edition into the album catalog (service role only:
 * `worker_album_catalog_sync`). Runs in GitHub Actions when `content/generated/album-edition-1.json` changes on main.
 * Without the key it says so and exits cleanly (rule 105: nothing fails because a key is missing).
 */
const url=process.env.SUPABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY
async function run(){
 if(!url||!key){console.log('album:sync — no Supabase service key here; nothing written.');return}
 const db=createClient(url,key,{auth:{persistSession:false}})
 const doc=JSON.parse(readFileSync(path.join(process.cwd(),'content/generated/album-edition-1.json'),'utf8')) as EditionFile
 for(const [club,rows] of Object.entries(doc.wings)){
  const {data,error}=await db.rpc('worker_album_catalog_sync' as never,{p_club:club,p_edition:doc.edition,p_rows:rows.map(r=>({slot:r.slot,page:r.page,person_id:r.person_id,record_id:r.record_id,name:r.name}))} as never)
  if(error)throw new Error(`${club}: ${error.message}`)
  console.log('album:sync —',club,JSON.stringify(data))
 }
}
run().catch(e=>{console.error(e);process.exit(1)})
