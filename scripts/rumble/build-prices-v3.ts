import {isMan} from '@/lib/clubs/rumble-xi/names'
import {loadClub,CORE_CLUB_IDS} from '@/lib/clubs/resolver'
import {rawPool,goalsByPlayer} from '@/lib/clubs/rumble'
import {extraPositions} from '@/lib/clubs/rumble-xi/positions'
import {mergesFor} from '@/lib/clubs/rumble-xi/merges'
import {quotaFor} from '@/lib/clubs/rumble-xi/quota'
import {priceTable,type PriceEntry,type Price} from '@/lib/clubs/rumble-xi/prices'
import {allPlayers} from '@/lib/archive/player-master'
import {priceForPlayer} from '@/lib/game/royal-rumble'
import {ROYAL_RUMBLE_CANONICAL_FIVES} from '@/lib/game/royal-rumble-prices'
import {norm} from '@/lib/fixtures/names'
import {readFileSync,writeFileSync,existsSync} from 'node:fs'
/**
 * freeze   — price every club that has no list yet (never touches a club that has one)
 * migrate  — add men the archive gained since: €1M, 'new-member', nothing else changes
 * validate — quotas, whole-million prices, no stranger, no gap (exit 1 on a fault)
 * The ladder (rulebook rumble-economy-v1): 10×€5 · 20×€4 · 40×€3 · 60×€2 · rest €1M; a small archive gets it in proportion, once.
 * Order of a club's men: pinned first (content/manual/rumble-pins.json), then one score — 55% playing strength (the owner workbook, or the club's
 * ordinary man moved by his record), 20% years at the club, 15% goals on record, 10% standing on the terrace (Hapoel Tel Aviv: THE WORKER's own
 * price; elsewhere neutral). Weights are the rulebook's proposal. Ties break on rating, then id. This ORDER is used once, at freeze.
 */
const [,, cmd='validate']=process.argv
const FILE='content/generated/rumble-prices-v3.json',PINS='content/manual/rumble-pins.json'
const TIER:Record<Price,PriceEntry['priceTier']>={5:'ICON',4:'STAR',3:'LEADING',2:'REGULAR',1:'REST'}
const today=new Date().toISOString().slice(0,10)
const doc=JSON.parse(readFileSync(FILE,'utf8')) as typeof priceTable
const pins:Record<string,Record<string,{priceM:Price;reason:string;decidedOn:string}>>=existsSync(PINS)?JSON.parse(readFileSync(PINS,'utf8')):{}
const midRank=(xs:number[])=>{const s=[...xs].sort((a,b)=>a-b);return xs.map(v=>{const lo=s.indexOf(v),hi=s.lastIndexOf(v);return s.length<2?0.5:((lo+hi)/2)/(s.length-1)})}

async function pinsForHapoel(data:Awaited<ReturnType<typeof loadClub>>){
 // THE WORKER's ten €5M men, found in this archive by exact name (rule 7)
 const club=data!.data,byName=new Map<string,string[]>()
 for(const p of club.players)for(const n of [p.value.name,...p.value.aliases])byName.set(norm(n),[...(byName.get(norm(n))||[]),p.value.id])
 const out:Record<string,{priceM:Price;reason:string;decidedOn:string}>={}
 for(const f of ROYAL_RUMBLE_CANONICAL_FIVES){
  const m=allPlayers().find(x=>x.slug===f.slug);if(!m)continue
  const ids=[...new Set([m.displayName,...m.aliases.he,...m.aliases.latin].flatMap(n=>byName.get(norm(n))||[]))]
  if(ids.length===1)out[ids[0]!]={priceM:5,reason:f.reasonHe,decidedOn:'2026-09-29'}
 }
 return out
}
async function standing(data:Awaited<ReturnType<typeof loadClub>>){
 const club=data!.data;if(club.identity.id!=='hapoel-tel-aviv')return new Map<string,number>()
 const byName=new Map<string,string>();for(const p of club.players)for(const n of [p.value.name,...p.value.aliases])byName.set(norm(n),p.value.id)
 const out=new Map<string,number>()
 for(const m of allPlayers()){if(m.kind!=='player')continue;const pr=priceForPlayer(m.slug);if(pr===null)continue
  const ids=[...new Set([m.displayName,...m.aliases.he,...m.aliases.latin].map(n=>byName.get(norm(n))).filter(Boolean))] as string[]
  if(ids.length===1)out.set(ids[0]!,pr/5)}
 return out
}
async function freeze(id:string){
 const data=await loadClub(id);if(!data)return
 // men added from the Wikipedia player categories join at €1M through `migrate`, never reshuffling the list (rulebook: a new man does not reprice the others)
 const wp=new Set(data.data.players!.filter(p=>p.sources.some(x=>x.startsWith('src-wp-roster-'))).map(p=>p.value.id))
 const pool=rawPool(data.data,{extra:extraPositions(id)}).filter(p=>!wp.has(p.id)),goals=goalsByPlayer(data.data),stand=await standing(data)
 if(id==='hapoel-tel-aviv'&&!pins[id]){pins[id]=await pinsForHapoel(data);writeFileSync(PINS,JSON.stringify(pins,null,1)+'\n')}
 const span=(p:{fromYear:number|null;toYear:number|null})=>p.fromYear!==null&&p.toYear!==null?p.toYear-p.fromYear+1:null
 const sp=pool.map(p=>span(p)),sorted=(xs:(number|null)[])=>xs.filter((x):x is number=>x!==null)
 const pctOf=(x:number,all:number[])=>all.length<2?0.5:all.filter(y=>y<x).length/(all.length-1)
 const allSpan=sorted(sp),allGoals=sorted(pool.map(p=>goals.has(p.id)?goals.get(p.id)!:null)),ratingPct=midRank(pool.map(p=>p.rating))
 // a part nobody wrote down is left out of the score, not scored as nothing (absence is not weakness); the weights of the parts that exist are renormalised
 const score=pool.map((p,i)=>{
  const parts:[number,number][]=[[0.55,ratingPct[i]!]]
  if(sp[i]!==null)parts.push([0.2,pctOf(sp[i]!,allSpan)])
  if(goals.has(p.id))parts.push([0.15,pctOf(goals.get(p.id)!,allGoals)])
  if(stand.has(p.id))parts.push([0.1,stand.get(p.id)!])
  return parts.reduce((t,x)=>t+x[0]*x[1],0)/parts.reduce((t,x)=>t+x[0],0)})
 const order=pool.map((_,i)=>i).sort((a,b)=>score[b]!-score[a]!||pool[b]!.rating-pool[a]!.rating||pool[a]!.id.localeCompare(pool[b]!.id))
 const q=quotaFor(pool.length),pinned=pins[id]??{},players:Record<string,PriceEntry>={}
 const left={...q.counts}
 for(const [pid,pin] of Object.entries(pinned)){if(!pool.some(p=>p.id===pid))continue;players[pid]={priceM:pin.priceM,priceTier:TIER[pin.priceM],locked:true,assignment:'owner-pinned',rationale:pin.reason,reviewedAt:pin.decidedOn};left[pin.priceM]-=1}
 let tier:Price=5
 for(const i of order){const p=pool[i]!;if(players[p.id])continue
  while(tier>1&&left[tier]<=0)tier=(tier-1) as Price
  players[p.id]={priceM:tier,priceTier:TIER[tier],locked:false,assignment:'auto',rationale:`score ${score[i]!.toFixed(3)} (strength 55 · years 20 · goals 15 · terrace 10, parts on file only)`,reviewedAt:today,...(q.mode==='proportional'?{temporaryQuota:true}:{})}
  left[tier]-=1}
 doc.clubs[id]={quotaMode:q.mode,size:pool.length,quota:Object.fromEntries(Object.entries(q.counts)),players}
}
async function applyV2(){
 // owner approval 10.10.2026: constitution V2, locked records may move, prices tightened for competition. The V1 list is kept beside as a snapshot.
 writeFileSync('content/generated/rumble-prices-v1.snapshot.json',JSON.stringify(JSON.parse(readFileSync(FILE,'utf8')),null,1)+'\n')
 for(const id of CORE_CLUB_IDS){const data=await loadClub(id);if(!data)continue
  const pool=rawPool(data.data,{extra:extraPositions(id)}),by=new Map(pool.map(p=>[p.id,p])),cur=doc.clubs[id]!
  const entries=Object.entries(cur.players),q=quotaFor(entries.length),sel=new Map<string,Price>()
  const tenure=(pid:string)=>{const p=by.get(pid);return p&&p.fromYear!==null&&p.toYear!==null?Math.max(0,p.toYear-p.fromYear):0}
  const keep=entries.filter(([,e])=>e.priceM===5);if(keep.length>q.counts[5])throw new Error(id+': more €5M men than the ladder allows')
  for(const [pid] of keep)sel.set(pid,5)
  const rest=entries.filter(([pid])=>!sel.has(pid)).sort((a,b)=>b[1].priceM-a[1].priceM||(by.get(b[0])?.rating??50)-(by.get(a[0])?.rating??50)||tenure(b[0])-tenure(a[0])||a[0].localeCompare(b[0]))
  let at=0;for(const p of [5,4,3,2,1] as const){const take=q.counts[p]-(p===5?keep.length:0);for(let i=0;i<take;i++)sel.set(rest[at++]![0],p)}
  if(at!==rest.length)throw new Error(id+': incomplete')
  let moved=0;for(const [pid,e] of entries){const pr=sel.get(pid)!;if(pr!==e.priceM){moved++;cur.players[pid]={...e,priceM:pr,priceTier:TIER[pr],assignment:'owner-pinned' as const,rationale:`economy v2 (approved 2026-10-10): was €${e.priceM}M. ${e.rationale}`.slice(0,300),reviewedAt:today}}else cur.players[pid]={...e,priceTier:TIER[pr]}}
  cur.quotaMode=q.mode;cur.size=entries.length;cur.quota=Object.fromEntries(Object.entries(q.counts)) as never;delete (cur as {temporaryQuota?:boolean}).temporaryQuota
  for(const e of Object.values(cur.players))delete e.temporaryQuota
  console.log(id,q.mode,entries.length,'moved',moved)}
 doc.version='rumble-economy-v2';writeFileSync(FILE,JSON.stringify(doc,null,1)+'\n')
}
async function main(){
 if(cmd==='apply-v2')await applyV2()
 if(cmd==='freeze'){for(const id of CORE_CLUB_IDS)if(!doc.clubs[id])await freeze(id);writeFileSync(FILE,JSON.stringify(doc,null,1)+'\n')}
 if(cmd==='migrate'){for(const id of CORE_CLUB_IDS){const d=await loadClub(id);if(!d||!doc.clubs[id])continue;let n=0
  for(const p of d.data.players)if(isMan(p.value.name)&&!new Set(mergesFor(id).map(m=>m.drop)).has(p.value.id)&&!doc.clubs[id]!.players[p.value.id]){doc.clubs[id]!.players[p.value.id]={priceM:1,priceTier:'REST',locked:false,assignment:'new-member',rationale:'joined the archive after the list was frozen',reviewedAt:today};n++}
  if(n)console.log(id,'+',n)}writeFileSync(FILE,JSON.stringify(doc,null,1)+'\n')}
 // validate
 let bad=0;const fail=(m:string)=>{bad++;console.log('FAIL',m)}
 for(const id of CORE_CLUB_IDS){const d=await loadClub(id);const c=doc.clubs[id];if(!d||!c){fail(`${id}: no price list`);continue}
  const dropped=new Set(mergesFor(id).map(m=>m.drop)),names=d.data.players.filter(p=>isMan(p.value.name)&&!dropped.has(p.value.id)),ids=new Set(names.map(p=>p.value.id))
  for(const p of names)if(!c.players[p.value.id])fail(`${id}: ${p.value.name} has no price`)
  for(const pid of Object.keys(c.players))if(!ids.has(pid))fail(`${id}: ${pid} is not in the archive`)
  const n=Object.keys(c.players).length,have={1:0,2:0,3:0,4:0,5:0} as Record<number,number>
  for(const e of Object.values(c.players)){if(![1,2,3,4,5].includes(e.priceM))fail(`${id}: price ${e.priceM}`);have[e.priceM]!+=1}
  console.log(id,c.quotaMode,n,JSON.stringify(have))
  const want=quotaFor(n).counts;for(const p of [5,4,3,2,1] as const)if(have[p]!==want[p])fail(`${id}: ${have[p]} at €${p}, economy v2 says ${want[p]}`)
  if((have[5]??0)<1)fail(`${id}: no €5M man`)}
 if(bad)process.exit(1)
}
main()
