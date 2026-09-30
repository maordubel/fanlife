/**
 * ויקיפועל — the parser, and the canonical files it produced.
 *
 * Two halves, and both are needed.
 *
 * The UNIT half runs on fixtures that are SHAPES: the column names, the HTML entities
 * inside JSON strings, `0` as a missing date, `x` as a neutral ground, `?` as the
 * table's own word for "not known". No club, date or result from the real source appears
 * in them — what is copied from the export is the structure the code must survive.
 *
 * The FILE half reads `content/manual/*.json` as they now stand, because the guards that
 * matter most are about the archive rather than about the function: a basketball row
 * that reached a football table, a date that was invented, a curated row that was
 * overwritten. Those are properties of the OUTPUT, and the output is what the game reads.
 */

import { describe, expect, it } from 'vitest'

import { nameOf } from '@/lib/game/archive'

import clubsFile from '@/content/manual/clubs.json'
import competitionsFile from '@/content/manual/competitions.json'
import conflictsFile from '@/content/manual/fact-conflicts.json'
import matchesFile from '@/content/manual/matches.json'
import squadsFile from '@/content/manual/squads.json'
import {
  FOOTBALL_DEPARTMENT,
  FOOTBALL_SLUG_SUFFIX,
  VIKIPOEL_SOURCE_TITLE,
  VIKIPOEL_SOURCE_URL,
  VIKIPOEL_SQUADS_SOURCE_TITLE,
  VIKIPOEL_SQUADS_SOURCE_URL,
  buildAliasIndex,
  cleanText,
  decodeEntities,
  deriveSlug,
  matchConfidence,
  neutralGroundFrom,
  parseFootballMatches,
  parseSquads,
  playedOnFrom,
  resolveAgainst,
  type VikipoelGameRow,
} from '@/scripts/ingest/sources/vikipoel-cargo'

/* ------------------------------------------------------------------ fixtures */

function game(over: Partial<VikipoelGameRow> = {}): VikipoelGameRow {
  return {
    page: '1900/01/משחקים (כדורגל)',
    ona: '1900/01',
    homegame: 1,
    host: 'מועדון הבית',
    oponent: 'קבוצה אלף',
    mifal: 'ליגה בדיונית',
    liga: 1,
    department: 'כדורגל',
    homescore: 2,
    awayscore: 1,
    shootout: null,
    result: 1,
    day: 6,
    month: 9,
    year: 1900,
    stage: 'מחזור 1',
    ...over,
  }
}

const CLUBS = [
  { slug: 'מועדון-הבית', nameHe: 'מועדון הבית', aliases: ['מועדון ב"ת'], sport: 'football' },
  { slug: 'קבוצה-אלף', nameHe: 'קבוצה אלף', sport: 'football' },
  { slug: 'סל-אלף', nameHe: 'סל אלף', sport: 'basketball' },
]
const COMPETITIONS = [
  { slug: 'ליגה-בדיונית', nameHe: 'ליגה בדיונית', sport: 'football' },
]

function run(rows: VikipoelGameRow[], curated: Parameters<typeof parseFootballMatches>[0]['curated'] = []) {
  return parseFootballMatches({ games: rows, clubs: CLUBS, competitions: COMPETITIONS, curated, usClubSlug: 'מועדון-הבית' })
}

const matches = matchesFile.records as Array<Record<string, unknown>>
const wikiMatches = matches.filter((row) => row.sourceTitle === VIKIPOEL_SOURCE_TITLE)
const curatedMatches = matches.filter((row) => row.sourceTitle !== VIKIPOEL_SOURCE_TITLE)
const squads = squadsFile.records as Array<Record<string, unknown>>
// A squad row cites the PLAYER-page export, not the match table — two reads, two
// sources (rule 2: the source named on a row has to be the one holding the fact).
const wikiSquads = squads.filter((row) => row.sourceTitle === VIKIPOEL_SQUADS_SOURCE_TITLE)

/* ------------------------------------------------------------ the raw fields */

describe('ויקיפועל — the cells', () => {
  it('decodes the export’s HTML entities once, in one place', () => {
    // `הפועל ת&quot;א` left alone is a DIFFERENT club from `הפועל ת"א`.
    expect(decodeEntities('א&quot;ב')).toBe('א"ב')
    expect(decodeEntities('א&#039;ב')).toBe("א'ב")
    expect(decodeEntities('א&amp;ב')).toBe('א&ב')
    expect(cleanText('  א&quot;ב   ג ')).toBe('א"ב ג')
  })

  it('reads `?` and the empty cell as "the source did not say", never as a value', () => {
    expect(cleanText('?')).toBeNull()
    expect(cleanText('???')).toBeNull()
    expect(cleanText('')).toBeNull()
    expect(cleanText(null)).toBeNull()
  })

  it('slugs the way content/manual writes slugs — gershayim kept', () => {
    // NOT lib/normalize.slugify(), which strips them: the curated file writes
    // `בית"ר-ירושלים` with the gershayim in it, and reading a file means using its rules.
    expect(deriveSlug('בית"ר ירושלים')).toBe('בית"ר-ירושלים')
    expect(deriveSlug('הפועל ת&quot;א')).toBe('הפועל-ת"א')
  })
})

describe('ויקיפועל — a date is never invented', () => {
  it('answers null whenever any of day/month/year is the source’s 0', () => {
    expect(playedOnFrom(game())).toBe('1900-09-06')
    expect(playedOnFrom(game({ day: 0 }))).toBeNull()
    expect(playedOnFrom(game({ month: 0 }))).toBeNull()
    expect(playedOnFrom(game({ year: 0 }))).toBeNull()
    expect(playedOnFrom(game({ day: 0, month: 0 }))).toBeNull()
  })

  it('keeps the row, reports it as undated, and guesses no day of the month', () => {
    const out = run([game({ day: 0, month: 0 })])
    expect(out.matches).toHaveLength(1)
    expect(out.matches[0]?.playedOn).toBeNull()
    expect(out.report.undated).toHaveLength(1)
    expect(out.report.undated[0]?.reason).toContain('playedOn')
  })

  it('leaves no fabricated date anywhere in the canonical file', () => {
    for (const row of wikiMatches) {
      const on = row.playedOn as string | null
      if (on === null) continue
      expect(on, JSON.stringify(row)).toMatch(/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/)
    }
    // `0` in any of the three columns must never have become `-00`.
    expect(JSON.stringify(wikiMatches)).not.toContain('-00-')
    expect(JSON.stringify(wikiMatches)).not.toContain('-00"')
  })
})

describe('ויקיפועל — home and away are never defaulted (rule 36)', () => {
  it('takes both sides from host/oponent and reads homegame only for a neutral ground', () => {
    expect(neutralGroundFrom('x')).toBe(true)
    expect(neutralGroundFrom(1)).toBe(false)
    expect(neutralGroundFrom(0)).toBe(false)
    // `?` and empty are NOT "not neutral" — they are "the source did not say".
    expect(neutralGroundFrom('?')).toBeNull()
    expect(neutralGroundFrom(null)).toBeNull()

    const out = run([game({ homegame: 'x' }), game({ stage: 'מחזור 2', homegame: '?' })])
    expect(out.matches.find((row) => row.stage === 'מחזור 1')?.neutralGround).toBe(true)
    expect(out.matches.find((row) => row.stage === 'מחזור 2')?.neutralGround).toBeNull()
    expect(out.report.groundUnrecorded).toHaveLength(1)
  })

  it('skips and reports a row that names only one side', () => {
    const out = run([game({ oponent: null }), game({ host: '' })])
    expect(out.matches).toHaveLength(0)
    expect(out.report.skipped).toHaveLength(2)
    for (const skip of out.report.skipped) expect(skip.reason).toContain('שני הצדדים')
  })
})

/* ------------------------------------------------------------ sport isolation */

describe('ויקיפועל — strict sport isolation (rules 6, 14, 38)', () => {
  it('admits only the department the wiki itself wrote, and counts the rest', () => {
    const out = run([
      game(),
      game({ department: 'כדורסל', host: 'סל אלף' }),
      game({ department: 'הפועל אוסישקין' }),
      game({ department: null }),
      game({ department: '' }),
    ])
    expect(FOOTBALL_DEPARTMENT).toBe('כדורגל')
    expect(out.matches).toHaveLength(1)
    expect(out.report.footballRows).toBe(1)
    // Counted, not silently dropped — the report says where the other four went.
    expect(out.report.byDepartment['כדורסל']).toBe(1)
    expect(out.report.byDepartment['הפועל אוסישקין']).toBe(1)
    expect(out.report.byDepartment['(אין ערך)']).toBe(2)
  })

  it('never lets a basketball club or competition into the football tables', () => {
    // `סל אלף` is a basketball row in the fixture club list, so the football alias index
    // must not contain it at all — sport-scoped aliases, rule 14.
    const index = buildAliasIndex(CLUBS, 'football')
    expect(index.byName.has('סל אלף')).toBe(false)
    expect(index.slugs.has('סל-אלף')).toBe(false)

    // And in the real archive: every club and competition a wiki match row points at has
    // a FOOTBALL row behind it. The membership is checked per sport rather than through a
    // slug→sport map, because a slug is unique only WITHIN a sport (rule 35 — the index
    // is `club (slug, sport)`) and `הפועל-תל-אביב` names two different clubs. A map keyed
    // on the slug alone answers with whichever row came last, which is how a check like
    // this one can look green while pointing at the wrong sport.
    const footballClubs = new Set(
      (clubsFile.records as Array<{ slug: string; sport?: string }>)
        .filter((row) => row.sport === 'football')
        .map((row) => row.slug),
    )
    const footballCompetitions = new Set(
      (competitionsFile.records as Array<{ slug: string; sport?: string }>)
        .filter((row) => row.sport === 'football')
        .map((row) => row.slug),
    )
    const basketballOnlyClubs = new Set(
      (clubsFile.records as Array<{ slug: string; sport?: string }>)
        .filter((row) => row.sport === 'basketball')
        .map((row) => row.slug),
    )
    for (const row of wikiMatches) {
      for (const slug of [row.homeClubSlug, row.awayClubSlug] as string[]) {
        expect(footballClubs.has(slug), slug).toBe(true)
        if (!footballClubs.has(slug)) expect(basketballOnlyClubs.has(slug), slug).toBe(false)
      }
      expect(
        footballCompetitions.has(row.competitionSlug as string),
        String(row.competitionSlug),
      ).toBe(true)
    }
  })

  it('reads the squad’s sport out of the category that carries its season (rule 37)', () => {
    const out = parseSquads({
      players: [
        {
          title: 'שחקן בדיוני',
          categories: [
            { title: 'קטגוריה:סגל הפועל ת"א (כדורגל) 1900/01' },
            { title: 'קטגוריה:סגל הפועל ת"א (כדורסל) 1900/01' },
            { title: 'קטגוריה:שחקני הפועל תל אביב (כדורגל)' },
          ],
        },
      ],
      curated: [],
      people: [],
      playerFacts: [],
      clubSlug: 'מועדון-הבית',
    })
    expect(out.squads).toHaveLength(1)
    expect(out.report.bySport['כדורסל']).toBe(1)
    expect(out.report.footballCategories).toBe(1)

    // And in the real file: every wiki squad row is on the football club.
    for (const row of wikiSquads) expect(row.clubSlug).toBe('הפועל-תל-אביב')
  })
})

/* ----------------------------------------------------------------- confidence */

describe('ויקיפועל — confidence 2 means COMPLETE, and nothing less', () => {
  const full = {
    playedOn: '1900-09-06',
    homeClubSlug: 'a',
    awayClubSlug: 'b',
    homeScore: 1,
    awayScore: 0,
    competitionSlug: 'c',
  }

  it('is 2 only with a full date, both clubs, both scores and a competition', () => {
    expect(matchConfidence(full)).toBe(2)
    expect(matchConfidence({ ...full, playedOn: null })).toBe(1)
    expect(matchConfidence({ ...full, homeClubSlug: null })).toBe(1)
    expect(matchConfidence({ ...full, awayClubSlug: null })).toBe(1)
    expect(matchConfidence({ ...full, homeScore: null })).toBe(1)
    expect(matchConfidence({ ...full, awayScore: null })).toBe(1)
    expect(matchConfidence({ ...full, competitionSlug: null })).toBe(1)
  })

  it('applies that rule to the rows it writes', () => {
    const out = run([game(), game({ stage: 'מחזור 2', day: 0 }), game({ stage: 'מחזור 3', homescore: '?' })])
    const byStage = new Map(out.matches.map((row) => [row.stage, row]))
    expect(byStage.get('מחזור 1')?.confidence).toBe(2)
    expect(byStage.get('מחזור 2')?.confidence).toBe(1)
    expect(byStage.get('מחזור 3')?.confidence).toBe(1)
    // A row with no score is not `played`, and the status comes from the vocabulary
    // `content/manual/matches.json` already uses.
    expect(byStage.get('מחזור 3')?.status).toBe('unknown')
    expect(byStage.get('מחזור 1')?.status).toBe('played')
  })

  it('holds for every wiki row in the canonical file', () => {
    for (const row of wikiMatches) {
      const complete =
        row.playedOn !== null &&
        row.homeScore !== null &&
        row.awayScore !== null &&
        typeof row.homeClubSlug === 'string' &&
        typeof row.awayClubSlug === 'string' &&
        typeof row.competitionSlug === 'string'
      expect(row.confidence, JSON.stringify(row)).toBe(complete ? 2 : 1)
      if (row.homeScore === null || row.awayScore === null) expect(row.status).not.toBe('played')
    }
  })

  it('puts a named source on every row it writes (rule 2)', () => {
    for (const row of wikiMatches) {
      expect(row.sourceTitle).toBe(VIKIPOEL_SOURCE_TITLE)
      expect(row.sourceUrl).toBe(VIKIPOEL_SOURCE_URL)
    }
    for (const row of wikiSquads) {
      expect(row.sourceTitle).toBe(VIKIPOEL_SQUADS_SOURCE_TITLE)
      expect(row.sourceUrl).toBe(VIKIPOEL_SQUADS_SOURCE_URL)
    }
    // And the two never swap: no match row cites the player export and no squad row
    // cites the match table.
    for (const row of wikiMatches) expect(row.sourceTitle).not.toBe(VIKIPOEL_SQUADS_SOURCE_TITLE)
  })
})

/* ------------------------------------------------------- curated rows survive */

describe('ויקיפועל — a curated row is never overwritten', () => {
  // The 33 rows in `matches.json` were verified against a named source one at a time,
  // most at confidence 2 with a real `sourceUrl`. The wiki is one unreviewed table. The
  // curated row wins the slot, and it wins it byte-identically: this is the list, frozen.
  const CURATED = 33

  it('keeps all 33, first, unchanged', () => {
    expect(curatedMatches).toHaveLength(CURATED)
    // They lead the file, in their original order — a reader of the diff can see at a
    // glance that nothing above line N moved.
    expect(matches.slice(0, CURATED)).toEqual(curatedMatches)
    for (const row of curatedMatches) {
      expect(row.sourceTitle).not.toBe(VIKIPOEL_SOURCE_TITLE)
      expect(typeof row.sourceTitle).toBe('string')
    }
  })

  it('drops the wiki row for a match a curated row already holds', () => {
    const curated = [
      {
        seasonLabel: '1900/01',
        competitionSlug: 'ליגה-בדיונית',
        stage: 'מחזור 1',
        playedOn: '1900-09-06',
        homeClubSlug: 'מועדון-הבית',
        awayClubSlug: 'קבוצה-אלף',
        homeScore: 2,
        awayScore: 1,
        sourceTitle: 'מקור מתועד בדיוני',
        sourceUrl: 'https://example.invalid/',
      },
    ]
    const out = run([game()], curated)
    expect(out.matches).toHaveLength(0)
    expect(out.report.curatedWins).toHaveLength(1)
    // Same facts, so nothing to record.
    expect(out.conflicts).toHaveLength(0)
  })

  it('keeps 27 curated squad rows and does not write a 2026/27 name twice', () => {
    const curatedSquads = squads.filter((row) => row.sourceTitle !== VIKIPOEL_SQUADS_SOURCE_TITLE)
    expect(curatedSquads).toHaveLength(27)
    expect(squads.slice(0, 27)).toEqual(curatedSquads)
    const seen = new Set<string>()
    for (const row of squads) {
      const key = `${row.personName as string}|${row.seasonLabel as string}|${row.clubSlug as string}`
      expect(seen.has(key), key).toBe(false)
      seen.add(key)
    }
  })
})

/* --------------------------------------------------------------- conflicts */

describe('ויקיפועל — a disagreement is recorded, never resolved (rule 60 §3)', () => {
  it('records the score both sources state and picks neither', () => {
    const curated = [
      {
        seasonLabel: '1900/01',
        competitionSlug: 'ליגה-בדיונית',
        stage: 'מחזור 1',
        playedOn: '1900-09-06',
        homeClubSlug: 'מועדון-הבית',
        awayClubSlug: 'קבוצה-אלף',
        homeScore: 3,
        awayScore: 3,
        sourceTitle: 'מקור מתועד בדיוני',
        sourceUrl: 'https://example.invalid/',
      },
    ]
    const out = run([game()], curated)
    const score = out.conflicts.find((row) => row.field === 'score')
    expect(score).toBeDefined()
    expect(score?.claimA).toContain('3:3')
    expect(score?.claimB).toContain('2:1')
    expect(score?.resolution).toBeNull()
    // The curated row still wins the slot. Recording is not resolving.
    expect(out.matches).toHaveLength(0)
  })

  it('records the competition rather than folding ליגה לאומית into ליגת-העל', () => {
    const curated = [
      {
        seasonLabel: '1900/01',
        competitionSlug: 'מפעל-אחר',
        stage: 'מחזור 1',
        playedOn: '1900-09-06',
        homeClubSlug: 'מועדון-הבית',
        awayClubSlug: 'קבוצה-אלף',
        homeScore: 2,
        awayScore: 1,
        sourceTitle: 'מקור מתועד בדיוני',
        sourceUrl: null,
      },
    ]
    const out = run([game()], curated)
    expect(out.conflicts.some((row) => row.field === 'competition')).toBe(true)
  })

  it('has recorded the four the owner measured, and every one it found', () => {
    const rows = conflictsFile.records as Array<Record<string, unknown>>
    const ours = rows.filter((row) => row.sourceBUrl === VIKIPOEL_SOURCE_URL)
    expect(ours.length).toBeGreaterThanOrEqual(4)

    // Measured by hand before this parser existed. If a future change to the club or
    // competition resolution stops the overlap check seeing one of these matches, the
    // conflict disappears silently — and that is exactly what this list prevents.
    for (const date of ['1962-10-13', '1995-08-08', '1995-08-22', '1998-05-02']) {
      expect(
        ours.some((row) => String(row.entityKey).startsWith(date)),
        `no conflict recorded for ${date}`,
      ).toBe(true)
    }

    for (const row of ours) {
      expect(row.entityTable).toBe('match')
      // open, or decided out loud: a resolution names its decider and carries structured decisions (delta 89)
      if (row.resolution !== null && row.resolution !== undefined) {
        expect(String(row.resolution), String(row.entityKey)).toMatch(/^הוכרע/)
        expect(String(row.resolvedBy ?? ''), String(row.entityKey)).not.toBe('')
      } else expect(row.resolution ?? null, String(row.entityKey)).toBeNull()
      expect(String(row.claimA).length).toBeGreaterThan(0)
      expect(String(row.claimB).length).toBeGreaterThan(0)
      expect(row.claimA).not.toBe(row.claimB)
    }

    // And no wiki match row survives for a date a conflict was recorded on — the curated
    // row won that slot, which is what makes the conflict a conflict and not a duplicate.
    // (A row whose claim A is UEFA's own match record is a delta-89 decision ABOUT a Games row —
    // the 1996 Intertoto dates — not a slot a curated row won, so it is not in this check.)
    const conflicted = new Set(
      ours.filter((row) => !String(row.sourceAUrl ?? '').startsWith('https://match.uefa.com/')).map((row) => String(row.entityKey).slice(0, 10)),
    )
    for (const row of wikiMatches) {
      if (row.playedOn && conflicted.has(row.playedOn as string)) {
        expect.unreachable(`a wiki row survived on ${String(row.playedOn)}, where a curated row won`)
      }
    }
  })
})

/* ------------------------------------------------------- alias-based resolution */

describe('ויקיפועל — clubs and competitions resolve through aliases, never fuzzily (rule 7)', () => {
  it('matches slug, nameHe, nameEn and aliases, and nothing else', () => {
    const index = buildAliasIndex(
      [{ slug: 'מועדון-הבית', nameHe: 'מועדון הבית', nameEn: 'Home Club', aliases: ['מועדון ב"ת'], sport: 'football' }],
      'football',
    )
    for (const name of ['מועדון-הבית', 'מועדון הבית', 'Home Club', 'מועדון ב"ת']) {
      expect(resolveAgainst(index, name)?.resolved, name).toBe(true)
      expect(resolveAgainst(index, name)?.slug).toBe('מועדון-הבית')
    }
    // A near miss is a MINT, not a merge. No prefix rule, no edit distance, no
    // "same first word": these all look like the club above and none of them is it.
    for (const name of ['מועדון הבית ב', 'מועדון', 'מועדון הביתי', 'Home Clu']) {
      const found = resolveAgainst(index, name)
      expect(found?.resolved, name).toBe(false)
      expect(found?.slug).toBe(deriveSlug(name))
    }
  })

  it('applies the space→hyphen slug convention to BOTH sides before comparing', () => {
    // The archive writes `בני-יהודה` and the wiki writes `בני יהודה`. They differ only
    // by the substitution that DEFINES a slug here, so this is comparing like with like
    // rather than matching loosely — and it is what stops a second `בני-יהודה` appearing.
    const index = buildAliasIndex([{ slug: 'בני-יהודה', nameHe: 'בני יהודה תל אביב', sport: 'football' }], 'football')
    const found = resolveAgainst(index, 'בני יהודה')
    expect(found?.resolved).toBe(true)
    expect(found?.slug).toBe('בני-יהודה')
  })

  it('mints an unknown name at confidence 1 with its own name as an alias', () => {
    const out = run([game({ oponent: 'קבוצה בית' }), game({ stage: 'מחזור 2', oponent: 'קבוצה בית' })])
    expect(out.mintedClubs).toHaveLength(1)
    const minted = out.mintedClubs[0]
    expect(minted?.slug).toBe('קבוצה-בית')
    expect(minted?.nameHe).toBe('קבוצה בית')
    expect(minted?.sport).toBe('football')
    expect(minted?.confidence).toBe(1)
    expect(minted?.aliases).toContain('קבוצה בית')
    expect(minted?.sourceTitle).toBe(VIKIPOEL_SOURCE_TITLE)
    // Reported with its row count, so a minted club is a question somebody can answer.
    expect(out.report.clubsMinted.find((row) => row.slug === 'קבוצה-בית')?.rows).toBe(2)

    // An alias list that already knows the minted name resolves it on the next run —
    // which is what makes the script idempotent rather than doubling the file.
    const again = parseFootballMatches({
      games: [game({ oponent: 'קבוצה בית' })],
      clubs: [...CLUBS, minted as never],
      competitions: COMPETITIONS,
      curated: [],
    })
    expect(again.mintedClubs).toHaveLength(0)
  })

  it('never folds ליגה לאומית into ליגת-העל — it mints it', () => {
    // Two competitions in two eras. Merging them would make "how many titles" a question
    // with no answer, so the wiki's name is minted and the archive's stays untouched.
    const index = buildAliasIndex(
      [{ slug: 'ליגת-העל', nameHe: 'ליגת העל', aliases: ['הליגה הלאומית'], sport: 'football' }],
      'football',
    )
    const found = resolveAgainst(index, 'ליגה לאומית')
    expect(found?.resolved).toBe(false)
    expect(found?.slug).toBe('ליגה-לאומית')

    const comps = competitionsFile.records as Array<{ slug: string; nameHe: string }>
    expect(comps.some((row) => row.slug === 'ליגה-לאומית')).toBe(true)
    expect(comps.some((row) => row.slug === 'ליגת-העל')).toBe(true)
    expect(comps.filter((row) => row.slug === 'ליגה-לאומית')).toHaveLength(1)
  })

  it('mints a competition type only from the source’s own `liga` flag', () => {
    const out = run([
      game({ mifal: 'ליגה חדשה', liga: 1 }),
      game({ mifal: 'גביע חדש', liga: 0, stage: 'גמר' }),
    ])
    const league = out.mintedCompetitions.find((row) => row.slug === 'ליגה-חדשה')
    const cup = out.mintedCompetitions.find((row) => row.slug === 'גביע-חדש')
    expect(league?.type).toBe('league')
    // A cup's subtype is never read off its Hebrew name, so it gets no `type` at all.
    expect(cup?.type).toBeUndefined()
  })

  it('leaves no wiki row pointing at a slug no file knows', () => {
    const clubSlugs = new Set((clubsFile.records as Array<{ slug: string }>).map((row) => row.slug))
    const compSlugs = new Set((competitionsFile.records as Array<{ slug: string }>).map((row) => row.slug))
    for (const row of wikiMatches) {
      expect(clubSlugs.has(row.homeClubSlug as string), String(row.homeClubSlug)).toBe(true)
      expect(clubSlugs.has(row.awayClubSlug as string), String(row.awayClubSlug)).toBe(true)
      expect(compSlugs.has(row.competitionSlug as string), String(row.competitionSlug)).toBe(true)
    }
  })

  it('never lets a minted slug reach a screen as a club\u2019s name', () => {
    // `nameOf.club` falls through to the slug when it does not know one, and a minted
    // slug is the club's name with hyphens in it — so before this delta the bank was
    // asking "כמה שערים הבקיעה הפועל תל אביב בחוץ מול מכבי-פ"ת". The club rows stay at
    // confidence 1 and stay out of `archive.clubs`; only the NAME is resolvable, and
    // this is the guard that says so.
    const nameBySlug = new Map(
      (clubsFile.records as Array<{ slug: string; nameHe: string; sport?: string }>)
        .filter((row) => row.sport === 'football')
        .map((row) => [row.slug, row.nameHe]),
    )
    for (const row of wikiMatches) {
      for (const slug of [row.homeClubSlug, row.awayClubSlug] as string[]) {
        expect(nameOf.club(slug), slug).toBe(nameBySlug.get(slug))
      }
      expect(nameOf.competition(row.competitionSlug as string)).not.toBe(row.competitionSlug)
    }
  })

  it('has a unique slug per sport, and a unique FOOTBALL slug', () => {
    for (const file of [clubsFile, competitionsFile]) {
      const rows = file.records as Array<{ slug: string; sport?: string }>
      const scoped = rows.map((row) => `${row.slug}|${row.sport ?? ''}`)
      expect(new Set(scoped).size, scoped.length.toString()).toBe(scoped.length)
      // And within football on its own, because every lookup in `lib/game` is keyed on
      // the slug alone — a second football row with the same slug would make which name
      // gets printed depend on file order.
      const football = rows.filter((row) => row.sport === 'football').map((row) => row.slug)
      expect(new Set(football).size, football.length.toString()).toBe(football.length)
    }
  })
})

/* -------------------------------------------------------------------- squads */

describe('ויקיפועל — a squad row carries no shirt number (rule 37)', () => {
  it('leaves shirtNumber null on every row it reads from a player page', () => {
    // `מספר בהפועל` is ONE value on a page covering many seasons. Writing it into every
    // season would state many facts from one, and would let two players "share" a number
    // they never shared. Every wiki row keeps null; the curated 2026/27 sheet does not,
    // because that sheet states a number per player for one season.
    expect(wikiSquads.length).toBeGreaterThan(1000)
    for (const row of wikiSquads) expect(row.shirtNumber, JSON.stringify(row)).toBeNull()
  })

  it('takes position from player-facts by exact name, and nothing from a guess', () => {
    const out = parseSquads({
      players: [
        { title: 'שחקן ידוע', categories: [{ title: 'קטגוריה:סגל הפועל ת"א (כדורגל) 1900/01' }] },
        { title: 'שחקן אלמוני', categories: [{ title: 'קטגוריה:סגל הפועל ת"א (כדורגל) 1900/01' }] },
      ],
      curated: [],
      people: [{ slug: 'שחקן-ידוע', fullNameHe: 'שחקן ידוע' }],
      playerFacts: [{ personNameHe: 'שחקן ידוע', position: 'MF', sport: 'football' }],
      clubSlug: 'מועדון-הבית',
    })
    const byName = new Map(out.squads.map((row) => [row.personName, row]))
    expect(byName.get('שחקן ידוע')?.position).toBe('MF')
    expect(byName.get('שחקן אלמוני')?.position).toBeNull()
    // `player-facts.json` records `origin`, not a nationality, so this is null rather
    // than a country inferred from a gentilic category.
    expect(byName.get('שחקן ידוע')?.nationalityHe).toBeNull()
    expect(out.report.playersWithoutFacts).toContain('שחקן אלמוני')
  })

  it('reports a season label it cannot read instead of correcting the source', () => {
    const out = parseSquads({
      players: [
        {
          title: 'שחקן בדיוני',
          categories: [
            { title: 'קטגוריה:סגל הפועל ת"א (כדורגל) 1966-68' },
            { title: 'קטגוריה:סגל הפועל ת"א (כדורגל) 1955' },
          ],
        },
      ],
      curated: [],
      people: [],
      playerFacts: [],
    })
    expect(out.squads).toHaveLength(0)
    expect(out.report.skipped).toHaveLength(2)
    // Both are refused by the archive's OWN canonicaliser, which is the same gate the
    // seed importer runs over `content/manual` — so a label that reaches the file can
    // always be loaded. Neither is a typo: `1955` is a calendar-year season and
    // `1966-68` is the Israeli league season that ran across two calendar years, which
    // a `YYYY/YY` label cannot express at all. Reported, not rewritten (rule 11).
    for (const skip of out.report.skipped) expect(skip.reason).toContain('אינו יכול להחזיק')
    expect(out.report.skipped.map((row) => row.reason).join(' ')).toContain('1966-68')
    expect(out.report.skipped.map((row) => row.reason).join(' ')).toContain('1955')
  })

  it('mints a football club off a slug another sport already holds', () => {
    // `clubs.json` has a BASKETBALL `הפועל-גבעתיים`; the wiki's football `הפועל גבעתיים`
    // plays 37 fixtures. One slug for both would let `pipeline.ts` — which merges clubs
    // on the slug alone — collapse them into one row of one sport, which is rule 6's
    // exact prohibition. The file's own precedent is a sport-suffixed slug.
    const withBasketball = [...CLUBS, { slug: 'קבוצה-בית', nameHe: 'קבוצה בית (סל)', sport: 'basketball' }]
    const out = parseFootballMatches({
      games: [game({ oponent: 'קבוצה בית' })],
      clubs: withBasketball,
      competitions: COMPETITIONS,
      curated: [],
      usClubSlug: 'מועדון-הבית',
    })
    expect(out.mintedClubs[0]?.slug).toBe(`קבוצה-בית${FOOTBALL_SLUG_SUFFIX}`)
    expect(out.mintedClubs[0]?.sport).toBe('football')
    expect(out.matches[0]?.awayClubSlug).toBe(`קבוצה-בית${FOOTBALL_SLUG_SUFFIX}`)
    expect(out.report.notes.join(' ')).toContain('כדורסל')
  })

  it('writes only YYYY/YY season labels into the canonical file', () => {
    for (const row of wikiSquads) expect(row.seasonLabel as string).toMatch(/^\d{4}\/\d{2}$/)
  })
})
