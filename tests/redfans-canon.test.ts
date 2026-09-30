import { describe, expect, it } from 'vitest'

import {
  matchNaturalKey,
  isCanonicalMatchId,
  idForNaturalKey,
  type MatchIdEntry,
  type MatchNaturalKey,
} from '@/lib/canon/matchId'
import { mintMatchId, recordKeyCorrection } from '@/scripts/ingest/lib/matchIds'
import {
  matchContextFromTitle,
  parseSchedulePage,
  parseScorerCell,
  parseSquadCategory,
  seasonFromTitle,
  stageFromTitle,
} from '@/scripts/ingest/parse/redfans'
import { canonFromCorpus, classifyPage, toRawPage } from '@/scripts/ingest/sources/redfans-canon'
import { recordFromStored } from '@/scripts/ingest/sources/wiki-corpus'
import { IngestReport } from '@/scripts/ingest/lib/report'
import type { RawPage } from '@/scripts/ingest/lib/types'
import type { WikiPageRecord } from '@/scripts/ingest/adapters/mediawiki'

/**
 * ויקיפועל → קנון.
 *
 * **Every fixture here is a SHAPE, not a fact.** The research brief is evidence of where
 * the data lives, not a source to copy from: hardcoding "Hapoel beat Maccabi Netanya 4:2
 * on 25.1.1981" into a test would make the suite pass on a fact the importer never read,
 * which is precisely the failure the whole provenance discipline exists to prevent
 * (rule 11). So the clubs here are invented placeholders and the point of each test is
 * that the PARSER handles the wiki's format — the real names arrive from the corpus.
 */

function page(title: string, sourceText: string): RawPage {
  return {
    pageId: 4242,
    title,
    namespace: title.startsWith('קטגוריה:') ? 14 : 0,
    url: `https://wiki.red-fans.com/index.php?title=${encodeURIComponent(title)}`,
    revisionId: 4242,
    fetchedAt: '2026-09-02T00:00:00.000Z',
    contentHash: 'abc123',
    format: 'wikitext',
    sourceText,
  }
}

/* ---------------------------------------------------------------- titles */

describe('כותרות — the wiki states the shape in the title', () => {
  it('reads a season from every page family the brief names', () => {
    expect(seasonFromTitle('לוח משחקים (כדורגל) 1980/81')).toBe('1980/81')
    expect(seasonFromTitle('עונת 1981/82 (כדורגל) מחזור 12')).toBe('1981/82')
    expect(seasonFromTitle('קטגוריה:סגל הפועל ת"א (כדורגל) 1982/83')).toBe('1982/83')
    expect(seasonFromTitle('מילון בלומפילד השלם')).toBeNull()
  })

  it('keeps the stage in the source\'s own words', () => {
    // Normalising it would merge two different matches: the stage is part of the key.
    expect(stageFromTitle('עונת 1980/81 (כדורגל) מחזור 12')).toBe('מחזור 12')
    expect(stageFromTitle('עונת 1982/83 (כדורגל) גביע המדינה גמר')).toBe('גביע המדינה גמר')
    expect(stageFromTitle('עונת 1980/81 (כדורגל)')).toBeNull()
  })

  it('routes a page to a parser by its title', () => {
    expect(classifyPage('לוח משחקים (כדורגל) 1980/81')).toBe('schedule')
    expect(classifyPage('קטגוריה:סגל הפועל ת"א (כדורגל) 1980/81')).toBe('squad-category')
    expect(classifyPage('עונת 1980/81 (כדורגל) מחזור 12')).toBe('match-round')
    expect(classifyPage('עונת 1980/81 (כדורגל)')).toBe('season')
    expect(classifyPage('קטגוריה:תמונות')).toBe('other')
  })

  it('takes the competition from the title when the title names one', () => {
    const cup = matchContextFromTitle('עונת 1982/83 (כדורגל) גביע המדינה גמר', 'ליגה-לאומית')
    expect(cup?.competitionSlug).toContain('גביע')
    const league = matchContextFromTitle('עונת 1980/81 (כדורגל) מחזור 3', 'ליגה-לאומית')
    expect(league?.competitionSlug).toBe('ליגה-לאומית')
    expect(league?.stage).toBe('מחזור 3')
  })
})

/* ------------------------------------------------------- schedule table */

const SCHEDULE_BOTH_CLUBS = `
{| class="wikitable"
! תאריך !! מפעל !! מחזור !! בית !! חוץ !! תוצאה !! מבקיעים !! אצטדיון
|-
| 25.10.1980 || ליגה לאומית || מחזור 4 || קבוצה אלף || קבוצה בית || 2:1 || פלוני 34', אלמוני || אצטדיון אלף
|-
| 1.11.1980 || ליגה לאומית || מחזור 5 || קבוצה גימל || קבוצה אלף || 0:0 ||  || אצטדיון גימל
|}
`

describe('לוח משחקים — the season schedule', () => {
  it('reads a row into a match, a date, a stage, both clubs and a result', () => {
    const report = new IngestReport('test')
    const out = parseSchedulePage(page('לוח משחקים (כדורגל) 1980/81', SCHEDULE_BOTH_CLUBS), report)

    expect(out.matches).toHaveLength(2)
    const first = out.matches[0]!
    expect(first.seasonLabel).toBe('1980/81')
    expect(first.playedOn).toBe('1980-10-25')
    expect(first.stage).toBe('מחזור 4')
    expect(first.homeScore).toBe(2)
    expect(first.awayScore).toBe(1)
    expect(first.status).toBe('played')
    expect(first.venueSlug).not.toBeNull()
    expect(first.wikiPage).toBe('לוח משחקים (כדורגל) 1980/81')
    // provenance is not optional (rule 2)
    expect(first.source.revisionId).toBe(4242)
    expect(first.confidence).toBe(1)
  })

  it('keys every match on sport|season|competition|home|away|stage', () => {
    const report = new IngestReport('test')
    const out = parseSchedulePage(page('לוח משחקים (כדורגל) 1980/81', SCHEDULE_BOTH_CLUBS), report)
    for (const match of out.matches) {
      expect(match.naturalKey.split('|')).toHaveLength(6)
      expect(match.naturalKey.startsWith('football|1980/81|')).toBe(true)
    }
    // two rounds against different clubs are two different matches
    expect(new Set(out.matches.map((m) => m.naturalKey)).size).toBe(out.matches.length)
  })

  it('resolves columns by header text, never by position', () => {
    // The same table with a column inserted must produce the same values. Positional
    // reading is how a scraped table goes quietly wrong instead of loudly breaking.
    const shifted = SCHEDULE_BOTH_CLUBS.replace('! תאריך', '! הערות !! תאריך').replace(
      /\| 25\.10\.1980/,
      '| — || 25.10.1980',
    )
    const report = new IngestReport('test')
    const out = parseSchedulePage(page('לוח משחקים (כדורגל) 1980/81', shifted), report)
    expect(out.matches[0]?.playedOn).toBe('1980-10-25')
  })

  it('derives home and away from a marker when the table names only the opponent', () => {
    const oneSided = `
{| class="wikitable"
! תאריך !! מפעל !! מחזור !! יריבה !! מקום !! תוצאה
|-
| 8.11.1980 || ליגה לאומית || מחזור 6 || קבוצה דלת || חוץ || 1:3
|}
`
    const report = new IngestReport('test')
    const out = parseSchedulePage(page('לוח משחקים (כדורגל) 1980/81', oneSided), report)
    expect(out.matches).toHaveLength(1)
    expect(out.matches[0]!.awayClubSlug).toContain('הפועל')
    expect(out.matches[0]!.homeClubSlug).not.toContain('הפועל')
  })

  it('skips a row rather than guessing which side was at home', () => {
    // Defaulting to home would invent the half of a match's identity that decides
    // which fixture it even is.
    const ambiguous = `
{| class="wikitable"
! תאריך !! מפעל !! מחזור !! יריבה !! תוצאה
|-
| 8.11.1980 || ליגה לאומית || מחזור 6 || קבוצה דלת || 1:3
|}
`
    const report = new IngestReport('test')
    const out = parseSchedulePage(page('לוח משחקים (כדורגל) 1980/81', ambiguous), report)
    expect(out.matches).toHaveLength(0)
    expect(report.skipped.some((row) => row.reason.includes('home/away'))).toBe(true)
  })

  it('keeps a match whose date is unreadable, and names the loss', () => {
    const badDate = SCHEDULE_BOTH_CLUBS.replace('25.10.1980', 'ללא תאריך')
    const report = new IngestReport('test')
    const out = parseSchedulePage(page('לוח משחקים (כדורגל) 1980/81', badDate), report)
    expect(out.matches).toHaveLength(2)
    expect(out.matches[0]!.playedOn).toBeNull()
  })

  it('reports a table it cannot read instead of returning nothing quietly', () => {
    const report = new IngestReport('test')
    const out = parseSchedulePage(
      page('לוח משחקים (כדורגל) 1980/81', '{| class="wikitable"\n! עמודה\n|-\n| ערך\n|}'),
      report,
    )
    expect(out.matches).toHaveLength(0)
    expect(report.rejected.length + report.skipped.length).toBeGreaterThan(0)
  })
})

/* ------------------------------------------------------------- scorers */

describe('מבקיעים — goals from a schedule cell', () => {
  const source = { naturalKey: 's', kind: 'wiki' as const, title: 't', url: null, pageTitle: null, revisionId: null, retrievedAt: null, note: null }

  it('reads a name and a minute', () => {
    const events = parseScorerCell("פלוני 34'", 'k', source)
    expect(events).toHaveLength(1)
    expect(events[0]!.minute).toBe(34)
    expect(events[0]!.type).toBe('goal')
  })

  it('never invents a minute', () => {
    expect(parseScorerCell('פלוני', 'k', source)[0]!.minute).toBeNull()
  })

  it('expands a multiplier into that many goals', () => {
    const events = parseScorerCell('אלמוני (4)', 'k', source)
    expect(events).toHaveLength(4)
    expect(new Set(events.map((e) => e.seq)).size).toBe(4)
  })

  it('leaves the club NULL — a scorers cell does not say whose they are', () => {
    for (const event of parseScorerCell("פלוני 12', אלמוני 80'", 'k', source)) {
      expect(event.clubSlug).toBeNull()
    }
  })

  it('reads nothing from an empty cell', () => {
    expect(parseScorerCell(null, 'k', source)).toEqual([])
    expect(parseScorerCell('  ', 'k', source)).toEqual([])
  })
})

/* ------------------------------------------------------ squad category */

describe('קטגוריית סגל — a squad is a set of pages', () => {
  it('turns category membership into squad rows for the season in the title', () => {
    const report = new IngestReport('test')
    const rows = parseSquadCategory(
      page('קטגוריה:סגל הפועל ת"א (כדורגל) 1980/81', ''),
      ['שחקן אלף', 'שחקן בית', 'שחקן גימל'],
      report,
    )
    expect(rows).toHaveLength(3)
    expect(rows.every((row) => row.seasonLabel === '1980/81')).toBe(true)
    expect(rows.every((row) => row.clubSlug === 'הפועל-תל-אביב')).toBe(true)
  })

  it('states only what a category states — no number, no position', () => {
    const report = new IngestReport('test')
    const rows = parseSquadCategory(
      page('קטגוריה:סגל הפועל ת"א (כדורגל) 1981/82', ''),
      ['שחקן אלף'],
      report,
    )
    expect(rows[0]!.shirtNumber).toBeNull()
    expect(rows[0]!.position).toBe('UNK')
    expect(rows[0]!.appearances).toBeNull()
  })

  it('drops sub-categories and files, and reports them', () => {
    const report = new IngestReport('test')
    const rows = parseSquadCategory(
      page('קטגוריה:סגל הפועל ת"א (כדורגל) 1982/83', ''),
      ['שחקן אלף', 'קטגוריה:תמונות', 'קובץ:תמונה.jpg', 'תבנית:סגל'],
      report,
    )
    expect(rows).toHaveLength(1)
    expect(report.skipped).toHaveLength(3)
  })

  it('never lists the same player twice', () => {
    const report = new IngestReport('test')
    const rows = parseSquadCategory(
      page('קטגוריה:סגל הפועל ת"א (כדורגל) 1980/81', ''),
      ['שחקן אלף', 'שחקן אלף'],
      report,
    )
    expect(rows).toHaveLength(1)
  })
})

/* --------------------------------------------------- canonical match id */

describe('מזהה קנוני — stable across a correction', () => {
  const key = (competition: string): MatchNaturalKey =>
    matchNaturalKey({
      sport: 'football',
      seasonLabel: '1980/81',
      competitionSlug: competition,
      homeClubSlug: 'הפועל-תל-אביב',
      awayClubSlug: 'קבוצה-אלף',
      stage: 'מחזור 4',
    })

  it('mints one id per natural key, and is stable across calls', () => {
    const registry: MatchIdEntry[] = []
    const a = mintMatchId(registry, key('ליגה-לאומית'), 'football')
    const b = mintMatchId(registry, key('ליגה-לאומית'), 'football')
    expect(a.minted).toBe(true)
    expect(b.minted).toBe(false)
    expect(b.id).toBe(a.id)
    expect(isCanonicalMatchId(a.id)).toBe(true)
    expect(registry).toHaveLength(1)
  })

  it('keeps the id when the natural key is corrected — the whole point', () => {
    // A saved life stores the id. Renaming a competition slug must not orphan a memory.
    const registry: MatchIdEntry[] = []
    const before = mintMatchId(registry, key('ליגה-לאומית'), 'football').id
    expect(recordKeyCorrection(registry, before, key('הליגה-הלאומית'))).toBe(true)

    expect(registry).toHaveLength(1)
    expect(registry[0]!.id).toBe(before)
    // the corrected key resolves…
    expect(idForNaturalKey(registry, key('הליגה-הלאומית'))).toBe(before)
    // …and so does the superseded one, so re-importing the old source is not a duplicate
    expect(idForNaturalKey(registry, key('ליגה-לאומית'))).toBe(before)
  })

  it('refuses a correction to an id nobody minted', () => {
    expect(recordKeyCorrection([], 'm_000000000000' as never, key('x'))).toBe(false)
  })

  it('separates the sports — a club slug is unique only within one', () => {
    const football = matchNaturalKey({
      sport: 'football',
      seasonLabel: '1980/81',
      competitionSlug: 'ליגה',
      homeClubSlug: 'הפועל-תל-אביב',
      awayClubSlug: 'יריבה',
      stage: null,
    })
    const basketball = matchNaturalKey({
      sport: 'basketball',
      seasonLabel: '1980/81',
      competitionSlug: 'ליגה',
      homeClubSlug: 'הפועל-תל-אביב',
      awayClubSlug: 'יריבה',
      stage: null,
    })
    expect(football).not.toBe(basketball)
    const registry: MatchIdEntry[] = []
    const a = mintMatchId(registry, football, 'football')
    const b = mintMatchId(registry, basketball, 'basketball')
    expect(a.id).not.toBe(b.id)
    expect(registry).toHaveLength(2)
  })
})

/* --------------------------------------------------------- the bridge */

function corpusPage(title: string, sourceText: string, links: string[] = []): WikiPageRecord {
  return {
    pageId: Math.abs([...title].reduce((n, c) => n * 31 + c.charCodeAt(0), 7)) % 100000,
    title,
    namespace: title.startsWith('קטגוריה:') ? 14 : 0,
    // The field is `sourceText`, not the provider's word for it: `WikiPageRecord` is a
    // `RawPage` and the adapter is the only file allowed to know what MediaWiki calls
    // things. A fixture written in the provider's vocabulary is how a suite goes on
    // passing against a shape the code stopped producing.
    sourceText,
    format: 'wikitext',
    contentHash: 'h',
    contentModel: 'wikitext',
    isRedirect: false,
    redirectTo: null,
    byteSize: sourceText.length,
    revisionId: 1,
    revTimestamp: null,
    revUser: null,
    revComment: null,
    categories: [],
    links,
    images: [],
    url: `https://wiki.red-fans.com/${title}`,
    fetchedAt: '2026-09-02T00:00:00.000Z',
  }
}

describe('הגשר — corpus on disk becomes canonical rows', () => {
  const corpus = [
    corpusPage('לוח משחקים (כדורגל) 1980/81', SCHEDULE_BOTH_CLUBS),
    corpusPage('קטגוריה:סגל הפועל ת"א (כדורגל) 1980/81', '', ['שחקן אלף', 'שחקן בית']),
    corpusPage('עונת 1980/81 (כדורגל)', 'עונת 1980/81 של הפועל תל אביב בכדורגל.'),
    corpusPage('מילון בלומפילד השלם', 'מונחים ביציע.'),
    // A basketball squad category, in the football corpus. Rule 6 must stop it.
    corpusPage('קטגוריה:סגל הפועל ת"א (כדורסל) 1980/81', '', ['כדורסלן אלף']),
  ]

  it('routes every page and produces canonical rows without a network call', () => {
    const result = canonFromCorpus(corpus, { seasons: ['1980/81'] })
    expect(result.bundle.matches.length).toBe(2)
    expect(result.bundle.matchEvents.length).toBeGreaterThan(0)
    expect(result.bundle.squadMemberships.length).toBe(2)
    expect(result.bundle.seasons.length).toBe(1)
    expect(result.shapes.other).toBeGreaterThan(0)
  })

  it('mints a stable id for every match it produced', () => {
    const result = canonFromCorpus(corpus, { seasons: ['1980/81'] })
    expect(result.matchIds.size).toBe(result.bundle.matches.length)
    for (const id of result.matchIds.values()) expect(isCanonicalMatchId(id)).toBe(true)
  })

  it('honours the season filter', () => {
    const result = canonFromCorpus(corpus, { seasons: ['1999/00'] })
    expect(result.bundle.matches).toHaveLength(0)
    expect(result.bundle.squadMemberships).toHaveLength(0)
  })

  it('is idempotent — a second pass mints nothing new', () => {
    const registry: MatchIdEntry[] = []
    const first = canonFromCorpus(corpus, { seasons: ['1980/81'], registry })
    const second = canonFromCorpus(corpus, { seasons: ['1980/81'], registry })
    expect(first.minted).toBeGreaterThan(0)
    expect(second.minted).toBe(0)
    expect([...first.matchIds.values()]).toEqual([...second.matchIds.values()])
  })

  it('refuses a basketball squad category in the football walk (rule 6)', () => {
    // The first version gated the schedule and season pages and let squad categories
    // through unchecked — a basketball player walked into the football squad on the
    // strength of eleven characters in a page title.
    const result = canonFromCorpus(corpus, { seasons: ['1980/81'] })
    for (const row of result.bundle.squadMemberships) {
      expect(row.personSlug).not.toContain('כדורסלן')
    }
    expect(result.report.rejected.some((r) => r.reason.includes('basketball'))).toBe(true)
  })

  it('maps a corpus record onto what the parsers read', () => {
    const raw = toRawPage(corpus[0]!)
    expect(raw.sourceText).toContain('wikitable')
    expect(raw.title).toBe('לוח משחקים (כדורגל) 1980/81')
  })

  it('decodes a stored page instead of casting it, so provenance survives the disk', () => {
    // What the dry run writes under `data/wiki-corpus/pages` is the TABLE's shape —
    // `content_hash`, `fetched_at`, `page_id`. `readCorpus` used to cast that JSON to a
    // `WikiPageRecord` and hand it straight on, so every page the canon build read had
    // no hash, no fetch time, no revision id and no page id, and rule 2's provenance was
    // lost on a path where nothing could ever fail. A cast is not a conversion.
    const record = recordFromStored({
      page_id: 91,
      title: 'לוח משחקים (כדורגל) 1980/81',
      namespace: 0,
      revision_id: 7,
      wikitext: SCHEDULE_BOTH_CLUBS,
      content_hash: 'deadbeef',
      fetched_at: '2026-09-02T00:00:00.000Z',
      url: 'https://wiki.red-fans.com/x',
    })
    const raw = toRawPage(record)
    expect(raw.sourceText).toContain('wikitable')
    expect(raw.contentHash).toBe('deadbeef')
    expect(raw.fetchedAt).toBe('2026-09-02T00:00:00.000Z')
    expect(raw.revisionId).toBe(7)
    expect(raw.pageId).toBe(91)
  })
})
