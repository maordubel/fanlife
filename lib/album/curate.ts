import type {Stint} from '@/lib/people/model'

/**
 * THE ALBUM — choosing a wing's stickers (edition one, 18.11.2026). Pure.
 *
 * A wing is six pages of six, and the pages walk through the club's history: the 120 best-known men (half ability, half
 * reputation — the same two numbers the Legends stars read) are cut into six eras by the middle of their years at the club,
 * and each era's six best fill one page. So a wing is never "the last ten seasons" and never only the founders. A man with no
 * recorded years is dealt to no era; an archive-only record (no reviewed position) is not a sticker yet.
 */
export type WingSticker={slot:number;page:number;era:string;person_id:string;record_id:string;name:string;from:number|null;to:number|null;pos:string[];/** the measured club shirt (SVG) the drawn figure wears when no free photo exists */kit?:string|null}
export type EditionFile={edition:number;builtOn:string;wings:Record<string,WingSticker[]>}
export const PAGES=6,PER_PAGE=6,POOL=120

const score=(s:Stint)=>(s.rating??0)*0.5+(s.reputation??0)*0.5+(s.stars??0)
const mid=(s:Stint)=>s.from!==null&&s.to!==null?(s.from+s.to)/2:s.from??s.to
export const eraLabel=(lo:number,hi:number)=>{const a=Math.floor(lo/10)*10,b=Math.floor(hi/10)*10;return a===b?`The ${a}s`:`${a}s–${b}s`}

export function curateWing(club:string,stints:readonly Stint[],personOf:(s:Stint)=>string):WingSticker[]{
 const seen=new Set<string>()
 const pool=stints.filter(s=>!s.archiveOnly&&s.rating!==null&&mid(s)!==null)
  .sort((a,b)=>score(b)-score(a)||a.eid.localeCompare(b.eid))
  .filter(s=>{const p=personOf(s);if(seen.has(p))return false;seen.add(p);return true})
  .slice(0,POOL)
 if(!pool.length)return []
 const byTime=[...pool].sort((a,b)=>mid(a)!-mid(b)!||score(b)-score(a))
 const pages=Math.min(PAGES,Math.ceil(pool.length/PER_PAGE))
 const out:WingSticker[]=[]
 for(let p=0;p<pages;p++){
  const era=byTime.slice(Math.floor(p*byTime.length/pages),Math.floor((p+1)*byTime.length/pages))
  if(!era.length)continue
  const lo=Math.min(...era.map(s=>mid(s)!)),hi=Math.max(...era.map(s=>mid(s)!))
  const best=[...era].sort((a,b)=>score(b)-score(a)||a.eid.localeCompare(b.eid)).slice(0,PER_PAGE).sort((a,b)=>mid(a)!-mid(b)!||a.eid.localeCompare(b.eid))
  for(const s of best)out.push({slot:out.length+1,page:p+1,era:eraLabel(lo,hi),person_id:personOf(s),record_id:s.eid,name:s.name,from:s.from,to:s.to,pos:s.pos})
 }
 return out.map((s,i)=>({...s,slot:i+1}))
}
