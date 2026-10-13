import 'server-only'
import {loadClubBase} from '@/lib/clubs/resolver'
import {ratedPool,rumbleReadiness,FIVE} from '@/lib/clubs/rumble'
import {quotaFor} from '@/lib/clubs/rumble-xi/quota'
import {xiReadiness} from '@/lib/clubs/rumble-xi/readiness'
import {FORMATION_IDS} from '@/lib/clubs/rumble-xi/formations'
import {withPlayerOverrides} from './apply'
import {getSnapshot,mergePatch,setSnapshot} from './effective'
import {appendAuditMany,everyRow,Refusal,withHypothetical,type Actor,type Row} from './service'
import {refreshSnapshot} from './snapshot'
import {update} from './store'
import {EMPTY_SNAPSHOT,keyOf,POSITIONS,type Override,type Patch,type Pos,type Snapshot} from './types'
/**
 * Change many men at once from the table (owner, 13.10.2026: "multiple selection, and change the price of the selection").
 * One change is applied to every chosen man: a price (1–5), or one more position. It is judged as a WHOLE — a stale row, a game that would stop
 * working, or a price ladder left off its steps refuses the batch with nothing written — then published as one revision, one audit line per man.
 * A locked or pinned price is not a wall for the admin; the lines carry it in the history.
 */
export const MANY_MAX=200
export type ManyChange={price:number}|{addPosition:Pos}
export type ManyItem={club:string;id:string;expectedRev:number}
export type ManyResult={revision:number;changed:number;unchanged:number;skipped:number;rows:Row[]}
const eq=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b)
export function parseChange(raw:unknown):ManyChange{
 if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new Refusal(400,'Choose what to change.')
 const o=raw as Record<string,unknown>,keys=Object.keys(o)
 if(keys.length!==1)throw new Refusal(400,'Change one thing at a time: a price, or one more position.')
 if('price' in o){const n=o.price;if(Number.isInteger(n)&&(n as number)>=1&&(n as number)<=5)return {price:n as number};throw new Refusal(400,'The price is a whole number from 1 to 5 (€M).')}
 if('addPosition' in o){if(POSITIONS.includes(o.addPosition as Pos))return {addPosition:o.addPosition as Pos};throw new Refusal(400,'A position is GK, DF, MF or FW.')}
 throw new Refusal(400,'Only the price or one more position can be changed for several men at once.')
}
function patchFor(r:Row,c:ManyChange):Patch|null{
 if('price' in c){if(c.price===r.price)return null;return {price:(c.price===r.basePrice?null:c.price) as Patch['price']}}
 if(r.positions.includes(c.addPosition))return null
 const next=[...r.positions,c.addPosition];return {positions:eq(next,r.basePositions)?null:next}
}
export async function quickMany(items:ManyItem[],changeRaw:unknown,o:{confirmQuota?:boolean},who:Actor):Promise<ManyResult>{
 if(!Array.isArray(items)||!items.length)throw new Refusal(400,'Choose at least one player.')
 if(items.length>MANY_MAX)throw new Refusal(400,`At most ${MANY_MAX} players at a time.`)
 const change=parseChange(changeRaw)
 await refreshSnapshot(true)
 const eff=new Map((await everyRow()).map(r=>[keyOf(r.club,r.id),r])),seen=new Set<string>()
 const plan:{key:string;row:Row;patch:Patch;next:Override|null}[]=[];let unchanged=0,skipped=0
 const at=new Date().toISOString(),reason=`Quick edit in the table (${items.length} men chosen)`
 for(const it of items){
  const key=keyOf(String(it?.club),String(it?.id)),row=eff.get(key)
  if(!row)throw new Refusal(404,`No such player: ${String(it?.id)}.`)
  if(seen.has(key))continue;seen.add(key)
  if(Number(it.expectedRev)!==row.rev)throw new Refusal(409,`${row.name} was changed by someone else since you opened the list. Reload and choose again. Nothing was written.`)
  if(row.removed||row.mergedInto){skipped++;continue}
  const patch=patchFor(row,change);if(!patch){unchanged++;continue}
  const cur=getSnapshot().overrides[key]??null
  plan.push({key,row,patch,next:mergePatch(cur,patch,{by:who.actor,at,reason})})
 }
 if(!plan.length)return {revision:getSnapshot().revision,changed:0,unchanged,skipped,rows:[]}
 const snap:Snapshot={...getSnapshot(),overrides:{...getSnapshot().overrides}};for(const p of plan){if(p.next)snap.overrides[p.key]=p.next;else delete snap.overrides[p.key]}
 const bad:string[]=[],off:{club:string;violations:string[]}[]=[]
 for(const club of new Set(plan.map(p=>p.row.club))){const raw=await loadClubBase(club);if(!raw)continue
  withHypothetical(snap,()=>{const pool=ratedPool(withPlayerOverrides(club,raw.data)),have:Record<number,number>={1:0,2:0,3:0,4:0,5:0};for(const c of pool)have[c.price]!+=1
   const want=quotaFor(pool.length).counts as Record<number,number>,v=[1,2,3,4,5].filter(p=>have[p]!==want[p]).map(p=>`€${p}M: ${have[p]} men, the ladder says ${want[p]}`)
   if(v.length)off.push({club,violations:v})
   if(!rumbleReadiness(pool,FIVE).playable)bad.push(`${club}: five-a-side`)
   for(const f of FORMATION_IDS)if(!xiReadiness(pool,f,6).ready)bad.push(`${club}: ${f}`)})}
 if(bad.length)throw new Refusal(422,`This would stop a game working (${[...new Set(bad)].slice(0,4).join('; ')}). Nothing was written.`,{broke:bad})
 if(off.length&&!o.confirmQuota)throw new Refusal(422,`This leaves a club off its price ladder. ${off.map(x=>x.violations.join(', ')).slice(0,2).join(' · ')} Confirm to publish it as an exception.`,{clubs:off})
 let revision=0;const events:Parameters<typeof appendAuditMany>[0]=[]
 const saved=await update<Snapshot>('published.json',EMPTY_SNAPSHOT,s=>{
  const ov={...s.overrides};events.length=0
  for(const p of plan){const cur=ov[p.key]??null;if((cur?.rev??0)!==p.row.rev)throw new Refusal(409,'A player changed while this was being written. Reload and choose again. Nothing was written.')
   const nx=mergePatch(cur,p.patch,{by:who.actor,at,reason});if(nx)ov[p.key]=nx;else delete ov[p.key]
   events.push({action:'publish',club:p.row.club,player:p.row.id,before:cur,after:nx,reason,revision:s.revision+1})}
  revision=s.revision+1;return {revision,updatedAt:at,overrides:ov}})
 setSnapshot(saved);await appendAuditMany(events,who)
 const fresh=new Map((await everyRow()).map(r=>[keyOf(r.club,r.id),r]))
 return {revision,changed:plan.length,unchanged,skipped,rows:plan.map(p=>fresh.get(p.key)!).filter(Boolean)}
}
