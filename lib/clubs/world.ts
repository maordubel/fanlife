import hapoelTelAviv from '@/club-packs/hapoel-tel-aviv/world.json'
import hapoelPetahTikva from '@/club-packs/hapoel-petah-tikva/world.json'
import zrinjski from '@/club-packs/zrinjski-mostar/world.json'
import olympiacos from '@/club-packs/olympiacos/world.json'
import panathinaikos from '@/club-packs/panathinaikos/world.json'
import aekAthens from '@/club-packs/aek-athens/world.json'
import celtic from '@/club-packs/celtic/world.json'
import stPauli from '@/club-packs/st-pauli/world.json'
import type {RegistryClub} from '@/lib/master/registry'
import {OWNER_KNOWLEDGE_LABEL} from '@/lib/credits/groups'

/** A club's own flavour for its app: nicknames, ground, terrace, a few facts. Every sourced line carries its sources. */
export type WorldSource={publisher:string;url:string}
export type Sourced={confidence:number;sources:WorldSource[]}
export type WorldNickname=Sourced&{text:string;local?:string;script?:string}
export type WorldLine=Sourced&{line:string}
export type WorldGround=WorldLine&{name:string;local?:string;script?:string}
export type WorldTerrace=WorldLine&{name:string;local?:string;script?:string;tab:string}
export type FlavourKind='place'|'heritage'|'language'|'moment'
export type WorldFlavour=WorldLine&{id:string;kind:FlavourKind;local?:string;script?:string}
export type WorldFact=WorldLine&{id:string;local?:string;script?:string}
/** Matchday culture: what is eaten, done, laughed at, where people meet, how they get to the ground. */
export type CultureKind='food'|'habit'|'humour'|'meetup'|'route'|'home'
/** The five matchday kinds a club's research is measured against; `home` (the supporter's own neighbourhood) is extra. */
export const CULTURE_KINDS:readonly CultureKind[]=['food','habit','humour','meetup','route']
const ALL_CULTURE_KINDS:readonly CultureKind[]=[...CULTURE_KINDS,'home']
/** A culture source is a publisher with an https page, or the owner's first-hand knowledge (rule 18): `owner: true`, no URL, the neutral label, never a name. */
export type CultureSource={publisher:string;url:string;owner?:undefined}|{publisher:string;owner:true;url?:undefined}
export type WorldCulture={id:string;kind:CultureKind;line:string;local?:string;
 /** a `home` line names its neighbourhood in a few words, for the map */
 name?:string;script?:string;confidence:number;sources:CultureSource[]
 /** era-bound lines: shown only in chapters whose year sits inside the range */
 fromYear?:number;untilYear?:number}
/** The neutral label an owner source carries, with the day he said it. */
export const OWNER_SOURCE=new RegExp(`^${OWNER_KNOWLEDGE_LABEL}, \\d{1,2}\\.\\d{1,2}\\.\\d{4}$`)
/** Hapoel Tel Aviv's one allowed political word: the taunt rival fans throw at its supporters. Anywhere else in culture it is refused. */
export const TAUNT_WORDS=['leftie','lefties','political left','left-wing','שמאלני']
export const TAUNT_SCOPE={clubId:'hapoel-tel-aviv',kind:'humour'} as const
export type ClubWorld={
 schemaVersion:1;clubId:string;review:string;note:string
 voice:{welcome:string;kicker:string}
 nicknames:WorldNickname[]
 ground?:WorldGround;founded?:WorldLine;emblem?:WorldLine;colours?:WorldLine;terrace?:WorldTerrace
 facts:WorldFact[]
 /** Small local touches the club page rotates through — place, heritage, speech, a moment. Extra seasoning, never the main content. */
 flavour?:WorldFlavour[]
 /** Matchday culture from the record. Each line is checked on its own: a failing line is dropped, never the whole file. */
 culture?:WorldCulture[]
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
 if(w.flavour!==undefined){
  if(!Array.isArray(w.flavour))out.push('flavour must be a list')
  else{
   const ids=new Set<string>()
   ;(w.flavour as unknown[]).forEach((f,i)=>{
    const l=`flavour[${i}]`;sourcedIssues(l,f,2,out)
    if(isRec(f)){textIssues(`${l}.line`,f.line,LINE_MAX,out);if(!['place','heritage','language','moment'].includes(f.kind as string))out.push(`${l}: kind`);if(typeof f.id!=='string'||ids.has(f.id))out.push(`${l}: id missing or repeated`);else ids.add(f.id)}
   })
  }
 }
 if(w.culture!==undefined&&!Array.isArray(w.culture))out.push('culture must be a list')
 return out
}

/** Problems with one culture line; empty means it may be shown. Same bar as every other line — two publishers, confidence 2–3, https, 220 characters, no forbidden word — except a line the owner sourced: one owner source (rule 18) is enough, at confidence 2. */
export function cultureIssues(c:unknown,label='culture',clubId?:string):string[]{
 const out:string[]=[]
 if(!isRec(c))return [`${label}: not an object`]
 const src=Array.isArray(c.sources)?c.sources as unknown[]:[]
 const owners=src.filter(s=>isRec(s)&&s.owner===true)
 if(owners.length){
  if(c.confidence!==2)out.push(`${label}: an owner-sourced line is confidence 2`)
  for(const s of owners){
   if(!isRec(s))continue
   if(s.url!==undefined)out.push(`${label}: an owner source carries no URL`)
   if(typeof s.publisher!=='string'||!OWNER_SOURCE.test(s.publisher))out.push(`${label}: an owner source carries the neutral label and a date, never a name`)
  }
  for(const s of src.filter(s=>!owners.includes(s))){
   if(!isRec(s)||typeof s.publisher!=='string'||!s.publisher||typeof s.url!=='string')out.push(`${label}: malformed source`)
   else if(!host(s.url))out.push(`${label}: source is not https (${s.publisher})`)
  }
 }else sourcedIssues(label,c,2,out)
 textIssues(`${label}.line`,c.line,LINE_MAX,out)
 if(!ALL_CULTURE_KINDS.includes(c.kind as CultureKind))out.push(`${label}: kind`)
 if(typeof c.id!=='string'||!c.id)out.push(`${label}: id missing`)
 if(c.local!==undefined)textIssues(`${label}.local`,c.local,LINE_MAX,out)
 if(c.kind==='home')textIssues(`${label}.name`,c.name,48,out)
 for(const k of ['fromYear','untilYear'] as const)if(c[k]!==undefined&&!Number.isInteger(c[k]))out.push(`${label}.${k}: not a year`)
 if(typeof c.fromYear==='number'&&typeof c.untilYear==='number'&&c.fromYear>c.untilYear)out.push(`${label}: fromYear after untilYear`)
 const text=`${c.line} ${c.local??''}`.toLowerCase()
 const inScope=clubId===TAUNT_SCOPE.clubId&&c.kind===TAUNT_SCOPE.kind
 if(!inScope)for(const w of TAUNT_WORDS)if(text.includes(w))out.push(`${label}: political word "${w}" is allowed only as the taunt in Hapoel Tel Aviv humour`)
 return out
}
/** The culture lines that pass, ids unique (the first wins). */
export function validCulture(list:unknown,clubId?:string):WorldCulture[]{
 if(!Array.isArray(list))return []
 const ids=new Set<string>()
 return list.filter((c,i)=>{if(cultureIssues(c,`culture[${i}]`,clubId).length)return false;const id=(c as WorldCulture).id;if(ids.has(id))return false;ids.add(id);return true}) as WorldCulture[]
}
/** Whether an era-bound line holds in a given year; a line with no range holds always. */
export const cultureInYear=(c:Pick<WorldCulture,'fromYear'|'untilYear'>,year:number|null|undefined):boolean=>
 year===null||year===undefined?c.fromYear===undefined&&c.untilYear===undefined:(c.fromYear===undefined||year>=c.fromYear)&&(c.untilYear===undefined||year<=c.untilYear)

/** The researched world for a club, or null. A file that fails validation is treated as absent — the app never shows a half-checked line. */
export function clubWorld(id:string):ClubWorld|null{
 const w=raw[id]
 if(!w||validateWorld(w,id).length)return null
 const world=w as ClubWorld
 return world.culture===undefined?world:{...world,culture:validCulture(world.culture,id)}
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
 const blocks:Sourced[]=[...w.nicknames,...[w.ground,w.founded,w.emblem,w.colours,w.terrace].filter((x):x is NonNullable<typeof x>=>Boolean(x)),...w.facts,...(w.flavour??[])]
 return [...new Set([...blocks,...(w.culture??[])].flatMap(b=>b.sources.map(s=>s.publisher)))].sort()
}

/** The flavour line for a given day, rotating through the list; `offset` picks a different one for a second spot on the same page. Deterministic, so server and client agree. */
export function flavourFor(w:ClubWorld,dayIndex:number,offset=0):WorldFlavour|null{
 const f=w.flavour??[]
 return f.length?f[((dayIndex+offset)%f.length+f.length)%f.length]!:null
}

/** The culture lines of one kind — empty when the record has none; nothing is ever invented to fill a kind. */
export const cultureOf=(w:ClubWorld|null,kind:CultureKind):WorldCulture[]=>(w?.culture??[]).filter(c=>c.kind===kind)
/** Kinds the record has not yet given this club. */
export const cultureMissing=(w:ClubWorld|null):CultureKind[]=>CULTURE_KINDS.filter(k=>!cultureOf(w,k).length)
