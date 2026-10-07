import 'server-only'
import {randomUUID} from 'node:crypto'
import {audit,mutate} from './store'
import {adapterFor} from './adapters'
import {mergeResearch,isPending} from './researchMerge'
import type {Job} from './types'
/** Dispatch by job.adapter (default: wikipedia). Providers are adapters; none writes to production data. */
export async function collect(job:Job){const a=adapterFor(job.adapter);if(!a)throw new Error(`Unknown research adapter "${job.adapter}".`);return a.collect(job)}
const DEFAULT_GAPS=['Confirm the article describes the right club and sport.','Verify identity and dates against official sources.','Research squads, kits, goals, venues and supporter culture.','Build and verify native content adapters and English LIFE scenes.']
const runnable=(j:Job)=>j.status==='queued'||j.status==='running'&&Date.now()-Date.parse(j.startedAt||j.createdAt)>300000
/**
 * Run one research job. With `id`, exactly that job (audit F15: "Bring into the club file" runs the job it queued, not
 * whichever job is first in the global queue); without, the first runnable job.
 * Research is the research layer only (F05): it never changes status, gates or what is published.
 */
export async function runResearch(id?:string):Promise<{ran:boolean;status?:'completed'|'failed';jobId?:string;clubId?:string;reason?:string}>{const lease=randomUUID();let reason:string|undefined
 const job=await mutate(s=>{const j=id?s.jobs.find(j=>j.id===id):s.jobs.find(runnable);if(!j){reason=id?'Job not found.':undefined;return null}if(!runnable(j)){reason=`Job is ${j.status}.`;return null}if(j.attempts>=3){j.status='failed';j.error='Retry limit reached.';reason=j.error;return null}j.status='running';j.startedAt=new Date().toISOString();j.attempts++;j.lease=lease;j.baseVersion=s.clubs.find(c=>c.id===j.clubId)?.version;return structuredClone(j)})
 if(!job)return{ran:false,...(reason?{reason}:{})}
 try{const result=await collect(job);await mutate(s=>{const j=s.jobs.find(j=>j.id===job.id);if(j?.lease!==lease)throw new Error('Job lease changed.');const c=s.clubs.find(c=>c.id===job.clubId);if(!c||c.version!==job.baseVersion)throw new Error('Club changed during research. Retry to preserve edits.')
  const adapter=job.adapter||'wikipedia',at=new Date().toISOString(),rep=mergeResearch(c,result,{adapter,runId:job.id,at})
  // research status lives beside publication state, never in it
  c.research={state:c.findings.some(isPending)||c.sources.some(x=>!x.reviewed||x.incoming)?'needs-review':'collected',lastRunId:job.id,lastAdapter:adapter,at}
  if(c.id!=='hapoel-tel-aviv')c.gaps=result.gaps?.length?result.gaps:DEFAULT_GAPS
  c.version++;j.status='completed';delete j.error
  audit(s,'research.completed',c.id,`${result.sources.length} sources collected · findings ${rep.added} new, ${rep.refreshed} still produced, ${rep.superseded} superseded${rep.restored?`, ${rep.restored} produced again`:''}${rep.changedReviewed?` · ${rep.changedReviewed} reviewed source(s) changed and need re-review`:''}`,{actor:`research:${adapter}`})});return{ran:true,status:'completed',jobId:job.id,clubId:job.clubId}}
 catch(e){await mutate(s=>{const j=s.jobs.find(j=>j.id===job.id);if(j?.lease===lease){j.status='failed';j.error=e instanceof Error?e.message:'Research failed';audit(s,'research.failed',j.clubId,j.error)}});return{ran:true,status:'failed',jobId:job.id,clubId:job.clubId}}}
