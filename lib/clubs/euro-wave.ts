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

type Raw=Record<string,unknown>
const arr=(v:unknown):Raw[]=>Array.isArray(v)?v as Raw[]:[]
const obj=(v:unknown):Raw=>v&&typeof v==='object'&&!Array.isArray(v)?v as Raw:{}
const AUTO:Record<string,unknown>={'zrinjski-mostar':zrinjskiAuto,'aek-athens':aekAuto,celtic:celticAuto,olympiacos:olympiacosAuto,panathinaikos:panathinaikosAuto,'hapoel-petah-tikva':petahAuto}
const MYS:Record<string,unknown>={'zrinjski-mostar':zrinjskiMys,'aek-athens':aekMys,celtic:celticMys,olympiacos:olympiacosMys,panathinaikos:panathinaikosMys,'hapoel-petah-tikva':petahMys}

/**
 * UEFA's own record of a club's European ties (owner decision, 2026-10-10: UEFA is sufficient for its competitions).
 * A club plays one match a day, so a UEFA match is the same match as a pack match on the same date: where the pack's record has no
 * eleven, UEFA's is filled in (and its source added); where the pack has none at all, UEFA's record is added. A pack record that
 * already states an eleven is never overwritten. Blind Cow mysteries from the same line-ups are added by id.
 */
export function withEuro<T extends Raw>(pack:T,clubId:string):T{
 const auto=obj(AUTO[clubId]),mys=obj(MYS[clubId])
 if(!Object.keys(auto).length&&!Object.keys(mys).length)return pack
 const sourced=mergeWave(mergeWave(pack,{sources:[...arr(auto.sources),...arr(mys.sources)]} as Raw),mys)
 const byDay=new Map(arr(sourced.matches).map(f=>[String(obj(f.value).on),f]))
 const fill=new Map<string,Raw>(),add:Raw[]=[]
 for(const w of arr(auto.matches)){
  if(w.status!=='approved')continue
  const wv=obj(w.value),lineup=arr(wv.lineup),day=String(wv.on),p=byDay.get(day)
  if(!p){add.push(w);continue}
  const pv=obj(p.value)
  if(lineup.length===11&&arr(pv.lineup).length!==11)fill.set(String(p.id),{...p,value:{...pv,lineup:wv.lineup,bench:wv.bench,scorers:arr(pv.scorers).length?pv.scorers:wv.scorers},sources:[...new Set([...(Array.isArray(p.sources)?p.sources as string[]:[]),...(Array.isArray(w.sources)?w.sources as string[]:[])])]})
 }
 const matches=arr(sourced.matches).map(f=>fill.get(String(f.id))??f)
 return {...sourced,matches:[...matches,...add]} as T
}
