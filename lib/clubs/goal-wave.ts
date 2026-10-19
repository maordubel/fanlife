import 'server-only'
import petah from '@/club-packs/hapoel-petah-tikva/wave-goals-2026-10-19.json'
import panathinaikos from '@/club-packs/panathinaikos/wave-goals-2026-10-19.json'
import aek from '@/club-packs/aek-athens/wave-goals-2026-10-19.json'
import celtic from '@/club-packs/celtic/wave-goals-2026-10-19.json'
import stPauli from '@/club-packs/st-pauli/wave-goals-2026-10-19.json'
import zrinjski from '@/club-packs/zrinjski-mostar/wave-goals-2026-10-19.json'
import {mergeWave} from './waves'

const WAVES:Record<string,Record<string,unknown>>={
 'hapoel-petah-tikva':petah,panathinaikos,'aek-athens':aek,celtic,
 'st-pauli':stPauli,'zrinjski-mostar':zrinjski,
}

/** Checked final-contact reconstructions use the existing pack compiler and game.
 * Earlier approvals win on collisions. No players, fixtures or game rules change. */
export function withGoalWave<T extends Record<string,unknown>>(pack:T,clubId:string):T{
 return mergeWave(pack,WAVES[clubId])
}
