import 'server-only'
import {createHash} from 'node:crypto'
import {mkdir,readFile,readdir,rename,writeFile} from 'node:fs/promises'
import path from 'node:path'
import {dataRoot} from '@/lib/dataRoot'
import {durable} from './durable'
import type {Club,Finding} from './types'

/**
 * The DESK PACK (8.10.2026, owner: "a simple button opens the club that has the data").
 * Until now an approved finding changed nothing a supporter could play: packs were files in the repository, changed only
 * by a developer's build. The desk pack closes that gap without loosening anything:
 *  - it is built ONLY from findings the owner approved, citing sources the owner reviewed — never by the autopilot;
 *  - it is the same pack shape the repository packs use, and it goes through the same compiler (`compilePack`), so a
 *    record the compiler refuses stays out of every game;
 *  - each fact carries the owner as approver and the dates of research and approval.
 * It lives in durable storage (Blob when connected, the data dir otherwise) at `desk-packs/<club>.json`.
 */
export type DeskPack={schemaVersion:1;clubId:string;builtAt:string;builtBy:string;findingIds:string[]
 sources:{id:string;title:string;url:string;publisher:string;access:'available';checkedAt:string}[]
 archive:[];players:{id:string;value:{name:string;sport:'football';positions:string[];fromYear:number|null;toYear:number|null;aliases:string[]};sources:string[];confidence:2;status:'approved';researchedAt:string;approvedAt:string;approvedBy:string;notes:string}[]}

const KEY=(id:string)=>`desk-packs/${id}.json`
const FILE=(id:string)=>path.join(dataRoot(),'desk-packs',`${id}.json`)
const day=(iso:string|undefined)=>(iso&&/^\d{4}-\d{2}-\d{2}/.test(iso)?iso.slice(0,10):new Date().toISOString().slice(0,10))
const hash=(s:string)=>createHash('sha256').update(s).digest('hex').slice(0,14)
const sourceKey=(id:string)=>`s-${hash(id)}`
const publisherOf=(url:string)=>{try{return new URL(url).hostname.replace(/^www\./,'')}catch{return 'unknown'}}

/** A finding the owner approved that a game can use: an approved player record whose every source is reviewed and unchanged. */
export function usable(c:Pick<Club,'sources'>,f:Finding){return f.decision==='approved'&&f.record?.kind==='player'&&!!f.record.name&&f.sources.length>0&&f.sources.every(id=>c.sources.some(s=>s.id===id&&s.reviewed&&!s.incoming))}

/** Pure: the pack the owner's approvals make. */
export function buildDeskPack(c:Pick<Club,'id'|'sources'|'findings'>,builtBy:string,now=new Date()):DeskPack{
 const rows=c.findings.filter(f=>usable(c,f)),cited=new Set(rows.flatMap(f=>f.sources))
 const sources=c.sources.filter(s=>cited.has(s.id)).map(s=>({id:sourceKey(s.id),title:s.title,url:s.url,publisher:publisherOf(s.url),access:'available' as const,checkedAt:day(s.retrievedAt)}))
 const seen=new Set<string>(),players:DeskPack['players']=[]
 for(const f of rows){const r=f.record!,id=`p-${hash(r.name.normalize('NFKC').toLowerCase())}`;if(seen.has(id))continue;seen.add(id)
  const retrieved=f.sources.map(id=>c.sources.find(s=>s.id===id)!.retrievedAt).sort()[0]
  players.push({id,value:{name:r.name,sport:'football',positions:(r.positions||[]).filter(p=>['GK','DF','MF','FW'].includes(p)),fromYear:r.fromYear??null,toYear:r.toYear??null,aliases:[]},sources:f.sources.map(sourceKey),confidence:2,status:'approved',researchedAt:day(retrieved),approvedAt:day(f.decidedAt),approvedBy:builtBy,notes:r.sourceUrl?`Read from ${r.sourceUrl}`:''})}
 return {schemaVersion:1,clubId:c.id,builtAt:now.toISOString(),builtBy,findingIds:rows.map(f=>f.id!).filter(Boolean),sources,archive:[],players}
}

export async function readDeskPack(id:string):Promise<DeskPack|null>{
 const d=durable()
 if(d){const r=await d.read(KEY(id));return r?JSON.parse(r.text) as DeskPack:null}
 try{return JSON.parse(await readFile(FILE(id),'utf8')) as DeskPack}catch(e){if((e as NodeJS.ErrnoException).code==='ENOENT')return null;throw e}
}
export async function writeDeskPack(p:DeskPack){
 const d=durable(),text=JSON.stringify(p)
 if(d){for(let i=0;i<4;i++){const cur=await d.read(KEY(p.clubId));if(await d.write(KEY(p.clubId),text,cur?.etag??null))return}throw new Error('Could not save the game data (storage busy). Try again.')}
 await mkdir(path.dirname(FILE(p.clubId)),{recursive:true});const tmp=`${FILE(p.clubId)}.${process.pid}.tmp`;await writeFile(tmp,text);await rename(tmp,FILE(p.clubId))
}
/** Clubs that have a desk pack — read once per call; small. */
export async function deskPackIds():Promise<string[]>{
 const d=durable()
 if(d)return (await d.list('desk-packs/')).map(n=>n.split('/').pop()!).filter(n=>n.endsWith('.json')).map(n=>n.slice(0,-5))
 try{return (await readdir(path.join(dataRoot(),'desk-packs'))).filter(n=>n.endsWith('.json')).map(n=>n.slice(0,-5))}catch{return []}
}
