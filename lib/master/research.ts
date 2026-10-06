import 'server-only'
import {randomUUID} from 'node:crypto'
import {audit,mutate,findingId,contentHash} from './store'
import {adapterFor} from './adapters'
import type {Job} from './types'
/** Dispatch by job.adapter (default: wikipedia). Providers are adapters; none writes to production data. */
export async function collect(job:Job){const a=adapterFor(job.adapter);if(!a)throw new Error(`Unknown research adapter "${job.adapter}".`);return a.collect(job)}
export async function runResearch(){const lease=randomUUID();const job=await mutate(s=>{const j=s.jobs.find(j=>j.status==='queued'||j.status==='running'&&Date.now()-Date.parse(j.startedAt||j.createdAt)>300000);if(!j)return null;if(j.attempts>=3){j.status='failed';j.error='Retry limit reached.';return null}j.status='running';j.startedAt=new Date().toISOString();j.attempts++;j.lease=lease;j.baseVersion=s.clubs.find(c=>c.id===j.clubId)?.version;return structuredClone(j)});if(!job)return{ran:false};try{const result=await collect(job);await mutate(s=>{const j=s.jobs.find(j=>j.id===job.id);if(j?.lease!==lease)throw new Error('Job lease changed.');const c=s.clubs.find(c=>c.id===job.clubId);if(!c||c.version!==job.baseVersion)throw new Error('Club changed during research. Retry to preserve edits.');const byId=new Map(c.sources.map(x=>[x.id,x])),fresh:typeof c.sources=[];let changed=0
 for(const x of result.sources){const h=contentHash(x.excerpt),had=byId.get(x.id)
  if(had?.reviewed){if((had.contentHash||contentHash(had.excerpt))!==h){had.incoming={excerpt:x.excerpt,retrievedAt:x.retrievedAt,contentHash:h};changed++}continue}
  fresh.push({...x,contentHash:h})}
 const freshIds=new Set(fresh.map(x=>x.id));c.sources=[...c.sources.filter(x=>x.reviewed||!freshIds.has(x.id)),...fresh]
 // decided findings (approved, rejected, deferred) are kept; a new proposal is added only if its stable id is new
 const decided=c.findings.filter(f=>f.decision),known=new Set(decided.map(f=>f.id))
 c.findings=[...decided,...result.findings.map(f=>({...f,id:findingId(f)})).filter(f=>!known.has(f.id))];if(c.id!=='hapoel-tel-aviv'){c.status='review';c.gaps=result.gaps?.length?result.gaps:['Confirm the article describes the right club and sport.','Verify identity and dates against official sources.','Research squads, kits, goals, venues and supporter culture.','Build and verify native content adapters and English LIFE scenes.']}c.version++;j.status='completed';delete j.error;audit(s,'research.completed',c.id,`${result.sources.length} sources collected${changed?` · ${changed} reviewed source(s) changed and need re-review`:''}`,{actor:`research:${job.adapter||'wikipedia'}`})});return{ran:true,status:'completed'}}catch(e){await mutate(s=>{const j=s.jobs.find(j=>j.id===job.id);if(j?.lease===lease){j.status='failed';j.error=e instanceof Error?e.message:'Research failed';audit(s,'research.failed',j.clubId,j.error)}});return{ran:true,status:'failed'}}}
