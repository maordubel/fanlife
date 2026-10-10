import type {ClubData,Readiness} from './contract'
import {gateReadiness} from './gate-data'
import {ratedPool,rumbleReadiness} from './rumble'
import {goalReadiness} from './goal'
import {GATE_THRESHOLDS as T} from './thresholds'

/**
 * Wave C content (gates 3, 4, 5, 8, 9, 11), read from a club's COMPILED data only — i.e. facts that
 * already passed the envelope (approved, checked sources). Nothing is inferred and nothing is padded:
 * a gate opens when the data supports it, and says exactly what is missing when it does not.
 */
export type LineupMatch={id:string;name:string;on:string|null;competition:string;score:string|null;starters:string[];bench:string[];decoys:string[];sources:string[]}
/** the rest of the kit, when a source documents it: shorts and socks as a colour name and an optional second colour */
export type KitPart={colour:string;trim:string|null}
export type KitView={id:string;season:string;type:string;maker:string|null;design:string|null;sponsor?:string|null;colours:string[];shorts?:KitPart|null;socks?:KitPart|null;sources:string[];/** the ids of the same shirt's other records, folded into this one (the catalogue's second image, a source's twin) */also?:string[]}
const str=(v:unknown)=>typeof v==='string'&&v.trim()?v.trim():null
const strs=(v:unknown)=>Array.isArray(v)?v.filter((x):x is string=>typeof x==='string'&&!!x.trim()).map(x=>x.trim()):[]
const obj=(v:unknown):Record<string,unknown>=>v&&typeof v==='object'&&!Array.isArray(v)?v as Record<string,unknown>:{}

export function lineupMatches(data:ClubData):LineupMatch[] {
 const players=data.players||[]
 return (data.matches||[]).flatMap(f=>{
  const v=obj(f.value),starters=[...new Set(strs(v.lineup))],bench=strs(v.bench)
  if(starters.length!==11)return []
  const decoys=players.filter(p=>!starters.includes(p.value.name)).length
  if(decoys<3)return []
  return [{id:f.id,name:f.value.name,on:str(v.on),competition:str(v.competition)||'',score:str(v.score),starters,bench,decoys:strs(v.decoys).filter(d=>!starters.includes(d)),sources:f.sources}]
 })
}
/** Candidate list for a match: its eleven plus club players who are not in it, in a stable order that does not reveal the answer. */
export function lineupPool(data:ClubData,m:LineupMatch):string[] {
 // the source's own decoys (same season's squad) first; the club roster only tops up
 const decoys=[...new Set([...m.decoys,...(data.players||[]).map(p=>p.value.name)])].filter(n=>!m.starters.includes(n)).slice(0,11)
 return [...new Set([...m.starters,...decoys])].sort((a,b)=>a.localeCompare(b))
}
export function kitViews(data:ClubData):KitView[] {
 return dedupeKits((data.kits||[]).flatMap(f=>{
  const v=obj(f.value),c=obj(v.construction),season=str(v.season)
  if(!season)return []
  const colours=(str(c.colors)||str(v.colors)||'').split(/[\/,]/).map(x=>x.trim().toLowerCase()).filter(Boolean)
  const part=(x:unknown):KitPart|null=>{const o=obj(x),colour=str(o.colour)?.toLowerCase();return colour?{colour,trim:str(o.trim)?.toLowerCase()??null}:null}
  return [{id:f.id,season,type:str(v.type)||'home',maker:str(v.manufacturer),design:str(c.design)||str(v.design),sponsor:str(v.sponsor),colours,shorts:part(v.shorts),socks:part(v.socks),sources:f.sources}]
 }))
}

const COLOUR_WORD:Record<string,string>={gray:'grey','sky blue':'skyblue','light blue':'skyblue'}
const norm=(c:string)=>COLOUR_WORD[c]??c
const STRIPES=new Set(['stripes','pinstripes'])
const SASHES=new Set(['sash','diagonal'])
const PLAINISH=new Set(['plain','solid'])
const designOk=(a0:string|null,b0:string|null)=>{
 const a=a0?.toLowerCase()??null,b=b0?.toLowerCase()??null,x=a&&PLAINISH.has(a)?'plain':a,y=b&&PLAINISH.has(b)?'plain':b
 return x===y||x===null||y===null||x==='graphic'||y==='graphic'||(STRIPES.has(x)&&STRIPES.has(y))||(SASHES.has(x)&&SASHES.has(y))
}
const subset=(a:string[],b:string[])=>a.every(c=>b.includes(c))
/** for comparison only: the Kit Master says cream and ink where a catalogue says white and black */
const SAME_COLOUR:Record<string,string>={cream:'white',ink:'black'}
const cmpColours=(c:string[])=>[...new Set(c.map(x=>SAME_COLOUR[x]??x))]
const coloursOk=(a0:string[],b0:string[])=>{const a=cmpColours(a0),b=cmpColours(b0);return !a.length||!b.length||subset(a,b)||subset(b,a)}
const makerOk=(a:string|null,b:string|null)=>!a||!b||a.toLowerCase()===b.toLowerCase()
const typeKey=(t:string)=>{const v=t.toLowerCase();return v==='gk'||v==='goalkeeper'?'gk':v}
const score=(k:KitView)=>(k.maker?3:0)+(k.sponsor?3:0)+(k.shorts?2:0)+(k.socks?2:0)+(k.design&&k.design!=='graphic'?1:0)+Math.min(k.colours.length,3)+Math.min(k.sources.length,3)*0.1-(/-v\d+$/.test(k.id)?5:0)-(/uefa-/.test(k.id)?4:0)
/**
 * One shirt is one card. A season and type the archive records more than once is folded when the records can be the SAME shirt:
 * compatible colours (equal, or one a subset of the other, order ignored — sources disagree on base and trim), compatible design
 * (a "graphic" or missing design says nothing; stripes and pinstripes are one family) and a maker that is not contradicted.
 * Two shirts that differ in design or maker (AEK 2005/06 home: plain vs contrasting sleeves) stay two. The richest record leads and
 * lends what it lacks; the others' ids ride along in `also` so a photograph keyed to any of them still finds the card.
 */
export function dedupeKits(list:KitView[]):KitView[]{
 const norm1=list.map(k=>({...k,colours:[...new Set(k.colours.map(norm))]}))
 const groups=new Map<string,KitView[]>()
 for(const k of norm1){const key=`${k.season}|${typeKey(k.type)}`;groups.set(key,[...(groups.get(key)??[]),k])}
 const out:KitView[]=[]
 for(const members of groups.values()){
  const sorted=[...members].sort((a,b)=>score(b)-score(a)||a.id.localeCompare(b.id)),clusters:KitView[][]=[]
  for(const k of sorted){
   const stub=k.design===null&&k.colours.length<=1 // a source's bare twin (UEFA's FKA record: no design, one colour) says only that the shirt exists
   const home=clusters.find(c=>{const lead=c[0]!;return makerOk(lead.maker,k.maker)&&(stub||(coloursOk(lead.colours,k.colours)&&designOk(lead.design,k.design)))})
   if(home)home.push(k);else clusters.push([k])
  }
  for(const c of clusters){
   const [lead,...rest]=c
   if(!rest.length){out.push(lead!);continue}
   const fill=<T,>(get:(k:KitView)=>T|null|undefined)=>get(lead!)??rest.map(get).find(v=>v!=null)??null
   const widest=[lead!,...rest].reduce((a,b)=>b.colours.length>a.colours.length&&subset(a.colours,b.colours)?b:a)
   out.push({...lead!,maker:fill(k=>k.maker),design:lead!.design&&lead!.design!=='graphic'?lead!.design:fill(k=>k.design&&k.design!=='graphic'?k.design:null)??lead!.design,sponsor:fill(k=>k.sponsor),shorts:fill(k=>k.shorts),socks:fill(k=>k.socks),colours:widest.colours,sources:[...new Set(c.flatMap(k=>k.sources))],also:rest.map(k=>k.id)})
  }
 }
 // keep the archive's own order: the order the records first appeared in
 const order=new Map(list.map((k,i)=>[k.id,i]))
 return out.sort((a,b)=>(order.get(a.id)??0)-(order.get(b.id)??0))
}

export function rivalsOf(data:ClubData){return (data.rivals||[]).filter(r=>r.status==='approved'&&r.confidence>=2)}

/** A kit is only a puzzle when it names enough to ask about: season + maker + design. */
export const buildableKits=(data:ClubData)=>kitViews(data).filter(k=>k.maker&&k.design)
export function waveCReadiness(data:ClubData):Record<string,Readiness> {
 const locked=(why:string):Readiness=>({state:'LOCKED',playable:false,eligible:0,target:0,reasons:[why]})
 const rivals=rivalsOf(data)
 return {
  lineup:gateReadiness(lineupMatches(data).length,T.lineup.target,T.lineup.minimum,T.lineup.unit),
  'kit-builder':gateReadiness(buildableKits(data).length,T['kit-builder'].target,T['kit-builder'].minimum,T['kit-builder'].unit),
  kits:gateReadiness(kitViews(data).length,T.kits.target,T.kits.minimum,T.kits.unit),
  derby:rivals.length?gateReadiness(rivals.length,T.derby.target,T.derby.minimum,T.derby.unit):locked('Human-approved primary rival needed; derby meetings are then read from the club archives.'),
  goal:goalReadiness(data),
  'royal-rumble':(()=>{const r=rumbleReadiness(ratedPool(data));const n=ratedPool(data).length;return r.playable?{state:r.full?'READY':'PARTIAL',playable:true,eligible:n,target:T['royal-rumble'].target,reasons:r.full?[]:['Thin squad data: some positions have few players, so deals repeat sooner.']} as Readiness:locked(`Needs players with documented positions: ${r.short.join(', ')}.`)})(),
 }
}
