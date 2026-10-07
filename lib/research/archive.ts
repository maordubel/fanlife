import {createHash,randomUUID} from 'node:crypto'
import {appendFile,mkdir} from 'node:fs/promises'
import path from 'node:path'
import {politeFetch,type FetchLike} from './fetcher'
import {dir,readJson,saveSnapshot,writeJson} from './store'
import {archiveParserFor,type ArchiveObservation} from './parsers'
import {canonicalJson} from './canonical'
import {RESEARCH_SCHEMA,type ArchiveCheckpoint,type ArchiveDiagnostic,type ArchiveDoc,type ArchiveRun,type ArchiveSource,type EndpointStatus,type SourceProfile} from './contract'

/**
 * The historical-archive collector (no AI, no OCR, no translation). Reads PUBLIC listings within a budget and keeps:
 *   archive-docs.json        one row per document, keyed provider:collection:id (posts 7 and pages 7 are two rows)
 *   archive-checkpoints.json where each listing stopped — committed only after its documents are stored
 *   archive-endpoints.json   availability per endpoint, not per site (a 403 on one route is not a dead site)
 *   runs/<runId>/run.json · resources.jsonl · diagnostics.jsonl · observations.jsonl
 * A document is not history. Until a parser written against stored fixtures exists for a source, its documents are
 * `needs-parser` and nothing is extracted. A listing that reached its last page is `listed` — never "complete".
 */
const files=(club:string)=>({docs:path.join(dir(club),'archive-docs.json'),cps:path.join(dir(club),'archive-checkpoints.json'),eps:path.join(dir(club),'archive-endpoints.json'),runs:path.join(dir(club),'archive-runs.json'),obs:path.join(dir(club),'archive-observations.json'),tax:path.join(dir(club),'archive-taxonomy.json')})
export const readArchiveDocs=(club:string)=>readJson<Record<string,ArchiveDoc>>(files(club).docs,{})
export const readCheckpoints=(club:string)=>readJson<Record<string,ArchiveCheckpoint>>(files(club).cps,{})
export const readEndpoints=(club:string)=>readJson<Record<string,EndpointStatus>>(files(club).eps,{})
export const readArchiveRuns=(club:string)=>readJson<ArchiveRun[]>(files(club).runs,[])
/**
 * An observation is tied to the document VERSION it came from (`contentHash`, `runId`). When a new version of that
 * document no longer produces it, it is retired with a reason — kept as history, never silently left active (audit F07).
 */
export type StoredObservation=ArchiveObservation&{providerId:string;contentHash?:string;runId?:string;retired?:{at:string;runId:string;reason:string}|null;history?:{at:string;runId:string;change:'retired'|'restored';reason:string}[]}
export const readObservations=(club:string)=>readJson<Record<string,StoredObservation>>(files(club).obs,{})
export const activeObservations=(obs:Record<string,StoredObservation>)=>Object.values(obs).filter(o=>!o.retired)
const readTaxonomy=(club:string)=>readJson<Record<string,Record<string,string>>>(files(club).tax,{})

const sha=(s:string|Buffer)=>createHash('sha256').update(s).digest('hex')
/**
 * What defines "the same listing": change any of these and the checkpoint starts again from page 1.
 * Canonical JSON (sorted keys; seeds and prefixes as sets), and it includes the seeds and the parser's version —
 * a new seed or a new parser is a new listing (audit F16).
 */
export const fingerprint=(src:ArchiveSource,collection:string)=>sha(canonicalJson({p:src.providerId,o:src.origin,c:collection,pp:src.budget.perPage,a:[...src.allowedPathPrefixes].sort(),seeds:collection==='html'?[...new Set(src.seeds||[])].sort():null,f:src.follow||null,parser:src.parserId,parserVersion:archiveParserFor(src.parserId)?.id??null,v:RESEARCH_SCHEMA})).slice(0,16)
const asFetchSource=(src:ArchiveSource):SourceProfile=>({providerId:src.providerId,familyId:src.familyId,origin:src.origin,adapterVersion:src.parserId||'reader-only',paths:{},capabilities:[],rate:{minIntervalMs:src.budget.minDelayMs,maxBytes:src.budget.maxResponseBytes,timeoutMs:src.budget.timeoutMs},scope:src.role})
export const allowedPath=(src:ArchiveSource,p:string)=>src.allowedPathPrefixes.some(a=>p.startsWith(a))
const decode=(s:string)=>s.replace(/<[^>]*>/g,'').replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Number(n))).replace(/&#x([0-9a-f]+);/gi,(_,n)=>String.fromCodePoint(parseInt(n,16))).replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#039;|&apos;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&nbsp;/g,' ').replace(/\s+/g,' ').trim()

type Ctx={deadline?:number;byDoc?:Map<string,Set<string>>;club:string;runId:string;now:()=>Date;fetchImpl?:FetchLike;budget:number;requests:number;diag:ArchiveDiagnostic[];resources:unknown[];docs:Record<string,ArchiveDoc>;cps:Record<string,ArchiveCheckpoint>;eps:Record<string,EndpointStatus>;counts:ArchiveRun['counts'];obs:Record<string,StoredObservation>;newObs:ArchiveObservation[];tax:Record<string,Record<string,string>>}
function endpoint(ctx:Ctx,src:ArchiveSource,ep:string,state:EndpointStatus['state'],status:number,reason:string|null){ctx.eps[`${src.providerId}:${ep}`]={endpoint:ep,providerId:src.providerId,state,status,reason,checkedAt:ctx.now().toISOString()}}
type Meta={slug:string|null;categories:number[];parent:number|null}
async function keep(ctx:Ctx,src:ArchiveSource,collection:string,id:string,url:string,title:string|null,content:string,published:string|null,modified:string|null,raw:Buffer|null,meta:Meta={slug:null,categories:[],parent:null}){
 const key=`${src.providerId}:${collection}:${id}`,hash=sha(`${title||''}\n${content}`),prev=ctx.docs[key],at=ctx.now().toISOString()
 let snapshot:string|null=prev?.snapshot||null
 if(raw&&src.retention.rawBody==='private-copy'){const m=await saveSnapshot(ctx.club,{hash:sha(raw),url,fetchedAt:at,status:200,contentType:null,bytes:raw.length,etag:null,lastModified:null},raw);snapshot=m.hash}
 // parse while the body is in memory (retention may be metadata-only): only with a registered parser, and only when
 // the taxonomy it classifies by was readable — otherwise the document waits, unparsed, for the next run
 const parser=archiveParserFor(src.parserId),tax=ctx.tax[src.providerId]
 let parse:ArchiveDoc['parse']='needs-parser'
 if(parser&&(!parser.needsTaxonomy||tax)){
  const r=parser.parse({url,title,html:content,providerKey:key,meta:{slug:meta.slug,parent:meta.parent,categories:meta.categories.map(c=>tax?.[String(c)]).filter((x):x is string=>!!x)}})
  const fresh=new Set(r.observations.map(o=>o.id))
  for(const o of r.observations){
   const had=ctx.obs[o.id],history=[...(had?.history||[])]
   if(had?.retired)history.push({at,runId:ctx.runId,change:'restored',reason:`produced again by document version ${hash.slice(0,12)}`})
   ctx.obs[o.id]={...o,providerId:src.providerId,contentHash:hash,runId:ctx.runId,retired:null,...(history.length?{history:history.slice(-20)}:{})};ctx.newObs.push(o)}
  // the active set for THIS document is replaced: what the new version no longer yields is retired, with the reason
  if(!ctx.byDoc){ctx.byDoc=new Map();for(const o of Object.values(ctx.obs)){const s=ctx.byDoc.get(o.providerRecordKey)||new Set<string>();s.add(o.id);ctx.byDoc.set(o.providerRecordKey,s)}}
  const mine=ctx.byDoc.get(key)||new Set<string>();for(const id of fresh)mine.add(id);ctx.byDoc.set(key,mine)
  for(const old of [...mine].map(id=>ctx.obs[id]!).filter(Boolean))if(!old.retired&&!fresh.has(old.id)){
   const reason=prev&&prev.contentHash!==hash?`document changed (${prev.contentHash.slice(0,12)} → ${hash.slice(0,12)}); ${parser.id} no longer produces this observation`:`${parser.id} no longer produces this observation from document version ${hash.slice(0,12)}`
   ctx.obs[old.id]={...old,retired:{at,runId:ctx.runId,reason},history:[...(old.history||[]),{at,runId:ctx.runId,change:'retired' as const,reason}].slice(-20)}
  }
  ctx.counts.recordsExtracted+=r.observations.length;parse='parsed'
 }
 ctx.docs[key]={providerKey:key,providerId:src.providerId,collection,url,title,contentHash:hash,bytes:Buffer.byteLength(content),publishedAsReported:published,modifiedAsReported:modified,retrievedAt:at,firstRunId:prev?.firstRunId||ctx.runId,lastRunId:ctx.runId,changed:!!prev&&prev.contentHash!==hash,snapshot,parse}
 ctx.counts.documentsRead++;if(!prev)ctx.counts.newDocuments++;else if(prev.contentHash!==hash)ctx.counts.changedDocuments++;else ctx.counts.unchangedDocuments++
}
/** The site's own category list (id → slug), read once per source when its parser classifies by it. */
async function readTaxonomy_(ctx:Ctx,src:ArchiveSource){
 if(ctx.tax[src.providerId]||!archiveParserFor(src.parserId)?.needsTaxonomy||!more(ctx))return
 const ep='/wp-json/wp/v2/categories',u=new URL(ep,src.origin);u.searchParams.set('per_page','100');u.searchParams.set('_fields','id,slug')
 const out=await get(ctx,src,u.href)
 if(out.kind!=='fetched'||!/json/i.test(out.meta.contentType||'')){endpoint(ctx,src,ep,out.kind==='refused'?(out.status===404?'not-found':'blocked'):'error',out.kind==='refused'?out.status:0,'reason' in out?out.reason:'not json');ctx.diag.push({code:'SOURCE_BLOCKED',providerId:src.providerId,url:u.href,message:'Categories unreadable — documents are kept and parsed on a later run.'});return}
 try{const rows=JSON.parse(out.body.toString('utf8')) as {id:number;slug:string}[];ctx.tax[src.providerId]=Object.fromEntries(rows.filter(r=>Number.isInteger(r.id)&&typeof r.slug==='string').map(r=>[String(r.id),decodeURIComponent(r.slug)]));endpoint(ctx,src,ep,'ok',200,null)}catch{endpoint(ctx,src,ep,'schema-changed',200,'categories not a list')}
}
/** One fetch, with the outcome turned into checkpoint/endpoint language. Never retried within a run. */
/** Budget left AND time left: a web request must answer before the platform cuts it off; the checkpoint resumes next run. */
const more=(ctx:Ctx)=>ctx.requests<ctx.budget&&!(ctx.deadline&&Date.now()>ctx.deadline)
async function get(ctx:Ctx,src:ArchiveSource,url:string){ctx.requests++;const out=await politeFetch(url,asFetchSource(src),null,ctx.fetchImpl,()=>ctx.now().getTime());ctx.resources.push({url,at:ctx.now().toISOString(),outcome:out.kind,...(out.kind==='fetched'?{status:200,hash:out.meta.hash,bytes:out.meta.bytes,contentType:out.meta.contentType}:out.kind==='refused'?{status:out.status,reason:out.reason}:'reason' in out?{reason:out.reason}:{})});return out}

async function readWordPress(ctx:Ctx,src:ArchiveSource,collection:'posts'|'pages'){
 const ep=`/wp-json/wp/v2/${collection}`,fp=fingerprint(src,collection),k=`${src.providerId}:${collection}`
 let cp=ctx.cps[k]
 if(cp&&cp.queryFingerprint!==fp){ctx.diag.push({code:'FINGERPRINT_CHANGED',providerId:src.providerId,url:null,message:`${collection}: the listing definition changed — starting again from page 1.`});cp=undefined as never}
 cp=cp||{schemaVersion:RESEARCH_SCHEMA,providerId:src.providerId,collection,queryFingerprint:fp,parserVersion:src.parserId,nextPage:1,lastCommittedPage:0,observedTotalDocuments:null,observedTotalPages:null,perPage:src.budget.perPage,state:'new',updatedAt:ctx.now().toISOString(),lastError:null}
 if(cp.state==='listed'||cp.state==='blocked')cp={...cp,nextPage:cp.state==='listed'?1:cp.nextPage,state:'running'} // a new pass re-reads for changes; a block is re-checked once
 if(!allowedPath(src,ep)){ctx.diag.push({code:'PATH_NOT_ALLOWED',providerId:src.providerId,url:ep,message:'The REST path is not in allowedPathPrefixes.'});return}
 await readTaxonomy_(ctx,src)
 while(more(ctx)){
  if(cp.observedTotalPages!==null&&cp.nextPage>cp.observedTotalPages){cp.state='listed';break}
  const u=new URL(ep,src.origin);u.searchParams.set('per_page',String(src.budget.perPage));u.searchParams.set('page',String(cp.nextPage));u.searchParams.set('orderby','id');u.searchParams.set('order','asc');u.searchParams.set('_fields','id,link,slug,title,content,date_gmt,modified_gmt,type,parent,categories')
  const out=await get(ctx,src,u.href)
  if(out.kind==='refused'){const nf=out.status===404,state=nf?'not-found':'blocked';endpoint(ctx,src,ep,state,out.status,out.reason);ctx.diag.push({code:nf?'RESOURCE_NOT_FOUND':'SOURCE_BLOCKED',providerId:src.providerId,url:u.href,message:nf?out.reason:`${out.reason}. Who refused (the source, or this server's network) is recorded as unknown until checked from another network.`});cp.state='blocked';cp.lastError=out.reason;ctx.counts.blockedEndpoints++;break}
  if(out.kind==='retry'||out.kind==='error'){
   // WordPress answers a page past the end with 400 rest_post_invalid_page_number: the listing ended
   if(/HTTP 400/.test(out.reason)&&cp.lastCommittedPage>0){cp.state='listed';break}
   endpoint(ctx,src,ep,'retry-later',0,out.reason);ctx.diag.push({code:'RETRY_LATER',providerId:src.providerId,url:u.href,message:out.reason});cp.state='retry-later';cp.lastError=out.reason;break}
  if(out.kind==='unchanged'){cp.lastCommittedPage=cp.nextPage;cp.nextPage++;continue}
  const ct=out.meta.contentType||''
  if(!/json/i.test(ct)){endpoint(ctx,src,ep,'not-json',200,`content-type ${ct||'missing'}`);ctx.diag.push({code:'SOURCE_NOT_JSON',providerId:src.providerId,url:u.href,message:'Expected JSON, got a web page (a login or challenge page is not "no records").'});cp.state='not-json';cp.lastError='not json';ctx.counts.blockedEndpoints++;break}
  let rows:unknown;try{rows=JSON.parse(out.body.toString('utf8'))}catch{rows=null}
  const bad=!Array.isArray(rows)||rows.some(r=>!r||typeof r!=='object'||!Number.isInteger((r as Record<string,unknown>).id)||typeof (r as Record<string,unknown>).link!=='string')
  if(bad){endpoint(ctx,src,ep,'schema-changed',200,'rows lack id/link');ctx.diag.push({code:'SOURCE_SCHEMA_CHANGED',providerId:src.providerId,url:u.href,message:'Rows are not WordPress documents with id and link — nothing stored from this page.'});cp.state='schema-changed';cp.lastError='schema';break}
  endpoint(ctx,src,ep,'ok',200,null)
  if(out.paging?.total!==null&&out.paging?.total!==undefined){if(cp.observedTotalDocuments!==null&&cp.observedTotalDocuments!==out.paging.total)ctx.diag.push({code:'SOURCE_SCHEMA_CHANGED',providerId:src.providerId,url:null,message:`${collection}: the site now reports ${out.paging.total} documents (was ${cp.observedTotalDocuments}) — pages may have shifted; duplicates are merged by id.`});cp.observedTotalDocuments=out.paging.total}
  if(out.paging?.totalPages!==null&&out.paging?.totalPages!==undefined)cp.observedTotalPages=out.paging.totalPages
  for(const r of rows as Record<string,unknown>[]){
   const link=String(r.link);let lu:URL|null=null;try{lu=new URL(link)}catch{}
   if(!lu||lu.host!==new URL(src.origin).host)ctx.diag.push({code:'OFF_ORIGIN_LINK',providerId:src.providerId,url:link,message:'Document links outside the profiled origin; kept as metadata only.'})
   const t=(r.title as {rendered?:string}|undefined)?.rendered,c=(r.content as {rendered?:string}|undefined)?.rendered||''
   await keep(ctx,src,collection,String(r.id),link,t?decode(t):null,c,typeof r.date_gmt==='string'?r.date_gmt:null,typeof r.modified_gmt==='string'?r.modified_gmt:null,src.retention.rawBody==='private-copy'?Buffer.from(JSON.stringify(r)):null,{slug:typeof r.slug==='string'?r.slug:null,categories:Array.isArray(r.categories)?(r.categories as unknown[]).filter((x):x is number=>Number.isInteger(x)):[],parent:Number.isInteger(r.parent)?r.parent as number:null})
  }
  // commit only after the page's documents are in memory for the atomic write below
  cp.lastCommittedPage=cp.nextPage;cp.nextPage++;cp.state='running';cp.lastError=null
  if(!(rows as unknown[]).length){cp.state='listed';break}
 }
 if(cp.state==='running')cp.state='partial_budget'
 cp.updatedAt=ctx.now().toISOString();ctx.cps[k]=cp
}

const hrefs=(html:string)=>[...html.matchAll(/href\s*=\s*["']([^"'#]+)["']/gi)].map(m=>m[1]!)
async function readHtml(ctx:Ctx,src:ArchiveSource){
 const k=`${src.providerId}:html`,fp=fingerprint(src,'html')
 let cp=ctx.cps[k]
 if(cp&&cp.queryFingerprint!==fp){ctx.diag.push({code:'FINGERPRINT_CHANGED',providerId:src.providerId,url:null,message:'html: seeds or follow rule changed — starting again.'});cp=undefined as never}
 cp=cp||{schemaVersion:RESEARCH_SCHEMA,providerId:src.providerId,collection:'html',queryFingerprint:fp,parserVersion:src.parserId,nextPage:0,lastCommittedPage:0,observedTotalDocuments:null,observedTotalPages:null,perPage:1,queue:[...(src.seeds||[])],seen:[],state:'new',updatedAt:ctx.now().toISOString(),lastError:null}
 if(cp.state==='listed'){cp.queue=[...(src.seeds||[])];cp.seen=[];cp.state='running'}
 const follow=src.follow?new RegExp(src.follow):null
 while(more(ctx)&&cp.queue!.length){
  const p=cp.queue![0]!
  if(!allowedPath(src,p)){cp.queue!.shift();ctx.diag.push({code:'PATH_NOT_ALLOWED',providerId:src.providerId,url:p,message:'Not under allowedPathPrefixes; not requested.'});continue}
  const url=new URL(p,src.origin).href,out=await get(ctx,src,url)
  if(out.kind==='refused'){cp.queue!.shift();cp.seen!.push(p);const nf=out.status===404;endpoint(ctx,src,p,nf?'not-found':'blocked',out.status,out.reason);ctx.diag.push({code:nf?'RESOURCE_NOT_FOUND':'SOURCE_BLOCKED',providerId:src.providerId,url,message:nf?out.reason:`${out.reason}. Who refused (the source, or this server's network) is recorded as unknown until checked from another network.`});if(!nf){ctx.counts.blockedEndpoints++;if((src.seeds||[]).includes(p)){cp.state='blocked';cp.lastError=out.reason;break}}continue}
  if(out.kind==='retry'||out.kind==='error'){endpoint(ctx,src,p,'retry-later',0,out.reason);ctx.diag.push({code:'RETRY_LATER',providerId:src.providerId,url,message:out.reason});cp.state='retry-later';cp.lastError=out.reason;break}
  cp.queue!.shift();cp.seen!.push(p)
  if(out.kind==='unchanged')continue
  endpoint(ctx,src,p,'ok',200,null)
  const html=out.body.toString('utf8'),title=html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]
  await keep(ctx,src,'html',p,url,title?decode(title):null,html,null,out.meta.lastModified,src.retention.rawBody==='private-copy'?out.body:null)
  if(follow)for(const h of hrefs(html)){let u:URL;try{u=new URL(h,url)}catch{continue};if(u.origin!==src.origin)continue;const q=u.pathname+u.search;if(follow.test(q)&&allowedPath(src,q)&&!cp.seen!.includes(q)&&!cp.queue!.includes(q))cp.queue!.push(q)}
 }
 cp.observedTotalDocuments=cp.seen!.length+cp.queue!.length
 if(cp.state==='running'||cp.state==='new')cp.state=cp.queue!.length?'partial_budget':'listed'
 cp.updatedAt=ctx.now().toISOString();ctx.cps[k]=cp
}

/** One bounded collection pass for a club (optionally one source). Resumes from the stored checkpoints. */
export async function collectArchive(clubId:string,sources:ArchiveSource[],{maxRequests=10,providerId,now=()=>new Date(),fetchImpl,deadline}:{maxRequests?:number;providerId?:string;now?:()=>Date;fetchImpl?:FetchLike;deadline?:number}={}):Promise<ArchiveRun>{
 const chosen=sources.filter(s=>!providerId||s.providerId===providerId)
 if(providerId&&!chosen.length)throw new Error(`No archive source "${providerId}" in this club's profile.`)
 return serialRun(clubId,async()=>{
  const f=files(clubId),runId=`${now().toISOString().replace(/[:.]/g,'-')}-${randomUUID().slice(0,6)}`,startedAt=now().toISOString()
  const ctx:Ctx={deadline,club:clubId,runId,now,fetchImpl,budget:Math.max(1,Math.min(200,maxRequests)),requests:0,diag:[],resources:[],docs:await readArchiveDocs(clubId),cps:await readCheckpoints(clubId),eps:await readEndpoints(clubId),counts:{requests:0,documentsRead:0,newDocuments:0,changedDocuments:0,unchangedDocuments:0,recordsExtracted:0,blockedEndpoints:0,budgetLeft:0},obs:await readObservations(clubId),newObs:[],tax:await readTaxonomy(clubId)}
  // share the budget fairly: every listing gets a turn, and no source exceeds its own per-run cap
  const total=ctx.budget,tasks=chosen.flatMap(src=>src.reader==='wordpress-rest'?(src.collections||[]).map(c=>({src,c:c as 'posts'|'pages'|'html'})):[{src,c:'html' as const}])
  const per=Math.max(1,Math.floor(total/Math.max(1,tasks.length)))
  for(const t of tasks){if(deadline&&Date.now()>deadline)break;ctx.budget=Math.min(total,ctx.requests+Math.min(per,t.src.budget.maxRequests));if(t.c==='html')await readHtml(ctx,t.src);else await readWordPress(ctx,t.src,t.c)}
  ctx.budget=total
  for(const src of chosen)if(!archiveParserFor(src.parserId))ctx.diag.push({code:'NEEDS_PARSER',providerId:src.providerId,url:null,message:`No tested parser for ${src.publisher} yet${src.parserId?` (${src.parserId} is planned)`:''}: documents are kept, nothing is extracted.`})
  ctx.counts.requests=ctx.requests;ctx.counts.budgetLeft=Math.max(0,Math.min(200,maxRequests)-ctx.requests)
  const states=chosen.flatMap(s=>s.reader==='wordpress-rest'?(s.collections||[]).map(c=>ctx.cps[`${s.providerId}:${c}`]?.state):[ctx.cps[`${s.providerId}:html`]?.state])
  const state:ArchiveRun['state']=!chosen.length?'nothing-to-do':states.some(s=>s==='partial_budget'||s==='retry-later')?'partial_budget':states.every(s=>s==='blocked'||s==='not-json')?'blocked':states.every(s=>s==='listed')?'listed':states.some(s=>s==='schema-changed')?'failed':'partial_budget'
  if(states.some(s=>s==='partial_budget'))ctx.diag.push({code:'BUDGET_EXHAUSTED',providerId:'*',url:null,message:'Budget used; the next run resumes from the checkpoint.'})
  const run:ArchiveRun={schemaVersion:RESEARCH_SCHEMA,id:runId,clubId,startedAt,finishedAt:now().toISOString(),providers:chosen.map(s=>s.providerId),state,counts:ctx.counts,diagnostics:ctx.diag,completeArchiveClaim:false,approvedForProduction:0}
  // durable order: documents first, then checkpoints, then the run record — a crash in between re-reads, never skips
  await writeJson(f.docs,ctx.docs);await writeJson(f.obs,ctx.obs);await writeJson(f.tax,ctx.tax);await writeJson(f.cps,ctx.cps);await writeJson(f.eps,ctx.eps)
  const rd=path.join(dir(clubId),'runs',runId);await mkdir(rd,{recursive:true})
  await writeJson(path.join(rd,'run.json'),run)
  await appendFile(path.join(rd,'resources.jsonl'),ctx.resources.map(r=>JSON.stringify(r)).join('\n')+(ctx.resources.length?'\n':''))
  await appendFile(path.join(rd,'diagnostics.jsonl'),ctx.diag.map(r=>JSON.stringify(r)).join('\n')+(ctx.diag.length?'\n':''))
  await appendFile(path.join(rd,'observations.jsonl'),ctx.newObs.map(o=>JSON.stringify(o)).join('\n')+(ctx.newObs.length?'\n':''))
  const runs=await readArchiveRuns(clubId);await writeJson(f.runs,[...runs,{...run,diagnostics:run.diagnostics.slice(0,50)}].slice(-100))
  return run
 })
}
// one collection per club at a time inside this process (the checkpoint file is the lock between processes)
const running=new Map<string,Promise<unknown>>()
function serialRun<T>(club:string,fn:()=>Promise<T>):Promise<T>{const prev=running.get(club)||Promise.resolve();const op=prev.then(fn,fn);running.set(club,op.catch(()=>undefined));return op}

/** What the control room shows per source: listing progress, endpoint health, documents kept, parser state. */
export async function archiveStatus(clubId:string,sources:ArchiveSource[]){
 const [docs,cps,eps,runs,obs]=await Promise.all([readArchiveDocs(clubId),readCheckpoints(clubId),readEndpoints(clubId),readArchiveRuns(clubId),readObservations(clubId)])
 const allObs=activeObservations(obs)
 const all=Object.values(docs)
 return {
  sources:sources.map(s=>({providerId:s.providerId,publisher:s.publisher,reader:s.reader,role:s.role,origin:s.origin,familyId:s.familyId,parser:archiveParserFor(s.parserId)?s.parserId:null,plannedParser:s.parserId,knownLimits:s.knownLimits||[],
   listings:(s.reader==='wordpress-rest'?(s.collections||[]):['html']).map(c=>{const cp=cps[`${s.providerId}:${c}`];return {collection:c,state:cp?.state||'new',pagesRead:cp?.lastCommittedPage||0,observedTotalDocuments:cp?.observedTotalDocuments??null,observedTotalPages:cp?.observedTotalPages??null,queue:cp?.queue?.length??null,lastError:cp?.lastError||null}}),
   documents:all.filter(d=>d.providerId===s.providerId).length,observations:allObs.filter(o=>o.providerId===s.providerId).length,changed:all.filter(d=>d.providerId===s.providerId&&d.changed).length,
   endpoints:Object.values(eps).filter(e=>e.providerId===s.providerId)})),
  documents:all.length,observations:allObs.length,retiredObservations:Object.values(obs).length-allObs.length,observationsByType:allObs.reduce((a:Record<string,number>,o)=>{a[o.recordType]=(a[o.recordType]||0)+1;return a},{}),needsParser:all.filter(d=>d.parse==='needs-parser').length,lastRun:runs.at(-1)||null,runs:runs.slice(-10).reverse()
 }
}
