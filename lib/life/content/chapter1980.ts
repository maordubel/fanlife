/**
 * מצבה — retired on 2.9.2026, in the master timeline rebase.
 *
 * The protagonist's birth year moved from 1972 to 1978, which makes him eight in 1986
 * rather than 1980. Everything in this file moved with him to
 * `lib/life/content/chapter1986.ts`: the identity, the prologue, the endings, the items
 * and the objectives. Nothing was renamed in place, because a file called `chapter1980`
 * holding 1986 content is how a codebase starts lying about itself.
 *
 * It stays as an inert tombstone rather than a deletion because deltas reach this repo
 * through GitHub's web upload, which adds and overwrites but never removes (rule 26).
 */

export const RETIRED_ON = '2026-09-02'
export const REPLACED_BY = 'lib/life/content/chapter1986.ts'
