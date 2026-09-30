'use client'

import { eraFor } from '@/lib/life/content/era'
import { artUrl } from '@/lib/life/runtime/art'
import { t } from '@/lib/i18n'

/**
 * קו החיים — the same person, four times, in one row.
 *
 * This is the thing the whole architecture is for, and it is worth showing before any of
 * it is playable. A Saturday in 1986 is not a level; it is the first entry in a life that
 * runs through a bedroom, a terrace, a uniform and a man, and the cheapest honest way to
 * say so is to stand the four of him side by side and let the player do the arithmetic.
 *
 * Two rules keep it honest. The age you have actually played is lit and named `כאן אתה
 * עכשיו`; every later age is dimmed, captioned `פרק שעוד ייכתב`, and claims nothing about
 * what happens in it. And nothing here carries a year — the captions are ages, not dates,
 * because the archive has no 1990s match on file and a caption is not the place to invent
 * one.
 */

/**
 * Four ages, and all four are PoGi.
 *
 * The row used to mix him with two other figures and one — `soldier` — that had no file
 * on disk at all, so the strip rendered a broken image between a boy and a stranger. It
 * is the same person now: eight, twelve (the `hero80` turnaround Stage B walks in), the
 * conscript, the young man. A life-line whose point is "this is you, later" cannot
 * contain somebody else.
 */
const AGES = [
  { art: 'pogi', labelKey: 'life.line.age1' },
  { art: 'hero80', labelKey: 'life.line.age2' },
  { art: 'pogiIDF-1', labelKey: 'life.line.age3' },
  { art: 'pogi90-1', labelKey: 'life.line.age4' },
] as const

/**
 * המשבצת שהפרק מדליק — **לפי הגוף שהוא הולך בו** (21.9.2026).
 *
 * עד היום זה היה `chapter === '1990' ? 1 : 0`, שנכתב כשהיו שני פרקים. מאז נוספו ארבעים,
 * וכרטיס הסיום של כל אחד מהם — 1996 במדים, 2019 מול בלומפילד המחודש — הדליק את **בן
 * השמונה** ועמעם את השאר תחת *"פרק שעוד ייכתב"*. הגוף של הפרק כבר אומר את הגיל
 * (`era.player`), ולכן המשבצת נגזרת ממנו, כמו הדיוקן בתיבה (`ownFace`).
 */
// (24.9.2026) the grown man ages on screen — 32/40/47 are the same slot: "the young man, later"
const SLOT_OF_BODY: Record<string, number> = { hero80: 1, teen: 1, soldier: 2, hero90: 3, pogi32: 3, pogi40: 3, pogi47: 3 }
export function ageReached(chapter: string): number {
  if (chapter === '1990') return 1
  return SLOT_OF_BODY[eraFor(chapter).player.pose.down] ?? 0
}

/** "הראשון בקופסה" נכון ב-1986 ו"השני" ב-1990; אחריהם הקופסה כבר לא סופרת בקול */
export function leadKey(chapter: string): 'life.line.lead' | 'life.line.lead2' | 'life.line.lead3' {
  if (chapter === '1990') return 'life.line.lead2'
  return ageReached(chapter) === 0 ? 'life.line.lead' : 'life.line.lead3'
}

export function LifeLine({ reached = 0, lead }: { reached?: number; lead?: 'life.line.lead' | 'life.line.lead2' | 'life.line.lead3' }) {
  return (
    <section className="border-hair border-concrete/40 bg-ink" data-life="lifeline">
      <header className="flex items-baseline justify-between gap-3 border-b-hair border-concrete/30 px-3 py-2">
        <h3 className="font-display text-[13px] leading-none text-sheet">
          <bdi>{t('life.line.title')}</bdi>
        </h3>
        <p className="truncate font-body text-[10px] leading-none text-concrete">
          <bdi>{t(lead ?? (reached >= 1 ? 'life.line.lead2' : 'life.line.lead'))}</bdi>
        </p>
      </header>

      <ol className="grid grid-cols-4 gap-px bg-concrete/25">
        {AGES.map((age, index) => {
          const here = index === reached
          const later = index > reached
          return (
            <li key={age.art} className="relative bg-ink">
              <div className="flex h-[124px] items-end justify-center overflow-hidden px-1">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={artUrl(age.art)}
                  alt=""
                  aria-hidden="true"
                  className={`max-h-full w-auto object-contain transition-opacity duration-stamp motion-reduce:transition-none ${
                    later ? 'opacity-25 grayscale' : 'opacity-100'
                  }`}
                />
              </div>
              {here && (
                <span
                  className="absolute inset-x-0 bottom-0 h-[3px] bg-red"
                  aria-hidden="true"
                />
              )}
              <p
                className={`border-t-hair border-concrete/30 px-1 py-1.5 text-center font-body text-[10px] leading-none ${
                  here ? 'text-sheet' : 'text-concrete/70'
                }`}
              >
                <bdi>{t(age.labelKey)}</bdi>
              </p>
            </li>
          )
        })}
      </ol>

      <p className="px-3 py-2 text-center font-body text-[10px] leading-none text-concrete/80">
        <bdi>{t(reached === AGES.length - 1 ? 'life.line.now' : 'life.line.soon')}</bdi>
      </p>
    </section>
  )
}
