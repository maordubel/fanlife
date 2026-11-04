import 'server-only'
import {readFile} from 'node:fs/promises'
import path from 'node:path'

/**
 * What a film can be about, per club (studio v3, owner 4.11.2026: "a film about a specific match, not only a season; more
 * choices, less freedom"). Written by `python3 -m studio.seasons` with the research stage's own reader, so every match,
 * season and opponent offered here is one the worker can research. Served filtered: a club holds up to ~3,400 matches.
 */
export type CatalogMatch={id:string;date:string;season:string;competition:string|null;stage:string|null;home:string;away:string;score:string;outcome:'win'|'draw'|'loss';opponent:string;side:'home'|'away';scorers:boolean;tags:string[]}
export type CatalogOpponent={name:string;played:number;won:number;drawn:number;lost:number;first:string;last:string;derby:boolean}
export type Catalog={club_id:string;seasons:Record<string,number>;matches:CatalogMatch[];opponents:CatalogOpponent[]}

const DIR=path.join(process.cwd(),'content','generated','stories')
const memo=new Map<string,Promise<Catalog|null>>()
export function catalogOf(club:string):Promise<Catalog|null>{
 if(!/^[a-z0-9-]{2,60}$/.test(club))return Promise.resolve(null)
 if(!memo.has(club))memo.set(club,readFile(path.join(DIR,`${club}.json`),'utf8').then(s=>JSON.parse(s) as Catalog).catch(()=>null))
 return memo.get(club)!
}

/** "Big nights" first: a final, a derby, a European night, a big score — then the rest, newest first. */
export const BIG=['final','derby','europe','big-score','penalties','extra-time','goals'] as const
const weight=(m:CatalogMatch)=>(m.tags.includes('final')?8:0)+(m.tags.includes('derby')?4:0)+(m.tags.includes('europe')?4:0)+(m.tags.includes('big-score')?2:0)+(m.tags.includes('penalties')||m.tags.includes('extra-time')?2:0)+(m.tags.includes('goals')?1:0)
const fold=(s:string)=>s.normalize('NFD').replace(/\p{M}/gu,'').toLowerCase()

export type MatchQuery={q?:string;season?:string;tag?:string;opponent?:string;order?:'big'|'new';limit?:number}
export function findMatches(c:Catalog,f:MatchQuery):{matches:CatalogMatch[];total:number}{
 const q=f.q?fold(f.q.trim()):''
 let rows=c.matches.filter(m=>(!f.season||m.season===f.season)&&(!f.opponent||m.opponent===f.opponent)&&(!f.tag||(f.tag==='big'?weight(m)>=4:m.tags.includes(f.tag)))
  &&(!q||fold(`${m.home} ${m.away} ${m.competition??''} ${m.date} ${m.season}`).includes(q)))
 if(f.order!=='new')rows=[...rows].sort((a,b)=>weight(b)-weight(a)||b.date.localeCompare(a.date))
 const limit=Math.min(Math.max(f.limit??40,1),120)
 return {matches:rows.slice(0,limit),total:rows.length}
}
