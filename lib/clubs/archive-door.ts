import 'server-only'
import type {ClubData} from './contract'
import {buildEntries,encodeArchive,tokensOf,type Entry} from './entities'

/**
 * The archive door (12.11.2026) — every gate's way back into the club's Living Archive (gate 12).
 *
 * A game result names men and matches; the archive holds an entry for many of them. This module answers ONE question for
 * every gate: "which archive entry is this?" — and answers it only when the archive itself holds that entry, so a door
 * never opens onto a 404 (the archive 404s an unknown `?event=`). Names are matched whole (rule 7): a name two entries
 * share opens neither. A match is the moment that stands for it — by its id, else the ONE moment on that exact day.
 *
 * One projection per club version per instance (the archive page itself reads it from here too): building the entries
 * walks every record, so it is done once and kept, never per request.
 */
type Projection={entries:Entry[];wire:ReturnType<typeof encodeArchive>;ids:Set<string>;door:Door}
export type Door={
 /** an archive entry id for a player fact id, or null */
 player:(playerId:string|null|undefined)=>string|null
 /** an archive entry id for a printed name (whole name or a multi-word alias), or null; a year keeps it to the man of that era */
 name:(name:string|null|undefined,year?:number|null)=>string|null
 /** the moment a match is: by its record id, else the ONE dated moment on that day (whose printed score agrees, when given) */
 match:(m:{id?:string|null;on?:string|null;score?:string|null})=>string|null
}
const PROJECTED=new Map<string,Projection>()
const scoreKey=(s:string|null|undefined)=>{const m=/(\d{1,2})\s*[-–:]\s*(\d{1,2})/.exec(s||'');return m?[Number(m[1]),Number(m[2])].sort((a,b)=>a-b).join('-'):null}

function makeDoor(entries:Entry[]):Door{
 const ids=new Set(entries.map(e=>e.id))
 const players=entries.filter(e=>e.kind==='player')
 const byName=new Map<string,string|null>()
 for(const e of players)for(const n of new Set([e.title,...(e.player?.aliases||[])])){
  const toks=tokensOf(n);if(!toks.length||(toks.length<2&&n!==e.title))continue
  const k=toks.join(' '),was=byName.get(k);byName.set(k,was===undefined||was===e.id?e.id:null)
 }
 const span=new Map(players.map(e=>[e.id,e.player]))
 const byMatch=new Map<string,string>(),byDay=new Map<string,Entry[]>()
 for(const e of entries){
  if(e.kind!=='moment')continue
  if(e.match)byMatch.set(e.match.matchId,e.id)
  if(e.on)(byDay.get(e.on)??byDay.set(e.on,[]).get(e.on)!).push(e)
 }
 return {
  player:id=>id&&ids.has(id)&&span.has(id)?id:null,
  name:(n,year)=>{
   if(!n)return null
   const id=byName.get(tokensOf(n).join(' '));if(!id)return null
   const p=span.get(id);if(year!=null&&p&&((p.from!==null&&year<p.from-1)||(p.to!==null&&year>p.to+1)))return null
   return id
  },
  match:({id,on,score})=>{
   if(id){if(ids.has(id))return id;const hit=byMatch.get(id);if(hit)return hit}
   if(!on)return null
   const day=byDay.get(on)||[],want=scoreKey(score)
   const fit=want?day.filter(e=>{const k=scoreKey(e.match?.score??e.title);return !k||k===want}):day
   return fit.length===1?fit[0]!.id:null
  },
 }
}

/** the club's archive projection (entries, the wire the archive page ships, the id set and the door) — cached per club version */
export function archiveProjection(club:ClubData):Projection{
 const k=`${club.identity.id}:${club.version}`,hit=PROJECTED.get(k);if(hit)return hit
 const entries=buildEntries(club)
 const out={entries,wire:encodeArchive(entries,club.sources),ids:new Set(entries.map(e=>e.id)),door:makeDoor(entries)}
 if(PROJECTED.size>=24)PROJECTED.delete(PROJECTED.keys().next().value as string)
 PROJECTED.set(k,out);return out
}
export const archiveDoor=(club:ClubData)=>archiveProjection(club).door
/** the URL of an archive entry's sheet, or null when there is no entry */
export const archiveEventHref=(clubId:string,entryId:string|null|undefined,locale:string)=>entryId?`/clubs/${clubId}/archive?${new URLSearchParams({event:entryId,lang:locale})}`:null
