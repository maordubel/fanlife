/**
 * עצירות — goals the archive holds and this gate may not PLAY, and why each one is held.
 *
 * Joining `content/manual/goals.json` to the match archive (21.9.2026) found three records
 * (all three settled and released on 1.10.2026 — see below) whose FIXTURE disagrees with the archive's own match rows. The move itself — who, what,
 * from where — is not what is disputed; the match it happened in is. A rebuild is dealt
 * under a masthead that prints the opponent and the score, so a record whose opponent is
 * in dispute would put a contested fact on screen as a heading, and grade the player
 * against a report that may be about another night.
 *
 * So they are held OUT of the gate until Maor re-reads the reports (ynet, ONE), and they
 * are held by NAME rather than filtered by a rule, because a hold is a decision about three
 * specific records and it should read like one. The conflicts are recorded — unresolved —
 * in `content/manual/fact-conflicts.json` by the Match Master work (rule 60 §3); this list
 * is only the gate's reaction to them, and it does not touch any other surface: the trivia
 * wing decides for itself what to do with the same rows.
 *
 * When the Match Master ships `usable.replay`, that flag supersedes this file and a hold
 * that disagrees with it is a test failure, not a silent winner.
 */

export type ReplayHold = {
  /** the fields of the record that the archive contradicts */
  fields: ReadonlyArray<'opponentHe' | 'scoreHe' | 'minute'>
  /** what `goals.json` says */
  claim: string
  /** what the rest of the archive says, and where */
  against: string
}

/**
 * Empty since 1.10.2026. Maor settled the three cup-final records on that day — 2010: the
 * opponent is בני יהודה and Vermouth's second goal is minute 73; 2012: the opponent is
 * מכבי חיפה and Dovidovitch is right — and `goals.json` was corrected to match. A hold is a
 * reaction to a REAL conflict (rule 65); when the evidence is settled the hold goes, and
 * this list stays as the place the next one would be named.
 */
export const REPLAY_HOLDS: Readonly<Record<string, ReplayHold>> = {}

export function replayHeld(goalId: string): boolean {
  return Object.prototype.hasOwnProperty.call(REPLAY_HOLDS, goalId)
}
