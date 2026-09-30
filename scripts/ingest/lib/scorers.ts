/**
 * `comments` on a ויקיפועל football row — the scorer line, read strictly.
 *
 * This module is PURE: no file IO, no network, no clock, no randomness. It takes a
 * string that has already been entity-decoded exactly once and answers with the goals it
 * can PROVE plus a refusals list. `sources/vikipoel-scorers.ts` does the reading and the
 * resolving; `scorers-cli.ts` does the writing. Three files, three jobs.
 *
 * **Rule 11 is the whole design.** A shape this parser cannot prove is refused and
 * reported with the raw text and a reason — it is never half-read, never guessed and
 * never quietly dropped. A row that half-parses yields ZERO goals and one refusal,
 * because a scorer list with a hole in it is a worse artefact than no scorer list: it
 * looks complete.
 *
 * **Rule 38 is why this file may not be called on every row.** `comments` is a FOOTBALL
 * convention. Reading it as scorers in the basketball rows once invented twenty goals in
 * a sport that does not record them that way, so the caller filters on `department`
 * before it gets here and `assertFootballDepartment` is the second lock.
 *
 * ---------------------------------------------------------------------------
 * THE GRAMMAR, as the corpus actually writes it
 * ---------------------------------------------------------------------------
 *
 * A scorer line is a list of SEGMENTS separated by top-level `,` or `;` (top level means
 * outside brackets, so `(52, 66)` stays one segment). A segment is a scorer and the
 * goals the source credits to him. Four segment shapes carry a goal spec and all four
 * are in the file:
 *
 *   · SLASH   `אמנון חרל"פ/10`            105 rows — the oldest convention
 *   · PAREN   `דב רמלר (48)`            1,818 rows — the dominant convention
 *   · BARE    `אללוף 27`                   76 rows
 *   · NAKED   `שבי בן ברוך`               291 rows — one goal, minute not stated
 *
 * plus a CONTINUATION: a segment that is a bare minute and no name belongs to the
 * PREVIOUS scorer (`הרברט מייטנר/13, 26` is one man and two goals — the `26` carries no
 * name of its own, so it cannot start one).
 *
 * A goal spec is a comma-separated list of items:
 *   · a minute — `48`, `48'`, `45+2`, `45+2'`, `'90+10` (the apostrophe is written on
 *     either side of the digits; it is a minute mark either way)
 *   · `?` — the source says a goal, and says it does not know when
 *   · a count word — `צמד` 2 · `שלושער`/`שלשער` 3 · `רביעייה` 4 · `חמישייה` 5 ·
 *     `שני שערים` · `N שערים`. A count word may sit before or after the name
 *     (`שלושער אמנון חרל"פ`, `חיים גלזר שלושער`) as well as inside the spec.
 *   · a marker that MODIFIES the minute before it — `פ` `פ'` `פנדל` `בפנדל` `בפ'`
 *     `בעיטת עונשין` (penalty) · `עצמי` `ע'` `ע` (own goal) · `הארכה` (extra time).
 *     A marker may be glued to the minute with no space (`90פ`, `35ע`, `?פ`) or joined
 *     to it by a hyphen (`54'-פ'`); splitting those is not a guess, because `פ` and `ע`
 *     are not digits and cannot be part of a minute.
 *   · `X או Y` — the source is unsure. Recorded, never resolved (rule 60 §3).
 *
 * Brackets are overloaded and that is the one place this file has to be careful:
 * `אברהם פלמן (בוצ'קה)/44` is a NICKNAME and `דב רמלר (48)` is a goal spec. The rule
 * that separates them is mechanical and stated here because a silent mis-read of it is
 * exactly the defect rule 11 exists to prevent:
 *
 *   **A bracket containing a digit MUST parse as a goal spec, or the row is refused.**
 *
 * An earlier draft of this parser let a bracket that failed to parse fall through to
 * "nickname", so `יהושע פייגנבוים (33',54'-פ')` silently became one goal by a man
 * nicknamed `33',54'-פ'`. A fallback that turns an unreadable field into a plausible
 * value is the shape rule 11 forbids, and it is caught here rather than in review
 * because the plausible value is the one nobody looks at twice.
 *
 * ---------------------------------------------------------------------------
 * WHAT IS REFUSED, AND WHY IT IS REFUSED RATHER THAN TUNED
 * ---------------------------------------------------------------------------
 *
 * `comments` is not only a scorer line. It is also where the wiki keeps match NOTES —
 * `המשחק הופסק בדקה ה-80 עקב רדת החשכה`, `10,000 צופים`, `ניצחון טכני`, an appeal to
 * the federation, a crowd invasion. Those rows carry no scorer list at all, or carry one
 * with a sentence bolted to it. Both are refused whole, with the raw text, so that a
 * person reading the report can see what the source actually said.
 *
 * The discriminator is a NAME SHAPE plus an explicit prose lexicon ({@link PROSE_WORDS}),
 * not a similarity score: a scorer token is one to four Hebrew words with no digits and
 * no sentence punctuation, and none of those words may be a word that only ever appears
 * in a note. `10,000 צופים` splits into `10` and `000 צופים` and both fail, which is the
 * intended answer — a crowd figure must never become a minute.
 *
 * **One ambiguity is left open on purpose, because closing it would need the score.**
 * A bracketed bare number is a MINUTE by the dominant convention (`דב רמלר (48)`), but a
 * handful of 1930s–40s rows use it as a COUNT (`[[אמנון חרל"פ]] (3), [[משה זימון]] (2)`
 * in a 5:0). Nothing INSIDE the line distinguishes them. This parser reads every one as
 * a minute and lets the score check catch the rest — those rows then disagree, become
 * recorded conflicts and land at confidence 1 (rule 2 keeps them out of the trivia
 * generator). Using the score to pick the reading would have been the other option and
 * it is the wrong one: the score check is only worth something while it is INDEPENDENT
 * of the parse, and a parser that consults the answer can no longer be measured by it.
 */

/* ------------------------------------------------------------------ the lexicon */

/** Count words the source uses instead of a minute list. */
export const COUNT_WORDS: Readonly<Record<string, number>> = {
  'צמד': 2,
  'שלושער': 3,
  'שלשער': 3,
  'רביעייה': 4,
  'רביעיה': 4,
  'חמישייה': 5,
  'חמישיה': 5,
}

/** Written-out numerals the source pairs with `שערים`. */
const SPELLED_COUNTS: Readonly<Record<string, number>> = {
  'שני': 2,
  'שלושה': 3,
  'ארבעה': 4,
  'חמישה': 5,
}

/** A goal from the spot. `ב` is the preposition the source sometimes prefixes. */
export const PENALTY_MARKERS: ReadonlySet<string> = new Set([
  'פ',
  "פ'",
  'בפ',
  "בפ'",
  'פנדל',
  'בפנדל',
  'מפנדל',
  'בעיטת עונשין',
  'מבעיטת עונשין',
])

/** An own goal by the other side. `ע` is the abbreviation. */
export const OWN_GOAL_MARKERS: ReadonlySet<string> = new Set(['עצמי', "ע'", 'ע', 'בעצמי'])

/** Extra time. Recorded as a marker so the item is legal; no field is derived from it. */
const EXTRA_TIME_MARKERS: ReadonlySet<string> = new Set(['הארכה', 'בהארכה'])

/**
 * Words that appear in a MATCH NOTE and never in a scorer's name.
 *
 * This is a lexicon, not a similarity measure. Every entry earns its place by appearing
 * in `comments` in the corpus inside a sentence, and none of them is a Hebrew given name
 * or surname — which is the property that makes the list safe to apply to a name token.
 * Rule 64 §5 is the precedent: the surname bridge was measured at ~50% error and DELETED
 * rather than tuned, so what stands in for cleverness here is an explicit list somebody
 * can read and argue with.
 */
export const PROSE_WORDS: readonly string[] = [
  // the match and what happened to it
  'המשחק', 'משחק', 'משחקי', 'המשחקים', 'הופסק', 'הופסקה', 'הפסקת', 'נדחה', 'נדחתה',
  'בוטל', 'בוטלה', 'אושרה', 'נערך', 'התקיימו', 'שוחק', 'המשך', 'החוזר',
  'לראשונה', 'בהארכה', 'הארכה', 'הכרעה', 'במחצית', 'מחזור', 'המחזור', 'בסיום',
  'במהלך', 'עלו', 'הנוער', 'הבכירה',
  // the result and the paperwork
  'תוצאה', 'תוצאת', 'בתוצאה', 'התוצאה', 'ניצחון', 'נצחון', 'נצחה', 'הפסד', 'טכני',
  'בפנדלים', 'ערעור', 'ערערה', 'ועדת', 'ההתאחדות', 'התאחדות', 'קבעה', 'נקבע', 'פסק',
  'אליפות', 'אלופת', 'המדינה', 'הגביע', 'מחזיקת', 'ליגה', 'ירדה', 'עלתה', 'זכתה',
  'זוכה', 'לבסוף', 'להפועל', 'בהיסטוריה',
  // people doing things that are not scoring
  'כבש', 'כבשו', 'הבקיע', 'הבקיעה', 'החטיא', 'הורחק', 'הורחקו', 'הכה', 'תקף',
  'התקוטטו', 'פרצו', 'שיתפה', 'שיתף', 'הופיעה', 'הופיעו', 'טענו', 'הודיעו',
  'החליטו', 'לוותר', 'להעניק', 'נותרה', 'פונו', 'השעתה',
  // the cast of a note
  'שחקן', 'שחקנים', 'כדורגלן', 'כדורגלנים', 'שוער', 'השופט', 'שופט', 'קהל', 'אוהדי',
  'צופים', 'עסקן', 'נציגי', 'ההנהלה', 'הקבוצה', 'לשכת', 'ביה"ד',
  // the furniture of a sentence
  'לאחר', 'כיוון', 'בעקבות', 'עקב', 'ייתכן', 'ככל', 'הנראה', 'לפי', 'במקומו', 'בגלל',
  'אך', 'ולכן', 'כמו', 'יתר', 'שלוש', 'פעמים', 'ביניהם', 'נוקשה', 'מגרש', 'למגרש',
  'גשם', 'גשמים', 'בוץ', 'חשכה', 'מהומה', 'דיווחים', 'דיווח', 'נכתב', 'הראשונה',
  // goals talked ABOUT rather than credited
  'שער', 'שערים', 'שעריה', 'נוסף', 'קריירה', 'דקה', 'דקות', 'ובדקה', 'בדקה', 'מרגלי',
  'הכדור', 'פגע', 'בשחקן', 'בדרך', 'לשער', 'חופשית', 'אחרונה', 'מבעיטה',
  // clubs named inside a note
  'הפועל', 'מכבי', 'בית"ר', 'הכח',
]

const PROSE_SET: ReadonlySet<string> = new Set(PROSE_WORDS)

/* ------------------------------------------------------------------ the shapes */

/** One goal the source credits. Every unreadable field is `null`, never a default. */
export type ParsedGoal = {
  /** the name exactly as the source wrote it, or `null` when the source wrote `?` */
  scorerNameHe: string | null
  /** the bracketed alias beside the name (`בוצ'קה`, `דוקטור`) — a hint, never the name */
  nicknameHe: string | null
  /** the minute, or `null` when the source wrote `?` or nothing or two candidates */
  minute: number | null
  /** the `+N` of `90+3`, or `null` */
  stoppage: number | null
  penalty: boolean
  ownGoal: boolean
  /** the source named two candidates (`מאיר או בוצ'קה`) — recorded, never resolved */
  scorerDisputed: boolean
  /** the source named two minutes (`80 או 82`) — recorded, never resolved */
  minuteDisputed: boolean
  /** the segment this goal was read out of, for the report */
  raw: string
}

/** Why a row produced nothing. `code` classes it; `reason` is for a person. */
export type ScorerRefusal = {
  code: ScorerRefusalCode
  reason: string
  /** the whole line, normalised — so the report can show what the source said */
  raw: string
  /** the segment that failed, when one did */
  segment?: string
}

export type ScorerRefusalCode =
  | 'still-encoded'
  | 'empty'
  | 'prose'
  | 'name-unreadable'
  | 'spec-unreadable'
  | 'bracket-with-digits-unreadable'
  | 'two-goal-specs'
  | 'orphan-minute'
  | 'slash-shape'
  | 'note-attached'

export type ScorerLineResult = {
  /** empty whenever `refusals` is not — a half-read row yields nothing (rule 11) */
  goals: ParsedGoal[]
  refusals: ScorerRefusal[]
}

/* --------------------------------------------------------------- normalisation */

/**
 * `[[A]]` → `A`, `[[A|B]]` → `B`.
 *
 * 1,273 of the 2,290 lines carry wiki link markup and 39 of them carry a pipe, where the
 * DISPLAY half is the name the line means to print. This is the only rewriting this file
 * does to the source's own characters.
 */
export function stripWikiLinks(text: string): string {
  return text
    .replace(/\[\[([^\]|]*)\|([^\]]*)\]\]/gu, '$2')
    .replace(/\[\[([^\]]*)\]\]/gu, '$1')
}

/** Link markup out, whitespace collapsed. Nothing else. */
export function normalizeScorerLine(text: string): string {
  return stripWikiLinks(text).replace(/\s+/gu, ' ').trim()
}

/**
 * A guard, not a decoder.
 *
 * The export stores HTML entities inside its JSON strings and the decode belongs to the
 * reader, ONCE — a double-unescape is its own bug, and the way to make it impossible is
 * to have exactly one place that does it. So this parser refuses text that still carries
 * an entity instead of quietly decoding it a second time.
 */
const ENTITY_RE = /&(?:quot|apos|amp|lt|gt|nbsp|#\d+);/u

/* ------------------------------------------------------------------- splitting */

/**
 * Split on separators that sit OUTSIDE brackets.
 *
 * `ישראל וייס (52, 66, 80)` must stay one segment; `רמלר (39), לנדאו (42)` must become
 * two. Depth counting is what tells them apart, and the corpus has no nested and no
 * unbalanced brackets (both checked), so a counter is exact here rather than a heuristic.
 */
export function splitTopLevel(text: string, separators: string): string[] {
  const out: string[] = []
  let depth = 0
  let current = ''
  for (const char of text) {
    if (char === '(') depth += 1
    else if (char === ')') depth = Math.max(0, depth - 1)
    if (depth === 0 && separators.includes(char)) {
      out.push(current)
      current = ''
    } else {
      current += char
    }
  }
  out.push(current)
  return out.map((part) => part.trim()).filter((part) => part !== '')
}

/* ------------------------------------------------------------------ minute spec */

/** `48` · `48'` · `45+2` · `45+2'` · `'90+10`. The apostrophe sits on either side. */
const MINUTE_RE = /^'?(\d{1,3})'?(?:\s*\+\s*(\d{1,2}))?\s*'?$/u

type SpecGoal = {
  minute: number | null
  stoppage: number | null
  penalty: boolean
  ownGoal: boolean
  minuteDisputed: boolean
}

export type SpecResult = { goals: SpecGoal[] } | { error: string }

function markerOf(token: string): 'penalty' | 'own' | 'extra' | null {
  if (PENALTY_MARKERS.has(token)) return 'penalty'
  if (OWN_GOAL_MARKERS.has(token)) return 'own'
  if (EXTRA_TIME_MARKERS.has(token)) return 'extra'
  return null
}

/**
 * Pull a marker that is glued to its minute apart from it.
 *
 * `90פ` `35ע` `?פ` `54'-פ'` — `פ` and `ע` are not digits, so the split is arithmetic
 * rather than interpretation. A hyphen between a minute and a marker is the same thing
 * written with a separator.
 */
function looseMarkerSplit(item: string): string {
  return item
    .replace(/-/gu, ' ')
    .replace(/^('?\d{1,3}(?:\s*\+\s*\d{1,2})?'?|\?)\s*(פ'?|ע'?)$/u, '$1 $2')
    .replace(/\s+/gu, ' ')
    .trim()
}

/**
 * One goal spec — the text after a `/`, inside a `(…)`, or trailing a name.
 *
 * An item carrying a digit or a `?` STARTS a goal; an item that is only a marker
 * MODIFIES the goal before it. `(58, פנדל)` is therefore one goal from the spot at 58,
 * and `(10 פנדל, 33)` is two goals. A marker that arrives before any minute is refused
 * rather than attached to whatever comes next: `(פ, 43)` could be one penalty at 43 or a
 * penalty plus a goal at 43, the line does not say which, and picking is inventing.
 */
export function parseMinuteSpec(spec: string): SpecResult {
  const items = splitTopLevel(spec, ',')
  if (items.length === 0) return { error: 'סוגר ריק — אין בו פריט אחד' }

  const goals: SpecGoal[] = []
  // Markers the source wrote BEFORE any minute — `(פנדל, 70')`, `(עצמי, 55)`. The wiki
  // writes the attribute on either side of the minute and means the same thing by it,
  // so a leading marker is held and applied to the first goal that follows. If none
  // follows, the spec is one goal whose minute the source did not write (`(פנדל)`).
  const pending = { penalty: false, ownGoal: false, any: false }
  const drain = (goal: SpecGoal): SpecGoal => {
    if (pending.any) {
      if (pending.penalty) goal.penalty = true
      if (pending.ownGoal) goal.ownGoal = true
      pending.penalty = false
      pending.ownGoal = false
      pending.any = false
    }
    return goal
  }

  for (const original of items) {
    const item = looseMarkerSplit(original)

    // `80 או 82` — the source names two minutes. The GOAL is certain, the minute is not.
    if (/ או /u.test(item)) {
      const sides = item.split(/ או /u).map((side) => side.trim())
      if (sides.every((side) => MINUTE_RE.test(side))) {
        goals.push(drain({
          minute: null,
          stoppage: null,
          penalty: false,
          ownGoal: false,
          minuteDisputed: true,
        }))
        continue
      }
      return { error: `"או" בין פריטים שאינם דקות: "${original}"` }
    }

    const countWord = COUNT_WORDS[item]
    if (countWord !== undefined) {
      if (goals.length > 0) return { error: `מילת־מניין "${item}" מעורבת עם דקות` }
      for (let index = 0; index < countWord; index += 1) {
        goals.push({ minute: null, stoppage: null, penalty: false, ownGoal: false, minuteDisputed: false })
      }
      continue
    }

    const spelled = spelledCount(item)
    if (spelled !== null) {
      if (goals.length > 0) return { error: `מילת־מניין "${item}" מעורבת עם דקות` }
      for (let index = 0; index < spelled; index += 1) {
        goals.push({ minute: null, stoppage: null, penalty: false, ownGoal: false, minuteDisputed: false })
      }
      continue
    }

    const words = item.split(' ')
    const head = words[0] ?? ''
    const tail = words.slice(1).join(' ').trim()

    // `?` — the source states a goal and states that it does not know when.
    if (/^\?$/u.test(head)) {
      const goal: SpecGoal = {
        minute: null,
        stoppage: null,
        penalty: false,
        ownGoal: false,
        minuteDisputed: false,
      }
      if (tail !== '' && !applyMarker(goal, tail)) {
        return { error: `סימון לא מוכר אחרי "?": "${tail}"` }
      }
      goals.push(drain(goal))
      continue
    }

    const minute = MINUTE_RE.exec(head)
    if (minute) {
      const goal: SpecGoal = {
        minute: Number(minute[1]),
        stoppage: minute[2] === undefined ? null : Number(minute[2]),
        penalty: false,
        ownGoal: false,
        minuteDisputed: false,
      }
      if (tail !== '' && !applyMarker(goal, tail)) {
        return { error: `סימון לא מוכר אחרי דקה: "${tail}"` }
      }
      goals.push(drain(goal))
      continue
    }

    const kind = markerOf(item)
    if (kind !== null) {
      const previous = goals[goals.length - 1]
      if (previous === undefined) {
        if (kind === 'penalty') pending.penalty = true
        if (kind === 'own') pending.ownGoal = true
        pending.any = true
      } else {
        if (kind === 'penalty') previous.penalty = true
        if (kind === 'own') previous.ownGoal = true
      }
      continue
    }

    // `עצמי 87` — marker written in front of its own minute.
    const headKind = markerOf(head)
    const trailing = MINUTE_RE.exec(tail)
    if (headKind !== null && trailing) {
      goals.push(drain({
        minute: Number(trailing[1]),
        stoppage: trailing[2] === undefined ? null : Number(trailing[2]),
        penalty: headKind === 'penalty',
        ownGoal: headKind === 'own',
        minuteDisputed: false,
      }))
      continue
    }

    return { error: `פריט שאינו דקה, מניין או סימון: "${original}"` }
  }

  if (pending.any) {
    // `(פנדל)` / `(עצמי)` on their own: the source states a goal and its manner, and
    // states no minute. One goal, `minute: null` — never a default minute.
    goals.push({
      minute: null,
      stoppage: null,
      penalty: pending.penalty,
      ownGoal: pending.ownGoal,
      minuteDisputed: false,
    })
  }
  if (goals.length === 0) return { error: `סוגר שאין בו שער: "${spec}"` }
  return { goals }
}

function applyMarker(goal: SpecGoal, token: string): boolean {
  const kind = markerOf(token)
  if (kind === null) return false
  if (kind === 'penalty') goal.penalty = true
  if (kind === 'own') goal.ownGoal = true
  return true
}

/** `שני שערים` · `2 שערים` — a count written as words. */
function spelledCount(item: string): number | null {
  const match = /^(\S+)\s+שערים$/u.exec(item)
  if (!match) return null
  const head = match[1] ?? ''
  const spelled = SPELLED_COUNTS[head]
  if (spelled !== undefined) return spelled
  if (/^\d{1,2}$/u.test(head)) return Number(head)
  return null
}

/* ------------------------------------------------------------------ name shape */

/** Hebrew letters plus the punctuation a Hebrew name actually contains. */
const NAME_CHARS = /^[֐-׿'"’\- ]+$/u

/**
 * Is this token a person's name, or a piece of a sentence?
 *
 * One to four words, Hebrew letters only, no digits, and no word from the prose
 * lexicon. The bound is what it is because the longest real scorer name in the corpus is
 * three words and a sentence clause is almost always longer — a token that needs five
 * words to be a name is reported rather than accepted.
 */
export function looksLikeScorerName(name: string): boolean {
  if (name === '') return false
  if (!NAME_CHARS.test(name)) return false
  const words = name.split(' ').filter((word) => word !== '')
  if (words.length < 1 || words.length > 4) return false
  return !words.some((word) => PROSE_SET.has(word) || PROSE_SET.has(word.replace(/["'’]/gu, '')))
}

/* -------------------------------------------------------------------- segments */

export type SegmentResult =
  | { kind: 'scorer'; name: string | null; nickname: string | null; disputed: boolean; goals: SpecGoal[] }
  | { kind: 'continuation'; goals: SpecGoal[] }
  | { kind: 'refused'; code: ScorerRefusalCode; reason: string }

/** A bracket whose content is a legal goal spec AND actually says something numeric. */
function bracketIsGoalSpec(inner: string): boolean {
  const trimmed = inner.trim()
  if (trimmed === '') return false
  const numericish =
    /[\d?]/u.test(trimmed) ||
    COUNT_WORDS[trimmed] !== undefined ||
    spelledCount(trimmed) !== null ||
    markerOf(trimmed) !== null
  if (!numericish) return false
  return 'goals' in parseMinuteSpec(trimmed)
}

/**
 * One scorer and his goals, or a refusal.
 *
 * The order below is the order the shapes can be told apart in, and each step only fires
 * on evidence the segment itself carries.
 */
export function parseScorerSegment(segment: string): SegmentResult {
  const trimmed = segment.trim().replace(/\.$/u, '')
  if (trimmed === '') return { kind: 'refused', code: 'empty', reason: 'מקטע ריק' }
  if (trimmed.includes('.')) {
    return {
      kind: 'refused',
      code: 'prose',
      reason: `נקודה בתוך המקטע — זהו משפט ולא רשימת כובשים: "${trimmed}"`,
    }
  }

  const brackets: Array<{ whole: string; inner: string }> = []
  const bracketRe = /\(([^()]*)\)/gu
  let found: RegExpExecArray | null = bracketRe.exec(trimmed)
  while (found !== null) {
    brackets.push({ whole: found[0], inner: (found[1] ?? '').trim() })
    found = bracketRe.exec(trimmed)
  }

  const specBrackets = brackets.filter((bracket) => bracketIsGoalSpec(bracket.inner))
  if (specBrackets.length > 1) {
    return {
      kind: 'refused',
      code: 'two-goal-specs',
      reason: `שני סוגרי־דקות במקטע אחד — כנראה פסיק חסר במקור: "${trimmed}"`,
    }
  }

  // Rule 11's hard edge: a bracket with a digit in it is a claim about minutes. If it
  // does not parse as one, the row is refused — it is NEVER demoted to a nickname.
  const digitBracket = brackets.find(
    (bracket) => /\d/u.test(bracket.inner) && !specBrackets.includes(bracket),
  )
  if (digitBracket) {
    const why = parseMinuteSpec(digitBracket.inner)
    return {
      kind: 'refused',
      code: 'bracket-with-digits-unreadable',
      reason: `סוגר שיש בו ספרה ואינו נקרא כדקות: "(${digitBracket.inner})" — ${'error' in why ? why.error : 'לא נקרא'}`,
    }
  }

  let spec: string | null = null
  const nicknames: string[] = []
  let bare = trimmed
  for (const bracket of brackets) {
    if (specBrackets[0] !== undefined && bracket.whole === specBrackets[0].whole && spec === null) {
      spec = bracket.inner
    } else {
      nicknames.push(bracket.inner)
    }
    bare = bare.replace(bracket.whole, ' ')
  }
  bare = bare.replace(/\s+/gu, ' ').trim()
  const nickname = nicknames[0] ?? null

  // A marker written as its own WORD at the end of the name — `אלון בן דור - עצמי`,
  // `חזום 92 (הארכה)`, `דניאל (עצמי) 40`. It is an attribute of the goal wherever the
  // source puts it, and a whole-word match is what keeps it off a name that merely ENDS
  // in the same letter (`אמנון חרל"פ` is one word and is not `פ`).
  const attributes = { penalty: false, ownGoal: false }
  if (spec !== null && markerOf(spec) !== null && /\d/u.test(bare)) {
    // `(הארכה)` / `(עצמי)` beside a bare minute: the bracket is the attribute, the
    // minute is the goal. Read together rather than as two competing goal specs.
    applyNamedMarker(attributes, spec)
    spec = null
  }
  for (;;) {
    const tail = /^(.*?)[\s-]+(\S+)$/u.exec(bare)
    if (!tail) break
    const word = tail[2] ?? ''
    if (markerOf(word) === null) break
    if ((tail[1] ?? '').trim() === '') break
    applyNamedMarker(attributes, word)
    bare = (tail[1] ?? '').trim()
  }

  // `שער עצמי (63')` — an own goal the source credits to nobody. The scorer is
  // `null` (rule 11: an unreadable field is null, and here the source declined to write
  // one at all), and the goal still counts, because a goal was still scored.
  if (bare === 'שער עצמי' || bare === 'עצמי' || bare === 'שער') {
    const parsed = spec === null ? { goals: blankGoals(1) } : parseMinuteSpec(spec)
    if ('error' in parsed) {
      return { kind: 'refused', code: 'spec-unreadable', reason: parsed.error }
    }
    for (const goal of parsed.goals) goal.ownGoal = true
    return { kind: 'scorer', name: null, nickname, disputed: false, goals: parsed.goals }
  }

  // COUNT PREFIX — `2-חיים גלזר (87, 88)`, `4-רחביה רוזנבוים (5, 35, 54, 76)`. The number in
  // front of the name is how many goals the man scored. Where the bracket ALSO lists the
  // minutes the two must agree; where they do not, the segment is refused rather than
  // one of the two being preferred, because the line does not say which is the mistake.
  const countPrefix = /^(\d{1,2})\s*-\s*(.+)$/u.exec(bare)
  if (countPrefix) {
    const declared = Number(countPrefix[1])
    const rest = (countPrefix[2] ?? '').trim()
    if (spec === null) {
      return namedWith(rest, nickname, blankGoals(declared), attributes, trimmed)
    }
    const parsed = parseMinuteSpec(spec)
    if ('error' in parsed) {
      return { kind: 'refused', code: 'spec-unreadable', reason: parsed.error }
    }
    if (parsed.goals.length !== declared) {
      return {
        kind: 'refused',
        code: 'spec-unreadable',
        reason: `קידומת המניין אומרת ${declared} והסוגר מונה ${parsed.goals.length}: "${trimmed}"`,
      }
    }
    return namedWith(rest, nickname, parsed.goals, attributes, trimmed)
  }

  // SLASH — `אמנון חרל"פ/10, 30` (the `, 30` already left as its own segment).
  if (bare.includes('/')) {
    if (spec !== null) {
      return {
        kind: 'refused',
        code: 'slash-shape',
        reason: `גם לוכסן וגם סוגר־דקות באותו מקטע: "${trimmed}"`,
      }
    }
    const parts = bare.split('/')
    if (parts.length !== 2) {
      return { kind: 'refused', code: 'slash-shape', reason: `יותר מלוכסן אחד: "${trimmed}"` }
    }
    const written = (parts[1] ?? '').trim()
    if (written === '') {
      return { kind: 'refused', code: 'slash-shape', reason: `לוכסן ללא דקה: "${trimmed}"` }
    }
    const parsed = parseMinuteSpec(written)
    if ('error' in parsed) {
      return { kind: 'refused', code: 'spec-unreadable', reason: parsed.error }
    }
    return namedWith((parts[0] ?? '').trim(), nickname, parsed.goals, attributes, trimmed)
  }

  // PAREN — `דב רמלר (48)`.
  if (spec !== null) {
    const parsed = parseMinuteSpec(spec)
    if ('error' in parsed) {
      return { kind: 'refused', code: 'spec-unreadable', reason: parsed.error }
    }
    if (bare === '') return { kind: 'continuation', goals: parsed.goals }
    return namedWith(bare, nickname, parsed.goals, attributes, trimmed)
  }

  if (bare === '') {
    return {
      kind: 'refused',
      code: 'name-unreadable',
      reason: `סוגר ללא שם וללא דקות: "${trimmed}"`,
    }
  }

  // CONTINUATION — the whole segment is a spec, so it belongs to the scorer before it.
  if (/^[\d?'][\d\s,'+?פע-]*$/u.test(bare)) {
    const parsed = parseMinuteSpec(bare)
    if ('error' in parsed) {
      return { kind: 'refused', code: 'spec-unreadable', reason: parsed.error }
    }
    return { kind: 'continuation', goals: parsed.goals }
  }

  const words = bare.split(' ')

  // COUNT BEFORE the name — `שלושער אמנון חרל"פ`, `רביעייה שמעון`.
  const leading = COUNT_WORDS[words[0] ?? '']
  if (leading !== undefined && words.length > 1) {
    return namedWith(words.slice(1).join(' '), nickname, blankGoals(leading), attributes, trimmed)
  }

  // COUNT AFTER the name — `חיים גלזר שלושער`, `סלים צמד`.
  const trailingCount = COUNT_WORDS[words[words.length - 1] ?? '']
  if (trailingCount !== undefined && words.length > 1) {
    return namedWith(words.slice(0, -1).join(' '), nickname, blankGoals(trailingCount), attributes, trimmed)
  }

  // BARE — `אללוף 27`, `רחמנוביץ' 51`.
  const bareMinutes = /^(.*?)\s([\d?'][\d\s,'+?פע-]*)$/u.exec(bare)
  if (bareMinutes && /\d/u.test(bareMinutes[2] ?? '') && (bareMinutes[1] ?? '').trim() !== '') {
    const parsed = parseMinuteSpec((bareMinutes[2] ?? '').trim())
    if ('goals' in parsed) {
      return namedWith((bareMinutes[1] ?? '').trim(), nickname, parsed.goals, attributes, trimmed)
    }
  }

  // A stray digit that reached here is a number this parser could not read as a minute.
  if (/\d/u.test(bare)) {
    return {
      kind: 'refused',
      code: 'spec-unreadable',
      reason: `ספרה שאינה נקראת כדקה: "${trimmed}"`,
    }
  }

  // NAKED — a name on its own is one goal whose minute the source did not write.
  return namedWith(bare, nickname, blankGoals(1), attributes, trimmed)
}

function applyNamedMarker(into: { penalty: boolean; ownGoal: boolean }, token: string): void {
  const kind = markerOf(token)
  if (kind === 'penalty') into.penalty = true
  if (kind === 'own') into.ownGoal = true
}

/** {@link named}, with the attributes the segment carried outside its goal spec. */
function namedWith(
  rawName: string,
  nickname: string | null,
  goals: SpecGoal[],
  attributes: { penalty: boolean; ownGoal: boolean },
  segment: string,
): SegmentResult {
  if (attributes.penalty || attributes.ownGoal) {
    for (const goal of goals) {
      if (attributes.penalty) goal.penalty = true
      if (attributes.ownGoal) goal.ownGoal = true
    }
  }
  return named(rawName, nickname, goals, segment)
}

function blankGoals(count: number): SpecGoal[] {
  const goals: SpecGoal[] = []
  for (let index = 0; index < count; index += 1) {
    goals.push({ minute: null, stoppage: null, penalty: false, ownGoal: false, minuteDisputed: false })
  }
  return goals
}

function named(
  rawName: string,
  nickname: string | null,
  goals: SpecGoal[],
  segment: string,
): SegmentResult {
  const name = rawName.trim()

  // `?/75` — the source states a goal and states that it does not know who.
  if (/^\?+$/u.test(name)) {
    return { kind: 'scorer', name: null, nickname, disputed: false, goals }
  }

  // `מאיר או בוצ'קה/80` — the source itself is unsure. That is a conflict, not a fact:
  // the GOAL is stated, the scorer is two candidates. Rule 60 §3 records both and
  // resolves neither, so the goal is kept with the source's own words and no player id.
  if (/ או /u.test(name)) {
    const sides = name.split(/ או /u).map((side) => side.trim())
    if (sides.every((side) => looksLikeScorerName(side))) {
      return { kind: 'scorer', name, nickname, disputed: true, goals }
    }
    return {
      kind: 'refused',
      code: 'name-unreadable',
      reason: `"או" בין טוקנים שאינם שמות: "${name}"`,
    }
  }

  if (!looksLikeScorerName(name)) {
    const words = name.split(' ').filter((word) => word !== '')
    const offending = words.find(
      (word) => PROSE_SET.has(word) || PROSE_SET.has(word.replace(/["'’]/gu, '')),
    )
    return {
      kind: 'refused',
      code: offending === undefined ? 'name-unreadable' : 'prose',
      reason:
        offending === undefined
          ? `טוקן שאינו נקרא כשם: "${name}" (מתוך "${segment}")`
          : `מילת־פרוזה "${offending}" בתוך טוקן־שם: "${name}"`,
    }
  }

  return { kind: 'scorer', name, nickname, disputed: false, goals }
}

/* ------------------------------------------------------------------- the line */

/**
 * The whole scorer line.
 *
 * A row is all-or-nothing: the first segment this parser cannot prove refuses the LINE,
 * and the goals already read are thrown away. That is deliberate and it is rule 11 in
 * its strictest form — a scorer list missing the goal that sat next to the sentence the
 * parser choked on is a list that looks complete and is not, and the report is where a
 * person gets to see the raw text and decide.
 */
export function parseScorerLine(text: string): ScorerLineResult {
  if (ENTITY_RE.test(text)) {
    return {
      goals: [],
      refusals: [
        {
          code: 'still-encoded',
          reason: 'הטקסט עדיין נושא ישויות HTML — יש לפענח פעם אחת בקורא, לא כאן',
          raw: text,
        },
      ],
    }
  }

  const line = normalizeScorerLine(text)
  if (line === '') {
    return { goals: [], refusals: [{ code: 'empty', reason: 'שורה ריקה', raw: text }] }
  }

  const goals: ParsedGoal[] = []
  let previous: { name: string | null; nickname: string | null; disputed: boolean } | null = null

  for (const segment of splitTopLevel(line, ';,')) {
    const parsed = parseScorerSegment(segment)

    if (parsed.kind === 'refused') {
      // A row whose scorer list is complete and then carries a SENTENCE is still refused
      // whole — but it is refused as its own class, because it is the class somebody may
      // one day decide to open and it should not hide inside "prose".
      //
      // It stays shut today for a reason that is in the corpus rather than in taste:
      // `המשחק הופסק בדקה ה-82 בתוצאה 2:2 ונקבע נצחון טכני למכבי פ"ת. כבשו להפועל: חיים גלזר (3), ...`
      // puts the scorers AFTER the sentence. So "the text after the full stop is a note"
      // is not true of this source, and a reader that assumed it would silently drop
      // every goal in that row. The boundary is not provable, so it is not taken.
      const code: ScorerRefusalCode =
        parsed.code === 'prose' && goals.length > 0 && segment.includes('.')
          ? 'note-attached'
          : parsed.code
      return { goals: [], refusals: [{ code, reason: parsed.reason, raw: line, segment }] }
    }

    if (parsed.kind === 'continuation') {
      if (previous === null) {
        return {
          goals: [],
          refusals: [
            {
              code: 'orphan-minute',
              reason: `דקה ללא כובש לפניה: "${segment}"`,
              raw: line,
              segment,
            },
          ],
        }
      }
      for (const goal of parsed.goals) goals.push(toParsedGoal(goal, previous, segment))
      continue
    }

    previous = { name: parsed.name, nickname: parsed.nickname, disputed: parsed.disputed }
    for (const goal of parsed.goals) goals.push(toParsedGoal(goal, previous, segment))
  }

  return { goals, refusals: [] }
}

function toParsedGoal(
  goal: SpecGoal,
  scorer: { name: string | null; nickname: string | null; disputed: boolean },
  segment: string,
): ParsedGoal {
  return {
    scorerNameHe: scorer.name,
    nicknameHe: scorer.nickname,
    minute: goal.minute,
    stoppage: goal.stoppage,
    penalty: goal.penalty,
    ownGoal: goal.ownGoal,
    scorerDisputed: scorer.disputed,
    minuteDisputed: goal.minuteDisputed,
    raw: segment,
  }
}

/* ------------------------------------------------------- the free validator */

/**
 * The same row carries the score, so the row checks itself.
 *
 * `homescore`/`awayscore` and the side Hapoel is named on say how many goals Hapoel
 * scored; the scorer line says who scored them. Those are two INDEPENDENT statements by
 * the same source, and where they agree the holding has earned something a single
 * reading never could.
 *
 *  · agree    → `confidence: 2` (rule 2 lets it feed the trivia generator)
 *  · disagree → `confidence: 1` and a recorded conflict stating BOTH numbers, which is
 *               rule 60 §3: the contradiction is kept, not decided. Nothing is dropped
 *               and nothing is corrected — the parse stands beside the score and a
 *               person picks later.
 *  · no score → `confidence: 1`, said out loud rather than assumed either way.
 */
export function scoreAgreement(input: {
  parsedGoals: number
  hapoelGoals: number | null
}): { agrees: boolean | null; confidence: 1 | 2 } {
  if (input.hapoelGoals === null) return { agrees: null, confidence: 1 }
  const agrees = input.parsedGoals === input.hapoelGoals
  return { agrees, confidence: agrees ? 2 : 1 }
}

/**
 * Rule 38's second lock.
 *
 * `comments` is a football convention. The caller filters on `department` before it
 * reaches this module; this throws if a row of another sport ever arrives anyway,
 * because the failure mode is silent and expensive — twenty invented basketball goals,
 * from a column basketball does not use that way.
 */
export function assertFootballDepartment(department: string | null | undefined): void {
  if (department !== 'כדורגל') {
    throw new Error(
      `scorers.ts קיבל שורה של ענף "${department ?? 'ללא'}" — comments הוא מוסכמה של כדורגל בלבד (כלל 38)`,
    )
  }
}
