import 'server-only'
import {existsSync,readFileSync} from 'node:fs'
import path from 'node:path'
import type {State} from '@/lib/master/types'
import type {ClubSummary} from '@/lib/master/summary'
import type {GateKey} from '@/lib/clubs/gates'
import {buildDesk,type ClubInput,type Desk,type GateInput} from './desk-model'
import {rivalCandidates,stagedBatches,uefaMatches,isReviewFile} from './staged/model'
import {isStagedClub,readDecisions,readStagedInput} from './staged/pack'
import {clubPreview} from './staged/preview'
import {loadClub} from '@/lib/clubs/resolver'

/** What the daily run found wrong with collection (research-reports/health.json, written by research:daily-report). */
export type HealthFile={generatedAt:string;alarms:{club:string;code:string;text:string}[]}
export function readHealth():HealthFile|null{
 const p=path.join(process.cwd(),'research-reports','health.json');if(!existsSync(p))return null
 try{return JSON.parse(readFileSync(p,'utf8')) as HealthFile}catch{return null}
}

const fromSummary=(s:ClubSummary):GateInput[]=>(s.data?.gates||[]).map(g=>({key:g.key,number:g.number,state:g.state,eligible:g.eligible,target:g.target,playable:g.dataPlayable,openNow:g.openNow}))

/** The research desk for every club the control room holds. Staged clubs carry their batches, decisions and preview. */
export async function researchDesk(state:State,summaries:ClubSummary[]):Promise<Desk>{
 // 'waiting-owner' alarms are what the desk itself asks — only collection problems are listed as health
 const health=readHealth(),problems=(health?.alarms||[]).filter(a=>a.code!=='waiting-owner'),alarmOf=(id:string)=>problems.find(a=>a.club===id)?.text??null
 const inputs=await Promise.all(state.clubs.map(async(c):Promise<ClubInput|null>=>{
  const s=summaries.find(x=>x.id===c.id);if(!s)return null
  const staged=isStagedClub(c.id),input=staged?readStagedInput(c.id):null
  if(!staged&&!s.engine.hasProvider)return null
  const base={id:c.id,name:c.name,country:c.country,primary:c.primary,status:c.status,version:c.version,gatesOn:c.gates,gates:fromSummary(s),alarm:alarmOf(c.id)}
  if(!input){
   const core=await loadClub(c.id).catch(()=>null),ps=core?.data.players||[]
   const coverage=core?{players:ps.length,approved:ps.filter(f=>f.status==='approved'&&f.confidence>=2).length,waiting:ps.filter(f=>f.confidence<2).length,noPosition:ps.filter(f=>!f.value.positions?.length).length}:null
   return {...base,staged:false,after:null,batches:[],perBatch:{},decisions:null,rivals:[],opponents:[],uefaMatches:0,historyMatches:0,coverage}
  }
  const [decisions,preview]=await Promise.all([readDecisions(c.id).catch(()=>null),clubPreview(c.id)])
  const batches=stagedBatches(input),perBatch:Record<string,GateKey[]>={}
  for(const b of batches){const p=preview?.batches[b.id];perBatch[b.id]=p&&p.hash===b.hash?p.opens:[]}
  const all=rivalCandidates(input,40)
  const after=preview?preview.all.gates.map(g=>({...g,openNow:false})):null
  return {...base,staged:true,after,batches,perBatch,decisions,rivals:all.slice(0,8),opponents:all.slice(8).map(r=>r.name),
   uefaMatches:uefaMatches(input).length,historyMatches:input.files.filter(f=>isReviewFile(f.name)).reduce((n,f)=>n+(f.data.matches?.length||0),0)}
 }))
 return buildDesk(inputs.filter((x):x is ClubInput=>!!x),problems.map(a=>a.text))
}
