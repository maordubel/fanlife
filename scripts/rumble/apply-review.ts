import {isMan} from '@/lib/clubs/rumble-xi/names'
import {loadClub,CORE_CLUB_IDS} from '@/lib/clubs/resolver'
import {mergesFor} from '@/lib/clubs/rumble-xi/merges'
import {quotaFor} from '@/lib/clubs/rumble-xi/quota'
import {norm} from '@/lib/fixtures/names'
import {readFileSync,writeFileSync} from 'node:fs'
/**
 * One-off reconciliation of the owner's reviewed workbook (2026-10-10) with the archive:
 *  1. men written twice (a Greek record and a Latin record with the same English name and compatible years) become ONE card (rumble-merges.json)
 *  2. the workbook's price for a man becomes a PIN (rumble-pins.json), matched by his exact original name (rule 7) — never by the workbook's row number;
 *     an existing owner pin (THE WORKER's own ten) is never overwritten, and a pin that would break the club's ladder is reported, not applied.
 * Then: `npm run rumble:names`, delete the club lists in rumble-prices-v3.json, `npm run rumble:prices -- freeze`, `-- validate`.
 */
const rev=JSON.parse(readFileSync('content/manual/rumble-review-2026-10-10.json','utf8')) as {club:string;original:string;priceM:1|2|3|4|5|null;priceStatus:string}[]
const names=JSON.parse(readFileSync('content/generated/player-names-en.json','utf8')) as Record<string,Record<string,{name:string;how:string}>>
const MERGES='content/manual/rumble-merges.json',PINS='content/manual/rumble-pins.json'
const merges=JSON.parse(readFileSync(MERGES,'utf8')) as Record<string,{keep:string;drop:string;why:string}[]>
const pins=JSON.parse(readFileSync(PINS,'utf8')) as Record<string,Record<string,{priceM:number;reason:string;decidedOn:string}>>
async function main(){
 for(const id of CORE_CLUB_IDS){const d=await loadClub(id);if(!d)continue
  const all=d.data.players.map(f=>f.value).filter(p=>isMan(p.name)),byId=new Map(all.map(p=>[p.id,p]))
  // 1. twins
  const taken=new Set(merges[id]!.flatMap(m=>[m.keep,m.drop])),groups=new Map<string,string[]>()
  for(const p of all){const n=(names[id]?.[p.id]?.name??'').replace(/ (I{1,3}|IV|\(\d{4}\))$/,'').toLowerCase();if(n&&!taken.has(p.id))groups.set(n,[...(groups.get(n)||[]),p.id])}
  let added=0
  for(const [n,ids] of groups){if(ids.length!==2)continue
   const [a,b]=ids.map(i=>byId.get(i)!) as [typeof all[0],typeof all[0]]
   const compat=(a.fromYear===b.fromYear)||a.fromYear===null||b.fromYear===null
   if(!compat)continue
   const hasPos=(p:typeof a)=>(p.positions?.length??0)>0
   const keep=hasPos(a)&&!hasPos(b)?a:hasPos(b)&&!hasPos(a)?b:(names[id]![a.id]!.how==='archive-latin'?a:b),drop=keep===a?b:a
   merges[id]!.push({keep:keep.id,drop:drop.id,why:`"${a.name}" and "${b.name}": one man, written twice in the archive (same English name "${n}", years compatible)`});added++}
  const dropped=new Set(merges[id]!.map(m=>m.drop)),keepOf=new Map(merges[id]!.map(m=>[m.drop,m.keep]))
  // 2. pins
  const idx=new Map<string,string[]>()
  for(const p of all)for(const nm of [p.name,...p.aliases])idx.set(norm(nm),[...new Set([...(idx.get(norm(nm))||[]),keepOf.get(p.id)??p.id])])
  const size=all.filter(p=>!dropped.has(p.id)).length,q=quotaFor(size).counts,pinned=pins[id]??={},use:Record<number,number>={1:0,2:0,3:0,4:0,5:0}
  for(const e of Object.values(pinned))use[e.priceM]!+=1
  let ok=0,skip:string[]=[],miss=0
  for(const r of rev.filter(x=>x.club===id)){const ids=idx.get(norm(r.original))||[]
   if(ids.length!==1){miss++;continue}
   const pid=ids[0]!;if(pinned[pid]){continue}
   if(!r.priceM||r.priceM===1||r.priceStatus==='pending')continue // €1M is the default; a pin is only needed to hold a higher price
   let price=r.priceM;while(price>2&&use[price]!>=q[price])price=(price-1) as 2|3|4|5 // the owner's price if the ladder has room, else the next rung down
   if(use[price]!>=q[price]){skip.push(`${r.original} €${r.priceM}M`);continue}
   if(price!==r.priceM)skip.push(`${r.original} €${r.priceM}M→€${price}M`)
   pinned[pid]={priceM:price,reason:`owner pricing review (8-club consolidated CSV) ${r.priceStatus==='full'?'(full ladder)':'(proportional)'}`,decidedOn:'2026-10-10'};use[price]!+=1;ok++}
  console.log(id,'size',size,'twins merged',added,'pins +',ok,'unmatched',miss,'over-quota',skip.length,skip.slice(0,4))}
 writeFileSync(MERGES,JSON.stringify(merges,null,1)+'\n');writeFileSync(PINS,JSON.stringify(pins,null,1)+'\n')
}
main()
