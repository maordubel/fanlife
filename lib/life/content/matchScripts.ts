/**
 * תסריטי משחק — the ~60 seconds a match takes, as data.
 *
 * A match in this game was two things until 5.9.2026: the 1986 final, directed minute by
 * minute in the scene class, and every match after it, told in a conversation the player
 * read. The upgrade brief asks for one shape for all of them: a fast, DIRECTED sequence —
 * the board and the minute, cinematic jumps between the moments that matter, two or
 * three short things the player does with his body, the terrace answering, and a way out
 * that leads straight to a consequence. About sixty seconds. No waiting.
 *
 * So a match is a list of steps. Each step waits, then does a few things at once: moves
 * the board, moves the crowd, says one line, asks one short question. The runner is
 * `lib/life/runtime/matchDirector.ts`; a scene hands it a script and gets it back when the
 * whistle goes. `tests/life-match.test.ts` walks every script without a browser.
 *
 * Three rules the scripts obey, and the tests check:
 * · **The board is the archive's.** A step may move the score, and the LAST score of a
 *   script must equal the anchor's `scoredFor / scoredAgainst`. A minute appears on the
 *   board only where the archive holds a goal minute (1986: the 86th). Everywhere else the
 *   board carries a phase word — המשחק, הארכה, פנדלים, סיום — and never a number this
 *   game made up.
 * · **No result in a spoken line.** The lines say what the ground felt; the board says
 *   what happened. (`tests/life-stage-b.test.ts` already bans a scoreline in dialogue.)
 * · **Under a minute of clock.** The waits of a regular match add up to at most 62 s. The
 *   1986 final is the brief's named exception — a terrace mission, not a regular match —
 *   and even there nothing waits passively.
 */
import type { CrowdState, SampleKey } from '../runtime/audio'
import type { LifeEvent } from '../events'

import { FULL_TIME, KICKOFF } from '../world/scenes'
import { FULL_98, HALF_98 } from './chapter1998laces'
import { LACES_LINES } from '../history/terrace'

export type MatchStep = {
  /** ms after the previous step ended (a `talk` pause does not count) */
  wait: number
  id?: string
  /** a board minute — only from the archive; the runner refuses one the anchor does not hold */
  minute?: number
  /** the board's word when there is no minute: המשחק · מחצית · הארכה · פנדלים · סיום */
  phaseHe?: string
  /** the score after this step, in the club's terms (for / against) */
  board?: { for: number; against: number }
  /** shorthand: one goal, ours or theirs — the board moves, the crowd answers, the picture reacts */
  goal?: 'for' | 'against'
  /** the scene stages this goal itself (1986: the archive film, or the authored 86th minute) */
  authored?: boolean
  crowd?: CrowdState
  text?: string
  tone?: 'plain' | 'red'
  sfx?: SampleKey
  level?: number
  whistle?: number
  /** a short conversation — the player's hands; the timeline waits for it */
  talk?: string
  /** advance the day clock to this minute (absolute), so the world outside agrees */
  clock?: number
  flag?: string
  events?: readonly LifeEvent[]
  /**
   * כמה מהאצטדיון להשאיר — the mix, as a step (Mission 01 §24, Shoelaces §24).
   *
   * 1 is an ordinary match. 0.3 is somebody listening to another ground. 0.05 is the
   * moment nobody in this stadium can see and everybody in it is holding their breath.
   * On 2.5.1998 this is the whole second half of the mission: the terrace is celebrating
   * a win at ninety per cent while a transistor at five per cent decides the season.
   */
  listen?: number
  /** the whistle: the board holds, the crowd empties, the host closes the match */
  end?: boolean
}

export type MatchScript = {
  id: string
  sport: 'football' | 'basketball'
  /** the brief's named exception: a terrace mission may run longer than a regular match */
  exempt?: boolean
  /** the board shows two numbers; false for a hall night the archive holds as a season, not a score */
  scored: boolean
  /** which side of the board we are on when the chapter's anchor is another night (the 1993 series) */
  atHome?: boolean
  steps: readonly MatchStep[]
}

/** the sum of the waits — what the clock spends, prompts aside */
export const scriptMs = (script: MatchScript) => script.steps.reduce((sum, step) => sum + step.wait, 0)

/** the board after the last step that moved it */
export function finalBoard(script: MatchScript): { for: number; against: number } | null {
  let board: { for: number; against: number } | null = null
  for (const step of script.steps) {
    if (step.board) board = { ...step.board }
    else if (step.goal) {
      const previous: { for: number; against: number } = board ?? { for: 0, against: 0 }
      board = { for: previous.for + (step.goal === 'for' ? 1 : 0), against: previous.against + (step.goal === 'against' ? 1 : 0) }
    }
  }
  return board
}

export const REGULAR_MATCH_MAX_MS = 62_000

// -------------------------------------------------------------------------- 1986 ---
/**
 * The final. Exempt from the minute rule by name in the brief, and the one script with
 * a minute on the board: the 86th, which `content/manual/match-events.json` holds with
 * a scorer and a source. The goal step is `authored` — the scene plays the archive film
 * if it has not been seen, else its own eighty-sixth minute — and the script picks up
 * after it for the celebration and the whistle.
 */
const FINAL_86: MatchScript = {
  id: 'final-86',
  sport: 'football',
  exempt: true,
  scored: true,
  steps: [
    { wait: 0, id: 'kickoff', minute: 0, board: { for: 0, against: 0 }, crowd: 'LOW_MURMUR', whistle: 1, text: 'המשחק מתחיל.', tone: 'red', clock: KICKOFF },
    { wait: 2600, id: 'stand', talk: 'm86-stand' },
    { wait: 900, id: 'song', minute: 12, crowd: 'CHANT', clock: KICKOFF + 12 },
    { wait: 5200, id: 'first-half', minute: 41, crowd: 'LOW_MURMUR', text: 'ארבעים דקות של כלום. הרגליים כואבות. אבא לא מוריד את העיניים מהמגרש.', clock: KICKOFF + 41 },
    { wait: 3800, id: 'half', phaseHe: 'מחצית', crowd: 'LOW_MURMUR', whistle: 1, text: 'מחצית. מישהו מעביר גרעינים לאורך השורה.', clock: KICKOFF + 46 },
    { wait: 3200, id: 'second', minute: 46, crowd: 'CHANT', whistle: 1, clock: KICKOFF + 61 },
    { wait: 4200, id: 'build', minute: 74, crowd: 'BUILDING_TENSION', text: 'היציע כבר לא שר. כולם רק מסתכלים.', clock: KICKOFF + 89 },
    { wait: 3600, id: 'breath', talk: 'm86-breath' },
    { wait: 600, id: 'near', minute: 81, crowd: 'NEAR_MISS', text: 'כמעט. כל היציע נשען קדימה ונופל חזרה.', clock: KICKOFF + 96 },
    { wait: 3400, id: 'goal', goal: 'for', authored: true, minute: 86, crowd: 'GOAL_BURST', clock: KICKOFF + 101 },
    { wait: 2400, id: 'after', phaseHe: 'סיום', crowd: 'AFTERMATH', text: 'ארבע דקות שאף אחד לא זוכר.', clock: FULL_TIME },
    { wait: 2200, id: 'end', end: true, crowd: 'FINAL_WHISTLE', whistle: 3 },
  ],
}

// -------------------------------------------------------------------------- 1998 ---
/**
 * Round 29, 2.5.1998 — the penultimate round, not the last one (the league finished on
 * 9.5.1998; corrected 7.9.2026 from Maor's canonical audit, which found five places in
 * the game calling this round the season's last). The match on the pitch is won — 1:0 —
 * and the title is lost by a point somewhere else, through a transistor. The board here
 * is OUR match; the other one has no board, because nobody in the ground could see it.
 */
const LACES_98: MatchScript = {
  id: 'laces-98',
  sport: 'football',
  scored: true,
  steps: [
    { wait: 0, id: 'kickoff', phaseHe: 'המשחק', board: { for: 0, against: 0 }, crowd: 'BUILDING_TENSION', whistle: 1, text: 'שני משחקים בבת אחת: אחד על הדשא, אחד בטרנזיסטור של האיש מאחוריך.', clock: HALF_98 - 44 },
    { wait: 3200, id: 'where', talk: 'm98-where' },
    { wait: 800, id: 'goal', goal: 'for', crowd: 'GOAL_BURST', text: 'שער. שלנו. היציע קופץ — ומיד מסתובב לטרנזיסטור.', tone: 'red', clock: HALF_98 - 20 },
    { wait: 6400, id: 'half', phaseHe: 'מחצית', crowd: 'LOW_MURMUR', whistle: 1, text: LACES_LINES.half, clock: HALF_98 },
    { wait: 6000, id: 'second', phaseHe: 'המשחק', crowd: 'CHANT', whistle: 1, clock: HALF_98 + 20 },
    { wait: 3600, id: 'listen', talk: 'm98-listen' },
    { wait: 800, id: 'late', crowd: 'BUILDING_TENSION', text: LACES_LINES.late, tone: 'red', sfx: 'crowd-swell', level: 0.8, clock: FULL_98 - 8 },
    { wait: 6400, id: 'near', crowd: 'NEAR_MISS', text: 'הדקות האחרונות. אף אחד לא מסתכל על המגרש.' },
    /**
     * השריקה איננה סוף המשימה — Shoelaces screenplay §22, and the whole shape of the day.
     *
     * *"זה הרגע שבו השחקן מצפה: MISSION COMPLETE. אבל שום דבר לא מופיע."* Their match at
     * Bloomfield finished, and it finished WELL — that is the cruelty. The other ground
     * kicked off later and is still playing, so the mission runs on past its own final
     * whistle while a terrace celebrates a win that is about to mean nothing.
     *
     * The mix does the telling (§24): the celebration is at full volume, then a little
     * less as people drift toward the transistor, and by the ninety-fourth minute there is
     * a stadium singing somewhere behind a small speaker held in two hands. Nothing on
     * screen says any of that.
     */
    { wait: 4800, id: 'ours-over', phaseHe: 'סיום', crowd: 'AFTERMATH', whistle: 3, clock: FULL_98, listen: 1, text: LACES_LINES.oursOver },
    { wait: 4200, id: 'they-play-on', crowd: 'CHANT', listen: 0.5, text: 'היציע שר. ובאמצע השירה, שלושה־ארבעה אנשים לא זזים: שם עוד משחקים.' },
    { wait: 5200, id: 'laces', listen: 0.12, talk: 'l1-laces' },
    { wait: 4400, id: 'another', listen: 0.1, sfx: 'crowd-real-miss', level: 0.5, text: 'צעקה מהרדיו. האנשים סביבו מתכווצים. ואז — כלום. עוד לא.' },
    { wait: 4600, id: 'ninety-four', listen: 0.05, text: 'הדקה הרביעית של תוספת הזמן. הרמקול הקטן הוא הדבר היחיד שנשמע.' },
    { wait: 3600, id: 'end', end: true, crowd: 'FINAL_WHISTLE', listen: 0.05, talk: 'l1-whistle' },
  ],
}

// -------------------------------------------------------------------------- 1999 ---
/**
 * The cup final, 19.5.1999, Ramat Gan. The archive: 1:1 after extra time, the shootout
 * won. The order the goals came in is what the chapter has said since it was written —
 * theirs first, the equaliser after. No minute is claimed for either. The shootout is
 * the player's hands (`c99-pens`), and the rest of the night follows from it.
 */
const CUP_99: MatchScript = {
  id: 'cup-99',
  sport: 'football',
  scored: true,
  steps: [
    { wait: 0, id: 'kickoff', phaseHe: 'המשחק', board: { for: 0, against: 0 }, crowd: 'CHANT', whistle: 1, text: 'הצבע שלכם בצד אחד, הצבע שלהם בשני, והקערה מלאה עד המדרגה האחרונה. והרעש — לא רעש. לחץ. כמו מים.' },
    { wait: 3400, id: 'scarf', talk: 'm99-scarf' },
    { wait: 900, id: 'theirs', goal: 'against', crowd: 'AFTERMATH', sfx: 'crowd-groan', level: 0.9, text: 'הם קודם. הצד השני של הקערה עולה באוויר. אצלכם — שקט של אנשים שסופרים דקות.' },
    { wait: 5200, id: 'react', talk: 'm99-behind' },
    { wait: 800, id: 'build', crowd: 'BUILDING_TENSION', text: 'ואז זה מתחיל לזוז. לא על המגרש — ביציע. מישהו מתחיל, ואלף ממשיכים.' },
    { wait: 5400, id: 'near', crowd: 'NEAR_MISS', text: 'קרוב. הקערה נושמת פנימה ולא החוצה.' },
    { wait: 3600, id: 'equaliser', goal: 'for', crowd: 'GOAL_BURST', text: 'השוויון. האצטדיון עולה באוויר ונשאר שם.', tone: 'red' },
    { wait: 6200, id: 'extra', phaseHe: 'הארכה', crowd: 'LOW_MURMUR', whistle: 2, text: 'הארכה. שקט של אנשים שאין להם כבר מה לצעוק.' },
    { wait: 5600, id: 'clock', crowd: 'BUILDING_TENSION', text: 'ואז השופט מסתכל בשעון, ואתה יודע מה זה אומר.' },
    { wait: 3400, id: 'pens', phaseHe: 'פנדלים', crowd: 'LOW_MURMUR', whistle: 1, talk: 'c99-pens' },
    { wait: 0, id: 'end', end: true, phaseHe: 'סיום', crowd: 'FINAL_WHISTLE' },
  ],
}

// --------------------------------------------------------------------- 13.5.2000 ---
/**
 * The title, 13.5.2000, at the Hatikva. 1:1 away, and the draw is the championship. The
 * chapter has always said theirs came first; it says no minute, and neither does this.
 */
const TITLE_00: MatchScript = {
  id: 'title-00',
  sport: 'football',
  scored: true,
  steps: [
    { wait: 0, id: 'kickoff', phaseHe: 'המשחק', board: { for: 0, against: 0 }, crowd: 'LOW_MURMUR', whistle: 1, text: 'מגרש קטן. יציע בטון, רשת, שכונה מסביב שמסתכלת מהמרפסות. אין מקום פנוי ואף אחד לא נושם.' },
    { wait: 3400, id: 'stand', talk: 'm00-stand' },
    { wait: 900, id: 'theirs', goal: 'against', crowd: 'AFTERMATH', sfx: 'crowd-groan', level: 0.9, text: 'הם קודם. כמובן שהם קודם. אתה לא מחשב. אתה מסתכל על מי שלידך ורואה שגם הוא לא.' },
    { wait: 6400, id: 'build', crowd: 'BUILDING_TENSION', text: 'היציע לא שר. הוא דוחף. כל היציע דוחף כדור בעיניים.' },
    { wait: 4600, id: 'equaliser', goal: 'for', crowd: 'GOAL_BURST', text: 'השוויון.', tone: 'red' },
    { wait: 6800, id: 'twenty', crowd: 'CHANT', text: 'ואז עשרים דקות שהן שנתיים.' },
    { wait: 4200, id: 'hold', talk: 'm00-hold' },
    { wait: 800, id: 'near', crowd: 'NEAR_MISS', text: 'הדקה האחרונה. אף אחד לא מסתכל על השעון, כולם מסתכלים על השופט.' },
    { wait: 5200, id: 'end', end: true, phaseHe: 'סיום', crowd: 'FINAL_WHISTLE', whistle: 3, talk: 't-match' },
  ],
}

// --------------------------------------------------------------------- 17.5.2000 ---
/**
 * The double, 17.5.2000, Ramat Gan again. 2:2 after extra time, the shootout won. The
 * archive gives the score and the fact that the second of ours came in extra time; it
 * does not give an order for the first two, so the board moves to level in one cut and
 * to level again in the extra half hour — a time jump, not a claim.
 */
const DOUBLE_00: MatchScript = {
  id: 'double-00',
  sport: 'football',
  scored: true,
  steps: [
    { wait: 0, id: 'kickoff', phaseHe: 'המשחק', board: { for: 0, against: 0 }, crowd: 'CHANT', whistle: 1, text: 'רמת גן. שוב. אותה קערה, אותו יריב, שנה אחרי. וכולם כאן כבר יודעים שזה יכול להיגמר בפנדלים, ומקללים את הידיעה.' },
    { wait: 3600, id: 'memory', talk: 'm00-memory' },
    { wait: 900, id: 'level', board: { for: 1, against: 1 }, crowd: 'NEAR_MISS', sfx: 'crowd-swell', level: 0.9, text: 'שער, ושער. תשעים דקות ואף אחד לא מוותר.' },
    // מה שהיציע עושה עם מה שהבאת לו — רגע אחד, בין תשעים לבין ההארכה
    { wait: 2600, id: 'stand', talk: 'd-stand' },
    { wait: 3800, id: 'extra', phaseHe: 'הארכה', crowd: 'BUILDING_TENSION', whistle: 2, text: 'הארכה. הרגליים של השחקנים נגמרות. הקולות ביציע לא.' },
    { wait: 4800, id: 'ours', goal: 'for', crowd: 'GOAL_BURST', text: 'שלנו. הבמה זזה. כל הצד הזה בבת אחת.', tone: 'red' },
    { wait: 5400, id: 'theirs', goal: 'against', crowd: 'AFTERMATH', sfx: 'crowd-groan', level: 0.9, text: 'ואז שלהם. הקערה נחתכת לשניים: צד שצועק וצד ששותק.' },
    { wait: 6000, id: 'clock', crowd: 'BUILDING_TENSION', text: 'ואף אחד לא מוותר. ואז השופט מסתכל בשעון.' },
    { wait: 3400, id: 'pens', phaseHe: 'פנדלים', crowd: 'LOW_MURMUR', whistle: 1, talk: 'd-match' },
    { wait: 0, id: 'end', end: true, phaseHe: 'סיום', crowd: 'FINAL_WHISTLE' },
  ],
}

// --------------------------------------------------------------------- the hall ---
/**
 * Ussishkin nights. The archive holds the final score of the 1993 games and only a
 * season for 1997 and 1999, so the hall boards carry no numbers the lines do not: the
 * game is told by the room — the bounce, the horn, the murmur that turns — and by the
 * conversation each night already has, which the script wraps rather than replaces.
 */
const GALIL_93_G1: MatchScript = {
  id: 'galil-93-g1',
  sport: 'basketball',
  scored: false,
  atHome: true,
  steps: [
    { wait: 0, id: 'tip', phaseHe: 'המשחק', crowd: 'CHANT', sfx: 'ball-bounce', level: 0.6, text: 'האולם מלא עד הקירות. הביטחון של אחרי גביע.' },
    { wait: 2800, id: 'inside', talk: 'g1-inside' },
    { wait: 600, id: 'turn', crowd: 'AFTERMATH', sfx: 'crowd-groan', level: 0.7, text: 'זה בא לאט. סל, ועוד סל, והאולם שמפסיק לצעוק ומתחיל להסתכל.' },
    { wait: 4600, id: 'near', crowd: 'NEAR_MISS', sfx: 'ball-bounce', level: 0.5 },
    { wait: 3200, id: 'end', end: true, phaseHe: 'סיום', crowd: 'FINAL_WHISTLE', sfx: 'buzzer', level: 0.7 },
  ],
}

const GALIL_93_G3: MatchScript = {
  id: 'galil-93-g3',
  sport: 'basketball',
  scored: false,
  atHome: true,
  steps: [
    { wait: 0, id: 'tip', phaseHe: 'המשחק', crowd: 'BUILDING_TENSION', sfx: 'ball-bounce', level: 0.6, text: 'אולם של גב אל הקיר. אנשים לא שרים — הם צורחים.' },
    { wait: 3200, id: 'run', crowd: 'GOAL_BURST', sfx: 'crowd-swell', level: 0.9, text: 'ואז זה בא. לא לאט — בבת אחת.' },
    { wait: 4200, id: 'chant', crowd: 'CHANT' },
    { wait: 3000, id: 'inside', talk: 'g3-inside' },
    { wait: 0, id: 'end', end: true, phaseHe: 'סיום', crowd: 'FINAL_WHISTLE', sfx: 'buzzer', level: 0.7 },
  ],
}

/**
 * כמה אנשים היו שם — לא כתוב כאן, כי הארכיון לא מחזיק את זה.
 *
 * Five lines in this file asserted crowd sizes — "ארבעים אלף" at Ramat Gan, "שש אלף איש"
 * at Hatikva — and `content/manual/matches.json` holds an attendance figure for exactly
 * six matches, all of them from the 2001/02 European run. None of these. The lines now
 * describe a full bowl and a full terrace, which is true and is what a child sees anyway;
 * a number is a claim, and rule 11 is that this game does not make claims it cannot source.
 */
export const MATCH_SCRIPTS: Record<string, MatchScript> = {
  'final-86': FINAL_86,
  'laces-98': LACES_98,
  'cup-99': CUP_99,
  'title-00': TITLE_00,
  'double-00': DOUBLE_00,
  'galil-93-g1': GALIL_93_G1,
  'galil-93-g3': GALIL_93_G3,
  // (23.9.2026) `hall-97`/`hall-99` removed: the overlay replaced both nights' `match`
  // beat action with a scripted conversation chain (`h1-chain`, `seed-away`), so neither
  // script is played by anything any more (life-match). `HALL_NIGHT` stays for its shape.
}

export const matchScriptFor = (id: string): MatchScript | null => MATCH_SCRIPTS[id] ?? null

/** the chapter each script belongs to, for the tests that hold a script's last board to its anchor */
export const SCRIPT_CHAPTER: Record<string, string> = {
  'final-86': '1986',
  'laces-98': '1998-laces',
  'cup-99': '1999-cup',
  'title-00': '2000-title',
  'double-00': '2000-double',
  'galil-93-g1': '1993-galil',
  'galil-93-g3': '1993-galil',
}
