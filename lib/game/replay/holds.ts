/**
 * עצירות — goals the archive holds and this gate may not PLAY, and why each one is held.
 *
 * Joining `content/manual/goals.json` to the match archive (21.9.2026) found three records
 * whose FIXTURE disagrees with the archive's own match rows. The move itself — who, what,
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

export const REPLAY_HOLDS: Readonly<Record<string, ReplayHold>> = {
  // Cup final, 11.5.2010. goals.json prints בית"ר ירושלים and 1:3; the Vikipoel Games table
  // (matches.json, confidence 2) has הפועל ת"א 3:1 בני יהודה for the same date and stage,
  // and raw Vikipoel lists ורמוט 25 and 75 and אניימה (pen.) 45 — i.e. Bnei Yehuda's night.
  'cupfinal-2010-vermouth-25': {
    fields: ['opponentHe', 'scoreHe'],
    claim: 'goals.json: בית"ר ירושלים · 1:3 להפועל',
    against: 'matches.json 2010-05-11 גמר גביע המדינה: הפועל ת"א 3:1 בני יהודה (ויקיפועל Games)',
  },
  // Same match, and the minute disagrees as well: 73 here, 75 in raw Vikipoel.
  'cupfinal-2010-vermouth-73': {
    fields: ['opponentHe', 'scoreHe', 'minute'],
    claim: 'goals.json: בית"ר ירושלים · 1:3 להפועל · דקה 73',
    against: 'matches.json 2010-05-11: הפועל ת"א 3:1 בני יהודה; ויקיפועל: ורמוט 75',
  },
  // Cup final, 15.5.2012. goals.json prints הפועל באר שבע; the archive has מכבי חיפה 2:1,
  // and the record contradicts ITSELF — its last touch is "מול דוידוביץ'", Maccabi Haifa's
  // keeper that season.
  'cupfinal-2012-igiebor-90-2': {
    fields: ['opponentHe'],
    claim: 'goals.json: הפועל באר שבע',
    against: 'matches.json 2012-05-15 גמר גביע המדינה: הפועל ת"א 2:1 מכבי חיפה; הרשומה עצמה נוקבת בדוידוביץ\'',
  },
}

export function replayHeld(goalId: string): boolean {
  return Object.prototype.hasOwnProperty.call(REPLAY_HOLDS, goalId)
}
