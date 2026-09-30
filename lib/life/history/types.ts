/**
 * ההיסטוריה כנתון — the shape a documented match takes when a game has to play it.
 *
 * Until 7.9.2026 the two days this game is really about — 12.5.1990 and 2.5.1998 — were
 * each a hand-written table inside the file that played them. `GOAL_AT = [12, 29, 44, 58,
 * 71, 84]` sat in `runtime/match1990.ts` looking exactly like history, and Yavne existed
 * only as three words, `level → ahead → further`. Maor's audit put the objection in one
 * sentence: internal pacing is not the historical record, and a mission whose whole
 * mechanic is documentary information cannot keep its documents in its head.
 *
 * So the record moves out here, and the record is careful about one thing above all:
 *
 *   **`minute` is what a source says. `pacingMinute` is what the game does.**
 *
 * They are different fields because they are different kinds of claim, and no amount of
 * convenience is allowed to merge them. Where no source gives a minute — which is most of
 * 12.5.1990, because the Walla retrospective names the scorers and not the clock —
 * `minute` is `null` and stays `null`. The game still needs to put those goals somewhere
 * in ninety minutes, and it does, in `pacingMinute`, which is a directing decision with a
 * directing decision's status: never shown, never spoken, never asserted.
 *
 * The second rule is the one rule 11 turns into code. An event whose confidence is
 * `disputed` — a scorer only Maor's internal brief names, a scoreline no source confirms —
 * is not `speakable`. The director will happily run the day off it, because the SHAPE of
 * the day (somebody is ahead, the status quo held at half-time) is what the verified
 * sources do support. It will not let anybody on the terrace say the name. That is the
 * difference between a game built on an archive and a game that decorates itself with one.
 *
 * The third rule: conflicts are stored, never resolved. Walla counts two for Zano and a
 * sixth for Elbaz; Maor's audit counts three for Zano and no Elbaz. Both claims live in
 * the same record with `conflictNote` naming them, exactly as `content/manual/
 * fact-conflicts.json` already does for the championship count.
 */

/** how much weight a claim carries — the same three words the audit asked for */
export type EventConfidence = 'verified' | 'high' | 'disputed'

export type HistoricalEventType =
  | 'kickoff'
  | 'goal'
  | 'penalty_awarded'
  | 'penalty_missed'
  | 'corner'
  | 'half_time'
  | 'full_time'
  | 'state'
  | 'other'

export type HistoricalMatchEvent = {
  id: string
  matchId: string
  venueId: string
  /**
   * The archive's minute, or `null` when no source gives one. Never a guess, never
   * back-filled from `pacingMinute`, and never rendered when `null`.
   */
  minute: number | null
  /** what a source PRINTS, when that is not a bare number ("93׳", "תוספת זמן") */
  displayMinute?: string
  /** the order within the venue, where a source gives an order but no clock */
  sequence: number
  type: HistoricalEventType
  /** club slug, in the archive's Hebrew keys */
  teamSlug?: string
  /** the scorer, as a source names him — only ever spoken when `speakable` */
  personHe?: string
  assistHe?: string
  /** running score after this event, in the venue's home–away order */
  scoreAfter?: string
  sourceIds: string[]
  confidence: EventConfidence
  conflictNote?: string
  /**
   * May a character in the game say this out loud? False for anything a named external
   * source does not carry. The director enforces it; `tests/life-history.test.ts` proves
   * no `disputed` event is ever speakable.
   */
  speakable: boolean
  /**
   * המקום בתסריט — where the GAME plays this, in venue minutes. Pacing, not history.
   * Present on every event because the director has to run a clock; meaningless as a
   * historical claim and never displayed.
   */
  pacingMinute: number
  /** a short Hebrew line the terrace may use — only where `speakable` */
  lineHe?: string
  /**
   * מה בדיוק קרה שם — the source's own description of the event, for the REPORT card.
   *
   * It is not `lineHe` and the difference is the whole of rule 60.2. `lineHe` is what a
   * fallible man on a terrace says, so it may carry no number and no name. This is what a
   * source PRINTS, shown on a screen that prints the source underneath it (rule 16) — "a
   * rebound after Ofer Shitrit's shot was pushed out". A character may never say it; a
   * card may always show it, because a card can cite.
   */
  detailHe?: string
}

/** a named source, resolved by id from every event that leans on it */
export type HistorySource = {
  id: string
  titleHe: string
  /**
   * הכינוי הקצר — what a citation under one row says, when the full title would drown it.
   *
   * The full `titleHe` carries the parenthesis of verified detail that makes a source
   * worth citing at all, and it belongs in the bibliography at the foot of the card. Under
   * a goal it is four lines of grey, repeated four times, and a citation nobody reads is a
   * citation that has stopped doing its job. Falls back to `titleHe`, so a source without
   * one is still cited in full rather than silently unattributed.
   */
  shortHe?: string
  url: string | null
  /** `archive` — a public source; `brief` — Maor's own documents, which are evidence about intent, not about football */
  kind: 'archive' | 'brief'
}

/** one ground on one day: its own kickoff, its own clock, its own stream */
export type VenueTimeline = {
  venueId: string
  matchId: string
  nameHe: string
  /** minutes after the PRIMARY venue's kickoff that this ground starts — 1998's parallel ground kicked off later */
  kickoffOffset: number
  /** the archive's final score, home–away, or null where the archive refuses to hold one */
  finalHe: string | null
  /**
   * איזה מחזור — as a number, not as a sentence.
   *
   * 7.9.2026: the game called 2.5.1998 "המחזור ה-29" in its narration and `מחזור 30` in its
   * archive at the same time, and both were strings nobody could test. It was the
   * penultimate round — Ballerz: *"שני מחזורים לסיום העונה"*, and *"במחזור הסיום שתי הקבוצות
   * ניצחו"* about the week after. So the round is data now, and
   * `tests/life-history.test.ts` reads it here rather than grepping prose.
   */
  round?: { number: number; ofTotal: number; isFinal: boolean }
  events: HistoricalMatchEvent[]
  /** why this ground matters to the boy standing in the other one */
  stakeHe: string
  /** a cup final that went to eleven metres — the one part of a day that is not a clock */
  shootout?: Shootout
}

/**
 * בעיטה אחת — one kick of a shootout, as a source prints it.
 *
 * A shootout is the only part of a documented day this record could not hold, and the
 * reason is structural rather than an oversight: every other event on a `VenueTimeline`
 * is placed by a minute, and a shootout has no minutes at all. It has an ORDER, and the
 * order is the drama. So it is its own list, it is settled from outside
 * (`ParallelHistoricalDirector.settle`), and it carries a source per kick like everything
 * else here.
 */
export type ShootoutKick = {
  /** 1-based, in the order they were taken */
  order: number
  /** true when it is our kick */
  ours: boolean
  takerHe: string
  outcome: 'scored' | 'saved' | 'missed'
  /** the keeper who stopped it, where a source names him */
  keeperHe?: string
  /** the source's own words about the kick — the corner it went into, the bar it hit */
  detailHe?: string
  /** the shootout score after this kick, in the source's own order */
  afterHe?: string
  sourceIds: string[]
}

export type Shootout = {
  /** who took the first kick of every round, in words, because a number would be a guess */
  firstHe: string
  /** the shootout's own result, ours first */
  resultHe: string
  kicks: ShootoutKick[]
  sourceIds: string[]
  conflictNote?: string
}

/**
 * עובדה שאינה אירוע — the referee, the crowd, a sending-off: things a source states about
 * a day that do not sit on its clock.
 *
 * They are kept apart from the event stream because the director runs the stream and
 * nothing here should ever run anything. A crowd figure two sources disagree about is the
 * canonical case, and `conflictNote` is where the disagreement is KEPT (rule 60.3).
 */
export type DayFact = {
  id: string
  labelHe: string
  valueHe: string
  sourceIds: string[]
  confidence: EventConfidence
  conflictNote?: string
}

/**
 * סרט שמישהו אחר צילם — a film of this day, as a LINK and never as an embed.
 *
 * The decision is written down here rather than in the component because it is a
 * decision and not a styling choice. An iframe would load a third-party player into a
 * game about a childhood, would not resolve in the QA container at all (rule 29 — the
 * sandbox refuses those hosts), and would therefore quietly break the "no console
 * errors" claim the three acceptance sentences rest on. A link opens the film in the
 * player's own browser, costs this game nothing, and is cited like any other source.
 */
export type DayFilm = {
  id: string
  titleHe: string
  url: string
  /** who says this film is of this day */
  sourceIds: string[]
}

/**
 * נייר אמיתי — a printed thing that exists, shown whole (rule 49).
 *
 * `printsHe` is what the document itself PRINTS, transcribed, and it is deliberately not
 * a caption in the game's voice: nothing in this game may write on a document, crop a
 * point out of one, or print a gloss across one. Quoting what a page says is the one way
 * to put words near a document without putting words on it.
 */
export type DayDocument = {
  /** a key declared in `DOC` in `runtime/art.ts` — the effect accepts nothing else */
  art: string
  titleHe: string
  /** the document's own words, transcribed and attributed to the document */
  printsHe: string
  sourceIds: string[]
  /** the one that gets the width — a front page shrunk to a thumbnail throws itself away */
  lead?: boolean
  /**
   * מה שחזר איתו הביתה — the one object on this day that a person could have in a pocket.
   *
   * A front page is the world's memory of a day; a ticket stub and a season book are HIS,
   * and the difference decides which screen each belongs on. `EndingCard` closes a
   * Saturday and may hold up a keepsake; `StageFinale` closes a chapter and shows
   * everything. A trophy photographed on its plinth is never a keepsake, however good the
   * picture is, because nobody came home with it.
   */
  keepsake?: boolean
}

export type HistoryDay = {
  id: string
  dateHe: string
  primaryVenueId: string
  venues: VenueTimeline[]
  sources: HistorySource[]
  /** what the archive will not say about this day, in one sentence, for the debug panel */
  silenceHe: string
  /** the referee, the crowd, the cards — stated by a source, off the clock */
  facts?: DayFact[]
  /** the paper somebody kept, in the order it should be shown */
  documents?: DayDocument[]
  /** film of the day, linked out, never embedded */
  films?: DayFilm[]
}
