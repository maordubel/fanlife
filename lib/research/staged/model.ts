import {createHash} from 'node:crypto'
import {core,sameClub} from '@/lib/fixtures/names'

/**
 * THE STAGED LINE (research desk, 10.11.2026). A club that has no repository pack still has material: the daily pull
 * writes UEFA's own record of its European ties (`research-staging/<id>/wave-auto.json`) and the history wave holds
 * its league results (`wave-history-*.json`). Until now none of it reached a game — the files were collected every
 * day and read by nobody. This module turns those files into BATCHES the owner can say yes to, and into the pack a
 * yes produces. Pure: no fs, no network, no React; `pack.ts` is the server side.
 *
 * Rules carried over, not invented here:
 *  - UEFA is sufficient for its own competitions (rule 102): an approved UEFA match needs no further approval.
 *  - An owner's blanket approval promotes records, not doubts (rule 114 §2): a record marked `conflictFree:false`
 *    stays in review, and a promoted record carries confidence 2 at most.
 *  - Nobody approves in the owner's name (rule 92 §4): a decision is written only from a signed-in owner session,
 *    with the date, and a batch is pinned to the content it was approved for (`hash`). A file that changes after the
 *    yes waits for a new yes — it is never carried over silently.
 */
type Raw=Record<string,unknown>
export type StagedFact={id:string;value:Raw;sources:string[];confidence:number;status:string;researchedAt?:string|null;approvedAt?:string|null;approvedBy?:string|null;conflictFree?:boolean;parserCertainty?:string;notes?:string}
export type StagedSource={id:string;title?:string;url?:string;publisher?:string;access?:string;checkedAt?:string}
export type StagedFile={name:string;data:{sources?:StagedSource[];matches?:StagedFact[];archive?:StagedFact[];players?:StagedFact[];rivals?:StagedFact[]}}
export type StagedInput={clubId:string;names:string[];files:StagedFile[]}
export type BatchDecision={id:string;hash:string;at:string;by:string}
export type RivalDecision={name:string;aliases:string[];at:string;by:string;sources:string[]}
/** The full opening (scripts/clubs/promote.ts via .github/workflows/club-open.yml): written by the runner, read by the desk. */
export type Promotion={state:'running'|'merged'|'failed';at:string;pr?:number|null;reason?:string|null}
export type StagedDecisions={schemaVersion:1;clubId:string;batches:BatchDecision[];rival:RivalDecision|null;updatedAt:string;promotion?:Promotion|null}
export const emptyDecisions=(clubId:string):StagedDecisions=>({schemaVersion:1,clubId,batches:[],rival:null,updatedAt:''})

export type BatchKind='history'|'squad'
export type Batch={id:string;kind:BatchKind;file:string;hash:string;title:string;detail:string;count:number;held:number;publishers:string[];span:{from:string|null;to:string|null};sample:{label:string;url:string|null}[]}

const arr=<T,>(v:T[]|undefined|null):T[]=>Array.isArray(v)?v:[]
const str=(v:unknown)=>typeof v==='string'?v:''
const obj=(v:unknown):Raw=>v&&typeof v==='object'&&!Array.isArray(v)?v as Raw:{}
const hash=(s:string)=>createHash('sha256').update(s).digest('hex').slice(0,16)
const day=(iso:string)=>/^\d{4}-\d{2}-\d{2}/.test(iso)?iso.slice(0,10):new Date().toISOString().slice(0,10)
export const isUefaFile=(name:string)=>name==='wave-auto.json'
/** files that carry facts a person must approve (everything but the UEFA pull, the config and the collector's manifest) */
export const isReviewFile=(name:string)=>name.startsWith('wave-')&&name.endsWith('.json')&&!isUefaFile(name)

/** The owner's text on a promoted record. Starts with "owner" so `mergeWave` treats it as a manual approval. */
export const ownerApproval=(by:string,at:string)=>`owner · ${by||'Maor'} on the research desk ${day(at)}`

const sourceMap=(input:StagedInput)=>{const m=new Map<string,StagedSource>();for(const f of input.files)for(const s of arr(f.data.sources))if(s?.id&&!m.has(s.id))m.set(s.id,s);return m}
const publisherOf=(s:StagedSource|undefined)=>s?.publisher||(s?.url?(()=>{try{return new URL(s.url!).hostname.replace(/^www\./,'')}catch{return 'unknown'}})():'unknown')

/** What a review file holds that is still waiting: its matches and archive events in `review`. */
function pending(f:StagedFile){return [...arr(f.data.matches),...arr(f.data.archive)].filter(x=>x&&x.status==='review')}
const promotable=(x:StagedFact)=>x.conflictFree!==false

/** The approved UEFA matches with a full eleven — the material the squad batch is read from. */
export function uefaMatches(input:StagedInput):StagedFact[]{
 const f=input.files.find(x=>isUefaFile(x.name));return arr(f?.data.matches).filter(m=>m.status==='approved')
}
type SquadMan={name:string;from:number;to:number;apps:number;positions:Set<string>;sources:string[]}
const POS:Record<string,string>={GOALKEEPER:'GK',DEFENDER:'DF',MIDFIELDER:'MF',FORWARD:'FW',GK:'GK',DF:'DF',MF:'MF',FW:'FW'}
const nameKey=(n:string)=>n.normalize('NFKC').trim().toLowerCase().replace(/\s+/g,' ')
/**
 * The men UEFA's own team sheets name for this club: every starter and substitute of an approved UEFA match, by the
 * exact name UEFA prints (rule 7 — never fuzzy), with the first and last season they were named and the position UEFA
 * gave when the pull recorded one (`value.squad[].pos`). A man is read, never inferred: no position → none.
 */
export function squadFromUefa(input:StagedInput):SquadMan[]{
 const men=new Map<string,SquadMan>()
 for(const m of uefaMatches(input)){
  const v=m.value,lineup=arr(v.lineup as string[]),bench=arr(v.bench as string[])
  if(lineup.length!==11)continue
  const y=Number(str(v.on).slice(0,4));if(!y)continue
  const pos=new Map(arr(v.squad as Raw[]).map(s=>[nameKey(str(s.name)),POS[str(s.pos).toUpperCase()]||'']))
  for(const name of [...lineup,...bench]){
   if(typeof name!=='string'||!name.trim())continue
   const k=nameKey(name),cur=men.get(k)??{name:name.trim(),from:y,to:y,apps:0,positions:new Set<string>(),sources:[]}
   cur.from=Math.min(cur.from,y);cur.to=Math.max(cur.to,y);cur.apps++
   const p=pos.get(k);if(p)cur.positions.add(p)
   for(const s of m.sources)if(!cur.sources.includes(s)&&cur.sources.length<3)cur.sources.push(s)
   men.set(k,cur)
  }
 }
 return [...men.values()].sort((a,b)=>b.apps-a.apps||a.name.localeCompare(b.name))
}

/** Every batch the owner can approve for this club, newest material first. */
export function stagedBatches(input:StagedInput):Batch[]{
 const src=sourceMap(input),out:Batch[]=[]
 for(const f of input.files.filter(x=>isReviewFile(x.name))){
  const rows=pending(f);if(!rows.length)continue
  const ok=rows.filter(promotable),days=ok.map(r=>str(r.value.on)).filter(Boolean).sort()
  const pubs=[...new Set(ok.flatMap(r=>r.sources.map(id=>publisherOf(src.get(id)))))].sort()
  const comps=[...new Set(ok.map(r=>str(r.value.competition)).filter(Boolean))]
  out.push({id:`history:${f.name}`,kind:'history',file:f.name,hash:hash(JSON.stringify(ok.map(r=>[r.id,r.value]).sort())),
   title:`${ok.length} ${ok.length===1?'result':'results'} from ${pubs.join(' + ')||'the staged history'}`,
   detail:`Dates and scores${comps.length?` — ${comps.length>3?`${comps.slice(0,3).join(', ')} and ${comps.length-3} more`:comps.join(', ')}`:''}. Each is a dated match record; scorers and line-ups are not part of it.`,
   count:ok.length,held:rows.length-ok.length,publishers:pubs,span:{from:days[0]??null,to:days.at(-1)??null},
   sample:ok.slice(0,5).map(r=>({label:`${str(r.value.on)} · ${str(r.value.name)}`,url:src.get(r.sources[0]!)?.url??null}))})
 }
 const men=squadFromUefa(input)
 if(men.length){
  const firstSrc=men[0]!.sources[0],years=men.flatMap(m=>[m.from,m.to])
  out.push({id:'squad:uefa',kind:'squad',file:'wave-auto.json',hash:hash(JSON.stringify(men.map(m=>[m.name,m.from,m.to,[...m.positions].sort()]))),
   title:`${men.length} men named on UEFA team sheets`,
   detail:`Every starter and substitute UEFA printed for this club, by the exact name UEFA uses, with the seasons they were named${men.some(m=>m.positions.size)?' and the position UEFA gave':''}. ${men.filter(m=>m.positions.size).length} of ${men.length} carry a position.`,
   count:men.length,held:0,publishers:['UEFA'],span:{from:String(Math.min(...years)),to:String(Math.max(...years))},
   sample:men.slice(0,5).map(m=>({label:`${m.name} · ${m.from===m.to?m.from:`${m.from}–${m.to}`} · ${m.apps} ${m.apps===1?'sheet':'sheets'}`,url:firstSrc?src.get(m.sources[0]!)?.url??null:null}))})
 }
 return out
}

/** A decision counts only for the exact content it was given for. */
export function approvedBatchIds(batches:Batch[],d:StagedDecisions|null):Set<string>{
 const ok=new Set<string>();if(!d)return ok
 for(const b of batches)if(d.batches.some(x=>x.id===b.id&&x.hash===b.hash))ok.add(b.id)
 return ok
}
/** Batches whose approval was for older content: the file changed after the yes. */
export function staleBatchIds(batches:Batch[],d:StagedDecisions|null):Set<string>{
 const s=new Set<string>();if(!d)return s
 for(const b of batches)if(d.batches.some(x=>x.id===b.id&&x.hash!==b.hash))s.add(b.id)
 return s
}

/** Is this side the club itself? Exact by the club's names, or — inside the club's OWN staged file, where one side is always
 * the club — the side whose words contain all of one of its names' words ("PAOK Saloniki" for "PAOK"). Both or neither → skipped. */
const words=(s:string)=>core(s).split(' ').filter(Boolean)
export function ours(names:string[],side:string){const w=new Set(words(side));return names.some(n=>sameClub(n,side)||(words(n).length>0&&words(n).every(x=>w.has(x))))}
export type RivalCandidate={name:string;meetings:number;sources:string[];lastOn:string|null}
/**
 * Who this club meets most, from its own staged match records (approved or waiting). The derby gate needs a
 * HUMAN-approved primary rival (gate threshold): the list only orders the choice, the owner makes it.
 */
export function rivalCandidates(input:StagedInput,limit=5):RivalCandidate[]{
 const tally=new Map<string,RivalCandidate&{key:string}>()
 for(const f of input.files)for(const m of arr(f.data.matches)){
  const v=m.value,home=str(v.home)||str(v.name).split(/\s+\d+\s*[-–:]\s*\d+\s+/)[0]||'',away=str(v.away)||str(v.name).split(/\s+\d+\s*[-–:]\s*\d+\s+/)[1]||''
  if(!home||!away)continue
  const h=ours(input.names,home),a=ours(input.names,away)
  if(h===a)continue
  const us=h?'home':'away'
  const opp=(us==='home'?away:home).replace(/\s+\([^)]*\)$/,'').trim(),key=core(opp);if(!key)continue
  const cur=tally.get(key)??{key,name:opp,meetings:0,sources:[],lastOn:null}
  cur.meetings++;const on=str(v.on);if(on&&(!cur.lastOn||on>cur.lastOn))cur.lastOn=on
  for(const s of m.sources)if(!cur.sources.includes(s)&&cur.sources.length<2)cur.sources.push(s)
  tally.set(key,cur)
 }
 return [...tally.values()].filter(c=>c.meetings>=2).sort((a,b)=>b.meetings-a.meetings||a.name.localeCompare(b.name)).slice(0,limit).map(({key:_k,...c})=>c)
}

/**
 * The pack this club's staged material makes, given the owner's decisions. Without a single decision it already
 * holds UEFA's approved matches (rule 102); every other record is in it only because its batch was approved for
 * this exact content. The compiler still judges every record.
 */
export function composeStaged(input:StagedInput,d:StagedDecisions|null,mergeHistory:(pack:Raw,wave:Raw)=>{pack:Raw;conflicts:unknown[]}):{pack:Raw;conflicts:unknown[];approved:string[]}{
 const batches=stagedBatches(input),ok=approvedBatchIds(batches,d),decided=new Map((d?.batches||[]).map(b=>[b.id,b]))
 const allSources=[...sourceMap(input).values()]
 let pack:Raw={schemaVersion:1,clubId:input.clubId,contentLocale:'en',sources:allSources,archive:[],players:[],rivals:[],matches:uefaMatches(input),trophies:[],seasons:[]}
 const conflicts:unknown[]=[]
 for(const f of input.files.filter(x=>isReviewFile(x.name))){
  const b=batches.find(x=>x.id===`history:${f.name}`);if(!b||!ok.has(b.id))continue
  const at=decided.get(b.id)!.at,by=decided.get(b.id)!.by
  const lift=(x:StagedFact):StagedFact=>x.status==='review'&&promotable(x)?{...x,status:'approved',confidence:Math.min(2,Number(x.confidence)||2),approvedAt:day(at),approvedBy:ownerApproval(by,at),researchedAt:x.researchedAt||day(at)}:x
  const wave={sources:arr(f.data.sources),matches:arr(f.data.matches).map(lift),archive:arr(f.data.archive).map(lift)}
  const r=mergeHistory(pack,wave as unknown as Raw);pack=r.pack;conflicts.push(...r.conflicts)
 }
 if(ok.has('squad:uefa')){
  const at=decided.get('squad:uefa')!.at,by=decided.get('squad:uefa')!.by
  const players=squadFromUefa(input).map(m=>({id:`p-u-${hash(nameKey(m.name))}`,value:{name:m.name,sport:'football',positions:[...m.positions].sort(),fromYear:m.from,toYear:m.to,aliases:[]},sources:m.sources,confidence:2,status:'approved',researchedAt:day(at),approvedAt:day(at),approvedBy:ownerApproval(by,at),parserCertainty:'high',conflictFree:true,notes:`Named on ${m.apps} UEFA team ${m.apps===1?'sheet':'sheets'} for this club.`}))
  pack={...pack,players:[...arr(pack.players as unknown[]),...players],mysteries:squadMysteries(input,at,by)}
 }
 if(d?.rival){
  const r=d.rival
  pack={...pack,rivals:[{id:'r-desk',value:{name:r.name,aliases:r.aliases,note:'The primary rival, chosen by the owner on the research desk.'},sources:r.sources,confidence:2,status:'approved',researchedAt:day(r.at),approvedAt:day(r.at),approvedBy:ownerApproval(r.by,r.at),parserCertainty:'high',conflictFree:true,notes:'Chosen from the clubs this club meets most in its own match records.'}]}
 }
 return {pack,conflicts,approved:[...ok]}
}

const MONTHS=['January','February','March','April','May','June','July','August','September','October','November','December']
const POS_TEXT:Record<string,string>={GK:'A goalkeeper.',DF:'A defender.',MF:'A midfielder.',FW:'A forward.'}
/**
 * Blind Cow targets from the same team sheets (the rules of scripts/ingest/clubs/uefa-mysteries.ts): every clue is
 * stated by UEFA's record of ONE tie — nationality, position, the tie, birth month, height, shirt number — a clue UEFA
 * does not state is left out, a man with fewer than five clues gets no mystery, and the name is never in a clue.
 */
export function squadMysteries(input:StagedInput,at:string,by:string):Raw[]{
 const out:Raw[]=[],done=new Set<string>()
 for(const m of uefaMatches(input)){
  const v=m.value,season=(()=>{const on=str(v.on),y=Number(on.slice(0,4)),mo=Number(on.slice(5,7));if(!y)return null;const start=mo>=7?y:y-1;return `${start}/${String(start+1).slice(2)}`})(),comp=str(v.competition).trim()
  for(const e of arr(v.squad as Raw[])){
   const name=str(e.name),k=nameKey(name);if(!name||done.has(k))continue
   const clues:Raw[]=[],src=m.sources.slice(0,1),c=(label:string,value:string,extra:Raw={})=>clues.push({id:`c${clues.length+1}`,label,value,sources:src,...extra})
   if(str(e.nat))c('Nationality',`${str(e.nat)}.`)
   if(POS_TEXT[str(e.pos)])c('Position',POS_TEXT[str(e.pos)]!)
   if(season&&comp)c('In Europe',`In the matchday squad for a ${comp} tie in the ${season} season.`,{scope:{season,competition:comp}})
   const bd=/^(\d{4})-(\d{2})-/.exec(str(e.born));if(bd)c('Born',`Born in ${MONTHS[Number(bd[2])-1]} ${bd[1]}.`)
   if(Number(e.height)>=140)c('Height',`Stands ${Number(e.height)} cm.`)
   if(Number(e.shirt)>0&&season)c('Shirt number',`Wore number ${Number(e.shirt)} in the ${season} season.`,{type:'shirt_number',scope:{season,competition:comp}})
   if(clues.length<5||clues.some(x=>str(x.value).toLowerCase().includes(name.toLowerCase())))continue
   done.add(k)
   out.push({id:`desk-m-${hash(k)}`,value:{targetPlayerId:`p-u-${hash(k)}`,clues},sources:src,confidence:2,status:'approved',researchedAt:day(at),approvedAt:day(at),approvedBy:ownerApproval(by,at),parserCertainty:'high',conflictFree:true,notes:'Every clue is stated by UEFA\'s official line-up record of one European tie.'})
  }
 }
 return out
}

/** Pure validation of an owner decision request. Returns an error sentence or null. */
export function checkDecision(batches:Batch[],req:{kind:string;id?:unknown;hash?:unknown;rival?:unknown},candidates:RivalCandidate[]):string|null{
 if(req.kind==='batch'){
  const b=batches.find(x=>x.id===req.id);if(!b)return 'That batch is not waiting any more. Reload.'
  if(b.hash!==req.hash)return 'The material changed since this page loaded. Reload and look again before approving.'
  if(!b.count)return 'Nothing in this batch can be approved.'
  return null
 }
 if(req.kind==='rival'){
  if(req.rival===null)return null
  if(typeof req.rival!=='string'||!candidates.some(c=>c.name===req.rival))return 'Pick one of the listed clubs.'
  return null
 }
 return 'Unknown decision.'
}
