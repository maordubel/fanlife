import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { rosterIndex, formationList } from '@/lib/game/allTimeXI'
import { fold } from '@/lib/game/roster-search'
import { shirtCoverage, shirtFor, shirtIndex } from '@/lib/kit/playerKit'
import { kitForSeason } from '@/lib/kit/seasons'
import { shirtBoard } from '@/lib/xi/board'
import { restore, XI_TABS } from '@/lib/xi/store'

const ROOT = join(__dirname, '..')

/**
 * שער 1 — the shirt a man is given, and the two sheets the gate keeps.
 */
describe('החולצה של האיש — a shirt is a season he actually played', () => {
  const index = shirtIndex()
  const squads = JSON.parse(readFileSync(join(ROOT, 'content/manual/squads.json'), 'utf8')) as {
    records: Array<{ personName: string; seasonLabel: string }>
  }
  const seasonsOf = new Map<string, Set<string>>()
  for (const row of squads.records) {
    const key = fold(row.personName)
    const found = seasonsOf.get(key) ?? new Set<string>()
    found.add(row.seasonLabel)
    seasonsOf.set(key, found)
  }

  it('never hands a man a season he was not in the squad for', () => {
    // The whole rule, over every one of them. Not the nearest season, not the era's
    // typical shirt — a shirt is a claim about a man (rule 11).
    for (const [key, shirt] of index) {
      expect(seasonsOf.get(key)?.has(shirt.seasonLabel), shirt.personName).toBe(true)
      expect(shirt.seasons, shirt.personName).toContain(shirt.seasonLabel)
      expect(kitForSeason(shirt.seasonLabel), shirt.personName).not.toBeNull()
      expect(shirt.kit.seasonLabel, shirt.personName).toBe(shirt.seasonLabel)
      expect(shirt.kit.variant, shirt.personName).toBe('home')
    }
  })

  it('gives Maor the two shirts he named', () => {
    // *"למשל לשלום תקוה להצמיד חולצה 99-00"* — his five-year spell contains the double,
    // and the double is the season the archive can draw.
    const tikva = shirtFor('שלום תקוה')
    expect(tikva?.seasonLabel).toBe('1999/00')
    expect(tikva?.why).toBe('trophy')
    expect(tikva?.wonHe.length).toBeGreaterThan(1)

    // *"למשה סיני להצמיד חולצה מ86"* — he is in the squad from 1979/80 to 1988/89 and
    // again to 1992/93, and the archive holds no kit from 1985/86. So it is the first
    // shirt inside his longest run that exists, and the screen prints the season.
    const sinai = shirtFor('משה סיני')
    expect(sinai?.seasonLabel).toBe('1985/86')
    expect(sinai?.spell).toBe(10)
    expect(kitForSeason('1985/86')).not.toBeNull()
  })

  it('prefers the spell over the trophy, which is the decision that ordered the rule', () => {
    // ערן זהבי is in the 2006/07 squad as a teenager — a cup season WITH a shirt on file
    // — and in 2008/09–2010/11 as the player people remember. Trophy-first would hand
    // him a season he barely played.
    const zahavi = shirtFor('ערן זהבי')
    expect(zahavi?.seasons).toContain('2006/07')
    expect(zahavi?.seasonLabel).toBe('2009/10')

    // And where the spell DOES contain an honour, the honour wins inside it.
    const badir = shirtFor('וואליד באדיר')
    expect(badir?.seasonLabel).toBe('2009/10')
    expect(badir?.why).toBe('trophy')
  })

  it('answers null rather than guessing, and says how many', () => {
    const roster = rosterIndex()
    const coverage = shirtCoverage(roster.all)
    expect(coverage.withShirt).toBe(index.size)
    // 389 of 661 today. The floor is the regression guard; the gap is the honest half,
    // and the day it is zero is the day somebody dressed a man from an era instead of
    // from a season.
    expect(coverage.withShirt).toBeGreaterThan(350)
    expect(coverage.withoutShirt).toBeGreaterThan(200)
    expect(coverage.withShirt + coverage.withoutShirt).toBe(roster.total)
    // אבי תקווה played one season, 2000/01, and the archive holds no kit for it.
    expect(shirtFor('אבי תקווה')).toBeNull()
  })

  it('states its reason and its source on every row it does answer', () => {
    for (const shirt of index.values()) {
      expect(['trophy', 'run', 'other'], shirt.personName).toContain(shirt.why)
      expect(shirt.sourceTitle.length, shirt.personName).toBeGreaterThan(10)
      expect(shirt.confidence, shirt.personName).toBeGreaterThanOrEqual(1)
      // a reason of `trophy` has to name what was won, or it is not a reason
      if (shirt.why === 'trophy') expect(shirt.wonHe.length, shirt.personName).toBeGreaterThan(0)
      else expect(shirt.wonHe, shirt.personName).toEqual([])
    }
  })

  it('sends each shirt to the screen once, not once per player', () => {
    const roster = rosterIndex()
    const board = shirtBoard(roster)
    expect(board.withShirt).toBe(index.size)
    // twenty-one home kits dress three hundred and eighty-nine men
    expect(Object.keys(board.seasons).length).toBeLessThan(25)
    expect(Object.keys(board.bySlug).length).toBe(board.withShirt)
    for (const [slug, row] of Object.entries(board.bySlug)) {
      const season = board.seasons[row.seasonLabel]
      expect(season, slug).toBeTruthy()
      expect(season?.spec.seasonLabel, slug).toBe(row.seasonLabel)
      // rule 25 — the crest is printed, and it is the era's
      expect(season?.spec.crestKey, slug).toBeTruthy()
    }
  })
})

describe('שני ההרכבים — what the gate keeps, and what it refuses to decide', () => {
  const store = readFileSync(join(ROOT, 'lib/xi/store.ts'), 'utf8')
  const builder = readFileSync(join(ROOT, 'app/xi/XIBuilder.tsx'), 'utf8')
  const page = readFileSync(join(ROOT, 'app/xi/page.tsx'), 'utf8')

  it('keeps localStorage behind the interface, so the screen never sees it', () => {
    // The same seam `lib/polls/store.ts` and `lib/kit/collection.ts` draw, for the same
    // reason: the day a table lands behind it, the screen does not change.
    expect(store).toContain('window.localStorage')
    for (const text of [builder, page]) {
      expect(text).not.toContain('localStorage')
      expect(text).not.toContain('sessionStorage')
    }
  })

  it('is async on every call and never throws at a browser that refuses it', () => {
    for (const method of ['read(', 'save(', 'clear(']) {
      expect(store).toContain(`async ${method}`)
    }
    const uses = store.split('\n').filter((line) => line.includes('window.localStorage'))
    expect(uses.length).toBeGreaterThan(0)
    expect(store.split('try {').length - 1).toBeGreaterThanOrEqual(uses.length)
  })

  it('restores a sheet without moving anybody to a slot he was not put in', () => {
    const formations = formationList()
    const first = formations[0]!
    const slot = first.slots[0]!.slotId
    const restored = restore(
      { formation: first.name, picks: { [slot]: 'אבדגי', 'NOT-A-SLOT': 'אבו-דוסו' }, savedOn: '' },
      formations,
    )
    expect(restored?.formation.name).toBe(first.name)
    expect(restored?.picks).toEqual({ [slot]: 'אבדגי' })
    // a formation that no longer exists drops the sheet rather than guessing a shape
    expect(restore({ formation: '9-9-9', picks: {}, savedOn: '' }, formations)).toBeNull()
    expect(restore(undefined, formations)).toBeNull()
  })

  it('keeps two sheets and no more', () => {
    expect([...XI_TABS]).toEqual(['best', 'worst'])
  })

  /**
   * **The app ranks nobody.**
   *
   * The worst eleven is a supporter's opinion, and the difference between that and a
   * generated "worst players" list is the difference between rule 18 and rule 11: Maor
   * may name the figures the terrace resents (gate 11 does it, from documented
   * transfers, with sources), and an app that ranked named men by nothing at all would
   * be publishing a factual claim no source supports.
   *
   * So: no seeded pick, no suggestion, no score, no sort of players anywhere in the
   * wing — and the screen and the share card both say whose opinion it is.
   */
  it('seeds no name, suggests nobody and scores nothing on the worst sheet', () => {
    // Comments are stripped first: a file is allowed — required, really — to SAY that
    // it ranks nobody. What it may not do is contain the thing.
    const code = (text: string) =>
      text.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ')
    for (const [path, text] of [
      ['lib/xi/store.ts', store],
      ['app/xi/XIBuilder.tsx', builder],
      ['app/xi/page.tsx', page],
      ['lib/xi/board.ts', readFileSync(join(ROOT, 'lib/xi/board.ts'), 'utf8')],
    ] as const) {
      for (const word of ['suggest', 'rank', 'worstList', 'defaultPicks', 'seedPicks', 'sort(']) {
        expect(code(text), `${path} names ${word}`).not.toContain(word)
      }
    }
    // the opinion is stated on the screen, not only on the card
    expect(builder).toContain("t('xi.worst.note')")
    expect(builder).toContain("t('xi.worst.opinion')")
    const messages = JSON.parse(readFileSync(join(ROOT, 'messages/he.json'), 'utf8')) as Record<
      string,
      string
    >
    expect(messages['xi.worst.note']).toContain('לא מדרגת')
    expect(messages['share.msg.worst']).toContain('לא דירגה')
  })

  it('shares as its own kind, at a link that opens the sheet it is about', () => {
    const copy = readFileSync(join(ROOT, 'lib/share/copy.ts'), 'utf8')
    expect(copy).toContain("worst: '/xi?tab=worst'")
    // and it carries no seed, because gate 1 deals no round
    expect(copy).toMatch(/SEEDLESS[^\n]*'worst'/)
    // the page reads the parameter the link carries — otherwise it is a lie in a URL
    expect(page).toContain('searchParams')
    expect(page).toContain("'worst'")
  })
})
