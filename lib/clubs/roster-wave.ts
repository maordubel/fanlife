import type {ClubData,Fact,ClubPlayer,Source} from './contract'
import cel from '@/club-packs/celtic/wave-roster-2026-10-10.json'
import aek from '@/club-packs/aek-athens/wave-roster-2026-10-10.json'
import oly from '@/club-packs/olympiacos/wave-roster-2026-10-10.json'
import pao from '@/club-packs/panathinaikos/wave-roster-2026-10-10.json'
import stp from '@/club-packs/st-pauli/wave-roster-2026-10-10.json'
import zri from '@/club-packs/zrinjski-mostar/wave-roster-2026-10-10.json'
import hpt from '@/club-packs/hapoel-petah-tikva/wave-roster-2026-10-10.json'
import hta from '@/club-packs/hapoel-tel-aviv/wave-roster-2026-10-10.json'
import {norm} from '@/lib/fixtures/names'
/**
 * Roster wave (10.10.2026): men the owner's consolidated pricing file and the public Wikipedia player categories name, who the archive did not yet hold.
 * Built by `scripts/rumble/build-roster-wave.ts` into `club-packs/<club>/wave-roster-2026-10-10.json`; added here on top of every club's compiled data, never over an
 * existing record (a name or alias already in the archive is skipped — exact match, rule 7). Confidence 1 (one source, unreviewed): the Rumble and the other
 * games that deal every man use them; the trivia generator (confidence ≥ 2) does not (rule 2). Years and positions are null/empty unless a source states them.
 */
type Wave={sources:Source[];players:Fact<ClubPlayer>[]}
const WAVES:Record<string,Wave>={celtic:cel,'aek-athens':aek,olympiacos:oly,panathinaikos:pao,'st-pauli':stp,'zrinjski-mostar':zri,'hapoel-petah-tikva':hpt,'hapoel-tel-aviv':hta} as unknown as Record<string,Wave>
export function withRosterWave(id:string,data:ClubData):ClubData{
 const w=WAVES[id];if(process.env.ROSTER_WAVE_OFF||!w||!w.players.length||!data.players)return data
 const have=new Set<string>(),ids=new Set<string>()
 for(const p of data.players){ids.add(p.id);for(const n of [p.value.name,...p.value.aliases])have.add(norm(n))}
 const add=w.players.filter(p=>!ids.has(p.id)&&![p.value.name,...p.value.aliases].some(n=>have.has(norm(n))))
 if(!add.length)return data
 const used=new Set(add.flatMap(p=>p.sources)),known=new Set(data.sources.map(s=>s.id))
 return {...data,players:[...data.players,...add],sources:[...data.sources,...w.sources.filter(s=>used.has(s.id)&&!known.has(s.id))]}
}
