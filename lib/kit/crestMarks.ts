/**
 * הסמלים — the club's crest eras, and which artwork prints for each.
 *
 * Rule 25 is absolute and I broke it building this gate: the first version of the kit
 * plate DREW a shield with a stroke for the hammer and a wedge for the flag. Maor
 * supplied seven photographs of the club's own marks, and a drawn approximation of a
 * crest is exactly what that rule exists to forbid — print it or leave the slot empty.
 * These are printed.
 *
 * `lib/kit/seasons.ts` resolves WHICH era a season belongs to, from the crest timeline.
 * This table is the other half: the era's name, and the file that prints for it.
 *
 * It is a static table rather than a read of the archive because both consumers are on
 * the wrong side of a boundary for that — `KitPlate` is a client component and the
 * archive is `server-only`. `tests/kit.test.ts` asserts every era in the timeline has an
 * entry here and every entry has a file on disk, so a new era cannot render as nothing.
 *
 * **The variant follows the cloth.** The club drew its early mark in red and in white
 * for the same reason every club does: a red crest on a red shirt is not a crest, it is
 * a texture. `onRed` names the light artwork for that era where the club made one, and
 * a shirt picks by its own base colour. That is the difference between having the assets
 * and using them.
 */

export type CrestMark = {
  /** the timeline's own `imageKey` */
  key: string
  /** the era's name, as the timeline states it — what a drawer card prints */
  nameHe: string
  /** the artwork for a light shirt */
  file: string
  /** the artwork for a red or ink shirt, where the club drew a light variant */
  onRed?: string
  /** what a supporter names it by, so the eras are told apart without naming a season */
  tellHe: string
  /**
   * The same era's LATER drawing, from a given year — the eighties print of the original mark
   * (27.9.2026, Maor: *"נא תהפוך אותו לשחור ולבן ותשמש בו בשחור ולבן לפי הצורך"*). Black on a
   * light shirt, white on a red one; the cream original was dropped, and with it its yellow.
   */
  late?: { fromYear: number; file: string; onRed: string }
}

export const CREST_MARKS: readonly CrestMark[] = [
  {
    key: 'worker-hapoel',
    nameHe: 'הסמל המקורי',
    file: 'worker-hapoel',
    onRed: 'worker-white',
    tellHe: 'הפועל בלי מסגרת',
    late: { fromYear: 1980, file: 'worker-80s-ink', onRed: 'worker-80s-white' },
  },
  {
    key: 'ball-waves',
    nameHe: 'כדור במרכז',
    file: 'ball-waves',
    tellHe: 'כדור וגלים',
  },
  {
    // 1997–2000, supplied 22.9.2026. The only crest file that carries yellow, and the owner's
    // approval for it is in `lib/brand/yellowExemptions.ts` — as this exact path.
    key: 'keter-color',
    nameHe: 'עיצוב מחדש',
    file: 'keter-color',
    tellHe: 'כתר בצבעים',
  },
  {
    // 27.9.2026 — Maor: *"שתיהם נכונות, עם הכיתוב השחור השתמשו בשתיהם"*. The flat mark on a
    // light shirt, the sewn patch (its own oval ground) on a red one. keter-ball.png, the red
    // lettering, stays on disk and prints nowhere.
    key: 'keter-ball',
    nameHe: 'תקופת כתר',
    file: 'keter-ball-black',
    onRed: 'keter-ball-patch',
    tellHe: 'כתר על הכדור',
  },
  {
    key: 'circle-1927',
    nameHe: 'צבעי המועדון',
    file: 'circle-1927',
    tellHe: 'עיגול · 1927',
  },
  {
    key: 'circle-1923',
    nameHe: 'בלי כתר',
    file: 'circle-1923',
    tellHe: 'עיגול · 1923',
  },
] as const

/** Every file this table can ask for — the test checks each one is on disk. */
export const CREST_FILES: readonly string[] = [
  ...new Set(CREST_MARKS.flatMap((mark) => [mark.file, mark.onRed, mark.late?.file, mark.late?.onRed].filter(Boolean) as string[])),
]

export function crestMark(key: string | null): CrestMark | null {
  if (!key) return null
  return CREST_MARKS.find((mark) => mark.key === key) ?? null
}

/** The artwork to print, given the shirt it is printing onto. */
export function crestArt(key: string | null, darkCloth: boolean, year?: number | null): string | null {
  const mark = crestMark(key)
  if (!mark) return null
  if (mark.late && typeof year === 'number' && year >= mark.late.fromYear) {
    return `/brand/crests/${darkCloth ? mark.late.onRed : mark.late.file}.png`
  }
  return `/brand/crests/${darkCloth && mark.onRed ? mark.onRed : mark.file}.png`
}

/** `"1985/86"` → 1985; anything else → null */
export function seasonStartYear(label: string | null | undefined): number | null {
  const m = /(\d{4})/.exec(label ?? '')
  return m ? Number(m[1]) : null
}
