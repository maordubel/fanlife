import 'server-only'
import {existsSync,readFileSync} from 'node:fs'
import {join} from 'node:path'
import type {Source,Finding,Job} from '../types'
import type {Adapter} from './types'
type Row=Record<string,unknown>
const read=(dir:string,n:string):Row[]=>{const p=join(dir,`${n}.json`);if(!existsSync(p))return [];const v=JSON.parse(readFileSync(p,'utf8'));return Array.isArray(v)?v:[]}
const https=(u:unknown)=>{try{return typeof u==='string'&&new URL(u).protocol==='https:'}catch{return false}}
/**
 * Reads a staged research package (research-staging/<club>/, built by research:stage). Every finding stays unapproved.
 * Audit A06: each finding cites the sources of the record it was READ from — never "the first source" by default — and
 * package statistics (counts, versions, conflicts) are a REPORT, not historical claims, so they go to the gap list and
 * can never be approved as a fact.
 */
async function collect(job:Job){
 const dir=join(process.cwd(),'research-staging',job.clubId)
 if(!existsSync(join(dir,'manifest.json')))throw new Error('No staged research package for this club. Import the package and run research:stage first.')
 const manifest=JSON.parse(readFileSync(join(dir,'manifest.json'),'utf8')) as Row,now=new Date().toISOString()
 const raw=read(dir,'sources'),identity=read(dir,'club-identity'),matches=read(dir,'matches'),backlog=read(dir,'backlog'),conflicts=read(dir,'conflicts')
 const sources:Source[]=raw.filter(s=>https(s.url)).map(s=>({id:`pkg-${s.id}`,title:String(s.title),url:String(s.url),excerpt:`${s.sourceFamilyId||s.publisher} · ${s.scope||'record_specific'} · images usable: ${s.imagesUsableInApp===true}`,reviewed:false,retrievedAt:typeof s.retrievedAt==='string'?s.retrievedAt:now}))
 const known=new Set(sources.map(s=>s.id))
 const findings:Finding[]=[]
 for(const row of identity){
  const cites=(Array.isArray(row.sourceIds)?row.sourceIds:[]).map(id=>`pkg-${id}`).filter(id=>known.has(id))
  if(!cites.length)continue
  for(const [field,key] of [['candidateIdentity','nameEn'],['founded','foundedOn'],['founder','founder'],['wikidata','wikidataId'],['city','city']] as const){
   const v=row[key];if(v!==null&&v!==undefined&&v!=='')findings.push({field,value:String(v),sources:cites,approved:false})
  }
 }
 const report=[
  `REPORT · package v${manifest.researchVersion} · snapshot ${manifest.snapshotAsOf} · ${manifest.approvedForProduction} approved for production`,
  `REPORT · ${matches.length} dated matches staged — a count of what was collected, not proof of a complete archive`,
  ...(conflicts.length?[`REPORT · ${conflicts.length} conflicts held open: ${conflicts.map(c=>c.topic||c.matchId).join('; ')}`]:[]),
 ]
 return {sources,findings,gaps:[...report,...backlog.map(b=>`${b.priority} · ${b.taskHe||b.task||''}`)]}
}
export const packageAdapter:Adapter={id:'package',label:'Staged research package',collect,needsQuery:false,capabilities:['identity','package-report'],available:(clubId)=>existsSync(join(process.cwd(),'research-staging',clubId,'manifest.json'))}
