/**
 * TOMBSTONE — retired 21.9.2026. Gate 8 keeps no progress store of its own.
 *
 * This file wrote raw `localStorage` (`worker.replayProgress.v1`) from inside a gate —
 * a second persistence system beside `lib/profile/store.ts` — and keyed each "best" by
 * the ARTICLE title, so two goals reported in one article shared one best score (five
 * such pairs in the archive). A move rebuilt at 78 or better is now collected under
 * its own goal id (`collect('goal', [goalId])`), and the run itself is `RecordRun`.
 *
 * It stays here inert because a delta reaches the repo through GitHub's web upload,
 * which never deletes (rule 26). Exports nothing, imports nothing.
 */
export {}
