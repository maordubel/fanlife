import {mkdir,readFile,rename,writeFile} from 'node:fs/promises'
import {randomUUID} from 'node:crypto'
import path from 'node:path'
import type {ResearchJob,ResearchRun,SnapshotMeta} from './contract'

/**
 * File-backed research store under the control-room data dir (`FAN_LIFE_DATA_DIR`, default `.fan-life`):
 *   research/<club>/jobs.json · runs.json · snapshots.json · snapshots/<sha256>.bin
 * Writes are serialised per process and atomic (temp file + rename). Jobs carry a random lease token: a worker may
 * complete a job only while it still holds that token, so a late worker can never overwrite a newer result.
 * At-least-once with idempotent writes — the same snapshot hash is stored once however often it is fetched.
 * (A shared Postgres store with SKIP LOCKED is the next step when more than one worker runs; the API stays the same.)
 */
export const root=()=>path.resolve(process.env.FAN_LIFE_DATA_DIR||'.fan-life','research')
export const dir=(club:string)=>{if(!/^[a-z][a-z0-9-]{1,60}$/.test(club))throw new Error('Invalid club id');return path.join(root(),club)}
const g=globalThis as typeof globalThis&{researchWrites?:Promise<unknown>}
export async function readJson<T>(file:string,fallback:T):Promise<T>{try{return JSON.parse(await readFile(file,'utf8')) as T}catch(e){if((e as NodeJS.ErrnoException).code==='ENOENT')return fallback;throw e}}
export async function writeJson(file:string,value:unknown){await mkdir(path.dirname(file),{recursive:true});const tmp=`${file}.${randomUUID()}.tmp`;await writeFile(tmp,JSON.stringify(value,null,1));await rename(tmp,file)}
export function serial<T>(fn:()=>Promise<T>):Promise<T>{const op=(g.researchWrites||Promise.resolve()).then(fn);g.researchWrites=op.catch(()=>undefined);return op}

export const readJobs=(club:string)=>readJson<ResearchJob[]>(path.join(dir(club),'jobs.json'),[])
export const readRunsFor=(club:string)=>readJson<ResearchRun[]>(path.join(dir(club),'runs.json'),[])
export const readSnapshots=(club:string)=>readJson<Record<string,SnapshotMeta>>(path.join(dir(club),'snapshots.json'),{})

/** Add jobs whose id is new; existing jobs keep their state (idempotent re-planning). */
export const upsertJobs=(club:string,jobs:ResearchJob[])=>serial(async()=>{const have=await readJobs(club),ids=new Set(have.map(j=>j.id)),add=jobs.filter(j=>!ids.has(j.id));await writeJson(path.join(dir(club),'jobs.json'),[...have,...add]);return add.length})
export const appendRun=(club:string,run:ResearchRun)=>serial(async()=>{const runs=await readRunsFor(club);await writeJson(path.join(dir(club),'runs.json'),[...runs,run].slice(-200));return run})

/** Lease up to n due jobs (planned, or failed-with-retry whose time has come, or leases that expired). */
export const lease=(club:string,n:number,now:Date,ttlMs=120000)=>serial(async()=>{
 const jobs=await readJobs(club),t=now.getTime(),out:ResearchJob[]=[]
 for(const j of [...jobs].sort((a,b)=>b.priority-a.priority||a.id.localeCompare(b.id))){
  if(out.length>=n)break
  const due=j.state==='planned'||(j.state==='failed'&&j.nextAttemptAt!==null&&Date.parse(j.nextAttemptAt)<=t)||(j.state==='leased'&&j.leaseUntil!==null&&Date.parse(j.leaseUntil)<=t)
  if(!due)continue
  j.state='leased';j.lease=randomUUID();j.leaseUntil=new Date(t+ttlMs).toISOString();j.attempts++;j.updatedAt=now.toISOString();out.push({...j})
 }
 await writeJson(path.join(dir(club),'jobs.json'),jobs);return out})
/** Complete a leased job — only while the lease is still ours. Returns false when another worker took it over. */
export const complete=(club:string,id:string,leaseToken:string,patch:Partial<ResearchJob>,now:Date)=>serial(async()=>{
 const jobs=await readJobs(club),j=jobs.find(x=>x.id===id)
 if(!j||j.lease!==leaseToken||j.state!=='leased')return false
 Object.assign(j,patch,{lease:null,leaseUntil:null,updatedAt:now.toISOString()});await writeJson(path.join(dir(club),'jobs.json'),jobs);return true})
export const saveSnapshot=(club:string,meta:SnapshotMeta,body:Buffer)=>serial(async()=>{
 const index=await readSnapshots(club),file=path.join(dir(club),'snapshots',`${meta.hash}.bin`)
 await mkdir(path.dirname(file),{recursive:true});try{await readFile(file)}catch{await writeFile(file,body)}
 index[meta.url]=meta;await writeJson(path.join(dir(club),'snapshots.json'),index);return meta})
