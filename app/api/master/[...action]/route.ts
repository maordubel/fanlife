import {NextRequest,NextResponse} from 'next/server'
import {randomUUID} from 'node:crypto'
import {audit,mutate,readState,auditArchiveMonths,readAuditArchive} from '@/lib/master/store'
import {sameOrigin,cronAuthorized,text,slug,color} from '@/lib/master/request'
import {adminFromRequest} from '@/lib/master/admin'
import {actorOf} from '@/lib/master/audit-log'
import {runResearch} from '@/lib/master/research'
import {isPending} from '@/lib/master/researchMerge'
import {lightState} from '@/lib/master/lightState'
import {checkUpstream} from '@/lib/master/upstream'
import {clubSummary,allSummaries} from '@/lib/master/summary'
import {ADAPTER_LIST} from '@/lib/master/adapters'
import {validateDisplay,saveDraft,publish,revert,reset,changedKeys,emptyDisplay} from '@/lib/master/lifeDisplay'
import {readRuns,planClub,collectClub} from '@/lib/research/service'
import {runWorker} from '@/lib/research/worker'
import {loadProfile} from '@/lib/research/bundle'
import {exportOverlays,loadClubProfile,validateArchiveSource,saveArchiveSource,removeArchiveSource,ensureProfile} from '@/lib/research/profiles'
import {exportArchiveStaging} from '@/lib/research/staging'
import {isReadOnlyError,READ_ONLY_HINT} from '@/lib/research/paths'
import {runPipeline,recordPipeline,lastPipelineRuns,AUTOMATION_ACTOR} from '@/lib/master/automation'
import type {Club} from '@/lib/master/types'
export const dynamic='force-dynamic'
export const maxDuration=60
const json=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'no-store'}})
/** Audit F01: every action needs the owner's session (or, for `cron` only, the scheduler's secret). */
const unauthorized=()=>json({error:'Sign in to the control room first.',login:'/master/login'},401)
const PAGE=25
class Conflict extends Error{}
export async function GET(r:NextRequest,{params}:{params:{action:string[]}}){try{const a=params.action.join('/'),q=r.nextUrl.searchParams
 // the scheduler runs the whole autopilot: collect → stage → bring in (unreviewed) → fetch planned pages → process jobs.
 // The GitHub workflow sends CRON_SECRET; the owner may also run it from a signed-in browser.
 if(a==='cron'){const owner=adminFromRequest(r);if(!cronAuthorized(r)&&!owner)return json({error:'Invalid scheduler authorization'},401);const report=await runPipeline();await recordPipeline(report,owner?actorOf(owner):{actor:AUTOMATION_ACTOR,role:'scheduler'});return json(report)}
 // the archive runner pins the control room's source profiles before it collects (handoff: admin ⇄ runner)
 if(a==='research/profiles-export'){if(!cronAuthorized(r)&&!adminFromRequest(r))return json({error:'Invalid scheduler authorization'},401);return json(await exportOverlays())}
 if(!adminFromRequest(r))return unauthorized()
 if(a==='pipeline/runs')return json(await lastPipelineRuns(10))
 if(a==='archive/profile'){const p=await loadClubProfile(slug(q.get('club')));return p?json(p):json({error:'No research profile for this club.'},404)}
 if(a==='state')return json(await readState())
 // F21: what the admin refreshes — no evidence arrays, last 100 audit rows
 if(a==='state/light')return json(lightState(await readState()))
 if(a==='summary')return json(await allSummaries(await readState()))
 if(a==='adapters')return json(ADAPTER_LIST)
 if(a==='research/runs')return json(await readRuns(q.get('club')||undefined))
 if(a.startsWith('summary/')){const s=await readState(),c=s.clubs.find(c=>c.id===a.slice(8));if(!c)return json({error:'Club not found'},404);return json(await clubSummary(c))}
 // A17: findings and sources are paged and filtered on the server, never shipped whole
 if(a==='evidence'){const s=await readState(),c=s.clubs.find(c=>c.id===q.get('club'));if(!c)return json({error:'Club not found'},404);const kind=q.get('kind')==='sources'?'sources':'findings',state=q.get('state')||'pending',page=Math.max(1,Number(q.get('page'))||1);const rows=kind==='sources'?c.sources.filter(x=>state==='all'||(state==='pending'?!x.reviewed||!!x.incoming:x.reviewed)):c.findings.filter(f=>state==='all'||(state==='pending'?isPending(f):!!f.decision));return json({kind,state,page,pages:Math.max(1,Math.ceil(rows.length/PAGE)),total:rows.length,version:c.version,rows:rows.slice((page-1)*PAGE,page*PAGE)})}
 if(a==='audit'){const s=await readState(),club=q.get('club'),page=Math.max(1,Number(q.get('page'))||1),rows=[...s.audit].reverse().filter(x=>!club||x.target===club);return json({page,pages:Math.max(1,Math.ceil(rows.length/PAGE)),rows:rows.slice((page-1)*PAGE,page*PAGE)})}
 // F19: entries rotated out of control.json stay readable, one month at a time
 if(a==='audit/archive'){const m=q.get('month');return json(m?{month:m,rows:await readAuditArchive(m)}:{months:await auditArchiveMonths()})}
 if(a==='life-display')return json((await readState()).lifeDisplay||emptyDisplay())
 if(a==='export')return new NextResponse(JSON.stringify(await readState(),null,2),{headers:{'Content-Type':'application/json','Content-Disposition':'attachment; filename="fan-life-control.json"','Cache-Control':'no-store'}})
 return json({error:'Not found'},404)}catch(e){return json({error:e instanceof Error?e.message:'Operation failed'},400)}}
export async function POST(r:NextRequest,{params}:{params:{action:string[]}}){try{const who=adminFromRequest(r);if(!who)return unauthorized();sameOrigin(r);const by=actorOf(who),a=params.action.join('/');if(a==='upstream/check')return json(await checkUpstream(by));const raw=await r.text();if(raw.length>250000)throw new Error('Request too large.');const b=raw?JSON.parse(raw):{}
// F15: run the job the caller queued (by id); without an id, the first runnable job (the scheduler's behaviour)
if(a==='research/run')return json(await runResearch(typeof b.id==='string'&&b.id?b.id.slice(0,64):undefined))
if(a==='clubs/create'){const created=await mutate(s=>{const id=slug(b.id);if(s.clubs.some(c=>c.id===id))throw new Error('Club already exists.');if(s.clubs.length>=100)throw new Error('Registry limit reached.');const c:Club={id,name:text(b.name,'Name'),city:text(b.city,'City'),country:text(b.country,'Country'),initials:text(b.initials,'Initials',4),primary:color(b.primary),secondary:color(b.secondary),status:'research',version:1,gates:[],sources:[],findings:[],gaps:['Research file created. Engine connection missing: register the club and build a first pack.']};s.clubs.push(c);audit(s,'club.created',id,'Research file only — no registry entry or data provider yet.',by);return c});await ensureProfile(created.id);return json(created,201)}
// one bounded archive pass + staging export, from the Data tab
if(a==='archive/collect'){const id=slug(b.clubId),max=Math.min(20,Math.max(1,Number(b.maxRequests)||5)),out=await collectClub(id,{providerId:typeof b.providerId==='string'&&b.providerId?b.providerId:undefined,maxRequests:max,deadline:Date.now()+40000});await mutate(s=>{audit(s,'archive.collected',id,`${out.run.providers.join(', ')} · ${out.run.state} · ${out.run.counts.requests} requests · ${out.run.counts.documentsRead} documents (${out.run.counts.newDocuments} new, ${out.run.counts.changedDocuments} changed) · ${out.run.counts.recordsExtracted} records extracted`,by);return true});return json(out)}
if(a==='archive/export'){const id=slug(b.clubId),p=await loadClubProfile(id);if(!p)throw new Error('No research profile for this club.');return json(await exportArchiveStaging(id,p.archive))}
if(a==='archive/source/save'){const id=slug(b.clubId),v=validateArchiveSource(b.source);if(!v.ok)throw new Error(`Source rejected: ${v.errors.join('; ')}`);await saveArchiveSource(id,v.value);await mutate(s=>{audit(s,'archive.source.saved',id,`${v.value.providerId} · ${v.value.reader} · ${v.value.origin}`,{...by,after:JSON.stringify(v.value)});return true});return json(await loadClubProfile(id))}
if(a==='archive/source/remove'){const id=slug(b.clubId),pid=slug(b.providerId);await removeArchiveSource(id,pid);await mutate(s=>{audit(s,'archive.source.removed',id,pid,by);return true});return json(await loadClubProfile(id))}
if(a==='pipeline/run'){const clubs=b.clubId?[slug(b.clubId)]:undefined,report=await runPipeline({clubs,maxRequestsPerClub:6});await recordPipeline(report,by);return json(report)}
// publish every gate whose COMPILED data is playable, in one click — still passes the activation check, still the owner's click
if(a==='clubs/open-playable'){const pre=(await readState()).clubs.find(c=>c.id===b.id);if(!pre)throw new Error('Club not found.');const sum=await clubSummary(pre),gates=(sum.data?.gates||[]).filter(g=>g.dataPlayable).map(g=>g.number);const check=await clubSummary({...pre,gates});if(!gates.length||!check.activation.allowed)throw new Error(`Cannot open: ${(gates.length?check.activation.reasons:['No gate has playable compiled data yet.']).join(' ')}`)
 return json(await mutate(s=>{const c=s.clubs.find(c=>c.id===b.id);if(!c||c.version!==b.version)throw new Conflict('Club changed. Reload before saving.');const before=JSON.stringify({status:c.status,gates:c.gates});Object.assign(c,{status:'live',gates,version:c.version+1});audit(s,'club.opened-playable',c.id,`${gates.length} gates with playable data`,{...by,before,after:JSON.stringify({status:c.status,gates}),reason:typeof b.reason==='string'?b.reason.slice(0,500):undefined});return c}))}
if(a==='clubs/update'){
 // A02: going live is a capability check against the COMPILED data and the engine, never a club id
 if(!['research','review','live','paused'].includes(b.status))throw new Error('Invalid status.')
 if(!Array.isArray(b.gates)||b.gates.some((n:unknown)=>typeof n!=='number'||!Number.isInteger(n)||n<1||n>13))throw new Error('Invalid gate selection.')
 const gates=[...new Set(b.gates as number[])]
 if(b.status==='live'){const pre=(await readState()).clubs.find(c=>c.id===b.id);if(!pre)throw new Error('Club not found.');const sum=await clubSummary({...pre,gates});if(!sum.activation.allowed)throw new Error(`Cannot go live: ${sum.activation.reasons.join(' ')}`)}
 return json(await mutate(s=>{const c=s.clubs.find(c=>c.id===b.id);if(!c||c.version!==b.version)throw new Conflict('Club changed. Reload before saving.');const before=JSON.stringify({status:c.status,gates:c.gates,name:c.name,primary:c.primary,secondary:c.secondary});Object.assign(c,{name:text(b.name,'Name'),primary:color(b.primary),secondary:color(b.secondary),status:b.status,gates,version:c.version+1});audit(s,'club.updated',c.id,'',{...by,before,after:JSON.stringify({status:c.status,gates:c.gates,name:c.name,primary:c.primary,secondary:c.secondary}),reason:typeof b.reason==='string'?b.reason.slice(0,500):undefined});return c}))}
if(a==='research/create')return json(await mutate(s=>{const id=slug(b.clubId);if(!s.clubs.some(c=>c.id===id))throw new Error('Club not found.');if(s.jobs.some(j=>j.clubId===id&&['queued','running'].includes(j.status)))throw new Error('Research already queued for this club.');const adapter=ADAPTER_LIST.find(x=>x.id===(b.adapter||'wikipedia'));if(!adapter)throw new Error('Unknown research adapter.');const job={id:randomUUID(),clubId:id,query:adapter.needsQuery?text(b.query,'Query'):(typeof b.query==='string'&&b.query.trim()?b.query.trim().slice(0,200):adapter.label),title:b.title?text(b.title,'Article title'):undefined,adapter:adapter.id==='wikipedia'?undefined:adapter.id,status:'queued' as const,attempts:0,createdAt:new Date().toISOString()};s.jobs.push(job);audit(s,'research.queued',id,`${adapter.label} · job ${job.id.slice(0,8)}`,by);return job}),201);
if(a==='research/retry')return json(await mutate(s=>{const j=s.jobs.find(j=>j.id===b.id);if(!j||j.status!=='failed')throw new Error('Only failed jobs can be retried.');j.status='queued';j.attempts=0;delete j.error;audit(s,'research.retried',j.clubId,`job ${j.id.slice(0,8)}`,by);return j}));
// A11/A12: decisions by STABLE id, with approve / reject / defer, a reason and the before/after in the audit
if(a==='evidence/decide'||a==='evidence/approve')return json(await mutate(s=>{const c=s.clubs.find(c=>c.id===b.clubId);if(!c||c.version!==b.version)throw new Conflict('Club changed. Reload first — your selection is kept.');const decision=a==='evidence/approve'?'approved':b.decision;if(!['approved','rejected','deferred'].includes(decision))throw new Error('Choose approve, reject or defer.');const reason=typeof b.reason==='string'?b.reason.trim().slice(0,500):'';if(decision!=='approved'&&!reason)throw new Error('Give a short reason when rejecting or deferring.')
 if(b.kind==='source'){const src=c.sources.find(x=>x.id===b.id);if(!src)throw new Error('Source not found.');const before=src.reviewed?(src.incoming?'reviewed (content changed)':'reviewed'):'unreviewed';if(decision==='approved'){if(src.incoming){src.excerpt=src.incoming.excerpt;src.retrievedAt=src.incoming.retrievedAt;src.contentHash=src.incoming.contentHash;delete src.incoming}src.reviewed=true}else if(decision==='rejected'){c.sources=c.sources.filter(x=>x.id!==src.id)}c.version++;audit(s,`evidence.source.${decision}`,c.id,src.id,{...by,before,after:decision,reason:reason||undefined});return c}
 const f=c.findings.find(x=>x.id===b.id);if(!f)throw new Error('Finding not found — it may have been replaced. Reload.');if(f.superseded&&decision==='approved')throw new Error(`This finding was superseded: ${f.superseded.reason} Reject or defer it instead.`);if(decision==='approved'&&(!f.sources.length||f.sources.some(id=>!c.sources.some(x=>x.id===id&&x.reviewed&&!x.incoming))))throw new Error('Review every cited source first (including changed ones).')
 const before=f.decision||'pending';f.decision=decision;f.approved=decision==='approved';f.decidedAt=new Date().toISOString();f.reason=reason||undefined;c.version++;audit(s,`evidence.finding.${decision}`,c.id,`${f.field} · ${f.id}`,{...by,before,after:decision,reason:reason||undefined});return c}));
if(a==='research/plan')return json(await planClub(slug(b.clubId)));
if(a==='research/fetch'){const p=loadProfile(slug(b.clubId));if(!p)throw new Error('No research profile for this club.');return json(await runWorker(p,{max:Math.min(5,Math.max(1,Number(b.max)||3))}))}
if(a.startsWith('life-display/')){const op=a.slice(13);return json(await mutate(s=>{const cur=s.lifeDisplay||emptyDisplay(),now=new Date().toISOString();let next=cur
 if(op==='save-draft'){const v=validateDisplay(b.patch,{partial:true});if(!v.ok)throw new Error(`Rejected: ${v.errors.map(e=>`${e.key} (${e.problem})`).join(', ')}`);next=saveDraft(cur,v.value)}
 else if(op==='publish')next=publish(cur,now);else if(op==='revert')next=revert(cur,now);else if(op==='reset')next=reset(cur,now);else throw new Error('Unknown display operation.')
 const keys=op==='save-draft'?changedKeys(cur.draft||cur.live,next.draft!):changedKeys(cur.live,next.live);s.lifeDisplay=next;audit(s,`life-display.${op}`,'global',keys.join(', ')||'no change',{...by,before:JSON.stringify(op==='save-draft'?cur.draft||cur.live:cur.live),after:JSON.stringify(op==='save-draft'?next.draft:next.live)});return next}))}
return json({error:'Unknown operation'},404)}catch(e){if(isReadOnlyError(e))return json({error:READ_ONLY_HINT},503);return json({error:e instanceof Error?e.message:'Operation failed'},e instanceof Conflict?409:400)}}
