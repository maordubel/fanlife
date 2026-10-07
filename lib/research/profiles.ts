import {existsSync,readFileSync,readdirSync} from 'node:fs'
import path from 'node:path'
import {RESEARCH_SCHEMA,type ArchiveSource,type ClubProfile} from './contract'
import {dir,readJson,root,serial,writeJson} from './store'
import {hostProblem} from './netguard'

/**
 * Research profiles come from two places and are read as one:
 *  - `research-profiles/<club>.json` in the repository (reviewed, shipped with the code)
 *  - `<data dir>/research/<club>/profile.json` written from the control room (a new club, a new source)
 * The control-room copy wins per providerId, so an owner can add or retune a source without a deploy.
 * A profile is configuration: it never approves anything and never opens a club.
 */
export type FullProfile=ClubProfile&{archive:ArchiveSource[];origin:{repo:boolean;admin:boolean}}
const REPO='research-profiles'
const empty=(clubId:string):ClubProfile&{archive:ArchiveSource[]}=>({schemaVersion:RESEARCH_SCHEMA,clubId,sport:'football',contentLocale:'en',snapshotAsOf:new Date().toISOString().slice(0,10),desiredGates:[],priorityMatchIds:[],sources:[],archive:[]})
function repoProfile(clubId:string,cwd=process.cwd()){const p=path.join(cwd,REPO,`${clubId}.json`);if(!existsSync(p))return null;const v=JSON.parse(readFileSync(p,'utf8'));if(v.clubId!==clubId)throw new Error('PROFILE_CLUB_MISMATCH');return {...empty(clubId),...v,archive:v.archive||[],sources:v.sources||[]} as ClubProfile&{archive:ArchiveSource[]}}
const overlayFile=(clubId:string)=>path.join(dir(clubId),'profile.json')

/**
 * Whether the repository's profile dataset is present on this server at all. A deployment that did not ship
 * `research-profiles/` (audit F03: the API route's trace missed it) must say so — "no profile" would read as zero data.
 */
export const profilesShipped=(cwd=process.cwd())=>existsSync(path.join(cwd,REPO))

export async function loadClubProfile(clubId:string,cwd=process.cwd()):Promise<FullProfile|null>{
 const repo=repoProfile(clubId,cwd),admin=await readJson<(ClubProfile&{archive:ArchiveSource[]})|null>(overlayFile(clubId),null)
 if(!repo&&!admin)return null
 const base=repo||empty(clubId)
 const byId=<T extends {providerId:string}>(a:T[],b:T[])=>[...a.filter(x=>!b.some(y=>y.providerId===x.providerId)),...b]
 return {...base,sources:byId(base.sources,admin?.sources||[]),archive:byId(base.archive,admin?.archive||[]),origin:{repo:!!repo,admin:!!admin}}
}
/** Every club that has a profile, in the repository or written from the control room. */
export function profiledClubs(cwd=process.cwd()):string[]{
 const ids=new Set<string>()
 if(existsSync(path.join(cwd,REPO)))for(const f of readdirSync(path.join(cwd,REPO)))if(f.endsWith('.json'))ids.add(f.slice(0,-5))
 if(existsSync(root()))for(const d of readdirSync(root()))if(existsSync(path.join(root(),d,'profile.json')))ids.add(d)
 return [...ids].sort()
}

const ORIGIN=/^https:\/\/[a-z0-9.-]+(?::\d+)?$/i,ID=/^[a-z][a-z0-9-]{1,60}$/
/** Strict: a source the collector cannot run safely is refused here, with the field named. */
export function validateArchiveSource(input:unknown):{ok:true;value:ArchiveSource}|{ok:false;errors:string[]}{
 const s=(input||{}) as Record<string,unknown>,errors:string[]=[]
 const str=(k:string,max=200)=>{const v=s[k];if(typeof v!=='string'||!v.trim()||v.length>max){errors.push(`${k} is required`);return ''}return v.trim()}
 const providerId=str('providerId',61),familyId=str('familyId',80),publisher=str('publisher'),origin=str('origin',200),locale=str('locale',20)
 if(providerId&&!ID.test(providerId))errors.push('providerId: lowercase letters, digits and hyphens')
 if(familyId&&!ID.test(familyId))errors.push('familyId: lowercase letters, digits and hyphens')
 if(origin&&!ORIGIN.test(origin))errors.push('origin must be https://host with no path')
 else if(origin){let host='';try{host=new URL(origin).hostname}catch{errors.push('origin is not a valid URL')}
  // F10: a public web source only — never loopback, private, link-local, metadata or a local name
  const why=host?hostProblem(host):null;if(why)errors.push(`origin: ${why}`)}
 const reader=s.reader==='wordpress-rest'||s.reader==='html'?s.reader:(errors.push('reader must be wordpress-rest or html'),'html')
 const roles=['results','people','club-history','fan-culture','items','mixed'],role=roles.includes(String(s.role))?s.role as ArchiveSource['role']:(errors.push('role is not one of '+roles.join(', ')),'mixed')
 const list=(k:string)=>Array.isArray(s[k])?(s[k] as unknown[]).map(String).map(x=>x.trim()).filter(Boolean):typeof s[k]==='string'?String(s[k]).split(/[\n,]/).map(x=>x.trim()).filter(Boolean):[]
 const collections=list('collections').filter(c=>c==='posts'||c==='pages') as ('posts'|'pages')[]
 const seeds=list('seeds'),prefixes=list('allowedPathPrefixes')
 if(reader==='wordpress-rest'&&!collections.length)errors.push('collections: choose posts and/or pages')
 if(reader==='html'&&!seeds.length)errors.push('seeds: at least one approved index page')
 for(const p of [...seeds,...prefixes])if(!p.startsWith('/'))errors.push(`path "${p}" must start with /`)
 const allowed=reader==='wordpress-rest'?[...new Set(['/wp-json/wp/v2/',...prefixes])]:prefixes.length?prefixes:seeds
 for(const seed of seeds)if(!allowed.some(a=>seed.startsWith(a)))errors.push(`seed ${seed} is outside allowedPathPrefixes`)
 let follow:string|undefined
 if(typeof s.follow==='string'&&s.follow.trim()){try{new RegExp(s.follow);follow=s.follow.trim()}catch{errors.push('follow is not a valid pattern')}}
 const n=(k:string,d:number,lo:number,hi:number)=>{const v=Number((s.budget as Record<string,unknown>|undefined)?.[k]??d);if(!Number.isFinite(v)||v<lo||v>hi){errors.push(`budget.${k} must be ${lo}–${hi}`);return d}return v}
 const budget={perPage:n('perPage',25,1,100),maxRequests:n('maxRequests',10,1,200),minDelayMs:n('minDelayMs',3000,1000,60000),timeoutMs:n('timeoutMs',20000,1000,60000),maxResponseBytes:n('maxResponseBytes',5242880,10000,20971520)}
 const parserId=typeof s.parserId==='string'&&s.parserId.trim()?s.parserId.trim():null
 if(errors.length)return {ok:false,errors}
 return {ok:true,value:{providerId,familyId,publisher,reader,origin:origin.replace(/\/$/,''),role,locale,...(reader==='wordpress-rest'?{collections}:{seeds,...(follow?{follow}:{})}),allowedPathPrefixes:allowed,parserId,budget,retention:{rawBody:s.retention&&(s.retention as Record<string,unknown>).rawBody==='private-copy'?'private-copy':'metadata-only',downloadImages:false},knownLimits:list('knownLimits')}}
}
/** Add or replace one archive source in the control-room profile of a club (creates the profile if needed). */
export const saveArchiveSource=(clubId:string,src:ArchiveSource)=>serial(async()=>{
 if(!ID.test(clubId))throw new Error('Invalid club id')
 const cur=await readJson<(ClubProfile&{archive:ArchiveSource[]})|null>(overlayFile(clubId),null)||empty(clubId)
 const next={...cur,archive:[...(cur.archive||[]).filter(a=>a.providerId!==src.providerId),src]}
 await writeJson(overlayFile(clubId),next);return next})
export const removeArchiveSource=(clubId:string,providerId:string)=>serial(async()=>{
 const cur=await readJson<(ClubProfile&{archive:ArchiveSource[]})|null>(overlayFile(clubId),null)
 if(!cur||!cur.archive.some(a=>a.providerId===providerId))throw new Error('Only sources added in the control room can be removed here; repository sources are changed in code review.')
 await writeJson(overlayFile(clubId),{...cur,archive:cur.archive.filter(a=>a.providerId!==providerId)});return true})
/** A club created in the control room starts with an empty profile, so it shows up in the data centre at once. */
export const ensureProfile=(clubId:string)=>serial(async()=>{if(repoProfile(clubId))return false;const cur=await readJson(overlayFile(clubId),null);if(cur)return false;await writeJson(overlayFile(clubId),empty(clubId));return true})
