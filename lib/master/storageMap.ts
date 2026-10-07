import 'server-only'
import {dataRoot,onServerless} from '@/lib/dataRoot'
import {durable} from './durable'
import {storageInfo} from './store'
import {evaluationMode} from './mode'

/**
 * Where each kind of data lives on THIS deployment and whether it survives a restart (plan §8 "storage map").
 * Stated from the code paths, not guessed: control state, profiles and the audit archive follow the durable store;
 * research runs, snapshots, staging and the evaluation database live under dataRoot(), which is /tmp on serverless.
 */
export type StorageRow={what:string;where:string;durable:'yes'|'no'|'committed'|'unknown';note:string}
export type Integration={name:string;present:boolean;note:string}

export function storageMap():StorageRow[]{
 const d=durable(),info=storageInfo(),tmp=onServerless(),root=dataRoot()
 const shared:StorageRow['durable']=d?(info.durable?'yes':'unknown'):(tmp?'no':'yes')
 const where=d?'Vercel Blob (private)':tmp?`${root} (this instance only)`:root
 return [
  {what:'Control state — clubs, gates, decisions, publication',where,durable:shared,note:info.error||info.note},
  {what:'Research profiles added in the control room',where,durable:shared,note:'The scheduled collector pins these when FAN_LIFE_RESEARCH_URL and FAN_LIFE_CRON_SECRET are set on GitHub.'},
  {what:'Activity archive (older than the newest 5,000 entries)',where,durable:shared,note:'Each entry is archived once, even when a write loses a race.'},
  {what:'Research runs, raw documents, staging (web-triggered)',where:tmp?`${root} (this instance only)`:root,durable:tmp?'no':'yes',note:'Runs started from this desk on Vercel are temporary. The committed record is the GitHub “Archive collect” run, which commits research-data/.'},
  {what:'Research data from scheduled runs',where:'GitHub repository · research-data/',durable:'committed',note:'Public repository: only public source material and checkpoints are committed.'},
  {what:'Evaluation database — closet, market, local stats',where:tmp?`${root}/postgres (this instance only)`:`${root}/postgres`,durable:tmp?'no':'yes',note:evaluationMode()?'Evaluation mode is on: shirts, listings and stats reset when the instance restarts until Supabase is connected.':'Not used: evaluation mode is off.'},
  {what:'Compiled club packs',where:'Repository · club-packs/ (shipped with each deploy)',durable:'committed',note:'Changed only by a reviewed build and a deploy.'},
 ]
}
const has=(k:string)=>!!(process.env[k]&&process.env[k]!.length)
export function integrations():Integration[]{
 return [
  {name:'Owner key (FAN_LIFE_ADMIN_KEY)',present:has('FAN_LIFE_ADMIN_KEY'),note:'Required for this desk in production.'},
  {name:'Blob store (BLOB_STORE_ID or BLOB_READ_WRITE_TOKEN)',present:has('BLOB_STORE_ID')||has('BLOB_READ_WRITE_TOKEN'),note:'Keeps control state across restarts.'},
  {name:'Scheduler secret (CRON_SECRET)',present:has('CRON_SECRET'),note:'Lets GitHub runs call the autopilot and pin profiles. Must equal the GitHub secret FAN_LIFE_CRON_SECRET.'},
  {name:'Supabase (NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY)',present:has('NEXT_PUBLIC_SUPABASE_URL')&&has('SUPABASE_SERVICE_ROLE_KEY'),note:'Durable accounts, market and audience events outside evaluation mode.'},
  {name:'Fixtures feed (THESPORTSDB_KEY)',present:has('THESPORTSDB_KEY'),note:'Next-up fixtures on the hub.'},
 ]
}
export function release(){return {commit:(process.env.VERCEL_GIT_COMMIT_SHA||'').slice(0,12)||null,branch:process.env.VERCEL_GIT_COMMIT_REF||null,env:process.env.VERCEL_ENV||(process.env.NODE_ENV==='production'?'production (not Vercel)':'development'),evaluation:evaluationMode()}}
