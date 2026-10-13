import type {ClubData,Fact,ClubPlayer,Source} from './contract'
import cel from '@/club-packs/celtic/wave-roster-2026-10-10.json'
import aek from '@/club-packs/aek-athens/wave-roster-2026-10-10.json'
import oly from '@/club-packs/olympiacos/wave-roster-2026-10-10.json'
import pao from '@/club-packs/panathinaikos/wave-roster-2026-10-10.json'
import stp from '@/club-packs/st-pauli/wave-roster-2026-10-10.json'
import zri from '@/club-packs/zrinjski-mostar/wave-roster-2026-10-10.json'
import hpt from '@/club-packs/hapoel-petah-tikva/wave-roster-2026-10-10.json'
import stpPeople from '@/club-packs/st-pauli/wave-squad-people-2026-10-12.json'
import zriPeople from '@/club-packs/zrinjski-mostar/wave-squad-people-2026-10-12.json'
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
// Squad-people wave (12.10.2026, owner-approved): DFB (St. Pauli, 78) and National Football Teams (Zrinjski, 6) men the club did not hold. Confidence 2, wired 13.10.2026.
const PEOPLE:Record<string,Wave>={'st-pauli':stpPeople,'zrinjski-mostar':zriPeople} as unknown as Record<string,Wave>
export function withRosterWave(id:string,data:ClubData):ClubData{
 if(id==='hapoel-tel-aviv')return data // Canonical Worker player master only; external waves require separate approval.
 const r=WAVES[id],pp=PEOPLE[id];if(process.env.ROSTER_WAVE_OFF||!data.players)return data
 const names=(p:Fact<ClubPlayer>)=>[p.value.name,...p.value.aliases].map(norm),ppNames=new Set((pp?.players??[]).flatMap(names))
 // a man in both waves is dealt once, from the squad-people wave (confidence 2)
 const w:Wave|undefined=r&&pp?{sources:[...r.sources,...pp.sources],players:[...pp.players,...r.players.filter(p=>!names(p).some(n=>ppNames.has(n)))]}:r??pp
 if(!w||!w.players.length)return data
 const have=new Set<string>(),ids=new Set<string>()
 for(const p of data.players){ids.add(p.id);for(const n of [p.value.name,...p.value.aliases])have.add(norm(n))}
 const add=w.players.filter(p=>!ids.has(p.id)&&![p.value.name,...p.value.aliases].some(n=>have.has(norm(n))))
 if(!add.length)return data
 const used=new Set(add.flatMap(p=>p.sources)),known=new Set(data.sources.map(s=>s.id))
 return {...data,players:[...data.players,...add],sources:[...data.sources,...w.sources.filter(s=>used.has(s.id)&&!known.has(s.id))]}
}
