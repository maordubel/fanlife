/**
 * DROP INTO scripts/rumble/generate-price-review-v2.ts IN FANLIFE REPOSITORY.
 * READ-ONLY: Creates research output in .delivery/rumble-pricing-v2-review/.
 * Run: node --require ./scripts/master/server-only.cjs --import tsx scripts/rumble/generate-price-review-v2.ts
 * No production prices are overwritten by this script.
 */
import {loadClub,CORE_CLUB_IDS} from '@/lib/clubs/resolver'
import {rawPool} from '@/lib/clubs/rumble'
import {extraPositions} from '@/lib/clubs/rumble-xi/positions'
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs'
async function main(){
const old=JSON.parse(readFileSync('content/generated/rumble-prices-v3.json','utf8')) as {version:string;clubs:Record<string,{players:Record<string,{priceM:number;locked?:boolean;assignment?:string;rationale?:string;reviewedAt?:string}>}>}
const outDir='.delivery/rumble-pricing-v2-review';mkdirSync(outDir,{recursive:true})
type Tier=1|2|3|4|5
function quota(n:number):Record<Tier,number>{
 const q:Record<Tier,number>={1:0,2:0,3:0,4:0,5:0};if(!n)return q
 if(n>=130){q[5]=10;q[4]=Math.max(20,Math.round(n*.08));q[3]=Math.max(40,Math.round(n*.20));q[2]=Math.max(60,Math.round(n*.35));for(const k of [2,3,4] as const)q[k]=Math.max(0,q[k]-Math.max(0,q[5]+q[4]+q[3]+q[2]-n));q[1]=n-q[5]-q[4]-q[3]-q[2];return q}
 const weights:[[Tier,number],[Tier,number],[Tier,number],[Tier,number],[Tier,number]]=[[5,.10],[4,.10],[3,.22],[2,.32],[1,.26]]
 const parts=weights.map(([price,w])=>({price,x:n*w,whole:Math.floor(n*w)}));for(const p of parts)q[p.price]=p.whole
 let left=n-parts.reduce((s,p)=>s+p.whole,0);parts.sort((a,b)=>(b.x-b.whole)-(a.x-a.whole)||b.price-a.price)
 for(let i=0;i<left;i++)q[parts[i]!.price]++
 if(q[5]===0){const donor=([1,2,3,4] as const).find(k=>q[k]>0);if(donor){q[donor]--;q[5]++}}return q
}
const esc=(v:unknown)=>'"'+String(v??'').replaceAll('"','""')+'"'
const lines=[['Club ID','Player ID','English name','Position','From year','To year','CA estimate / rating','Current €M','Proposed €M','Change €M','Was locked','Prior assignment','Reason','Evidence status']]
const table=structuredClone(old);table.version='rumble-economy-v2-REVIEW-ONLY'
const summaries:string[]=[]
for(const id of CORE_CLUB_IDS){
 const club=await loadClub(id);if(!club||!old.clubs[id])throw Error('Unresolved club '+id)
 const src=old.clubs[id]!,dst=table.clubs[id]!,players=rawPool(club.data,{extra:extraPositions(id)})
 const map=new Map(players.map(p=>[p.id,p]));const entries=Object.entries(src.players);const q=quota(entries.length)
 // Preserve all existing €5M icons. For full clubs, this must be exactly ten.
 const preserved=entries.filter(([,e])=>e.priceM===5);if(preserved.length>q[5])throw Error('Too many legacy €5M icons at '+id)
 const selected=new Map<string,Tier>();for(const [pid] of preserved)selected.set(pid,5)
 const remaining=entries.filter(([pid])=>!selected.has(pid)).sort((a,b)=>{
  const aRating=map.get(a[0])?.rating??50,bRating=map.get(b[0])?.rating??50
  const aTenure=(map.get(a[0])?.fromYear!=null&&map.get(a[0])?.toYear!=null)?Math.max(0,(map.get(a[0])!.toYear!-map.get(a[0])!.fromYear!)):0
  const bTenure=(map.get(b[0])?.fromYear!=null&&map.get(b[0])?.toYear!=null)?Math.max(0,(map.get(b[0])!.toYear!-map.get(b[0])!.fromYear!)):0
  // Existing editorial tier is useful evidence, but not an absolute professional fact.
  return (b[1].priceM-a[1].priceM)||bRating-aRating||(bTenure-aTenure)||a[0].localeCompare(b[0])
 })
 let at=0;for(const p of [5,4,3,2,1] as const){const take=q[p]-(p===5?preserved.length:0);for(let i=0;i<take;i++){const e=remaining[at++];if(!e)throw Error('Tier overflow at '+id);selected.set(e[0],p)}}
 if(at!==remaining.length||selected.size!==entries.length)throw Error('Incomplete pricing at '+id)
 const count={1:0,2:0,3:0,4:0,5:0};let changed=0,lockedChanges=0
 for(const [pid,e] of entries){const player=map.get(pid);const proposed=selected.get(pid)!;count[proposed]++
  const change=proposed-e.priceM;if(change)changed++;if(change&&e.locked)lockedChanges++
  lines.push([id,pid,player?.name??'',player?.position??'',player?.fromYear??'',player?.toYear??'',player?.rating??'',e.priceM,proposed,change,e.locked?'YES':'NO',e.assignment??'',e.rationale??'',player?'player found in rawPool':'CHECK: no matching current pool record'])
  dst.players[pid]={...dst.players[pid],priceM:proposed,priceTier:({1:'REST',2:'REGULAR',3:'LEADING',4:'STAR',5:'ICON'} as Record<number,string>)[proposed],rationale:(e.rationale??'')+' | proposed economy v2 — REQUIRES REVIEW'}
 }
 ;(dst as any).quota=Object.fromEntries(Object.entries(q));(dst as any).size=entries.length
 summaries.push([id,entries.length,changed,lockedChanges,q[5],q[4],q[3],q[2],q[1]].join(','))
}
writeFileSync(outDir+'/FULL_PLAYER_PRICING_REVIEW.csv',lines.map(r=>r.map(esc).join(',')).join('\n')+'\n')
writeFileSync(outDir+'/PRICE_PROPOSAL_REVIEW_ONLY.json',JSON.stringify(table,null,2)+'\n')
writeFileSync(outDir+'/SUMMARY.csv','club,count,changes,changesToLocked,price5,price4,price3,price2,price1\n'+summaries.join('\n')+'\n')
console.log('REVIEW FILES ONLY',outDir,'rows:',lines.length-1)
}
main()
