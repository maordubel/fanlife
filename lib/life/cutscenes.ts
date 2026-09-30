import type { HistoricalAnchor } from './anchors'

/**
 * הארכיון נפתח — the moment the illustrated memory opens onto real footage.
 *
 * This game has spent four passes insisting on one rule: the life is fiction, the history
 * is not, and the join between them is a typed interface rather than a sentence somebody
 * wrote in a dialogue file (rule 11, brief §4 and §24). `HistoricalAnchor` is that join
 * for FACTS. This is the same join for FILM.
 *
 * A cutscene is a configuration, not a scene. It names a video, says which flag it raises
 * and which objective comes after it, and says nothing at all about what happened in the
 * match — because the thing on screen is the match, and the game has no business
 * narrating over it. Everything printed on the card around the film is read off the
 * anchor: the date, the two clubs, the ground. If the archive stops holding the 1986 row,
 * the card goes back to saying less, exactly as every other screen in this chapter does.
 *
 * **It is a system and not a one-off, and that is the point.** Bloomfield 1986 is the
 * first of these. The strike of 1970, the cup runs, the season the club nearly folded,
 * a demonstration, an interview with a man who is now dead — every one of them is a
 * `HistoricalCutscene` entry and a video id, and none of them needs a line of new code.
 *
 * ## What it may never do
 *
 * Trap the player. YouTube is somebody else's server, and it fails in at least six ways:
 * embedding disabled by the uploader, video pulled, network down, autoplay with sound
 * blocked by the browser, the iframe API failing to load at all, and the player simply
 * choosing to skip. Every one of those ends the same way — the flag is raised, the next
 * objective appears, the chapter continues — and the difference between them is only what
 * the player saw. `CutsceneOutcome` is that difference, and nothing else in the game
 * branches on it except the memory kept.
 */

/** How a cutscene ended. The chapter continues identically in all three cases. */
export type CutsceneOutcome =
  /** played to the end, or close enough that the player saw the thing */
  | 'watched'
  /** the player pressed דלג */
  | 'skipped'
  /** YouTube could not play it: embedding off, video gone, offline, API dead */
  | 'unavailable'

/**
 * How sure the game is that this film is the thing it says it is (design pass v2 §23.6).
 *
 * Registry presence is not proof of anything: an id copied out of an old document is a
 * candidate until somebody has opened it and checked it is the right match, that it
 * embeds, and whose it is. Only `locked_verified` may open by itself in the middle of a
 * chapter; everything else is at most an archive link a player chooses to open.
 */
export type FootageStatus =
  /** the owner chose it and it has been watched against the archive row — may auto-play */
  | 'locked_verified'
  /** sourced to the archive (a `films` row in `history/days.ts`) — optional, never automatic */
  | 'verified_optional'
  /** an id with no recorded check: never auto-plays, waits for a live look */
  | 'candidate_needs_live_check'
  /** period footage — never presented as the playable match */
  | 'context_only'
  /** checked and refused; kept only so the id is not proposed again */
  | 'rejected'

/**
 * What the film is FOR (design pass v2 §23.4). Four roles, and only the first interrupts play.
 */
export type FootageRole =
  /** a rare historical eruption inside the story, after the player has done the playable work */
  | 'CINEMATIC_PAYOFF'
  /** original highlights after an event or an ending — opened by choice */
  | 'ARCHIVE_FOOTAGE'
  /** a clip the Red Box unlocks later, as a documentary memory */
  | 'RED_BOX_BONUS'
  /** period context — never the exact match unless verified */
  | 'BACKGROUND_CONTEXT'

export type HistoricalCutscene = {
  /** stable id, stored in the save as part of a flag — never a description */
  id: string
  /** the chapter this film belongs to (`content/chapters.ts` id) */
  chapter: string
  /** §23.6 — see `FootageStatus` */
  status: FootageStatus
  /** §23.4 — see `FootageRole` */
  role: FootageRole
  /**
   * Where the game opens it, in words a test can hold: `era:<chapter>@<step>` for the
   * chapter's own film (`Era.cutscene`, played at the step named), `beat:<id>` for a
   * beat's `{ a: 'cutscene' }`, or null for a film nothing opens automatically.
   */
  trigger: string | null
  /** why the status is what it is — the provenance, one line */
  provenanceHe: string
  /** the YouTube video id, not a URL */
  youtubeId: string
  /** what this piece of film IS, in the game's voice — never a claim about the match */
  titleHe: string
  /** optional second line under the title on the intro card */
  subtitleHe?: string
  /** seconds into the video to begin; omit to start at the beginning */
  startSeconds?: number
  /** seconds at which to stop; omit to play to the end */
  endSeconds?: number
  /** who this footage belongs to, shown under the frame — attribution is not optional */
  sourceTitle: string
  /** the original, so a player can go and watch it where it lives */
  sourceUrl: string
  /** raised however the cutscene ends, including skipped and unavailable */
  completionFlag: string
  /** raised ONLY when the player actually watched it — the difference is a memory */
  watchedFlag: string
  /** the HUD objective the chapter shows next; the cutscene never ends into nothing */
  nextObjectiveHe: string
  /**
   * What the game says instead, when the film cannot play.
   *
   * Deliberately not a description of the match. It is one line that hands the player
   * back to the game, because the fallback for missing footage is the FOOTAGE being
   * missing — and in this chapter the thing behind it is a ninety-minute scene the game
   * can play by itself.
   */
  fallbackHe: string
}

/**
 * הכרטיס — what is printed around the film, built from the anchor and from nothing else.
 *
 * `null` for every field the archive cannot answer. A cutscene whose anchor has no match
 * row shows its title and its date-less self rather than a guessed line, which is the
 * same discipline `resolveChapterAnchor` applies to the celebration screen.
 */
export type CutsceneCard = {
  titleHe: string
  subtitleHe: string | null
  /** `הפועל תל אביב — מכבי חיפה`, or null when the archive holds no opponent */
  fixtureHe: string | null
  /** `24 במאי 1986`, or null */
  dateHe: string | null
  /** `אצטדיון בלומפילד`, or null — a cup final on neutral ground genuinely has none */
  placeHe: string | null
}

const US_HE = 'הפועל תל אביב'

const MONTHS_HE = [
  'בינואר', 'בפברואר', 'במרץ', 'באפריל', 'במאי', 'ביוני',
  'ביולי', 'באוגוסט', 'בספטמבר', 'באוקטובר', 'בנובמבר', 'בדצמבר',
] as const

/**
 * `1986-05-24` → `24 במאי 1986`.
 *
 * Written out rather than punctuated, because this string is the first thing on a black
 * screen before archival film and `24.5.1986` reads as a receipt. Returns null rather
 * than guessing at anything it cannot parse.
 */
export function longDateHe(iso: string | null | undefined): string | null {
  if (!iso) return null
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  if (!match) return null
  const [, year, month, day] = match
  const name = MONTHS_HE[Number(month) - 1]
  if (!name) return null
  return `${Number(day)} ${name} ${year}`
}

export function cutsceneCard(scene: HistoricalCutscene, anchor: HistoricalAnchor): CutsceneCard {
  const match = anchor.match
  return {
    titleHe: scene.titleHe,
    subtitleHe: scene.subtitleHe ?? null,
    fixtureHe: match ? (match.atHome ? `${US_HE} — ${match.opponentHe}` : `${match.opponentHe} — ${US_HE}`) : null,
    dateHe: longDateHe(match?.playedOn),
    placeHe: match?.venueHe ?? null,
  }
}

/**
 * The whole registry. Six entries; four of them may open by themselves (§23.6) — 1986, and
 * the three the owner locked on 25.9.2026 ("מאשר את כולם.") — each at exactly one trigger.
 *
 * `dFykPEa8NAE` is the full televised summary of the match rather than the goal on its
 * own, and that was Maor's call: an eight-year-old on that terrace did not see a clip of
 * the eighty-sixth minute, he saw an afternoon. The cutscene therefore plays what the
 * broadcast showed, and the game's own eighty-sixth minute happens on the other side of
 * it, in the world, with the child in it.
 */
export const CUTSCENES: Record<string, HistoricalCutscene> = {
  /**
   * 25.9.2026 — three films were put to the owner with one question ("watch each once
   * and say which to lock; until then only 1986 opens by itself") and he answered all of
   * them in three words: **"מאשר את כולם."** That is the owner, on the specific asset, in
   * his own words — the form §23.6 asks for — so the three are `locked_verified` payoffs
   * and each one has exactly one trigger, after the chapter's own payoff and never before
   * it (MASTER §55: big moments suspend systems; the film is the eruption AFTER the boy
   * has done the work, not instead of it).
   */
  '1993-cup': {
    id: '1993-cup', chapter: '1993-cup', status: 'locked_verified', role: 'CINEMATIC_PAYOFF', trigger: 'beat:93-film',
    provenanceHe: 'אושר בידי מאור ב-25.9.2026 אחרי צפייה, על המזהה הזה: "מאשר את כולם." (עד אז: מזהה בלי בדיקה מתועדת ובלי שורת films בארכיון). נפתח פעם אחת, על המדרכה בפינת אוסישקין, אחרי הצפירה והגביע — לא לפניהם.',
    youtubeId: 'I5FHT27dRgY', titleHe: 'גמר הגביע — ארכיון', subtitleHe: 'אחרי שפוגי כבר יודע מה קרה',
    sourceTitle: 'ארכיון וידאו — YouTube', sourceUrl: 'https://www.youtube.com/watch?v=I5FHT27dRgY', completionFlag: 'cutscene:1993-cup', watchedFlag: 'watched:1993-cup',
    // the same sentence `objective1993` prints once `after:walk` is up and the film is behind him
    nextObjectiveHe: 'למי מספרים קודם: האוטובוס חזרה, אופיר בקיוסק, או האור במטבח.', fallbackHe: 'הארכיון לא נפתח. הזיכרון המאויר ממשיך.',
  },
  '1999-basket-context': {
    id: '1999-basket-context', chapter: '1999-basket', status: 'context_only', role: 'BACKGROUND_CONTEXT', trigger: null,
    provenanceHe: 'תיעוד תקופה, לא צילום של משחק הירידה — מסומן כך מאז שנרשם.',
    youtubeId: 'GFRF2t7jXXE', titleHe: '1999 — הקשר מהארכיון', subtitleHe: 'תיעוד תקופה, לא צילום של משחק הירידה',
    sourceTitle: 'תיעוד תקופה — YouTube', sourceUrl: 'https://www.youtube.com/watch?v=GFRF2t7jXXE', completionFlag: 'cutscene:1999-basket-context', watchedFlag: 'watched:1999-basket-context', nextObjectiveHe: 'חזרה לתל אביב.', fallbackHe: 'התיעוד לא נפתח. הסיפור ממשיך בלי להמציא צילום שלא קיים.',
  },
  '2000-title': {
    id: '2000-title', chapter: '2000-title', status: 'locked_verified', role: 'CINEMATIC_PAYOFF', trigger: 'beat:t-film',
    provenanceHe: 'אושר בידי מאור ב-25.9.2026 אחרי צפייה, על המזהה הזה: "מאשר את כולם." (עד אז: מזהה בלי בדיקה מתועדת; לארכיון של 13.5.2000 אין שורת films). נפתח פעם אחת בשכונת התקווה, אחרי שהידיעה מהמשחק המקביל אושרה והחיבוק כבר קרה (t-champions) — ורק אז "אין קרדיטים" (t-close).',
    youtubeId: 'pdQLDp_-Xgo', titleHe: 'האליפות — ארכיון', subtitleHe: 'רק אחרי שהאישור הגיע',
    sourceTitle: 'ארכיון וידאו — YouTube', sourceUrl: 'https://www.youtube.com/watch?v=pdQLDp_-Xgo', completionFlag: 'cutscene:2000-title', watchedFlag: 'watched:2000-title',
    // the chapter prints no objective in the ground after `t:confirmed`; this is the line `t-close` speaks next
    nextObjectiveHe: 'עוד ארבעה ימים גמר גביע.', fallbackHe: 'הארכיון לא נפתח. החגיגה המאוירת ממשיכה.',
  },
  '2000-double': {
    id: '2000-double', chapter: '2000-double', status: 'verified_optional', role: 'ARCHIVE_FOOTAGE', trigger: null,
    provenanceHe: 'אותו מזהה כמו film-00-full ("תקציר המשחק") בארכיון של 17.5.2000, מקור ויקיפועל — פתוח מדוח המשחק, לא אוטומטי.',
    youtubeId: 'RO14bGFcD-Q', titleHe: 'גמר הגביע — ארכיון', subtitleHe: 'הדאבל',
    sourceTitle: 'ארכיון וידאו — YouTube', sourceUrl: 'https://www.youtube.com/watch?v=RO14bGFcD-Q', completionFlag: 'cutscene:2000-double', watchedFlag: 'watched:2000-double', nextObjectiveHe: 'הדרך הביתה.', fallbackHe: 'הארכיון לא נפתח. הגמר והדרך הביתה ממשיכים במשחק.',
  },
  /**
   * Two ids for the shoot-out, and only one plays. The archive row `film-00-pens` of
   * 17.5.2000 carries `RvyReKDwCC0`; the owner watched THIS id (`EGlBnUQN5AQ`) and approved
   * it, so this is the one that opens — he approved what he watched, not a row he did not.
   * Both are kept here in words so the next reader is not asked to trust. The full summary
   * (`2000-double`, `RO14bGFcD-Q`) stays `verified_optional` from the match report: the
   * shoot-out beat (`d-film`) is the only automatic film in the chapter, so nobody is ever
   * shown two films back to back.
   */
  '2000-penalties': {
    id: '2000-penalties', chapter: '2000-double', status: 'locked_verified', role: 'CINEMATIC_PAYOFF', trigger: 'beat:d-film',
    provenanceHe: 'אושר בידי מאור ב-25.9.2026 אחרי צפייה, על המזהה הזה (EGlBnUQN5AQ): "מאשר את כולם." שורת הארכיון film-00-pens של 17.5.2000 נושאת RvyReKDwCC0 — שני המזהים נשמרים, זה שנצפה ואושר הוא שמתנגן. נפתח פעם אחת ברמת גן, אחרי "זה נגמר. דאבל." (d-pens) ולפני ההליכה הביתה (d-after); תקציר המשחק המלא (2000-double) נשאר אופציונלי ולא אוטומטי.',
    youtubeId: 'EGlBnUQN5AQ', titleHe: 'הפנדלים — ארכיון', subtitleHe: 'רגע ממוקד מתוך הגמר',
    sourceTitle: 'ארכיון וידאו — YouTube', sourceUrl: 'https://www.youtube.com/watch?v=EGlBnUQN5AQ', completionFlag: 'cutscene:2000-penalties', watchedFlag: 'watched:2000-penalties',
    // `objectiveDouble` prints nothing once `d:over` is up — the walk home (`d-after`) opens by itself right after
    nextObjectiveHe: 'לנשום. ואז הביתה.', fallbackHe: 'הקטע לא נפתח. רגע הפנדלים המאויר ממשיך.',
  },
  '1986-championship': {
    id: '1986-championship',
    chapter: '1986',
    status: 'locked_verified',
    role: 'CINEMATIC_PAYOFF',
    trigger: 'era:1986@final-86/goal',
    provenanceHe: 'בחירה של מאור (סיכום השידור המלא), על שורת הארכיון 24.5.1986. כל דרכי הכישלון נבדקות בדפדפן (footage-probe); ההטמעה עצמה — לאשר פעם אחת ב-/qa/life-cutscene.',
    youtubeId: 'dFykPEa8NAE',
    titleHe: 'משחק האליפות',
    subtitleHe: 'שידור מהארכיון',
    sourceTitle: 'ארכיון וידאו — סיכום המשחק, YouTube',
    sourceUrl: 'https://www.youtube.com/watch?v=dFykPEa8NAE',
    completionFlag: 'cutscene:1986-championship',
    watchedFlag: 'watched:1986-championship',
    // the same sentence the chapter's objective prints once the film is behind him
    nextObjectiveHe: 'למצוא את אבא.',
    fallbackHe: 'הסרט מהארכיון לא נפתח. תסתכל על המגרש — המשחק עוד רץ.',
  },
}

export function cutsceneFor(id: string): HistoricalCutscene | null {
  return CUTSCENES[id] ?? null
}

/**
 * Only verified cinematic payoffs open by themselves (§23.6). Everything else in the
 * registry is an archive film a player chooses, and a chapter that names one as its
 * automatic film simply plays on without it — the same fall-through as an unknown id.
 */
export function autoPlayable(scene: HistoricalCutscene): boolean {
  return scene.status === 'locked_verified' && scene.role === 'CINEMATIC_PAYOFF'
}

/** the film a chapter or a beat may open WITHOUT the player asking — or null */
export function autoCutsceneFor(id: string | null | undefined): HistoricalCutscene | null {
  if (!id) return null
  const scene = cutsceneFor(id)
  return scene && autoPlayable(scene) ? scene : null
}

/**
 * The URL the embed loads, with every parameter this game actually wants.
 *
 * `enablejsapi` is what lets the shell hear the video end instead of guessing at it.
 * `rel=0` keeps YouTube from offering three other videos over the last frame of a
 * historical document. `modestbranding` is deliberately NOT set — it was deprecated, and
 * more to the point the attribution belongs on screen (it is under the frame) rather than
 * scrubbed off it. `origin` is required by the iframe API when `enablejsapi` is on.
 */
export function embedUrl(scene: HistoricalCutscene, origin: string): string {
  const params = new URLSearchParams({
    enablejsapi: '1',
    rel: '0',
    playsinline: '1',
    autoplay: '1',
    fs: '0',
    cc_load_policy: '0',
    iv_load_policy: '3',
    origin,
  })
  if (scene.startSeconds) params.set('start', String(Math.round(scene.startSeconds)))
  if (scene.endSeconds) params.set('end', String(Math.round(scene.endSeconds)))
  return `https://www.youtube-nocookie.com/embed/${scene.youtubeId}?${params.toString()}`
}
