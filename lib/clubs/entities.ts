import type {ClubData,ClubPlayer,Source} from './contract'
import {eligibleArchive} from './archive'

/**
 * The Living Archive's per-club read model (gate 12, 8.10.2026).
 *
 * An archive entry is a PROJECTION of what the club pack already approves — a dated moment, or a player — and the links
 * between entries are only the ones the data itself states:
 *   · a moment that NAMES a player (their full name or a multi-word alias, written out in the moment's own title or hint)
 *     points at that player's entry; the player's entry lists the moments that name him;
 *   · a moment that NAMES the club's approved rival or one of its seasons ("2007/08") says so literally;
 *   · moments on the same exact day / in the same year sit side by side (that is a date, not a claim).
 * Nothing is inferred from a surname, a hint of a team, a season "membership" or a kit. Rule 7: names are matched whole,
 * never fuzzily; a name two players share links to neither. Rule 11: unknown stays unknown.
 *
 * Pure and framework-free: the server view builds it and ships a compact wire form (`encodeArchive`) to the client.
 */
export type EntryKind='moment'|'player'
export type Precision='day'|'year'|'unknown'
export type PlayerFacts={positions:ClubPlayer['positions'];from:number|null;to:number|null;aliases:string[]}
export type Entry={
 id:string;kind:EntryKind;title:string
 /** exact ISO day — only when the record is day-precision; a year-only moment never claims a day */
 on:string|null;year:number|null;hint:string
 confidence:0|1|2|3;sources:string[]
 /** the approval note, unless it is the carried-forward legacy boilerplate */
 note:string|null;legacy:boolean
 player:PlayerFacts|null
 /** entry ids of players this moment names */
 names:string[]
 /** text references (rival / season) this moment names */
 refs:TextRef[]
}
export type TextRef={kind:'rival'|'season';id:string;name:string}
export const precisionOf=(e:Pick<Entry,'on'|'year'>):Precision=>e.on?'day':e.year!==null?'year':'unknown'

const ISO=/^(\d{4})-(\d{2})-(\d{2})$/
/** a real calendar day — never a shape that merely looks like one */
export function validDay(iso:string|null|undefined):iso is string{
 const m=iso?ISO.exec(iso):null;if(!m)return false
 const y=Number(m[1]),mo=Number(m[2]),d=Number(m[3]),t=new Date(Date.UTC(y,mo-1,d))
 return t.getUTCFullYear()===y&&t.getUTCMonth()===mo-1&&t.getUTCDate()===d
}

// ------------------------------------------------------------------ names
/** case- and diacritic-folded, so "Karačić" and "KARACIC" are the same written name; never a fuzzy match */
export const fold=(s:string)=>s.normalize('NFD').replace(/\p{M}/gu,'').toLocaleLowerCase()
export const tokensOf=(s:string)=>fold(s).split(/[^\p{L}\p{N}]+/u).filter(Boolean)
const MAX_GRAM=5

type NameKey=string
/** key → the ONE thing it names; a key two things share names neither */
function indexNames<T extends string>(rows:{id:T;names:string[]}[],minTokens:(toks:string[])=>boolean){
 const by=new Map<NameKey,T|null>()
 for(const r of rows)for(const n of new Set(r.names)){
  const toks=tokensOf(n);if(toks.length>MAX_GRAM||!minTokens(toks))continue
  const key=toks.join(' '),was=by.get(key)
  by.set(key,was===undefined||was===r.id?r.id:null)
 }
 return by
}
function grams(text:string){
 const toks=tokensOf(text),out=new Set<string>()
 for(let i=0;i<toks.length;i++)for(let n=1;n<=MAX_GRAM&&i+n<=toks.length;n++)out.add(toks.slice(i,i+n).join(' '))
 return out
}
const multi=(t:string[])=>t.length>=2
const longOne=(t:string[])=>t.length>=2||(t[0]?.length??0)>=5

/** a season label such as "2007/08" or "1954/55", found as written — not inside a longer run of digits or slashes */
export function seasonsIn(text:string,seasons:{id:string;name:string}[]):TextRef[]{
 const out:TextRef[]=[]
 for(const s of seasons){
  const name=s.name.trim();if(!/^\d{4}\/\d{2,4}$/.test(name))continue
  const at=text.indexOf(name);if(at<0)continue
  const before=text[at-1],after=text[at+name.length]
  if((before&&/[\d/]/.test(before))||(after&&/[\d/]/.test(after)))continue
  out.push({kind:'season',id:s.id,name})
 }
 return out
}

// ------------------------------------------------------------------ build
type Pack=Pick<ClubData,'archive'|'timeline'|'sources'>&{players?:ClubData['players'];rivals?:ClubData['rivals'];seasons?:ClubData['seasons']}

export function buildEntries(data:Pack):Entry[]{
 const records=eligibleArchive(data),byFact=new Map((data.players||[]).map(f=>[f.id,f]))
 const entries:Entry[]=records.map(f=>{
  const p=byFact.get(f.id)?.value,legacy=f.approvedBy==='legacy-curation'
  const on=validDay(f.value.on)?f.value.on:null
  const year=on?Number(on.slice(0,4)):Number.isSafeInteger(f.value.year)?f.value.year:null
  return {
   id:f.id,kind:p?'player':'moment',title:f.value.title,on,year,
   // a player's "hint" in the shared projection is the approval note — it is not text for a reader
   hint:p?'':f.value.hint,confidence:f.confidence,sources:[...f.sources],note:legacy||!f.notes?null:f.notes,legacy,
   player:p?{positions:[...p.positions],from:p.fromYear,to:p.toYear,aliases:[...p.aliases]}:null,names:[],refs:[],
  }
 })
 // ---- links the text itself states
 const players=entries.filter(e=>e.kind==='player')
 const playerIx=indexNames(players.map(e=>({id:e.id,names:[e.title,...(e.player?.aliases||[])]})),multi)
 const rivals=(data.rivals||[]).map(f=>({id:f.id,name:f.value.name})),rivalIx=indexNames(rivals.map(r=>({id:r.id,names:[r.name]})),longOne)
 const rivalName=new Map(rivals.map(r=>[r.id,r.name])),seasons=(data.seasons||[]).map(f=>({id:f.id,name:f.value.name}))
 for(const e of entries){
  if(e.kind!=='moment')continue
  const text=`${e.title} ${e.hint}`,g=grams(text),names=new Set<string>(),rv=new Set<string>()
  for(const k of g){const p=playerIx.get(k);if(p)names.add(p);const r=rivalIx.get(k);if(r)rv.add(r)}
  e.names=[...names].sort()
  e.refs=[...[...rv].sort().map(id=>({kind:'rival' as const,id,name:rivalName.get(id)!})),...seasonsIn(text,seasons)]
 }
 return entries
}

/** "who is named in this moment" read backwards: the moments that name one player, newest first */
export function mentionedIn(entries:Entry[],playerId:string):Entry[]{
 return entries.filter(e=>e.kind==='moment'&&e.names.includes(playerId)).sort(newestFirst)
}
export const newestFirst=(a:Entry,b:Entry)=>(b.on||`${b.year??0}`).localeCompare(a.on||`${a.year??0}`)||a.id.localeCompare(b.id)

// ------------------------------------------------------------------ wire (what the server sends the client)
type Wire=[id:string,kind:0|1,title:string,on:string|null,year:number|null,hint:string,conf:number,srcSet:number,note:number,legacy:0|1,player:0|[string,number|null,number|null,string[]],names:0|string[],refs:0|[('r'|'s'),string,string][]]
export type ArchiveWire={rows:Wire[];srcSets:string[][];notes:string[];sources:Record<string,[string,string|null]>}

export function encodeArchive(entries:Entry[],sources:Pick<Source,'id'|'title'|'url'>[]):ArchiveWire{
 const sets:string[][]=[],setIx=new Map<string,number>(),notes:string[]=[],noteIx=new Map<string,number>(),used=new Set<string>()
 const rows=entries.map((e):Wire=>{
  const sk=e.sources.join('|');let si=setIx.get(sk);if(si===undefined){si=sets.length;sets.push([...e.sources]);setIx.set(sk,si)}
  e.sources.forEach(s=>used.add(s))
  let ni=-1;if(e.note){const n=noteIx.get(e.note);if(n===undefined){ni=notes.length;notes.push(e.note);noteIx.set(e.note,ni)}else ni=n}
  return [e.id,e.kind==='player'?1:0,e.title,e.on,e.on?null:e.year,e.hint,e.confidence,si,ni,e.legacy?1:0,
   e.player?[e.player.positions.join('/'),e.player.from,e.player.to,e.player.aliases]:0,e.names.length?e.names:0,
   e.refs.length?e.refs.map(r=>[r.kind==='rival'?'r':'s',r.id,r.name] as ['r'|'s',string,string]):0]
 })
 const src:Record<string,[string,string|null]>={}
 for(const s of sources)if(used.has(s.id))src[s.id]=[s.title,s.url]
 return {rows,srcSets:sets,notes,sources:src}
}
export function decodeArchive(w:ArchiveWire):Entry[]{
 return w.rows.map(r=>{
  const [id,kind,title,on,year,hint,conf,si,ni,legacy,pl,names,refs]=r
  return {
   id,kind:kind===1?'player':'moment',title,on,year:on?Number(on.slice(0,4)):year,hint,confidence:conf as Entry['confidence'],
   sources:w.srcSets[si]||[],note:ni>=0?w.notes[ni]??null:null,legacy:legacy===1,
   player:pl?{positions:(pl[0]?pl[0].split('/'):[]) as ClubPlayer['positions'],from:pl[1],to:pl[2],aliases:pl[3]}:null,
   names:names||[],refs:(refs||[]).map(([k,i,n])=>({kind:k==='r'?'rival' as const:'season' as const,id:i,name:n})),
  }
 })
}
