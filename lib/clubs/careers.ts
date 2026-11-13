/**
 * Club careers (13.11.2026) — a player's appearances and goals AT the club, from the career waves (two publishers each, or a source
 * the owner approved). Applied once, after every other wave, so it reaches every man the pack finally holds: it only fills a `career`
 * the record does not state. A career row for an id the pack does not hold is ignored — unless the row is a whole player record
 * (sport, positions): then he is a man the archive did not know and is added (Olympiacos: the club's all-players table, 13.11.2026).
 *   Celtic, St. Pauli, AEK: scripts/club-research/integrate-careers-2026-11-13.py
 *   Olympiacos: scripts/ingest/clubs/olympiacos-history-players.ts (olympiacos-history.gr, approved by the owner 13.11.2026)
 */
import celtic from '@/club-packs/celtic/wave-careers-2026-11-13.json'
import stPauli from '@/club-packs/st-pauli/wave-careers-2026-11-13.json'
import aek from '@/club-packs/aek-athens/wave-careers-2026-11-13.json'
import olympiacos from '@/club-packs/olympiacos/wave-olympiacos-history.json'
import celticSeasons from '@/club-packs/celtic/wave-history-scotland.json'
type Raw=Record<string,unknown>
const WAVES:Record<string,Raw>={celtic,'st-pauli':stPauli,'aek-athens':aek,olympiacos} as unknown as Record<string,Raw>
const arr=(v:unknown):Raw[]=>Array.isArray(v)?v as Raw[]:[]
export function withCareers<T extends Raw>(pack:T,clubId:string):T{
 const w=WAVES[clubId];if(!w)return pack
 const rows=new Map(arr(w.players).filter(r=>r.status==='approved'&&(r.value as Raw)?.career).map(r=>[String(r.id),r]))
 if(!rows.size)return pack
 const have=new Set(arr(pack.sources).map(s=>String(s.id))),used=new Set<string>()
 const players=arr(pack.players).map(f=>{
  const r=rows.get(String(f.id)),v=f.value as Raw;if(!r||v?.career)return f
  for(const s of arr(r.sources))used.add(String(s))
  return {...f,value:{...v,career:(r.value as Raw).career},sources:[...new Set([...arr(f.sources).map(String),...arr(r.sources).map(String)])]}
 })
 const known=new Set(players.map(f=>String(f.id)))
 // OLYHIST_REBUILD: the collector reads the pack without the men it added last time, so it re-joins them honestly
 const added=process.env.OLYHIST_REBUILD?[]:[...rows.values()].filter(r=>!known.has(String(r.id))&&(r.value as Raw).sport==='football'&&Array.isArray((r.value as Raw).positions))
 for(const r of added)for(const s of arr(r.sources))used.add(String(s))
 const sources=[...arr(pack.sources),...arr(w.sources).filter(s=>used.has(String(s.id))&&!have.has(String(s.id)))]
 return {...pack,players:[...players,...added],sources}
}

/** the same fill for men a later wave adds to the compiled data (the roster wave): a career row for his id, when he states none */
export function careerFor(clubId:string,id:string):{apps:number;goals:number|null;basis:string}|null{
 const w=WAVES[clubId];if(!w)return null
 const r=arr(w.players).find(r=>r.status==='approved'&&String(r.id)===id),c=(r?.value as Raw|undefined)?.career as Raw|undefined
 if(!c||typeof c.apps!=='number'||typeof c.basis!=='string')return null
 return {apps:c.apps,goals:typeof c.goals==='number'?c.goals:null,basis:c.basis}
}

/**
 * The season-history feeds (13.11.2026): every match two season-by-season publishers agree on (Celtic: FitbaStats × London Hearts,
 * scripts/ingest/clubs/history-scotland.ts). Added AFTER the match feeds, so a night UEFA or the league feed already holds keeps its
 * record and its eleven — the history row only fills the nights nobody else recorded, and lib/clubs/one-night.ts folds any twin.
 */
const SEASONS:Record<string,Raw>={celtic:celticSeasons} as unknown as Record<string,Raw>
export function withSeasonHistory<T extends Raw>(pack:T,clubId:string):T{
 const w=SEASONS[clubId];if(!w)return pack
 const ids=new Set(arr(pack.matches).map(m=>String(m.id))),have=new Set(arr(pack.sources).map(s=>String(s.id)))
 const add=arr(w.matches).filter(m=>m.status==='approved'&&!ids.has(String(m.id)))
 const used=new Set(add.flatMap(m=>arr(m.sources).map(String)))
 return {...pack,matches:[...arr(pack.matches),...add],sources:[...arr(pack.sources),...arr(w.sources).filter(s=>used.has(String(s.id))&&!have.has(String(s.id)))]}
}
