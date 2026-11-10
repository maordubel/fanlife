import 'server-only'
import {existsSync,readFileSync,readdirSync} from 'node:fs'
import {mkdir,readFile,rename,writeFile} from 'node:fs/promises'
import path from 'node:path'
import {REGISTRY} from '@/lib/master/registry'
import {durable} from '@/lib/master/durable'
import {dataRoot} from '@/lib/dataRoot'
import {STATIC_CLUB_IDS} from '@/lib/clubs/resolver-ids'
import {composeStaged,emptyDecisions,isReviewFile,isUefaFile,stagedBatches,type StagedDecisions,type StagedFile,type StagedInput} from './model'

/**
 * Server side of the staged line (see `model.ts`). Reads `research-staging/<id>/` — the files the daily pull and the
 * history waves write — and the owner's decisions, which live in durable storage at `research-desk/<id>.json`
 * (Supabase/Blob when connected, the data dir otherwise), never in the repository: approving is a click, not a build.
 */
const ROOT=()=>path.join(process.cwd(),'research-staging')
const KEY=(id:string)=>`research-desk/${id}.json`
const FILE=(id:string)=>path.join(dataRoot(),'research-desk',`${id}.json`)
const safeId=(id:string)=>/^[a-z0-9-]{2,48}$/.test(id)

/** Registry clubs with no repository pack whose staging folder holds at least one wave file. */
export function stagedClubIds():string[]{
 const root=ROOT();if(!existsSync(root))return []
 return REGISTRY.map(c=>c.id).filter(id=>!STATIC_CLUB_IDS.includes(id)&&existsSync(path.join(root,id))&&readdirSync(path.join(root,id)).some(n=>isUefaFile(n)||isReviewFile(n)))
}
export const isStagedClub=(id:string)=>stagedClubIds().includes(id)

const inputCache=new Map<string,{at:number;v:StagedInput|null}>()
/** The club's staged files, read once a minute at most (the files only change with a deployment). */
export function readStagedInput(id:string):StagedInput|null{
 if(!safeId(id))return null
 const hit=inputCache.get(id);if(hit&&Date.now()-hit.at<60_000)return hit.v
 const dir=path.join(ROOT(),id)
 let v:StagedInput|null=null
 if(existsSync(dir)){
  const files:StagedFile[]=readdirSync(dir).filter(n=>isUefaFile(n)||isReviewFile(n)).sort().map(name=>{try{return {name,data:JSON.parse(readFileSync(path.join(dir,name),'utf8'))}}catch{return null}}).filter((f):f is StagedFile=>!!f)
  let names:string[]=[REGISTRY.find(c=>c.id===id)?.name||id]
  try{const cfg=JSON.parse(readFileSync(path.join(dir,'ingest.json'),'utf8'));if(Array.isArray(cfg.names)&&cfg.names.length)names=[...new Set([...cfg.names.map(String),...names])]}catch{/* no ingest config: the registry name */}
  v=files.length?{clubId:id,names,files}:null
 }
 inputCache.set(id,{at:Date.now(),v});return v
}

export async function readDecisions(id:string):Promise<StagedDecisions>{
 if(!safeId(id))return emptyDecisions(id)
 const d=durable()
 if(d){const r=await d.read(KEY(id),{shared:true});return r?JSON.parse(r.text) as StagedDecisions:emptyDecisions(id)}
 try{return JSON.parse(await readFile(FILE(id),'utf8')) as StagedDecisions}catch(e){if((e as NodeJS.ErrnoException).code==='ENOENT')return emptyDecisions(id);throw e}
}
/** Compare-and-swap on the durable store; a busy store is an error the owner sees, never a silent loss. */
export async function writeDecisions(next:StagedDecisions){
 if(!safeId(next.clubId))throw new Error('Unknown club.')
 const d=durable(),text=JSON.stringify(next)
 if(d){for(let i=0;i<4;i++){const cur=await d.read(KEY(next.clubId));if(await d.write(KEY(next.clubId),text,cur?.etag??null))return}throw new Error('Could not save the decision (storage busy). Try again.')}
 await mkdir(path.dirname(FILE(next.clubId)),{recursive:true});const tmp=`${FILE(next.clubId)}.${process.pid}.tmp`;await writeFile(tmp,text);await rename(tmp,FILE(next.clubId))
}

/** The staged pack for the resolver: the club's files plus the owner's decisions, or null when nothing is staged. */
export async function stagedPack(id:string,override?:StagedDecisions|null){
 const input=readStagedInput(id);if(!input)return null
 const decisions=override===undefined?await readDecisions(id).catch(()=>null):override
 const {mergeHistorical}=await import('@/lib/clubs/history-wave')
 return {...composeStaged(input,decisions,(p,w)=>mergeHistorical(p,w)),input,decisions}
}
/** Every decision the owner could still take, as if taken now — what the desk shows under "approving opens". */
export function allApproved(id:string,input:StagedInput,cur:StagedDecisions|null,rival?:{name:string;sources:string[]}|null):StagedDecisions{
 const now=new Date().toISOString(),batches=stagedBatches(input)
 return {schemaVersion:1,clubId:id,updatedAt:now,batches:batches.map(b=>({id:b.id,hash:b.hash,at:now,by:'preview'})),rival:cur?.rival??(rival?{name:rival.name,aliases:[],at:now,by:'preview',sources:rival.sources}:null)}
}
