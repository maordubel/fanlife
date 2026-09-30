/**
 * מצבה — retired on 2.9.2026 when the concept boards arrived.
 *
 * This file held the first world: nine locations built out of coloured rectangles by
 * `runtime/painter.ts`, in a top-down view. The approved concept art is painted 3/4
 * interiors and streets, so the world moved to `world/scenes.ts` — one painting per
 * place with a walk band across it — and every location, exit, person and interaction
 * moved with it.
 *
 * It stays here as an inert tombstone rather than being deleted, because deltas reach
 * this repo through GitHub's web upload, which adds and overwrites but never removes
 * (rule 26). A retired file that still imported something would keep failing the deploy
 * long after the local tree was clean, so this one imports nothing and exports nothing
 * that anybody reads.
 *
 * The schedule that used to live here now lives in `world/scenes.ts` beside the scenes it
 * belongs to: KICKOFF, KOBI_LEAVES, FULL_TIME.
 */

export const RETIRED_ON = '2026-09-02'
export const REPLACED_BY = 'lib/life/world/scenes.ts'
