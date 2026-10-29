import 'server-only'
import petah from '@/club-packs/hapoel-petah-tikva/wave-goals-2026-10-19.json'
import panathinaikos from '@/club-packs/panathinaikos/wave-goals-2026-10-19.json'
import aek from '@/club-packs/aek-athens/wave-goals-2026-10-19.json'
import celtic from '@/club-packs/celtic/wave-goals-2026-10-19.json'
import stPauli from '@/club-packs/st-pauli/wave-goals-2026-10-19.json'
import zrinjski from '@/club-packs/zrinjski-mostar/wave-goals-2026-10-19.json'
import petah28 from '@/club-packs/hapoel-petah-tikva/wave-goals-2026-10-28.json'
import panathinaikos28 from '@/club-packs/panathinaikos/wave-goals-2026-10-28.json'
import aek28 from '@/club-packs/aek-athens/wave-goals-2026-10-28.json'
import stPauli28 from '@/club-packs/st-pauli/wave-goals-2026-10-28.json'
import zrinjski28 from '@/club-packs/zrinjski-mostar/wave-goals-2026-10-28.json'
import {mergeWave} from './waves'

const WAVES:Record<string,Record<string,unknown>>={
 'hapoel-petah-tikva':petah,panathinaikos,'aek-athens':aek,celtic,
 'st-pauli':stPauli,'zrinjski-mostar':zrinjski,
}

/** Checked final-contact reconstructions use the existing pack compiler and game.
 * Earlier approvals win on collisions. No players, fixtures or game rules change. */
/** 28.10.2026 — the content round's wave: more goals two publishers describe touch by touch (agent review). */
const WAVES_28:Record<string,Record<string,unknown>>={'hapoel-petah-tikva':petah28,panathinaikos:panathinaikos28,'aek-athens':aek28,'st-pauli':stPauli28,'zrinjski-mostar':zrinjski28}
export function withGoalWave<T extends Record<string,unknown>>(pack:T,clubId:string):T{
 const first=mergeWave(pack,WAVES[clubId])
 return WAVES_28[clubId]?mergeWave(first,WAVES_28[clubId]):first
}
