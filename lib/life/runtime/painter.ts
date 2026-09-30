/**
 * מצבה — retired on 2.9.2026, when the concept boards arrived.
 *
 * This module was part of the procedural placeholder renderer: 'painter' drew the world (or
 * its people) out of flat shapes so the gameplay could be built and judged before any
 * artwork existed. It did its job. The game now draws Maor's approved paintings, cut by
 * `scripts/life/build-art.py` and named in `lib/life/runtime/art.ts`.
 *
 * It stays as an inert tombstone rather than a deletion because deltas reach this repo
 * through GitHub's web upload, which adds and overwrites but never removes (rule 26). A
 * retired file that still imported something would keep failing the deploy long after the
 * local tree was clean — so this one imports nothing.
 */

export const RETIRED_ON = '2026-09-02'
export const REPLACED_BY = 'lib/life/runtime/art.ts'
