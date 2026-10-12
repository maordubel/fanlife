import {createHash} from 'node:crypto'
import type {Pos} from '@/lib/clubs/rumble-format'
import {slotsOf} from '@/lib/clubs/rumble-xi/formations'
import type {FormationId} from '@/lib/clubs/rumble-xi/types'
import type {Card,Catalog,Decade} from './types'
import {CORE_SIZE} from './types'

/**
 * The heritage catalog (FL-01/04/05). Pure: the server hands in the club's rated pool and the ids its archive APPROVED; what
 * comes back is frozen into a career when it starts. A man with no recorded years at the club stays in the archive (signable)
 * but in no decade rail — a decade is never guessed.
 */
type PoolRow={id:string;name:string;position:Pos;alt?:Pos[];free?:boolean;price:number;rating:number;fromYear:number|null;toYear:number|null}
export function eligibleDecades(from:number|null,to:number|null):Decade[]{
 if(from==null||to==null||from>to||from<1850||to>2100)return []
 const out:Decade[]=[];for(let d=Math.floor(from/10)*10;d<=Math.floor(to/10)*10;d+=10)out.push(d);return out
}
export const decadeLabel=(d:Decade)=>`${d}s`
export function buildCatalog(club:string,clubName:string,pool:readonly PoolRow[],approved:ReadonlySet<string>):Catalog{
 const cards:Card[]=pool.filter(p=>approved.has(p.id)).map(p=>({id:p.id,name:p.name,position:p.position,...(p.alt?.length?{alt:[...p.alt]}:{}),...(p.free?{free:true}:{}),price:p.price,rating:p.rating,fromYear:p.fromYear,toYear:p.toYear,decades:eligibleDecades(p.fromYear,p.toYear)}))
  .sort((a,b)=>a.id.localeCompare(b.id))
 const digest=createHash('sha256').update(JSON.stringify([club,cards.map(c=>[c.id,c.position,c.alt??[],!!c.free,c.price,c.rating,c.fromYear,c.toYear])])).digest('hex').slice(0,16)
 return {club,clubName,digest,cards}
}

/** can this man fill a slot of this family? a man with no recorded position fits any outfield slot, never goal */
export const fits=(c:Pick<Card,'position'|'alt'|'free'>,fam:Pos)=>c.free?fam!=='GK':c.position===fam||!!c.alt?.includes(fam)

/** the strongest legal eleven for a formation from these men (slot order), or null when one slot cannot be filled */
export function bestXI(cards:readonly Card[],f:FormationId):string[]|null{
 const slots=slotsOf(f),used=new Set<string>(),out:string[]=[]
 // the scarcest families first, so a man who can play two lines is not spent where anyone would do
 const order=slots.map((s,i)=>({s,i,n:cards.filter(c=>fits(c,s.family)).length})).sort((a,b)=>a.n-b.n||a.i-b.i)
 const pick:string[]=new Array(slots.length)
 for(const {s,i} of order){
  const c=cards.filter(x=>!used.has(x.id)&&fits(x,s.family)).sort((a,b)=>Number(!!a.free)-Number(!!b.free)||b.rating-a.rating||a.id.localeCompare(b.id))[0]
  if(!c)return null;used.add(c.id);pick[i]=c.id
 }
 out.push(...pick);return out
}
export function validXI(xi:readonly string[],squad:readonly string[],cards:readonly Card[],f:FormationId):string|null{
 const slots=slotsOf(f),by=new Map(cards.map(c=>[c.id,c])),own=new Set(squad)
 if(xi.length!==slots.length)return `An eleven needs ${slots.length} men.`
 if(new Set(xi).size!==xi.length)return 'A man can stand in one slot only.'
 for(let i=0;i<slots.length;i++){const c=by.get(xi[i]!);if(!c||!own.has(c.id))return 'Every man in the eleven must be in your squad.';if(!fits(c,slots[i]!.family))return `${c.name} cannot play ${slots[i]!.fine}.`}
 return null
}

/** eighteen from the home decade by line (2 GK · 6 DF · 6 MF · 4 FW), the strongest first; a short decade is completed from the club's other years, nearest first, and says so */
export function coreSquad(cards:readonly Card[],decade:Decade):{squad:string[];completed:string[]}{
 const want:Record<Pos,number>={GK:2,DF:6,MF:6,FW:4},taken=new Set<string>(),completed:string[]=[]
 const dist=(c:Card)=>c.decades.length?Math.min(...c.decades.map(d=>Math.abs(d-decade))):1e9
 const rank=(a:Card,b:Card)=>b.rating-a.rating||a.id.localeCompare(b.id)
 for(const fam of ['GK','DF','MF','FW'] as Pos[]){
  const home=cards.filter(c=>!taken.has(c.id)&&c.decades.includes(decade)&&(fam==='GK'?c.position==='GK':c.position===fam||!!c.free)).sort(rank)
  for(const c of home.slice(0,want[fam])){taken.add(c.id)}
  let need=want[fam]-Math.min(want[fam],home.length)
  if(need>0){const away=cards.filter(c=>!taken.has(c.id)&&!c.decades.includes(decade)&&c.position===fam).sort((a,b)=>dist(a)-dist(b)||rank(a,b))
   for(const c of away){if(!need)break;taken.add(c.id);completed.push(c.id);need--}}
 }
 // still short of eighteen (a thin club): any man of the decade, then of the club
 for(const c of [...cards].filter(c=>!taken.has(c.id)).sort((a,b)=>Number(!a.decades.includes(decade))-Number(!b.decades.includes(decade))||rank(a,b))){if(taken.size>=CORE_SIZE)break;taken.add(c.id);if(!c.decades.includes(decade))completed.push(c.id)}
 return {squad:[...taken],completed}
}
