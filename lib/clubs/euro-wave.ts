import 'server-only'
import {mergeWave} from './waves'
import zrinjskiAuto from '@/club-packs/zrinjski-mostar/wave-auto.json'
import aekAuto from '@/club-packs/aek-athens/wave-auto.json'
import celticAuto from '@/club-packs/celtic/wave-auto.json'
import olympiacosAuto from '@/club-packs/olympiacos/wave-auto.json'
import panathinaikosAuto from '@/club-packs/panathinaikos/wave-auto.json'
import petahAuto from '@/club-packs/hapoel-petah-tikva/wave-auto.json'
import zrinjskiMys from '@/club-packs/zrinjski-mostar/wave-mysteries-2026-10-10.json'
import aekMys from '@/club-packs/aek-athens/wave-mysteries-2026-10-10.json'
import celticMys from '@/club-packs/celtic/wave-mysteries-2026-10-10.json'
import olympiacosMys from '@/club-packs/olympiacos/wave-mysteries-2026-10-10.json'
import panathinaikosMys from '@/club-packs/panathinaikos/wave-mysteries-2026-10-10.json'
import petahMys from '@/club-packs/hapoel-petah-tikva/wave-mysteries-2026-10-10.json'

import htaLeague from '@/club-packs/hapoel-tel-aviv/wave-league-lineups-2026-10-10.json'
import zrinjskiLeague from '@/club-packs/zrinjski-mostar/wave-league-lineups-2026-10-10.json'
import aekLeague from '@/club-packs/aek-athens/wave-league-lineups-2026-10-10.json'
import celticLeague from '@/club-packs/celtic/wave-league-lineups-2026-10-10.json'
import olympiacosLeague from '@/club-packs/olympiacos/wave-league-lineups-2026-10-10.json'
import panathinaikosLeague from '@/club-packs/panathinaikos/wave-league-lineups-2026-10-10.json'
import petahLeague from '@/club-packs/hapoel-petah-tikva/wave-league-lineups-2026-10-10.json'
import stPauliLeague from '@/club-packs/st-pauli/wave-league-lineups-2026-10-10.json'
// 12.10.2026 — the club's own team sheets from the staged Panathinaikos research package (scripts/club-research/attach-pao-lineups-2026-10-12.py)
import paoSheets from '@/club-packs/panathinaikos/wave-pao-lineups-2026-10-12.json'
// 12.10.2026 — St. Pauli plays no UEFA football: its Blind Cow comes from the DFB squad registrations (scripts/club-research/build-dfb-mysteries-2026-10-12.py)
import stPauliMys from '@/club-packs/st-pauli/wave-mysteries-dfb-2026-10-12.json'

type Raw=Record<string,unknown>
const arr=(v:unknown):Raw[]=>Array.isArray(v)?v as Raw[]:[]
const obj=(v:unknown):Raw=>v&&typeof v==='object'&&!Array.isArray(v)?v as Raw:{}
const AUTO:Record<string,unknown>={'zrinjski-mostar':zrinjskiAuto,'aek-athens':aekAuto,celtic:celticAuto,olympiacos:olympiacosAuto,panathinaikos:panathinaikosAuto,'hapoel-petah-tikva':petahAuto}
const LEAGUE:Record<string,unknown>={'hapoel-tel-aviv':htaLeague,'zrinjski-mostar':zrinjskiLeague,'aek-athens':aekLeague,celtic:celticLeague,olympiacos:olympiacosLeague,panathinaikos:panathinaikosLeague,'hapoel-petah-tikva':petahLeague,'st-pauli':stPauliLeague}
/** more same-rule fills: a club's own team sheets from a staged research package (owner, 12.10.2026) */
const SHEETS:Record<string,unknown>={panathinaikos:paoSheets}
const MYS:Record<string,unknown>={'zrinjski-mostar':zrinjskiMys,'aek-athens':aekMys,celtic:celticMys,olympiacos:olympiacosMys,panathinaikos:panathinaikosMys,'hapoel-petah-tikva':petahMys,'st-pauli':stPauliMys}

/**
 * UEFA's own record of a club's European ties (owner decision, 2026-10-10: UEFA is sufficient for its competitions).
 * A club plays one match a day, so a UEFA match is the same match as a pack match on the same date: where the pack's record has no
 * eleven, UEFA's is filled in (and its source added); where the pack has none at all, UEFA's record is added. A pack record that
 * already states an eleven is never overwritten. Blind Cow mysteries from the same line-ups are added by id.
 * `wave-league-lineups` (365Scores × LiveScore; single-publisher sheets approved by the owner on 12.10.2026) rides the same rule for league and cup matches,
 * and so does a club's own team-sheet wave (`wave-pao-lineups-2026-10-12`), which also carries same-source decoys for gate 3. The first source to fill a
 * match wins (UEFA, then the league feed, then the club's sheet), and a match two feeds add for one day is added once.
 */
export function withEuro<T extends Raw>(pack:T,clubId:string):T{
 const euro=obj(AUTO[clubId]),league=obj(LEAGUE[clubId]),sheets=obj(SHEETS[clubId]),mys=obj(MYS[clubId])
 if(!Object.keys(euro).length&&!Object.keys(league).length&&!Object.keys(sheets).length&&!Object.keys(mys).length)return pack
 const auto={sources:[...arr(euro.sources),...arr(league.sources),...arr(sheets.sources)],matches:[...arr(euro.matches),...arr(league.matches),...arr(sheets.matches)]}
 const sourced=mergeWave(mergeWave(pack,{sources:[...arr(auto.sources),...arr(mys.sources)]} as Raw),mys)
 const byDay=new Map(arr(sourced.matches).map(f=>[String(obj(f.value).on),f]))
 const fill=new Map<string,Raw>(),add:Raw[]=[]
 for(const w of arr(auto.matches)){
  if(w.status!=='approved')continue
  const wv=obj(w.value),lineup=arr(wv.lineup),day=String(wv.on),p=byDay.get(day)
  if(!p){add.push(w);byDay.set(day,w);continue}
  const pv=obj(p.value)
  if(lineup.length===11&&arr(pv.lineup).length!==11&&!fill.has(String(p.id)))fill.set(String(p.id),{...p,value:{...pv,lineup:wv.lineup,bench:wv.bench,scorers:arr(pv.scorers).length?pv.scorers:wv.scorers,...(arr(wv.decoys).length&&!arr(pv.decoys).length?{decoys:wv.decoys}:{})},sources:[...new Set([...(Array.isArray(p.sources)?p.sources as string[]:[]),...(Array.isArray(w.sources)?w.sources as string[]:[])])]})
 }
 const matches=arr(sourced.matches).map(f=>fill.get(String(f.id))??f)
 return {...sourced,matches:[...matches,...add.map(f=>fill.get(String(f.id))??f)]} as T
}
