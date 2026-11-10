import 'server-only'
import {createHash} from 'node:crypto'
import {existsSync,readFileSync} from 'node:fs'
import path from 'node:path'
import {REGISTRY} from '@/lib/master/registry'
import {SHARED_GATES,type GateKey} from '@/lib/clubs/gates'
import {emptyDecisions,rivalCandidates,stagedBatches,type StagedDecisions,type StagedInput} from './model'
import {readStagedInput,stagedPack} from './pack'

/**
 * "What would a yes open?" — the staged club compiled with no decision, with each batch alone, and with every batch
 * plus the most-met club as rival. Compiling is the only honest answer (the compiler decides what a gate can play), and
 * it costs about a second for the biggest club, so the daily run writes the answers to `research-reports/desk-preview.json`
 * (`npm run research:desk-preview`). The desk reads that file and recompiles a club only when its staged material no
 * longer matches the hash the file was written for.
 */
export type GateLine={key:GateKey;number:number;state:string;eligible:number;target:number;playable:boolean}
export type ClubPreview={inputHash:string;base:GateLine[];batches:Record<string,{hash:string;opens:GateKey[]}>;all:{gates:GateLine[];opens:GateKey[]}}
export type PreviewFile={generatedAt:string;clubs:Record<string,ClubPreview>}
export const PREVIEW_FILE='research-reports/desk-preview.json'

export const inputHash=(input:StagedInput)=>createHash('sha256').update(JSON.stringify(stagedBatches(input).map(b=>[b.id,b.hash]))+JSON.stringify(rivalCandidates(input,1))).digest('hex').slice(0,16)

async function gatesFor(id:string,d:StagedDecisions):Promise<GateLine[]>{
 const reg=REGISTRY.find(c=>c.id===id)!,sp=await stagedPack(id,d)
 if(!sp)return SHARED_GATES.map(g=>({key:g.key,number:g.number,state:'LOCKED',eligible:0,target:0,playable:false}))
 const [{compilePackEuro,withBaseWaves},{readinessPass}]=await Promise.all([import('@/lib/clubs/providers'),import('@/lib/clubs/resolver')])
 const r=readinessPass(withBaseWaves(id,compilePackEuro(sp.pack,reg)))
 return SHARED_GATES.map(g=>{const x=(r.data.gates as Record<string,{state:string;eligible:number;target:number;playable:boolean}|undefined>)[g.key];return {key:g.key,number:g.number,state:x?.state||'LOCKED',eligible:x?.eligible||0,target:x?.target||0,playable:!!x?.playable}})
}
const opened=(before:GateLine[],after:GateLine[])=>after.filter(g=>g.playable&&!before.find(b=>b.key===g.key)?.playable).map(g=>g.key)

export async function previewClub(id:string):Promise<ClubPreview|null>{
 const input=readStagedInput(id);if(!input)return null
 const now=new Date().toISOString(),batches=stagedBatches(input),rival=rivalCandidates(input,1)[0]??null
 const none=emptyDecisions(id),base=await gatesFor(id,none),per:ClubPreview['batches']={}
 for(const b of batches){const g=await gatesFor(id,{...none,batches:[{id:b.id,hash:b.hash,at:now,by:'preview'}]});per[b.id]={hash:b.hash,opens:opened(base,g)}}
 const all=await gatesFor(id,{...none,batches:batches.map(b=>({id:b.id,hash:b.hash,at:now,by:'preview'})),rival:rival?{name:rival.name,aliases:[],at:now,by:'preview',sources:rival.sources}:null})
 return {inputHash:inputHash(input),base,batches:per,all:{gates:all,opens:opened(base,all)}}
}

let fileCache:{at:number;v:PreviewFile|null}|null=null
export function readPreviewFile():PreviewFile|null{
 if(fileCache&&Date.now()-fileCache.at<60_000)return fileCache.v
 const p=path.join(process.cwd(),PREVIEW_FILE);let v:PreviewFile|null=null
 if(existsSync(p))try{v=JSON.parse(readFileSync(p,'utf8')) as PreviewFile}catch{v=null}
 fileCache={at:Date.now(),v};return v
}
const live=new Map<string,{hash:string;p:Promise<ClubPreview|null>}>()
/** The preview for one club: the daily file when it still describes this material, else compiled once per instance. */
export async function clubPreview(id:string):Promise<ClubPreview|null>{
 const input=readStagedInput(id);if(!input)return null
 const h=inputHash(input),f=readPreviewFile()?.clubs[id]
 if(f&&f.inputHash===h)return f
 const hit=live.get(id);if(hit&&hit.hash===h)return hit.p
 const p=previewClub(id).catch(()=>null);live.set(id,{hash:h,p});return p
}
