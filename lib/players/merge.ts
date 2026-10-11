import 'server-only'
import {loadClubBase,CORE_CLUB_IDS} from '@/lib/clubs/resolver'
import {ratedPool,rumbleReadiness,FIVE} from '@/lib/clubs/rumble'
import {quotaFor} from '@/lib/clubs/rumble-xi/quota'
import {xiReadiness} from '@/lib/clubs/rumble-xi/readiness'
import {FORMATION_IDS} from '@/lib/clubs/rumble-xi/formations'
import {withPlayerOverrides} from './apply'
import {getSnapshot,mergePatch,overrideOf,setSnapshot} from './effective'
import {appendAuditMany,everyRow,findBase,Refusal,withHypothetical,type Actor,type Row} from './service'
import {likeness,suggestKeeper,type Likeness,type Person} from './match'
import {refreshSnapshot} from './snapshot'
import {update} from './store'
import {EMPTY_SNAPSHOT,keyOf,type Override,type Price,type Snapshot} from './types'
/**
 * "These two records are one man." The duplicate leaves the squad; his names become aliases of the man he is, his years widen, his positions join, his sources join
 * (lib/players/apply.ts). Nothing is deleted: the duplicate stays in the desk, marked, and one click undoes it. Chains are refused — a man is merged into a man who is himself kept.
 */
const person=(r:Row):Person=>({id:r.id,name:r.name,nameOriginal:r.nameOriginal,aliases:r.aliases,fromYear:r.fromYear,toYear:r.toYear,wave:r.wave,locked:r.locked,price:r.price,positions:r.positions})
export type Candidate={club:string;clubName:string;a:Row;b:Row;likeness:Likeness;suggest:{keep:string;drop:string;why:string}}
/** every pair at a club that looks like one man, strongest first — exact name/alias collisions and likely spellings; a suggestion list, never applied */
export async function duplicateCandidates(clubs:string[]=CORE_CLUB_IDS,limit=150):Promise<{candidates:Candidate[];total:number}>{
 const rows=(await everyRow(clubs)).filter(r=>!r.removed&&!r.mergedInto),byClub=new Map<string,Row[]>()
 for(const r of rows)byClub.set(r.club,[...(byClub.get(r.club)||[]),r])
 const out:Candidate[]=[]
 const {skeleton,fold}=await import('./match')
 for(const [club,list] of byClub){
  // block by family-name skeleton (and by exact folded name) so a club of 1,400 men is not compared pairwise
  const blocks=new Map<string,Row[]>()
  const add=(k:string,r:Row)=>{if(k.length>=2)blocks.set(k,[...(blocks.get(k)||[]),r])}
  for(const r of list){const seen=new Set<string>()
   for(const n of [r.name,r.nameOriginal,...r.aliases]){const w=fold(n.replace(/\(.*?\)/g,'')).split(' ').filter(Boolean);if(!w.length)continue
    const k='s:'+skeleton(w.at(-1)!);if(!seen.has(k)){seen.add(k);add(k,r)}
    const e='e:'+fold(n);if(e.length>=7&&!seen.has(e)){seen.add(e);add(e,r)}}}
  const done=new Set<string>()
  for(const [,group] of blocks){if(group.length<2||group.length>40)continue
   for(let i=0;i<group.length;i++)for(let j=i+1;j<group.length;j++){const a=group[i]!,b=group[j]!,key=[a.id,b.id].sort().join('|');if(done.has(key))continue;done.add(key)
    const l=likeness(person(a),person(b));if(!l)continue
    const s=suggestKeeper(person(a),person(b));out.push({club,clubName:a.clubName,a,b,likeness:l,suggest:{keep:s.keep.id,drop:s.drop.id,why:s.why}})}}
 }
 out.sort((x,y)=>y.likeness.score-x.likeness.score||x.clubName.localeCompare(y.clubName)||x.a.name.localeCompare(y.a.name))
 return {candidates:out.slice(0,limit),total:out.length}
}
export type MergePreview={keep:Row;drop:Row;result:{name:string;aliases:string[];years:string;positions:string[];price:number;rating:number};warnings:string[];priceChoices:{keep:number;drop:number};quota:{ok:boolean;violations:string[]};readiness:{broke:string[]};canMerge:boolean;blocker:string|null}
const years=(f:number|null,t:number|null)=>f===null?'not recorded':`${f}${t&&t!==f?'–'+t:''}`
export async function mergePreview(club:string,keepId:string,dropId:string):Promise<MergePreview>{
 await refreshSnapshot()
 const kb=await findBase(club,keepId),db=await findBase(club,dropId);if(!kb||!db)throw new Refusal(404,'No such player at this club.')
 const rows=await everyRow([club]),keep=rows.find(r=>r.id===keepId)!,drop=rows.find(r=>r.id===dropId)!
 let blocker:string|null=null
 if(keepId===dropId)blocker='A man cannot be merged into himself.'
 else if(keep.mergedInto)blocker=`${keep.name} is itself merged into another record — undo that first, or keep the other record.`
 else if(rows.some(r=>r.mergedInto===dropId))blocker=`${drop.name} already has duplicates merged into him — keep him, or undo those merges.`
 else if(keep.removed||drop.removed)blocker='A removed man cannot be part of a merge — restore him first.'
 const warnings:string[]=[]
 const fams=(r:Row)=>new Set(r.positions)
 if(keep.positions.length&&drop.positions.length&&![...fams(drop)].some(p=>fams(keep).has(p)))warnings.push(`They have no position in common (${keep.positions.join('/')} vs ${drop.positions.join('/')}) — check it is one man.`)
 if(keep.fromYear!==null&&drop.fromYear!==null){const a1=keep.fromYear,a2=keep.toYear??a1,b1=drop.fromYear,b2=drop.toYear??b1,gap=Math.max(a1,b1)-Math.min(a2,b2);if(gap>6)warnings.push(`Their years are ${gap} years apart (${years(keep.fromYear,keep.toYear)} vs ${years(drop.fromYear,drop.toYear)}).`)}
 if(keep.price!==drop.price)warnings.push(`Prices differ (€${keep.price}M vs €${drop.price}M): choose which one the man keeps.`)
 if(drop.locked)warnings.push(`${drop.name} is locked/pinned (${drop.lockReason||'pinned'}) — his price is not carried over unless you choose it.`)
 const names=[...new Set([keep.name,drop.name,...keep.aliases,...drop.aliases,drop.nameOriginal].filter(n=>n&&n!==keep.name))]
 const fr=[keep.fromYear,drop.fromYear].filter((x):x is number=>x!==null),to=[keep.toYear,drop.toYear].filter((x):x is number=>x!==null)
 // what the club looks like after: the merge laid over the snapshot, judged once
 const raw=await loadClubBase(club);let quota={ok:true,violations:[] as string[]},broke:string[]=[]
 if(raw&&!blocker){
  const merged:Override={mergedInto:keepId,rev:(overrideOf(club,dropId)?.rev??0)+1,by:'preview',at:'',reason:''}
  const snap:Snapshot={...getSnapshot(),overrides:{...getSnapshot().overrides,[keyOf(club,dropId)]:merged}}
  const r=withHypothetical(snap,()=>{const pool=ratedPool(withPlayerOverrides(club,raw.data)),have:Record<number,number>={1:0,2:0,3:0,4:0,5:0};for(const c of pool)have[c.price]!+=1
   const want=quotaFor(pool.length).counts as Record<number,number>,v=[5,4,3,2,1].filter(p=>have[p]!==want[p]).map(p=>`€${p}M: ${have[p]} men, the ladder says ${want[p]}`),b:string[]=[]
   if(!rumbleReadiness(pool,FIVE).playable)b.push('five-a-side');for(const f of FORMATION_IDS)if(!xiReadiness(pool,f,6).ready)b.push(f);return {v,b}})
  quota={ok:!r.v.length,violations:r.v};broke=r.b}
 return {keep,drop,result:{name:keep.name,aliases:names,years:years(fr.length?Math.min(...fr):null,to.length?Math.max(...to):null),positions:[...new Set([...keep.positions,...drop.positions])],price:keep.price,rating:keep.rating},
  warnings,priceChoices:{keep:keep.price,drop:drop.price},quota,readiness:{broke},canMerge:!blocker&&!broke.length,blocker}
}
export type MergeOpts={reason:string;price?:'keep'|'drop'|'higher';confirmQuota?:boolean;ownerException?:boolean;expectedRev?:number}
export async function mergePlayers(club:string,keepId:string,dropId:string,o:MergeOpts,who:Actor){
 if(!o.reason||o.reason.trim().length<3)throw new Refusal(400,'A reason is required to merge two records.')
 const pv=await mergePreview(club,keepId,dropId)
 if(pv.blocker)throw new Refusal(422,pv.blocker)
 if(pv.readiness.broke.length)throw new Refusal(422,`This merge would stop a game working (${pv.readiness.broke.join(', ')}). Nothing was written.`,pv)
 const choice=o.price??'keep',price=(choice==='drop'?pv.priceChoices.drop:choice==='higher'?Math.max(pv.priceChoices.keep,pv.priceChoices.drop):pv.priceChoices.keep) as Price
 const priceMoves=price!==pv.keep.price
 if(priceMoves&&pv.keep.locked&&!(o.ownerException&&who.role==='owner'))throw new Refusal(403,'The man you keep has a locked or pinned price: changing it needs the owner’s exception.',pv)
 if(!pv.quota.ok&&!o.confirmQuota)throw new Refusal(422,'This leaves the club off its price ladder. Confirm to publish it as an exception.',pv)
 await refreshSnapshot(true)
 const at=new Date().toISOString(),reason=`merge ${dropId} into ${keepId}: ${o.reason.trim()}`,events:Parameters<typeof appendAuditMany>[0]=[]
 let revision=0
 const snap=await update<Snapshot>('published.json',EMPTY_SNAPSHOT,s=>{
  const ov={...s.overrides},kd=keyOf(club,dropId),kk=keyOf(club,keepId);events.length=0
  if((ov[kd]?.rev??0)!==(overrideOf(club,dropId)?.rev??0))throw new Refusal(409,'One of the two records changed while merging. Open the merge again.')
  const dBefore=ov[kd]??null,dAfter={...(dBefore??{}),mergedInto:keepId,rev:(dBefore?.rev??0)+1,by:who.actor,at,reason} as Override
  ov[kd]=dAfter;events.push({action:'publish',club,player:dropId,before:dBefore,after:dAfter,reason,revision:s.revision+1})
  if(priceMoves){const kBefore=ov[kk]??null,kAfter=mergePatch(kBefore,{price},{by:who.actor,at,reason});if(kAfter)ov[kk]=kAfter;events.push({action:'publish',club,player:keepId,before:kBefore,after:kAfter,reason,revision:s.revision+1})}
  revision=s.revision+1;return {revision,updatedAt:at,overrides:ov}})
 setSnapshot(snap);await appendAuditMany(events,who)
 return {revision,keep:keepId,drop:dropId,price}
}
/** undo a merge: the duplicate returns to the squad exactly as he was (a new, audited change) */
export async function unmerge(club:string,dropId:string,reason:string,who:Actor){
 if(!reason||reason.trim().length<3)throw new Refusal(400,'A reason is required.')
 await refreshSnapshot(true);const cur=overrideOf(club,dropId)??null;if(!cur?.mergedInto)throw new Refusal(404,'This record is not merged.')
 const at=new Date().toISOString(),next=mergePatch(cur,{mergedInto:null},{by:who.actor,at,reason:'unmerge: '+reason.trim()});let revision=0
 const snap=await update<Snapshot>('published.json',EMPTY_SNAPSHOT,s=>{if((s.overrides[keyOf(club,dropId)]?.rev??0)!==cur.rev)throw new Refusal(409,'This record changed while undoing the merge.');const ov={...s.overrides};if(next)ov[keyOf(club,dropId)]=next;else delete ov[keyOf(club,dropId)];revision=s.revision+1;return {revision,updatedAt:at,overrides:ov}})
 setSnapshot(snap);await appendAuditMany([{action:'publish',club,player:dropId,before:cur,after:next,reason:'unmerge: '+reason.trim(),revision}],who);return {revision}
}
