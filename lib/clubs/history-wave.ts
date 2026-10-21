import 'server-only'
import petah from '@/club-packs/hapoel-petah-tikva/wave-history-2026-10-18.json'
import zrinjski from '@/club-packs/zrinjski-mostar/wave-history-2026-10-18.json'
import aek20 from '@/club-packs/aek-athens/wave-history-2026-10-20.json'
import celtic20 from '@/club-packs/celtic/wave-history-2026-10-20.json'
import olympiacos20 from '@/club-packs/olympiacos/wave-history-2026-10-20.json'
import panathinaikos20 from '@/club-packs/panathinaikos/wave-history-2026-10-20.json'
import stpauli20 from '@/club-packs/st-pauli/wave-history-2026-10-20.json'
import zrinjski20 from '@/club-packs/zrinjski-mostar/wave-history-2026-10-20.json'
import {mergeWave} from './waves'
import {enClub} from '@/lib/trivia/names'
import aliases from '@/content/manual/names-en/history-side-aliases.json'

type Raw=Record<string,unknown>
const obj=(x:unknown):Raw=>x&&typeof x==='object'&&!Array.isArray(x)?x as Raw:{}
const arr=(x:unknown):Raw[]=>Array.isArray(x)?x as Raw[]:[]
const str=(x:unknown)=>typeof x==='string'?x:''
const key=(x:string)=>{
 const en=enClub(x)??x,name=(aliases.names as Record<string,string>)[en]??en
 return name.normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().replaceAll('ø','o').replaceAll('đ','d').replaceAll('ł','l').replace(/\b(?:hsk|nk|fk|fc|hapoel)\b/g,'').replace(/[^a-z0-9]/g,'')
}
/** Waves are applied in order; each one goes through the same day-collision gate, so a later wave never overrides an earlier fact. */
const WAVES:Record<string,unknown[]>={'hapoel-petah-tikva':[petah],'zrinjski-mostar':[zrinjski,zrinjski20],'aek-athens':[aek20],'celtic':[celtic20],'olympiacos':[olympiacos20],'panathinaikos':[panathinaikos20],'st-pauli':[stpauli20]}

/** Scores are HOME first in both source formats. Shootouts are a separate field. */
function result(v:Raw):{home:string;away:string;hg:number;ag:number}|null{
 if(typeof v.home==='string'&&typeof v.away==='string'&&Number.isInteger(v.homeGoals)&&Number.isInteger(v.awayGoals))return {home:v.home,away:v.away,hg:Number(v.homeGoals),ag:Number(v.awayGoals)}
 const m=/^(.*?)\s+(\d{1,2})\s*[-–:]\s*(\d{1,2})\s+(.+?)(?:\s+\([^)]*\))?$/.exec(str(v.name))
 return m?{home:m[1]!,away:m[4]!,hg:Number(m[2]),ag:Number(m[3])}:null
}
export type HistoryConflict={existing:string;incoming:string;on:string;reason:'result-or-opponent-conflict'|'multiple-matches-on-day'}

/** Add checked history to the SAME pack every game reads. An existing match wins;
 * matching sources enrich it without losing its eleven. Conflicting results stay
 * out of both matches and archive, and are reported by the census/diagnostic test.
 * Like withEuro, first-team records are reconciled by day; multiple candidates on
 * one day require review rather than guessing which game a source describes.
 */
export function mergeHistorical<T extends Raw>(pack:T,wave:Raw):{pack:T;conflicts:HistoryConflict[]}{
 const sources=arr(wave.sources),existing=arr(pack.matches),out=[...existing],events:Raw[]=[...arr(wave.archive)],conflicts:HistoryConflict[]=[]
 const byDay=new Map<string,number[]>()
 for(let i=0;i<out.length;i++){const day=str(obj(out[i]!.value).on);if(day)byDay.set(day,[...(byDay.get(day)??[]),i])}
 const incomingDays=new Map<string,number>()
 for(const f of arr(wave.matches)){const day=str(obj(f.value).on);incomingDays.set(day,(incomingDays.get(day)??0)+1)}
 for(const f of arr(wave.matches)){
  if(f.status!=='approved'||Number(f.confidence)<2)continue
  const v=obj(f.value),on=str(v.on),indices=byDay.get(on)??[]
  if(indices.length>1||(incomingDays.get(on)??0)>1){conflicts.push({existing:indices.map(i=>str(out[i]!.id)).join(','),incoming:str(f.id),on,reason:'multiple-matches-on-day'});continue}
  let matched=false
  if(indices.length){
   const i=indices[0]!,p=out[i]!,pv=obj(p.value),a=result(pv),b=result(v)
   const same=a&&b&&key(a.home)===key(b.home)&&key(a.away)===key(b.away)&&a.hg===b.hg&&a.ag===b.ag
   const neutralReversed=a&&b&&(v.neutral===true||pv.neutral===true)&&key(a.home)===key(b.away)&&key(a.away)===key(b.home)&&a.hg===b.ag&&a.ag===b.hg
   if(!same&&!neutralReversed){conflicts.push({existing:str(p.id),incoming:str(f.id),on,reason:'result-or-opponent-conflict'});continue}
   // An existing record whose sources are not checked-and-available cannot carry the incoming approval
   // (the compiler would drop the merged record): the approved record replaces it, keeping both source lists.
   const usable=new Set(arr(pack.sources).filter(x=>obj(x).access==='available'&&obj(x).checkedAt).map(x=>str(obj(x).id)))
   const known=new Set(arr(pack.sources).map(x=>str(obj(x).id)))
   const pSources=Array.isArray(p.sources)?p.sources as string[]:[]
   if(p.status!=='approved'||Number(p.confidence)<2||(pSources.length>0&&pSources.every(x=>known.has(x))&&!pSources.some(x=>usable.has(x)))){
    out[i]={...f,sources:[...new Set([...pSources.filter(x=>usable.has(x)),...(f.sources as string[])])]}
    matched=true
   }else{
   // Core approval, identifiers, documented season, lineup and scorers survive.
   out[i]={...p,value:{...v,...pv,season:pv.season??v.season},sources:[...new Set([...(Array.isArray(p.sources)?p.sources as string[]:[]),...(f.sources as string[])])]}
   matched=true
   }
  }else{byDay.set(on,[out.length]);out.push(f)}
  // Match-only input would never reach Living Archive (eligibleArchive reads
  // archive/timeline). Make its projection here, after the same collision gate.
  // An existing dated event retains chronology priority through mergeWave.
  events.push({...f,id:`${str(f.id)}-moment`,value:{id:`${str(f.id)}-moment`,name:v.name,on,precision:'day',sport:'football',sensitive:false,hint:`${str(v.competition)} · ${str(v.season)}${matched?' · Corroborated match record.':''}`}})
 }
 return {pack:mergeWave({...pack,matches:out},{sources,archive:events}),conflicts}
}

export function withHistorical<T extends Raw>(pack:T,clubId:string):{pack:T;conflicts:HistoryConflict[]}{
 let cur=pack;const conflicts:HistoryConflict[]=[]
 for(const wave of WAVES[clubId]??[]){const r=mergeHistorical(cur,obj(wave));cur=r.pack;conflicts.push(...r.conflicts)}
 return {pack:cur,conflicts}
}
