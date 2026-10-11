import 'server-only'
import {readFile} from 'node:fs/promises'
import path from 'node:path'
import {dir,readJson,readSnapshots} from '@/lib/research/store'
import {extractCandidates,mergeCandidates,sha} from './extract'
import {evaluate} from './gate'
import {readdirSync} from 'node:fs'
import {profiledClubs} from '@/lib/research/profiles'
import {isDurable,readDoc,updateDoc} from './storage'
import {publishCandidate,readPolicy} from './published'
import {EXTRACTOR_VERSION,PIPELINE_VERSION,WORKER_ROUTE_CLUB,type Candidate} from './types'

/**
 * The daily pass. It never makes a request of its own: it reads the snapshots the research engine already fetched
 * within each source's own limits (`lib/research/fetcher.ts`), so this layer cannot overrun a quota, trip a block or
 * bypass robots.txt. Planning is locked by (club, UTC day, pipeline version) — a second tick the same day finds the
 * lock and does only the unprocessed remainder, in small resumable batches.
 */
export const BATCH_SNAPSHOTS=20
type PassState={processed:Record<string,string>;plans:Record<string,string>;runs:PassRun[]}
export type PassRun={at:string;clubs:string[];state:'ok'|'nothing-to-do'|'paused'|'error';counts:Record<string,number>;issues:Record<string,number>;note:string}
const EMPTY:PassState={processed:{},plans:{},runs:[]}

export {htmlToText,textOf,documentDate} from './text'
import {textOf,documentDate} from './text'

/** Every club the pipeline watches: those with a research profile, those with a club pack, and the Worker's own club. */
export async function goalClubs():Promise<string[]>{
 const packs=(()=>{try{return readdirSync(path.join(process.cwd(),'club-packs'),{withFileTypes:true}).filter(d=>d.isDirectory()).map(d=>d.name)}catch{return [] as string[]}})()
 return [...new Set([...(await profiledClubs().catch(()=>[] as string[])),...packs,WORKER_ROUTE_CLUB])].sort()
}

const keyFile=(club:string)=>`candidates-${club}`
export const readCandidates=async(club:string)=>(await readDoc<Candidate[]>(keyFile(club),[])).value
const upsert=(club:string,add:Candidate[])=>updateDoc<Candidate[]>(keyFile(club),[],have=>{
 const by=new Map(have.map(c=>[c.id,c]))
 for(const c of add){const old=by.get(c.id);by.set(c.id,old?{...mergeCandidates(old,c),status:old.status==='published'||old.status==='rolled_back'?old.status:c.status,issues:c.issues}:c)}
 return [...by.values()]
})

export async function goalsPass({now=new Date(),clubs,maxSnapshots=BATCH_SNAPSHOTS}:{now?:Date;clubs:string[];maxSnapshots?:number}):Promise<PassRun>{
 const policy=await readPolicy(),at=now.toISOString(),day=at.slice(0,10)
 const counts:Record<string,number>={snapshots:0,candidates:0,withSequence:0,held:0,readyForReview:0,published:0,skippedUnreadable:0},issues:Record<string,number>={}
 const finish=async(run:Omit<PassRun,'at'|'clubs'>):Promise<PassRun>=>{const r={at,clubs,...run};await updateDoc<PassState>('state',EMPTY,s=>({...s,runs:[...s.runs,r].slice(-60)}));return r}
 if(policy.paused)return finish({state:'paused',counts,issues,note:'Paused by the owner; nothing was read.'})
 let budget=maxSnapshots,worked=false
 for(const club of clubs){
  if(budget<=0)break
  // candidates the collector read while the body was in memory (no raw copy kept): judged here, on every pass, idempotently
  const collected=await readJson<Candidate[]>(path.join(dir(club),'goal-candidates.json'),[]).catch(()=>[] as Candidate[])
  if(collected.length){
   const known=new Set((await readCandidates(club)).map(c=>c.id)),out:Candidate[]=[]
   for(const c of collected){
    const res=evaluate(c,{policy,durable:isDurable()});out.push({...c,status:res.status,issues:res.issues})
    if(!known.has(c.id)){counts.candidates!++;if(c.steps.length)counts.withSequence!++;if(res.status==='held')counts.held!++;if(res.status==='ready_for_review')counts.readyForReview!++;for(const i of res.issues)issues[i]=(issues[i]??0)+1}
   }
   await upsert(club,out);worked=true
   for(const c of out)if(c.status==='auto_publishable'){const r=await publishCandidate(c,'automation:goals');if(r.ok&&!r.already)counts.published!++}
  }
  const snaps=Object.values(await readSnapshots(club).catch(()=>({})))
  const st=(await readDoc<PassState>('state',EMPTY)).value
  const todo=snaps.filter(m=>m.status===200&&st.processed[m.hash]!==EXTRACTOR_VERSION).slice(0,budget)
  if(!todo.length)continue
  // the daily plan is a lock, not a queue: recorded once per (club, day, pipeline version)
  await updateDoc<PassState>('state',EMPTY,s=>({...s,plans:{...s.plans,[`${club}|${day}|${PIPELINE_VERSION}`]:at}}))
  for(const m of todo){
   budget--;worked=true;counts.snapshots!++
   let body:string
   try{body=await readFile(path.join(dir(club),'snapshots',`${m.hash}.bin`),'utf8')}catch{counts.skippedUnreadable!++;continue}
   const doc=textOf(body)
   if(doc){
    const playedOn=documentDate(doc.text)
    const found=extractCandidates({clubId:club,sourceId:new URL(m.url).hostname,url:m.url,body:doc.text,fetchedAt:m.fetchedAt,playedOn,opponentHe:null})
    const out:Candidate[]=[]
    for(const c of found){
     const res=evaluate(c,{policy,durable:isDurable()})
     out.push({...c,status:res.status,issues:res.issues})
     counts.candidates!++;if(c.steps.length)counts.withSequence!++
     if(res.status==='held')counts.held!++;if(res.status==='ready_for_review')counts.readyForReview!++
     for(const i of res.issues)issues[i]=(issues[i]??0)+1
    }
    if(out.length){
     await upsert(club,out)
     for(const c of out)if(c.status==='auto_publishable'){const r=await publishCandidate(c,'automation:goals');if(r.ok&&!r.already)counts.published!++}
    }
   } else counts.skippedUnreadable!++
   await updateDoc<PassState>('state',EMPTY,s=>({...s,processed:{...s.processed,[m.hash]:EXTRACTOR_VERSION}}))
  }
 }
 return finish({state:worked?'ok':'nothing-to-do',counts,issues,note:worked?`Read ${counts.snapshots} stored page(s); no request was made.`:'No unprocessed stored pages. A green status here means "checked, nothing new", not "found goals".'})
}

export async function readPassState():Promise<PassState>{return (await readDoc<PassState>('state',EMPTY)).value}
export {sha}
