import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { ALL_CHARACTERS, portraitFor, speakerKeys } from '@/lib/life/characters'
import { DIALOGUE } from '@/lib/life/content/dialogue'
import { eraFor, ERA_KEYS } from '@/lib/life/content/era'

/**
 * לכל דמות הפנים שלה — every speaker resolves to a plate, or is named here as one that
 * does not have one yet.
 *
 * `Say.who` is free text, and that is fine: a writer types `who: 'קובי'` in one scene and
 * `who: 'kobi'` in the next. What was NOT fine is that the portrait maps are keyed by the
 * Hebrew name only and the dialogue box looked the speaker up with a plain
 * `portraits[who]`. Every line spelled by id resolved to `undefined`, and the box drew a
 * nameplate with no face. `portraitFor()` resolves through the registry, so both
 * spellings find the same face; this suite holds that.
 *
 * **המדידה עצמה הייתה שבורה, ו-16.9.2026 היא זו שתוקנה ראשונה.**
 *
 * This file used to count speakers by running `/who:\s*'([^']+)'/g` over the text of
 * `lib/life/content/*.ts`, and reported "363 of 953 lines — 38% of the dialogue in the
 * game — had no portrait, 109 of them Kobi". That number was an artefact of the regex.
 * `who` is not only a speaker: it is also the TARGET of an effect — `{ e: 'rel', who:
 * 'kobi', axis: 'bond' }`, `{ e: 'remember', who: 'asaf' }` — and there are **345 of
 * those** in the content files against 610 real spoken lines. Every one was counted as a
 * faceless line, under its id spelling, which is why the id spellings dominated the
 * report and why `asaf` appeared to have seventeen lines with no face. He has nine, and
 * every chapter that speaks them has mapped him since the September ingest.
 *
 * So the count is no longer read off the text. It walks the live objects — `DIALOGUE`
 * plus each era's own beats, windows, encounters and ambient — and counts a node only
 * when it carries BOTH a speaker and something said (`text`, or `lineHe` for an
 * encounter). A relationship write has no line in it and can no longer be mistaken for
 * one. The cost of the old approach was not a wrong percentage; it was that the three
 * loudest names in `NO_PLATE_YET` were people who already had faces, and listing them
 * there had quietly switched the guard off for them.
 */

const CONTENT = join(process.cwd(), 'lib/life/content')

/** Every key any era's plate map answers to. */
const PLATE_KEYS: ReadonlySet<string> = (() => {
  const keys = new Set<string>()
  for (const name of readdirSync(CONTENT)) {
    if (!name.endsWith('.ts')) continue
    const text = readFileSync(join(CONTENT, name), 'utf8')
    for (const block of text.matchAll(
      /export const PORTRAIT[A-Z0-9_]*\s*:\s*Record<string, string>\s*=\s*\{([\s\S]*?)\n\}/g,
    )) {
      for (const entry of (block[1] as string).matchAll(/'([^']+)'\s*:/g)) keys.add(entry[1] as string)
    }
  }
  return keys
})()

/**
 * כל מי שבאמת אומר משהו — walked off the live objects, never off the text.
 *
 * A node counts when it names a speaker AND carries the words: `Say` is `{ who, text }`
 * and an encounter is `{ who, lineHe }`. An effect is `{ e, who, … }` with nothing said
 * in it, so it is structurally invisible here rather than filtered by name. Narration
 * (`who: null`) is not a speaker and never was.
 *
 * Objects are visited once — several eras share one ambient pool, and counting it per
 * chapter would weight those lines by how many chapters borrow them.
 */
function speakers(): Map<string, number> {
  const found = new Map<string, number>()
  const seen = new Set<object>()
  const walk = (value: unknown): void => {
    if (Array.isArray(value)) {
      for (const item of value) walk(item)
      return
    }
    if (!value || typeof value !== 'object') return
    if (seen.has(value)) return
    seen.add(value)
    const node = value as Record<string, unknown>
    const said = typeof node.text === 'string' || typeof node.lineHe === 'string'
    if (said && typeof node.who === 'string') found.set(node.who, (found.get(node.who) ?? 0) + 1)
    for (const child of Object.values(node)) walk(child)
  }
  walk(DIALOGUE)
  for (const chapter of [...ERA_KEYS, 'prologue']) {
    const era = eraFor(chapter)
    walk([era.beats, era.opportunities, era.encounters, era.ambient, era.endings])
  }
  return found
}

function resolves(who: string): boolean {
  return speakerKeys(who).some((key) => PLATE_KEYS.has(key))
}

/**
 * Speakers with no plate anywhere, as of 16.9.2026 — three, and none of them is a
 * person the player looks at.
 *
 *  · `@crowd` is not a name, it is a SENTINEL. `WorldScene` swaps it for a real
 *    supporter's `displayNameHe` off the save's own seed before the line ever reaches
 *    the box (rule 58), so the string itself is never rendered. It is listed rather than
 *    special-cased, because a filter that knows about it here is a second place that has
 *    to learn the day it is renamed.
 *  · `הסדרן` and `מוכר הגרעינים` are the two people of the Bloomfield street mission in
 *    `lib/life/city/mission.ts`. That street is the `/city` route, which renders no
 *    portraits at all — no era map governs it. They get plates the day an era scene
 *    points at `bf-steward-bag` or `bf-vendor-seeds`, and not before.
 *
 * **ומה שיצא מהרשימה ב-16.9.2026, וחשוב לדעת למה.** `asaf`, `michel` and `yaron` were
 * here as the three biggest holes in the cast. All three were the ID spelling of a
 * person who never speaks under it — every one of their "lines" was an `{ e: 'rel' }`
 * effect miscounted by the old regex. Their Hebrew spellings resolve in every era that
 * plays them (`אסף` in all three, `מישל` in all five, `ירון` in the one). `המוכר`,
 * `הגבר`, `אבא עם ילד` and `קופאית` left for the opposite reason: they were real
 * faceless extras and they were cast to plates that already existed on disk.
 * An entry here is a guard switched OFF for that name, so the list stays short.
 */
const NO_PLATE_YET: ReadonlySet<string> = new Set([
  '@crowd',
  /**
   * `PARTNER` — אותה צורה של `@crowd`: תפקיד ולא שם (`RUNTIME_ROLES`). `resolveSpeaker`
   * מחליף אותו בשם של בן/בת הזוג שנבחר/ה לפני שהשורה מגיעה לתיבה, וכל אחת משלוש
   * הדמויות האפשריות (מלאני, דור, תמר) נמצאת ב-`PORTRAIT_FAMILY` בשמה.
   * `tests/life-partner.test.ts` מחזיק את זה.
   */
  'PARTNER',
  'הסדרן',
  'מוכר הגרעינים',
  // בתיה יצאה מכאן ב-27.9.2026 — `faceBatya`, נחתך מהגוף שלה (הצילום שמאור אישר)
  /**
   * יבגני — שורה ברישום (`yevgeny`, `provenance: 'composite'`), בלי `portraitSet`. הוא
   * מדבר שורה אחת ב-`Y02.3` (*"אני נכנס לתפקיד שסיכמנו, לא לנעליים של מישהו"*), ורק
   * בחיים שבהם פוגי השאיר את הנעליים ריקות. אותה סיבה שבתיה הייתה כאן עד שהגיע הצילום שלה: עדיף בלי פנים מאשר עם
   * הפנים של רומא או של מתוקי (כלל 67). ב-`ART-PROMPTS-2000-2026.md` §16 אין לו בקשה עדיין.
   */
  'יבגני',
  // המנהל המקצועי — תפקיד בשיחת וידאו אחת של 2025 (`SPEAKING_ROLES`), מסך ולא אדם בחדר (28.9.2026)
  'המנהל המקצועי',
  /**
   * שלושה מחלונות CAREER (21.9.2026), באותו נימוק: שורה ברישום, בלי `portraitSet`.
   * שני (`crowd-shani`) — הצלמת של J01–J03; ארז (`crowd-erez`) — שורה אחת ב-T01;
   * מראיינת — תפקיד ולא אדם, כמו הסדרן, ב-J03 בלבד.
   */
  'שני',
  'ארז',
  'מראיינת',
  /** מיכל ואדם — *"NPC בדיוניים מקצועיים חדשים"* של חלון OWNER (`michal`, `adam`), בלי `portraitSet` */
  'מיכל',
  'אדם',
  /**
   * אלכס — *"המכר המקומי אלכס בדיוני ואינו מייצג לאום"* (X03, `2023-abroad`, 21.9.2026). שורה
   * ברישום (`alex`), בלי `portraitSet`: הגוף שלו בחדר הוא תחליף מסומן (`world/castFigures.ts`),
   * ופנים יבואו עם הבקשה ב-ART-PROMPTS §16.
   */
  'אלכס',
])

describe('לכל דמות הפנים שלה', () => {
  it('שני האיותים של אותו אדם מגיעים לאותו פלייט', () => {
    const kobi = ALL_CHARACTERS.find((character) => character.id === 'kobi')
    expect(kobi?.displayNameHe).toBe('קובי')

    const plates = { 'קובי': 'faceKobi' }
    expect(portraitFor('קובי', plates)).toBe('faceKobi')
    expect(portraitFor('kobi', plates), 'the id spelling must find the same face').toBe('faceKobi')
  })

  it('איות גולמי גובר על הרישום — עידן רשאי להחליף פלייט לפרק אחד', () => {
    const plates = { kobi: 'faceKobi90', 'קובי': 'faceKobi' }
    expect(portraitFor('kobi', plates)).toBe('faceKobi90')
  })

  it('לא ממציא פנים למי שאינו ברישום', () => {
    expect(portraitFor('מישהו שלא קיים', { 'קובי': 'faceKobi' })).toBeNull()
  })

  it('כל דובר במשחק מגיע לפלייט, או רשום כאן כחסר', () => {
    const orphans: string[] = []
    for (const [who, lines] of speakers()) {
      if (resolves(who) || NO_PLATE_YET.has(who)) continue
      orphans.push(`${who} (${lines} שורות)`)
    }
    expect(
      orphans,
      `speakers with no portrait and no entry in NO_PLATE_YET:\n${orphans.join('\n')}`,
    ).toEqual([])
  })

  it('פחות מ-6% מהשורות במשחק בלי פנים', () => {
    // 12 of 610 — the two city-mission extras and the crowd sentinel, and nothing else.
    // The 38.1% this ceiling was written against was the broken measurement; the real
    // figure on the day it was written is unknown and not worth reconstructing. The
    // ceiling stays where it is, because what it guards is drift, not that old number.
    let withFace = 0
    let faceless = 0
    for (const [who, lines] of speakers()) {
      if (resolves(who)) withFace += lines
      else faceless += lines
    }
    const share = faceless / (withFace + faceless)
    expect(share, `${(share * 100).toFixed(1)}% of lines render with no portrait`).toBeLessThan(0.06)
  })

  it('דמות שאין לה פלייט לא צוברת תפקיד בשקט', () => {
    // An extra with no face is fine. An extra with thirty lines is a character somebody
    // forgot to commission art for, and this is the guard that notices before a player
    // does. (It used to cite `asaf` and his seventeen lines as the case in point. He
    // never had seventeen and never lacked a face — see the note at the top of the file.)
    const loud: string[] = []
    for (const [who, lines] of speakers()) {
      if (resolves(who)) continue
      // PARTNER is never drawn as PARTNER: resolveSpeaker swaps in Melanie, Dor or Tamar, and
      // each has a face (see NO_PLATE_YET). Pass D grew the tag past twenty lines (28.9.2026).
      if (who === 'PARTNER') continue
      if (lines > 20) loud.push(`${who}: ${lines} שורות ואין לו פנים`)
    }
    expect(loud, loud.join('\n')).toEqual([])
  })
})
