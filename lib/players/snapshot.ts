import 'server-only'
import {readJson} from './store'
import {setSnapshot,getSnapshot} from './effective'
import {EMPTY_SNAPSHOT,type Snapshot} from './types'
/**
 * The published overrides, refreshed from the store at most every few seconds per instance. If the store is unreachable the LAST KNOWN GOOD
 * snapshot keeps serving (and `lastError` says so for the desk); a failed read is never presented as a new revision.
 */
const TTL_MS=process.env.NODE_ENV==='test'?0:8_000
const st=globalThis as typeof globalThis&{fanPlayerSnapAt?:number;fanPlayerSnapErr?:string|null;fanPlayerSnapInflight?:Promise<Snapshot>}
export const lastError=()=>st.fanPlayerSnapErr??null
export async function refreshSnapshot(force=false):Promise<Snapshot>{
 if(process.env.PLAYER_OVERRIDES_OFF)return EMPTY_SNAPSHOT
 if(!force&&TTL_MS&&st.fanPlayerSnapAt&&Date.now()-st.fanPlayerSnapAt<TTL_MS)return getSnapshot()
 if(st.fanPlayerSnapInflight&&!force)return st.fanPlayerSnapInflight
 const run=(async()=>{
  try{const s=await readJson<Snapshot>('published.json',EMPTY_SNAPSHOT);setSnapshot(s);st.fanPlayerSnapErr=null;return s}
  catch(e){st.fanPlayerSnapErr=String((e as Error)?.message||e);return getSnapshot()}
  finally{st.fanPlayerSnapAt=Date.now();st.fanPlayerSnapInflight=undefined}
 })()
 st.fanPlayerSnapInflight=run;return run
}
