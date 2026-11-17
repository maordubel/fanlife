import 'server-only'
import type {ClubData} from './contract'
import type {Entry} from './entities'
import {readMatch} from '@/lib/life/universal/match'
import {CLUB_SPELLINGS} from './spellings'
import {core,namesOf} from '@/lib/fixtures/names'
import {canonClub} from '@/lib/trivia/club-names'
import {enClub} from '@/lib/trivia/names'

/**
 * The archive INDEX (owner, 17.11.2026: "a perfect, convenient index, as much information as possible").
 *
 * Gate 12's sixth door: the whole club archive ordered three ways a supporter looks things up in a printed yearbook —
 * by SEASON, by OPPONENT and by COMPETITION — each row with its record (P W D L, goals) and the entries behind it.
 * Players A–Z is built in the browser from the entries it already holds.
 *
 * Nothing is inferred. A row is a match only when its own record states home, away and both goals, or when its printed
 * scoreline names the club on one side (lib/life/universal/match.ts → readMatch, the club's own spellings). The opponent
 * is printed in English where the name table knows him and grouped by his core name (legal forms dropped, rule 7) —
 * the same grouping as the head-to-head ledger (lib/fixtures/meetings.ts). A season is the European football year
 * (July–June) of the record's own day; a year-only record sits in no season. Entries are referenced by their index in
 * the archive wire (the client decodes the rows in the same order).
 */
export type Tally={p:number;w:number;d:number;l:number;gf:number;ga:number}
export type IndexRow={key:string;label:string;ids:number[];t:Tally|null;from?:string|null;to?:string|null}
export type ArchiveIndex={seasons:IndexRow[];opponents:IndexRow[];competitions:IndexRow[]}

type MV={name?:unknown;home?:unknown;away?:unknown;homeGoals?:unknown;awayGoals?:unknown;score?:unknown;competition?:unknown;on?:unknown}
const english=(n:string)=>canonClub(enClub(n)??n)||n
/** "2013-08-25" → "2013/14"; a July–June football year */
export const seasonOf=(on:string|null):string|null=>{
 if(!on)return null
 const y=Number(on.slice(0,4)),m=Number(on.slice(5,7));if(!y||!m)return null
 const s=m>=7?y:y-1;return `${s}/${String((s+1)%100).padStart(2,'0')}`
}
/** "Italian Serie A 2013/14" · "UEFA Champions League 2012-13" · "Premier League - Championship Round" → the competition's own name */
export function competitionKey(raw:string|null|undefined):string|null{
 let s=(raw||'').split(' · ')[0]!
 // seasons and years are the season index's business
 s=s.replace(/\b(18|19|20)\d{2}\s*[-–/]\s*(\d{2}|\d{4})\b/g,'').replace(/\b(18|19|20)\d{2}\b/g,'')
 // "Scottish League (Division One (old) / 12)" → "Scottish League (Division One (old))"; "League Cup (Group 1 / Group 1)" → "League Cup (Group 1)"
 s=s.replace(/\s*\/\s*[^()]*\)\s*$/,')')
 // a stage written in brackets: (R3) (QF Leg1) (Semi Final) (Final) (Group 2) (Replay)
 s=s.replace(/\s*\((?:R\d+|QF|SF|Semi[ -]?Final|Quarter[ -]?Final|Final|Group\s*\w+|Replay|Leg\s*\d|Round\s*\d+|Play-?offs?)\b[^()]*\)/gi,'')
 // a stage written after the name: "… group stage", "… final at the Olympic Stadium", "… - Semi Finals", ", round 2"
 s=s.replace(/\s+[-–]\s+(round|matchday|group|semi|quarter|final|play|championship|relegation|placement|qualif|1st|2nd|3rd|first|second|third|last).*$/i,'')
 s=s.replace(/\s*,\s*(round|semi|quarter|final|group|matchday|first|second|replay).*$/i,'')
 s=s.replace(/\s+(group stage|league phase|knockout.*|(semi|quarter)[ -]?finals?.*|finals?(\s+(at|in|replay)\b.*)?|qualifying.*|qualifiers?|preliminary round|(first|second|third|fourth) round|round of \d+|last \d+)$/i,'')
 // a numbered section or table: "(Section 2)" "(12)" "()" "(Semi Replay)"
 s=s.replace(/\s*\((?:Section\s*\d+|\d+|Semi\s*Replay|)\)/gi,'')
 s=s.replace(/\s{2,}/g,' ').trim().replace(/[\s,·:-]+$/,'')
 if(!s||s.length<3||/^\d/.test(s))return null
 // a slug or an all-lower-case name is printed as words: "wwin-liga-bih" → "Wwin Liga Bih", "bundesliga" → "Bundesliga"
 if(s===s.toLowerCase())s=s.split(/[-_\s]+/).map(w=>w.charAt(0).toUpperCase()+w.slice(1)).join(' ')
 return SAME[s.toLowerCase()]??s
}
/** one competition, two spellings in the records (rule 7: only names the records themselves print, mapped by hand) */
const SAME:Record<string,string>={
 'super league greece':'Greek Super League','greece cup':'Greek Cup','dfb pokal':'DFB-Pokal','uefa europa conference league':'UEFA Conference League',
 "cup winners' cup":"European Cup Winners' Cup",'uefa cup winners\' cup':"European Cup Winners' Cup",'wwin liga bih':'Bosnia and Herzegovina League','bosnia and herzegovina premier liga':'Bosnia and Herzegovina League',
 'scottish premiership':'Scottish League (Premiership)','ecwc':"European Cup Winners' Cup",'bundesliga 2':'2. Bundesliga',
}
/** a bare league name the club's own country makes unambiguous */
const LOCAL:Record<string,Record<string,string>>={Greece:{'super league':'Greek Super League','greek league':'Greek Super League'},Israel:{'premier league':'Israeli Premier League'}}
const blank=():Tally=>({p:0,w:0,d:0,l:0,gf:0,ga:0})
function score(t:Tally,f:number,a:number){t.p++;t.gf+=f;t.ga+=a;if(f>a)t.w++;else if(f===a)t.d++;else t.l++}

export function buildArchiveIndex(club:ClubData,entries:Entry[]):ArchiveIndex{
 const ours=[club.identity.name,...(CLUB_SPELLINGS[club.identity.id]??[]),...namesOf(club.identity.name),...((club.identity as {aliases?:string[]}).aliases??[])]
 const matches=new Map((club.matches||[]).map(m=>[m.id,m.value as MV]))
 const seasons=new Map<string,IndexRow>(),opponents=new Map<string,IndexRow>(),comps=new Map<string,IndexRow>()
 const row=(map:Map<string,IndexRow>,key:string,label:string)=>map.get(key)??map.set(key,{key,label,ids:[],t:null}).get(key)!
 const nightsSeen=new Set<string>()
 entries.forEach((e,i)=>{
  if(e.kind!=='moment')return
  const v=e.match?matches.get(e.match.matchId):undefined
  // the result this entry states: the record's own fields, else its printed scoreline with our side named
  let res:{us:boolean;opp:string;f:number;a:number}|null=null
  if(v&&typeof v.home==='string'&&typeof v.away==='string'&&Number.isInteger(v.homeGoals)&&Number.isInteger(v.awayGoals)){
   const r=readMatch(`${v.home} ${v.homeGoals}-${v.awayGoals} ${v.away}`,ours)
   if(r)res={us:true,opp:r.us==='home'?r.away:r.home,f:r.us==='home'?r.homeGoals:r.awayGoals,a:r.us==='home'?r.awayGoals:r.homeGoals}
  }
  if(!res){const r=readMatch(e.title,ours);if(r)res={us:true,opp:r.us==='home'?r.away:r.home,f:r.us==='home'?r.homeGoals:r.awayGoals,a:r.us==='home'?r.awayGoals:r.homeGoals}}
  // one night is one match in the tallies, whatever number of entries tell it
  const night=res&&e.on?`${e.on}|${[res.f,res.a].sort().join('-')}`:null,first=night?!nightsSeen.has(night):!!res
  if(night)nightsSeen.add(night)
  const season=seasonOf(e.on)
  if(season){const s=row(seasons,season,season);s.ids.push(i);if(res&&first){s.t??=blank();score(s.t,res.f,res.a)}}
  if(res){
   const name=english(res.opp),k=core(name)||name.toLowerCase()
   if(k){const o=row(opponents,k,name);o.ids.push(i);if(first){o.t??=blank();score(o.t,res.f,res.a)}
    const when=e.on??(e.year!==null?String(e.year):null);if(when){if(!o.from||when<o.from)o.from=when;if(!o.to||when>o.to){o.to=when;o.label=name}}}
  }
  const comp0=competitionKey(e.match?.competition??(typeof v?.competition==='string'?v.competition:null)??(res?e.hint:null))
  const comp=comp0?(LOCAL[club.identity.country]?.[comp0.toLowerCase()]??comp0):null
  if(comp){const c=row(comps,comp.toLowerCase(),comp);c.ids.push(i);if(res&&first){c.t??=blank();score(c.t,res.f,res.a)}
   const when=e.on??(e.year!==null?String(e.year):null);if(when){if(!c.from||when<c.from)c.from=when;if(!c.to||when>c.to)c.to=when}}
 })
 const newest=(a:number,b:number)=>((entries[b]!.on||String(entries[b]!.year??0)).localeCompare(entries[a]!.on||String(entries[a]!.year??0)))
 const done=(rows:IndexRow[])=>rows.map(r=>({...r,ids:[...new Set(r.ids)].sort(newest)}))
 return {
  seasons:done([...seasons.values()]).sort((a,b)=>b.key.localeCompare(a.key)),
  opponents:done([...opponents.values()].filter(r=>(r.t?.p??0)>=1)).sort((a,b)=>(b.t?.p??0)-(a.t?.p??0)||a.label.localeCompare(b.label)),
  competitions:done([...comps.values()].filter(r=>r.ids.length>=2)).sort((a,b)=>b.ids.length-a.ids.length||a.label.localeCompare(b.label)),
 }
}
