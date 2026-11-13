/**
 * Club careers (13.11.2026) — a player's appearances and goals AT the club, from the career waves (two publishers each, or a source
 * the owner approved). Applied once, after every other wave, so it reaches every man the pack finally holds: it only fills a `career`
 * the record does not state, and it never adds a man (a career row for an id the pack does not hold is ignored).
 *   Celtic, St. Pauli, AEK: scripts/club-research/integrate-careers-2026-11-13.py
 *   Olympiacos: scripts/ingest/clubs/olympiacos-history-players.ts (olympiacos-history.gr, approved by the owner 13.11.2026)
 */
import celtic from '@/club-packs/celtic/wave-careers-2026-11-13.json'
import stPauli from '@/club-packs/st-pauli/wave-careers-2026-11-13.json'
import aek from '@/club-packs/aek-athens/wave-careers-2026-11-13.json'
import olympiacos from '@/club-packs/olympiacos/wave-olympiacos-history.json'
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
 const sources=[...arr(pack.sources),...arr(w.sources).filter(s=>used.has(String(s.id))&&!have.has(String(s.id)))]
 return {...pack,players,sources}
}
