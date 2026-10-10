import {loadClub,CORE_CLUB_IDS} from '@/lib/clubs/resolver'
import {rawPool} from '@/lib/clubs/rumble'
import {extraPositions} from '@/lib/clubs/rumble-xi/positions'
import {quotaFor} from '@/lib/clubs/rumble-xi/quota'
import {readFileSync,writeFileSync} from 'node:fs'

/**
 * Explicit, reviewable reprice — NEVER run in normal build.
 * Commands:
 *   npx tsx scripts/rumble/reprice-v2.ts dry-run
 *   npx tsx scripts/rumble/reprice-v2.ts apply
 *
 * Preserves all owner-pinned €5M icons, all manual pins where possible,
 * and prioritizes existing tier + individual rating. Creates a human-readable
 * diff before any output. Applying requires manual approval of the diff.
 */
const FILE='content/generated/rumble-prices-v3.json'
const raw=JSON.parse(readFileSync(FILE,'utf8'))
const cmd=process.argv[2]??'dry-run'
if(!['dry-run','apply'].includes(cmd))throw Error('expected dry-run or apply')
const TIER:Record<number,string>={1:'REST',2:'REGULAR',3:'LEADING',4:'STAR',5:'ICON'}
const report:string[]=['club,id,name,oldPrice,newPrice,assignment']
for(const id of CORE_CLUB_IDS){
 const loaded=await loadClub(id)
 const c=raw.clubs[id]
 if(!loaded||!c)throw Error('Club missing from price table: '+id)
 const members=rawPool(loaded.data,{extra:extraPositions(id)})
 const byId=new Map(members.map(p=>[p.id,p]))
 const people=Object.entries(c.players) as [string,{priceM:number;locked:boolean;assignment:string;priceTier:string;rationale:string;reviewedAt:string;temporaryQuota?:boolean}][]
 const quota=quotaFor(people.length),remaining={...quota.counts}
 const next=new Map<string,number>()
 const pinned=people.filter(([,v])=>v.locked)
 // Locked records are explicit editorial decisions; never silently override.
 for(const [pid,v] of pinned){
  if(remaining[v.priceM as 1|2|3|4|5]<=0)throw Error(id+': too many pinned players at €'+v.priceM)
  next.set(pid,v.priceM);remaining[v.priceM as 1|2|3|4|5]--
 }
 const rest=people.filter(([pid])=>!next.has(pid)).sort((a,b)=>{
  const ratingA=byId.get(a[0])?.rating??50,ratingB=byId.get(b[0])?.rating??50
  return b[1].priceM-a[1].priceM||ratingB-ratingA||a[0].localeCompare(b[0])
 })
 let at=0
 for(const cost of [5,4,3,2,1] as const){
  while(remaining[cost]-->0){
   const x=rest[at++];if(!x)throw Error('not enough players for '+id)
   next.set(x[0],cost)
  }
 }
 if(at!==rest.length)throw Error(id+': unassigned members')
 const count={1:0,2:0,3:0,4:0,5:0} as Record<number,number>
 for(const [pid,v] of people){
  const p=next.get(pid)!
  count[p]++
  if(v.priceM!==p)report.push([id,pid,JSON.stringify(byId.get(pid)?.name??''),v.priceM,p,v.assignment].join(','))
  if(cmd==='apply'&&v.priceM!==p){v.priceM=p;v.priceTier=TIER[p];v.rationale+=' | economy-v2 approved rebalance 2026-10-10'}
 }
 for(const cost of [1,2,3,4,5] as const)if(count[cost]!==quota.counts[cost])throw Error(id+': quota mismatch €'+cost)
 if(cmd==='apply'){c.quotaMode=quota.mode;c.quota=Object.fromEntries(Object.entries(quota.counts));c.size=people.length}
}
writeFileSync('rumble-pricing-v2-diff.csv',report.join('\n')+'\n')
if(cmd==='apply'){
 raw.version='rumble-economy-v2'
 writeFileSync(FILE,JSON.stringify(raw,null,1)+'\n')
}
console.log(cmd,report.length-1,'proposed changes; diff: rumble-pricing-v2-diff.csv')
