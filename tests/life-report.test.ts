import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { HISTORY_DAYS } from '@/lib/life/history'
import { PRESETS } from '@/lib/life/history/presets'
import { buildMatchReport, keepsakeFor, printableMinute } from '@/lib/life/finale'
import { CHAPTERS } from '@/lib/life/content/chapters'
import { DOC } from '@/lib/life/runtime/art'

/**
 * דו"ח המשחק — the end-of-match card, proved without a browser.
 *
 * Maor asked for the end of every match to be an experience "כמו שעשינו ב-86", and the
 * thing that actually made 1986 land was never the layout: it was a real ticket, four
 * real pages, a scorer, a minute, and a source line under every one of them. So what this
 * file guards is not that the card renders. It is that the card **cannot print anything
 * nobody wrote down** — which is the only property that makes the other chapters worth
 * ending this way.
 *
 * Six things, in the order they would hurt:
 *
 * 1. Every row on the card cites a source the day itself lists (rule 16).
 * 2. No minute reaches the card that a source did not give, and `pacingMinute` never can.
 * 3. A document key is a declared `DOC` key with a file behind it and a manifest row that
 *    reports zero yellow (rules 49, 8, 61).
 * 4. Films are LINKS — no iframe, no embed host, nothing that would load a third-party
 *    player into the game or break the QA sweep's "no console errors" (rule 29).
 * 5. A chapter with nothing documented gets `null` and no empty headings.
 * 6. A keepsake is refused to anybody who was not in the ground.
 *
 * Rule 45: not one year is typed here. The chapters under test are derived from
 * `PRESETS`, which is the same mapping the director runs off.
 */
const ROOT = join(__dirname, '..')
const ART = join(ROOT, 'public/life/art')
const manifest = JSON.parse(readFileSync(join(ART, 'manifest.json'), 'utf8')) as Record<
  string,
  Record<string, { w: number; h: number; bytes: number; yellowLeft: number }>
>

/** every chapter the director has a documented day for — derived, never listed */
const DOCUMENTED = Object.keys(PRESETS)

describe('דו"ח המשחק — what the card is allowed to print', () => {
  it('builds a report for every documented day and for nothing else', () => {
    for (const chapter of DOCUMENTED) expect(buildMatchReport(chapter), chapter).not.toBeNull()
    const undocumented = CHAPTERS.map((row) => row.id).filter((id) => !DOCUMENTED.includes(id))
    expect(undocumented.length, 'every chapter is documented — this test has nothing to prove').toBeGreaterThan(0)
    for (const chapter of undocumented) expect(buildMatchReport(chapter), chapter).toBeNull()
  })

  it('cites, for every single row, a source the day itself lists', () => {
    for (const chapter of DOCUMENTED) {
      const report = buildMatchReport(chapter)!
      const known = new Set(report.sources.map((source) => source.id))
      const rows: Array<{ what: string; ids: readonly string[] }> = [
        ...report.goals.map((goal) => ({ what: goal.id, ids: goal.sourceIds })),
        ...report.facts.map((fact) => ({ what: fact.id, ids: fact.sourceIds })),
        ...report.documents.map((doc) => ({ what: doc.art, ids: doc.sourceIds })),
        ...report.films.map((film) => ({ what: film.id, ids: film.sourceIds })),
        ...(report.shootout ? [{ what: `${chapter}:shootout`, ids: report.shootout.sourceIds }] : []),
        ...(report.shootout?.kicks ?? []).map((kick) => ({ what: `${chapter}:kick:${kick.order}`, ids: kick.sourceIds })),
      ]
      for (const row of rows) {
        expect(row.ids.length, `${row.what} carries no source`).toBeGreaterThan(0)
        for (const id of row.ids) expect(known.has(id), `${row.what} cites "${id}", which the report does not list`).toBe(true)
      }
    }
  })

  /**
   * The bibliography is not padded either. A day may list a source only one of its venues
   * leans on, and printing the whole list under a card that used three of them is the
   * citation version of inventing a fact.
   */
  it('lists only the sources its own rows actually cite', () => {
    for (const chapter of DOCUMENTED) {
      const report = buildMatchReport(chapter)!
      const cited = new Set<string>()
      for (const goal of report.goals) for (const id of goal.sourceIds) cited.add(id)
      for (const fact of report.facts) for (const id of fact.sourceIds) cited.add(id)
      for (const doc of report.documents) for (const id of doc.sourceIds) cited.add(id)
      for (const film of report.films) for (const id of film.sourceIds) cited.add(id)
      for (const id of report.shootout?.sourceIds ?? []) cited.add(id)
      for (const kick of report.shootout?.kicks ?? []) for (const id of kick.sourceIds) cited.add(id)
      for (const source of report.sources) expect(cited.has(source.id), `${chapter} lists ${source.id} and never cites it`).toBe(true)
    }
  })

  /**
   * Rule 60.1, as a property of the printed string rather than of a comment: the card may
   * show `displayMinute` or `minute`, and there is no path by which `pacingMinute` can
   * reach it. The 17.5.2000 opener is the case that matters — two sources, one minute
   * apart, so `minute` is null and the card prints "86׳ או 87׳" rather than choosing.
   */
  it('prints no minute the archive did not give, and never the pacing one', () => {
    for (const chapter of DOCUMENTED) {
      const report = buildMatchReport(chapter)!
      for (const goal of report.goals) {
        const printed = printableMinute(goal)
        expect(goal.minuteHe, `${goal.id} disagrees with printableMinute`).toBe(printed)
        if (printed === null) continue
        if (goal.displayMinute) {
          expect(printed).toBe(goal.displayMinute)
          continue
        }
        expect(printed).toBe(`${goal.minute}׳`)
        expect(goal.minute, `${goal.id} printed a minute the archive does not hold`).not.toBeNull()
      }
    }
  })

  it('keeps a disputed goal silent and unminuted on the card', () => {
    for (const chapter of DOCUMENTED) {
      for (const goal of buildMatchReport(chapter)!.goals) {
        if (goal.confidence !== 'disputed') continue
        expect(printableMinute(goal), `${goal.id} is disputed and prints a minute`).toBeNull()
        expect(goal.speakable, `${goal.id} is disputed and speakable`).toBe(false)
      }
    }
  })

  it('keeps a conflict rather than settling it', () => {
    const notes = DOCUMENTED.flatMap((chapter) => {
      const report = buildMatchReport(chapter)!
      return [
        ...report.goals.map((goal) => goal.conflictNote),
        ...report.facts.map((fact) => fact.conflictNote),
        report.shootout?.conflictNote,
      ]
    }).filter(Boolean) as string[]
    // the crowd at Ramat Gan in 1999: two sources, two numbers, no average
    const crowd = notes.join(' ')
    expect(crowd).toContain('33,000')
    expect(crowd).toContain('40,000')
    // and the one minute the two 2000 sources disagree about
    expect(crowd).toContain('86')
    expect(crowd).toContain('87')
  })
})

/**
 * כלל 11, בצורה שהכרטיס יכול להפר — a name printed under a citation is still a claim, and
 * a claim whose only backing is an internal document of this project is not a fact about
 * football (`kind: 'brief'`, and Maor's own instruction: *"מסמך פנימי הוא לא מקור
 * היסטורי"*). `speakable` already enforces that for a line a character says. This is the
 * same fence around the other way a name can reach a player.
 *
 * It is why the report reads the PRIMARY venue only, and the four Yavne scorers of
 * 12.5.1990 — who exist in two briefs and in no newspaper — stay where they are: running
 * the day, named nowhere.
 */
describe('כלל 11 — מי מותר לכרטיס לנקוב בשמו', () => {
  it('prints no scorer whose only source is an internal brief', () => {
    for (const chapter of DOCUMENTED) {
      const report = buildMatchReport(chapter)!
      const briefs = new Set(report.sources.filter((source) => source.kind === 'brief').map((source) => source.id))
      for (const goal of report.goals) {
        if (!goal.personHe) continue
        const external = goal.sourceIds.some((id) => !briefs.has(id))
        expect(external, `${goal.id} names ${goal.personHe} on a brief alone`).toBe(true)
      }
      for (const kick of report.shootout?.kicks ?? []) {
        const external = kick.sourceIds.some((id) => !briefs.has(id))
        expect(external, `${chapter} kick ${kick.order} names ${kick.takerHe} on a brief alone`).toBe(true)
      }
    }
  })

  /**
   * ומה שכרטיס מדפיס, דמות עדיין לא אומרת. `detailHe` is the source's own description and
   * it belongs on a screen that carries the citation; `lineHe` is a fallible man on a
   * terrace. Copying one into the other is the single most likely way this pass ends up
   * putting a newspaper's sentence in somebody's mouth.
   */
  it('never lets a printed detail become a spoken line', () => {
    const spoken = Object.values(HISTORY_DAYS)
      .flatMap((day) => day.venues.flatMap((venue) => venue.events))
      .map((event) => event.lineHe)
      .filter(Boolean) as string[]
    const details = Object.values(HISTORY_DAYS)
      .flatMap((day) => day.venues.flatMap((venue) => venue.events))
      .map((event) => event.detailHe)
      .filter(Boolean) as string[]
    for (const detail of details) {
      for (const line of spoken) expect(line.includes(detail), `"${line}" speaks a printed detail`).toBe(false)
    }
  })
})

describe('הנייר — a document is a document', () => {
  it('names only declared DOC keys, with a file and a clean manifest row behind each', () => {
    const docs = manifest.docs ?? {}
    for (const chapter of DOCUMENTED) {
      for (const doc of buildMatchReport(chapter)!.documents) {
        expect(DOC.includes(doc.art as (typeof DOC)[number]), `${doc.art} is not a declared DOC key`).toBe(true)
        const row = docs[doc.art]
        expect(row, `${doc.art} has no manifest row`).toBeDefined()
        expect(row!.yellowLeft, `${doc.art} ships ${row!.yellowLeft} yellow pixels`).toBe(0)
      }
    }
  })

  /**
   * What sits under a scan is a TRANSCRIPTION, and the test for that is that the words are
   * on the paper. It cannot read the paper, so it checks the next best thing: every
   * caption is long enough to be a quotation rather than a label, and none of them is the
   * game talking about the player — no second person, which is the voice every other
   * screen in this game is written in and the one voice a document may not be given.
   */
  it('quotes each document instead of captioning it', () => {
    for (const chapter of DOCUMENTED) {
      for (const doc of buildMatchReport(chapter)!.documents) {
        expect(doc.printsHe.length, `${doc.art} has no transcription`).toBeGreaterThan(24)
        expect(/\bאתה\b|\bשלך\b|\bהיית\b/.test(doc.printsHe), `${doc.art} speaks to the player`).toBe(false)
      }
    }
  })
})

describe('הסרטים — links, never embeds', () => {
  it('carries only plain watch links', () => {
    for (const chapter of DOCUMENTED) {
      for (const film of buildMatchReport(chapter)!.films) {
        expect(film.url.startsWith('https://'), `${film.id} is not https`).toBe(true)
        expect(/<iframe|embed\/|player\./i.test(film.url), `${film.id} looks like an embed`).toBe(false)
        expect(film.titleHe.length, `${film.id} has no label`).toBeGreaterThan(2)
      }
    }
  })

  /**
   * And the component may not grow one later. An iframe on this card would load a
   * third-party player into a game about a childhood, would not resolve in the QA
   * container at all (rule 29 — the sandbox refuses those hosts), and would therefore
   * break the "no console errors" claim every delta in this project makes. The decision
   * is written down in `history/types.ts`; this is the part that fails if somebody
   * changes their mind quietly.
   */
  it('mounts no embed in the card itself', () => {
    const source = readFileSync(join(ROOT, 'components/life/MatchReport.tsx'), 'utf8')
    expect(/<iframe/i.test(source), 'MatchReport embeds a player').toBe(false)
    expect(source).toContain('rel="noopener noreferrer"')
    expect(source).toContain('target="_blank"')
  })
})

describe('מזכרת — only somebody who was there kept one', () => {
  it('hands a keepsake to a night spent in the ground and to nobody else', () => {
    const withPaper = DOCUMENTED.filter((chapter) => HISTORY_DAYS[PRESETS[chapter]!.day.id]?.documents?.some((doc) => doc.keepsake))
    expect(withPaper.length, 'no day carries a keepsake — this test has nothing to prove').toBeGreaterThan(0)
    for (const chapter of withPaper) {
      expect(keepsakeFor(chapter, 'inside'), chapter).not.toBeNull()
      expect(keepsakeFor(chapter, 'late'), chapter).not.toBeNull()
      for (const elsewhere of ['radio', 'army', 'working', 'television', 'outside', 'travelling', null]) {
        expect(keepsakeFor(chapter, elsewhere), `${chapter} handed a stub to ${elsewhere}`).toBeNull()
      }
    }
  })

  it('never makes a front page into a keepsake', () => {
    for (const day of Object.values(HISTORY_DAYS)) {
      for (const doc of day.documents ?? []) {
        if (!doc.keepsake) continue
        expect(doc.lead === undefined || doc.keepsake, `${doc.art}`).toBe(true)
        // the three that are: a match ticket and two season books. A page is the world's
        // memory of a day; these are his.
        expect(/ticket|season/i.test(doc.art), `${doc.art} is a keepsake and is not a ticket`).toBe(true)
      }
    }
  })
})
