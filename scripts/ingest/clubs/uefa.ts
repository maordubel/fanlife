/**
 * THE ONLY FILE THAT KNOWS UEFA'S MATCH API (match.uefa.com/v5).
 * Public JSON, no key. Gives every European club match with the date, score, scorers with minutes,
 * stadium and — through /lineups — both starting elevens and benches. Field names verified against
 * live responses on 2026-10-06 (matches?teamId=…, matches/{id}/lineups).
 */
import type {Fetcher,Goal,ProviderMatch} from './types'
type J=Record<string,unknown>
const o=(v:unknown):J=>v&&typeof v==='object'&&!Array.isArray(v)?v as J:{}
const a=(v:unknown):J[]=>Array.isArray(v)?v.map(o):[]
const s=(v:unknown)=>typeof v==='string'&&v.trim()?v.trim():null
const n=(v:unknown)=>typeof v==='number'&&Number.isFinite(v)?v:null
export const UEFA='https://match.uefa.com/v5'
export const COMPETITIONS={championsLeague:1,europaLeague:14,conferenceLeague:2019} as const
export const matchesUrl=(teamId:string|number,offset=0,limit=50)=>`${UEFA}/matches?teamId=${encodeURIComponent(String(teamId))}&limit=${limit}&offset=${offset}&order=DESC&status=FINISHED`
export const lineupUrl=(id:string)=>`${UEFA}/matches/${encodeURIComponent(id)}/lineups`
export const pageUrl=(id:string)=>`https://www.uefa.com/uefachampionsleague/match/${encodeURIComponent(id)}--`
const team=(t:unknown)=>{const x=o(t);return {id:s(x.id),name:s(x.internationalName)}}
/** One UEFA match object → ProviderMatch (no lineup yet). Unfinished or unreadable → null. */
export function parseMatch(raw:unknown):ProviderMatch|null {
 const m=o(raw),home=team(m.homeTeam),away=team(m.awayTeam),on=s(o(m.kickOffTime).date),id=s(m.id)
 if(!id||!home.name||!away.name||!on||!/^\d{4}-\d{2}-\d{2}$/.test(on))return null
 const reg=o(o(m.score).regular),total=o(o(m.score).total),h=n(total.home)??n(reg.home),aw=n(total.away)??n(reg.away)
 const goals:Goal[]=a(o(m.playerEvents).scorers).flatMap(g=>{
  const name=s(o(g.player).internationalName);if(!name)return []
  const tid=s(g.teamId),side=tid===home.id?'home':tid===away.id?'away':null
  if(!side)return []
  const t=s(g.goalType)||'';return [{name,minute:n(o(g.time).minute),team:side,own:/OWN/i.test(t)}]
 })
 return {provider:'uefa',providerId:id,url:pageUrl(id),publisher:'UEFA',on,competition:s(o(o(m.competition).metaData).name)||s(o(m.competition).id)||'UEFA',home:home.name,away:away.name,homeId:home.id,awayId:away.id,
  score:h===null||aw===null?null:{home:h,away:aw},venue:s(o(m.stadium).name),goals,lineup:null}
}
const names=(v:unknown)=>a(v).map(p=>s(o(p.player).internationalName)).filter((x):x is string=>!!x)
/** Starting elevens only when UEFA lists exactly eleven distinct names per side; anything else stays null (never padded). */
export function parseLineups(raw:unknown):ProviderMatch['lineup']{
 const r=o(raw),h=o(r.homeTeam),aw=o(r.awayTeam),hf=[...new Set(names(h.field))],af=[...new Set(names(aw.field))]
 if(hf.length!==11||af.length!==11)return null
 return {home:hf,away:af,homeBench:names(h.bench),awayBench:names(aw.bench)}
}
export async function uefaMatchesForTeam(fetchJson:Fetcher,teamId:string,{pages=10}:{pages?:number}={}):Promise<ProviderMatch[]> {
 const out:ProviderMatch[]=[]
 for(let p=0;p<pages;p++){
  const rows=a(await fetchJson(matchesUrl(teamId,p*50)));if(!rows.length)break
  for(const r of rows){const m=parseMatch(r);if(m)out.push(m)}
  if(rows.length<50)break
 }
 return out
}
export async function withLineup(fetchJson:Fetcher,m:ProviderMatch):Promise<ProviderMatch>{
 try{return {...m,lineup:parseLineups(await fetchJson(lineupUrl(m.providerId)))}}catch{return m}
}
/** Team ids seen in a competition-season listing, for discovery by exact name + country (never fuzzy). */
export function teamsIn(rows:unknown):{id:string;name:string;country:string}[]{
 const seen=new Map<string,{id:string;name:string;country:string}>()
 for(const r of a(rows))for(const t of [o(r.homeTeam),o(r.awayTeam)]){const id=s(t.id),name=s(t.internationalName);if(id&&name)seen.set(id,{id,name,country:s(t.countryCode)||''})}
 return [...seen.values()]
}
