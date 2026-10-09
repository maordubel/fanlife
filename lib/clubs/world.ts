import hapoelTelAviv from '@/club-packs/hapoel-tel-aviv/world.json'
import hapoelPetahTikva from '@/club-packs/hapoel-petah-tikva/world.json'
import zrinjski from '@/club-packs/zrinjski-mostar/world.json'
import olympiacos from '@/club-packs/olympiacos/world.json'
import panathinaikos from '@/club-packs/panathinaikos/world.json'
import aekAthens from '@/club-packs/aek-athens/world.json'
import celtic from '@/club-packs/celtic/world.json'
import stPauli from '@/club-packs/st-pauli/world.json'
import type {RegistryClub} from '@/lib/master/registry'

/** A club's own flavour for its app: nicknames, ground, terrace, a few facts. Every sourced line carries its sources. */
export type WorldSource={publisher:string;url:string}
export type Sourced={confidence:number;sources:WorldSource[]}
export type WorldNickname=Sourced&{text:string;local?:string;script?:string}
export type WorldLine=Sourced&{line:string}
export type WorldGround=WorldLine&{name:string;local?:string;script?:string}
export type WorldTerrace=WorldLine&{name:string;local?:string;script?:string;tab:string}
export type WorldFact=WorldLine&{id:string;local?:string;script?:string}
export type ClubWorld={
 schemaVersion:1;clubId:string;review:string;note:string
 voice:{welcome:string;kicker:string}
 nicknames:WorldNickname[]
 ground?:WorldGround;founded?:WorldLine;emblem?:WorldLine;colours?:WorldLine;terrace?:WorldTerrace
 facts:WorldFact[]
}
/** What the app shows for a club that has no researched world yet: its name and place, nothing invented. */
export type ResolvedWorld=ClubWorld&{researched:boolean;terraceTab:string}

export const TAB_MAX=8
export const LINE_MAX=220
export const VOICE_MAX=64
/** Words that must never reach a fan: politics, violence, slurs, lyrics markers and machinery. Checked on every string. */
export const FORBIDDEN=['ultras','hooligan','riot','clash','fascis','nazi','antifa','communis','zionis','nationalis','terror','massacre','killed','died','tragedy','disaster','yellow','lyrics','chant','song','http','evidence','confidence']

const raw:Record<string,unknown>={'hapoel-tel-aviv':hapoelTelAviv,'hapoel-petah-tikva':hapoelPetahTikva,'zrinjski-mostar':zrinjski,olympiacos,panathinaikos,'aek-athens':aekAthens,celtic,'st-pauli':stPauli}
const isRec=(v:unknown):v is Record<string,unknown>=>typeof v==='object'&&v!==null&&!Array.isArray(v)
const SECOND=new Set(['co','com','org','gov','ac','net'])
/** Registrable host: en.wikipedia.org → wikipedia.org, www.israelhayom.co.il → israelhayom.co.il. */
const host=(url:string)=>{try{const u=new URL(url);if(u.protocol!=='https:')return null;const p=u.hostname.split('.');const n=p.length>=3&&SECOND.has(p[p.length-2]!)&&p[p.length-1]!.length===2?3:2;return p.slice(-n).join('.')}catch{return null}}
/** Wikipedia and Wikidata are one publisher; so are a site and its sub-domains. */
const publisherKey=(s:WorldSource)=>host(s.url)??s.publisher

function sourcedIssues(label:string,v:unknown,min:number,out:string[]){
 if(!isRec(v)){out.push(`${label}: not an object`);return}
 const conf=v.confidence
 if(typeof conf!=='number'||conf<2||conf>3)out.push(`${label}: confidence must be 2 or 3`)
 const src=Array.isArray(v.sources)?v.sources as WorldSource[]:[]
 if(!src.length)out.push(`${label}: no sources`)
 for(const s of src){
  if(!isRec(s)||typeof s.publisher!=='string'||!s.publisher||typeof s.url!=='string')out.push(`${label}: malformed source`)
  else if(!host(s.url))out.push(`${label}: source is not https (${s.publisher})`)
 }
 if(new Set(src.filter(s=>isRec(s)&&typeof s.url==='string').map(publisherKey)).size<min)out.push(`${label}: needs ${min} distinct publishers`)
}
function textIssues(label:string,t:unknown,max:number,out:string[]){
 if(typeof t!=='string'||!t.trim()){out.push(`${label}: empty text`);return}
 if(t.length>max)out.push(`${label}: longer than ${max}`)
 const low=t.toLowerCase()
 for(const w of FORBIDDEN)if(low.includes(w))out.push(`${label}: forbidden word "${w}"`)
}

/** Returns the list of problems with a world file; empty means it may be shown. Two publishers per line, two for a confidence-2 line too. */
export function validateWorld(w:unknown,clubId?:string):string[]{
 const out:string[]=[]
 if(!isRec(w))return ['not an object']
 if(w.schemaVersion!==1)out.push('schemaVersion must be 1')
 if(typeof w.clubId!=='string'||(clubId&&w.clubId!==clubId))out.push('clubId does not match the folder')
 if(typeof w.review!=='string'||!w.review)out.push('review stamp missing')
 if(typeof w.note!=='string'||!w.note)out.push('note missing')
 const voice=w.voice
 if(!isRec(voice))out.push('voice missing')
 else{textIssues('voice.welcome',voice.welcome,VOICE_MAX,out);textIssues('voice.kicker',voice.kicker,VOICE_MAX,out)}
 if(!Array.isArray(w.nicknames))out.push('nicknames must be a list')
 else (w.nicknames as unknown[]).forEach((n,i)=>{const l=`nicknames[${i}]`;sourcedIssues(l,n,2,out);if(isRec(n))textIssues(`${l}.text`,n.text,40,out)})
 for(const k of ['ground','founded','emblem','colours','terrace'] as const){
  const v=w[k]
  if(v===undefined)continue
  sourcedIssues(k,v,2,out)
  if(isRec(v)){
   textIssues(`${k}.line`,v.line,LINE_MAX,out)
   if(k==='ground'||k==='terrace')textIssues(`${k}.name`,v.name,48,out)
   if(k==='terrace'){
    textIssues('terrace.tab',v.tab,TAB_MAX,out)
    if(typeof v.tab==='string'&&v.tab.length>TAB_MAX)out.push(`terrace.tab: longer than ${TAB_MAX}`)
   }
  }
 }
 if(!Array.isArray(w.facts))out.push('facts must be a list')
 else{
  const ids=new Set<string>()
  ;(w.facts as unknown[]).forEach((f,i)=>{
   const l=`facts[${i}]`;sourcedIssues(l,f,2,out)
   if(isRec(f)){textIssues(`${l}.line`,f.line,LINE_MAX,out);if(typeof f.id!=='string'||ids.has(f.id))out.push(`${l}: id missing or repeated`);else ids.add(f.id)}
  })
 }
 return out
}

/** The researched world for a club, or null. A file that fails validation is treated as absent — the app never shows a half-checked line. */
export function clubWorld(id:string):ClubWorld|null{
 const w=raw[id]
 return w&&validateWorld(w,id).length===0?w as ClubWorld:null
}
export const WORLD_IDS=Object.keys(raw)

/** Always returns something to draw: the researched world, or the club's name and place with nothing invented. */
export function worldFor(club:Pick<RegistryClub,'id'|'name'|'city'|'country'>):ResolvedWorld{
 const w=clubWorld(club.id)
 if(w)return {...w,researched:true,terraceTab:w.terrace?.tab??'Terrace'}
 return {
  schemaVersion:1,clubId:club.id,review:'none',note:'No researched world yet.',
  voice:{welcome:`Welcome to ${club.name}.`,kicker:`${club.city} · ${club.country}`},
  nicknames:[],facts:[],researched:false,terraceTab:'Terrace',
 }
}
/** The one nickname line for a hero or a description, or ''. */
export const nicknameLine=(w:ClubWorld):string=>w.nicknames.map(n=>n.text).join(' · ')
/** Every distinct publisher behind what a club's History page shows, for the small "Sources" credit. */
export function worldPublishers(w:ClubWorld):string[]{
 const blocks:Sourced[]=[...w.nicknames,...[w.ground,w.founded,w.emblem,w.colours,w.terrace].filter((x):x is NonNullable<typeof x>=>Boolean(x)),...w.facts]
 return [...new Set(blocks.flatMap(b=>b.sources.map(s=>s.publisher)))].sort()
}
