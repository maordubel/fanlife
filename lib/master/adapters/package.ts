import 'server-only'
import {existsSync,readFileSync} from 'node:fs'
import {join} from 'node:path'
import type {Source,Finding,Job} from '../types'
import type {Adapter} from './types'
const read=(dir:string,n:string):any[]=>{const p=join(dir,`${n}.json`);return existsSync(p)?JSON.parse(readFileSync(p,'utf8')):[]}
/** Reads a staged research package (research-staging/<club>/, built by research:stage). Every finding stays unapproved. */
async function collect(job:Job){
 const dir=join(process.cwd(),'research-staging',job.clubId)
 if(!existsSync(join(dir,'manifest.json')))throw new Error('No staged research package for this club. Import the package and run research:stage first.')
 const manifest=JSON.parse(readFileSync(join(dir,'manifest.json'),'utf8')),now=new Date().toISOString()
 const raw=read(dir,'sources'),identity=read(dir,'club-identity')[0]||{},matches=read(dir,'matches'),backlog=read(dir,'backlog'),conflicts=read(dir,'conflicts')
 const https=(u:string)=>{try{return new URL(u).protocol==='https:'}catch{return false}}
 const sources:Source[]=raw.filter(s=>https(s.url)).map(s=>({id:`pkg-${s.id}`,title:String(s.title),url:s.url,excerpt:`${s.sourceFamilyId||s.publisher} · ${s.scope||'record_specific'} · images usable: ${s.imagesUsableInApp===true}`,reviewed:false,retrievedAt:s.retrievedAt||now}))
 const first=sources[0]?.id?[sources[0].id]:[]
 const findings:Finding[]=[]
 const add=(field:string,value:unknown,ids=first)=>{if(value!==null&&value!==undefined&&value!=='')findings.push({field,value:String(value),sources:ids,approved:false})}
 add('candidateIdentity',identity.nameEn);add('founded',identity.foundedOn);add('founder',identity.founder)
 add('researchPackage',`v${manifest.researchVersion} · snapshot ${manifest.snapshotAsOf} · ${manifest.approvedForProduction} approved`)
 add('coverageClaim',`${matches.length} dated matches staged — a count of what was collected, not proof of a complete archive`)
 add('openConflicts',`${conflicts.length} held open: ${conflicts.map((c:any)=>c.topic||c.matchId).join('; ')}`)
 return {sources,findings,gaps:backlog.map((b:any)=>`${b.priority} · ${b.taskHe}`)}
}
export const packageAdapter:Adapter={id:'package',label:'Staged research package',collect}
