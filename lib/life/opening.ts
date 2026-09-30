import type { HistoricalAnchor } from './anchors'
import { longDateHe } from './cutscenes'

/**
 * הפתיח — six moments before the player is allowed to touch anything.
 *
 * The vision document (§4) sets the job of this sequence in one sentence, and it is worth
 * keeping in front of whoever edits this file: **it has to explain why Hapoel already has
 * a place in this child's life before he is old enough to choose it.** Nothing here is
 * gameplay and nothing here is exposition. It is a father, a radio, a scarf on a cot, and
 * a boy who ends up at a window looking at a floodlight.
 *
 * ## Why it is data and not a scene
 *
 * The sequence is DOM — six beats, two of them short films — for the same reason the
 * dialogue is DOM: Hebrew in a WebGL canvas gets no bidi handling, no selection, no
 * screen reader, and reflows badly on a narrow phone. It also means the whole opening
 * costs the game nothing until it plays: no Phaser scene, no texture atlas, no boot.
 *
 * ## The one rule it shares with everything else
 *
 * A beat may hold a caption written for it, and it may hold a line READ OFF THE ARCHIVE,
 * and it may not hold a caption that states a fact. The cup final of 1983 is the case: on
 * 3.9.2026 `content/manual` gained 1.6.1983, הפועל תל אביב 3 מכבי תל אביב 2, and Gili
 * Landau's 67th-minute goal — so beat three names the date, the opponent and the score by
 * resolving `prologueAnchor`, and if that row ever leaves the archive the beat quietly
 * goes back to being a photograph of a man lifting a child. Nothing in this file will
 * ever have to be edited for that to happen, which is the entire point of writing it
 * this way rather than typing `1.6.1983` into a caption.
 */

/**
 * The six documentary modes (owner spec 25.9.2026, §16 and §50). A mode names what the beat
 * IS — the component decides what that looks like. No CSS class ever lives in this file
 * (§48): `mode: 'archive'`, never `className: 'bg-black border…'`.
 *
 *   origin    the huge year, the thread's first node, clean titles
 *   memory    a strip of dark "paper" behind the line that turns the beat
 *   archive   film marks, the year stamp, the archive's own line in mono
 *   identity  the thread itself is the picture — the mark drawn again and again
 *   lights    two cold floodlight beams and haze; never yellow, never warm
 *   handoff   a clean frame, the title, the thread leaving the glass
 */
export type OpeningDocumentaryMode = 'origin' | 'memory' | 'archive' | 'identity' | 'lights' | 'handoff'

export const OPENING_MODES: readonly OpeningDocumentaryMode[] = ['origin', 'memory', 'archive', 'identity', 'lights', 'handoff']

export type OpeningBeat = {
  id: string
  mode: OpeningDocumentaryMode
  /** how long it holds, in milliseconds, when nobody touches anything */
  ms: number
  /**
   * The first stretch of `ms` in which only the overline and the thread's first point are on
   * the glass — beat 0 of the spec, the breath before the first sentence (§8).
   */
  leadMs?: number
  /** the line itself. Written for the beat; never a fact. */
  captionHe: string
  /**
   * שנה על הפריים — the year the beat is stamped with, as background architecture.
   *
   * A stamp is a DATE and never a caption, and only where the year is KNOWN, never typed
   * where the archive already holds it: `stampFrom: 'anchor'` takes the year off the
   * prologue anchor's own date, so the beat that shows the cup final is stamped 1983
   * because the archive says 1 June 1983 and for no other reason. A beat with neither is
   * a beat with no year on it, which is the honest state of a memory nobody has dated.
   */
  stampHe?: string
  stampFrom?: 'anchor'
  /**
   * A second line, built from the archive at render time.
   *
   * `fixture` is `הפועל תל אביב — מכבי תל אביב · 3:2 · 1 ביוני 1983`, `date` is
   * `1 ביוני 1983`. Both come from the prologue anchor and both are null when the archive
   * cannot answer, in which case the beat simply has one line.
   */
  archiveLine?: 'fixture' | 'date'
  /** a small line ABOVE the caption — a place, a register; never a fact */
  overlineHe?: string
  /** a small line BELOW the caption — an index of the beat, the way a documentary lists */
  noteHe?: string
  /**
   * The part of `captionHe` the beat turns on. It must be a verbatim substring of the
   * caption (asserted): it is a direction — where the paper goes, which line lands — and
   * never a second copy of the text.
   */
  emphasisHe?: string
}

/**
 * The order, and it is the order the vision document proposed.
 *
 * 1978 · the cot — the family on the way — 1983 · the shoulders — the crest at the table —
 * the window. Five pictures and no explanation, and then the boy is on his father's
 * shoulders in a crowd he does not understand, and the player has the controls.
 *
 * There was a sixth at the front until 6.9.2026: a cold open on the new ground in 2026,
 * "forty-eight years, he still goes there", cutting back to the cot. It was a good frame
 * for a game whose first playable minute was a narrated title card. It stopped being one
 * the moment 1983 became something you play: an opening that says "he is still going" and
 * then hands you a five-year-old has already told you how it turns out, and it made the
 * first thing in a childhood a picture of an old man's habit. Maor cut it, and he is
 * right. The coda at the end of the built life still returns to that ground, which is
 * where the sentence belongs — at the end of a life rather than in front of one.
 */
/**
 * ------------------------------------------------------------------------------------
 * **הסרט נכנס, ואלה חמש התמונות שמנגנות כשהוא לא יכול (17.9.2026).**
 *
 * מאור מסר `opening-2026-09-17.mov` — 21.4 שניות בשחקנים חיים, אותם ביטים כמו החמישה
 * למטה, עם הכתוביות **צרובות בתמונה** — ואמר *"במקום המצגת שיש כעת"*.
 *
 * הוא נמדד ולא נשלח באותו בוקר, וזה היה נכון: הפס הקנוני של `lib/isYellow.ts`, על
 * הפענוח (כלל 61), על כל 642 הפריימים — **352 נושאים צהוב, הגרוע 4.5303%**, והוא שעת
 * הזהב בסצנת העריסה ולא רעש קידוד. כלל 8 מתיר חריג רק מפי הבעלים, על נכס מסוים, במילים
 * שלו. אז הוצגה לו המדידה, והתשובה הייתה **"הסרטון מאושר כפי שהוא."** — וזה בדיוק הסדר
 * שכלל 69 דורש. שלושת הקבצים רשומים ב-`lib/brand/yellowExemptions.ts` עם המספרים שלהם.
 *
 * **ולמה חמש התמונות נשארות.** לא כשריד: הן הפתיח שמנגן כשהסרט לא יכול — `prefers-
 * reduced-motion`, אוטופליי שנדחה, קודק חסר, רשת שנתקעה. `components/life/Opening.tsx`
 * היא ההחלטה. הן גם החצי ה**נגיש**: הטקסט שלהן הוא DOM, קורא מסך קורא אותו, והכתוביות
 * של הסרט הן פיקסלים.
 *
 * ולכן `archiveLine` עדיין כאן. בסרט אין שורת ארכיון — הכתוביות שלו נרטיביות בלבד ולא
 * אומרות תאריך, יריבה או תוצאה, וזה מה שמתיר אותו תחת כלל 11 — ובמצגת הביט השלישי עדיין
 * קורא את גמר 1983 מהעוגן. אם השורה הזאת תיעלם, הפתיח הנגיש יאבד את הדבר היחיד בו
 * שהארכיון אומר בעצמו.
 * ------------------------------------------------------------------------------------
 */
/**
 * הסרט — שני קידודים ופוסטר, ולא קובץ אחד.
 *
 * כלל 30: *"the video ships as **both** VP9/WebM and h.264/mp4"*, כי דפדפן ה-QA הוא
 * Chromium פתוח בלי מפענח h.264 — כלומר בלי ה-WebM הפתיח אינו ניתן לאימות כאן, והוא היה
 * "מן הסתם עובד" במקום נבדק. ה-WebM ראשון גם משום שהוא הקטן והנקי מבין השניים.
 */
export const FILM = {
  webm: '/life/opening/opening-film.webm',
  mp4: '/life/opening/opening-film.mp4',
  poster: '/life/opening/opening-film-poster.png',
  /**
   * 25.84 שניות — `ffprobe` על ה-MP4 שעלה ב-23.9.2026 (היה 21.405, הסרט של 17.9). ה-WebM
   * של אותה העלאה נמדד 7.949 ש׳ בלבד — קידוד קטוע — ולכן ה-MP4 היה הראשון ב-`OpeningFilm`.
   * 25.9.2026: ה-WebM קודד מחדש מה-MP4 ונמדד — VP9 25.864 ש׳ / h.264 25.833 ש׳, 775 פריימים
   * בשניהם — ולכן VP9 חזר להיות ה-`<source>` הראשון (כלל 30). המספר כאן הוא של הקידוד הקצר
   * מבין השניים; המעבר לדוקומנטרי (`beatForFilmMs`) יכול רק להקדים, לא לאחר. הבעלים על
   * הגרסה הזאת: "מאשר את הגרסא החדשה, עם הצהוב." (`lib/brand/yellowExemptions.ts`).
   */
  ms: 25_840,
} as const

/**
 * ------------------------------------------------------------------------------------
 * **25.9.2026 — the documentary thread.** The five stills stopped being the fallback. Owner
 * spec (OPENING DOCUMENTARY HYBRID): when the film cannot play, the player gets a SECOND
 * real opening built from text, time, a line, typography, light, grain and rhythm — and
 * nothing that has to be downloaded. So the beats below carry a `mode` and no `art`. The
 * captions are the same canonical sentences, word for word (§15: this is directing, not
 * rewriting); the entry breath and the handoff line are the only new copy.
 *
 * The stills and the two clips are NOT deleted (§17, and the 17.9 decision that they are
 * the accessible half of the opening): they stay in `public/life/opening`, registered in
 * the asset provenance, ready to come back as optional polish (§18) — never as a
 * dependency. `tests/life-opening.test.ts` holds both halves of that.
 *
 * 22.8 s in all — a real alternative to the 21.4 s film, not a 27 s slideshow (§31).
 * ------------------------------------------------------------------------------------
 */
export const OPENING: OpeningBeat[] = [
  {
    id: 'born',
    mode: 'origin',
    stampHe: '1978',
    leadMs: 900,
    ms: 4400,
    overlineHe: 'דרום תל אביב',
    // The one caption the vision document wrote itself, kept word for word.
    captionHe: 'עוד לפני שידע לדבר, כבר החליטו בשבילו איפה הלב שלו יהיה.',
    noteHe: 'בית · אבא · שבת',
  },
  {
    id: 'first-time',
    mode: 'memory',
    ms: 3600,
    captionHe: 'בפעם הראשונה הוא לא זכר כלום. אבא זוכר הכול.',
    emphasisHe: 'אבא זוכר הכול.',
  },
  {
    id: 'cup',
    mode: 'archive',
    // The year comes off the archive row, not out of this file.
    stampFrom: 'anchor',
    ms: 4800,
    overlineHe: 'מהארכיון',
    captionHe: 'הוא לא הבין את החוקים. הוא הבין את אבא.',
    archiveLine: 'fixture',
  },
  {
    id: 'crest',
    mode: 'identity',
    ms: 3600,
    captionHe: 'אחר כך ציירו אותו שוב ושוב, עד שהילד ידע לצייר אותו לבד.',
  },
  {
    id: 'window',
    mode: 'lights',
    ms: 3400,
    captionHe: 'ומהחלון שלו רואים את הזרקורים.',
  },
  {
    id: 'handoff',
    mode: 'handoff',
    ms: 3000,
    // From explanation to invitation (§14): the documentary stops talking ABOUT him and
    // hands the player the controls.
    captionHe: 'מכאן אתה כבר בפנים.',
  },
]

export type OpeningLines = {
  captionHe: string
  /** the archive's line, or null when the archive cannot answer */
  archiveHe: string | null
  /** what goes in the corner: a written stamp, the anchor's year, or nothing */
  stampHe: string | null
}

const US_HE = 'הפועל תל אביב'

export function openingLines(beat: OpeningBeat, anchor: HistoricalAnchor): OpeningLines {
  const match = anchor.match
  // the stamp: written, or the anchor's own year, or nothing at all
  const stampHe =
    beat.stampFrom === 'anchor'
      ? (match?.playedOn?.slice(0, 4) ?? null)
      : (beat.stampHe ?? null)

  if (!beat.archiveLine) return { captionHe: beat.captionHe, archiveHe: null, stampHe }
  if (!match) return { captionHe: beat.captionHe, archiveHe: null, stampHe }

  if (beat.archiveLine === 'date') {
    return { captionHe: beat.captionHe, archiveHe: longDateHe(match.playedOn), stampHe }
  }

  const home = match.atHome ? US_HE : match.opponentHe
  const away = match.atHome ? match.opponentHe : US_HE
  // Goals for and against, in that order, never a "3:2" string typed by hand — the archive
  // holds two numbers and the direction they belong to.
  const scoreHe = match.atHome
    ? `${match.scoredFor}:${match.scoredAgainst}`
    : `${match.scoredAgainst}:${match.scoredFor}`
  const date = longDateHe(match.playedOn)
  return {
    captionHe: beat.captionHe,
    archiveHe: `${home} — ${away} · ${scoreHe}${date ? ` · ${date}` : ''}`,
    stampHe,
  }
}

/** Total run time if nobody skips, for the loading estimate and for the tests. */
export function openingMs(): number {
  return OPENING.reduce((total, beat) => total + beat.ms, 0)
}

/**
 * A caption, cut where a documentary would cut it: after a sentence, after a comma. Each
 * piece arrives on its own breath, and the pieces joined are the caption again, character
 * for character (asserted) — the direction never edits the sentence.
 */
export function captionPieces(captionHe: string): string[] {
  const pieces = captionHe.match(/[^.,!?]+[.,!?]*\s*/g) ?? [captionHe]
  return pieces.filter((piece) => piece.trim() !== '')
}

/**
 * Where a frozen film hands over (the one rescue `openingAttempt.ts` allows): the beat whose
 * share of the documentary matches the share of the film already seen, so a player who
 * watched 1978 and the family does not watch them again.
 */
export function beatForFilmMs(filmMs: number): number {
  const share = Math.max(0, Math.min(1, filmMs / FILM.ms))
  const total = openingMs()
  let elapsed = 0
  for (let i = 0; i < OPENING.length; i += 1) {
    elapsed += OPENING[i]!.ms
    if (elapsed / total > share) return i
  }
  return OPENING.length - 1
}

/**
 * הפתיח מתנגן פעם אחת — for a life that is starting, and never again for that life.
 *
 * The first version of this used `sessionStorage`, which meant every new tab was a new
 * opening: a player who had been in 1991 for a week sat through the cot and the bus every
 * time they came back. That is not what a film does. The opening belongs to a NEW GAME —
 * a life with nothing in its log yet — and once it has played it is written into that
 * life as `life:opening`, a person-flag that survives every year and every day. Reset the
 * life and the opening comes back, because it is a new life. Reload in the middle of the
 * sequence and it plays again, because it never finished.
 */
export const OPENING_FLAG = 'life:opening'

/** True when this life has been lived past its first minute — the opening is not for it. */
export function lifeHasBegun(events: readonly { t: string }[], flags: Record<string, unknown>): boolean {
  if (flags[OPENING_FLAG]) return true
  return events.some((event) => event.t === 'chapter.entered' || event.t === 'moved')
}

/** @deprecated — the key the shell used to write into `sessionStorage`; read nowhere now */
export const OPENING_SEEN = 'the-worker:life:opening'
