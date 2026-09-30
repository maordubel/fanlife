import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  archiveFigures,
  boxDeal,
  dealFacts,
  detailOf,
  discoverPool,
  factDeck,
  forgottenPool,
  longDateHe,
  onThisDay,
  pressColumns,
  archiveIdentity,
  rabbitDetail,
  searchCards,
  seasonCards,
  shelfPool,
  todayDecks,
} from '@/lib/archive/wing'
import { entity, neighbors, related, search } from '@/lib/archive/graph'
import { playerMaster } from '@/lib/archive/player-master'
import { applyEvent } from '@/lib/profile/events'
import { emptyProfile, isOn } from '@/lib/profile/store'
import { mergeDeviceProfiles } from '@/lib/portal/merge'
import { GATES, PLAYABLE_GATES, gateFor, gateSeeded, isOpen, wallOrder } from '@/lib/gates'
import { allGates, helpForRoute } from '@/lib/help'
import {
  parseTurim,
  readTurimFile,
  shortQuote,
  publishedOnFrom,
  QUOTE_MAX,
  VIKIPOEL_TURIM_SOURCE_TITLE,
} from '@/scripts/ingest/sources/vikipoel-turim'

const ROOT = join(__dirname, '..')

describe('"בשער" — 1,385 טורים, ומה שמותר להדפיס מהם', () => {
  const raw = readTurimFile(join(ROOT, 'content/raw/vikipoel-turim.json'))
  const { columns, report } = parseTurim(raw)
  const canonText = readFileSync(join(ROOT, 'content/manual/press-columns.json'), 'utf8')
  const canon = JSON.parse(canonText) as {
    confidence: number
    source: { title: string; read: number }
    records: typeof columns
  }

  it('takes every row, and reports anything it cannot', () => {
    expect(report.rowsRead).toBe(raw.length)
    expect(report.accepted + report.skipped.length).toBe(report.rowsRead)
    for (const skip of report.skipped) expect(skip.reason.length).toBeGreaterThan(5)
    // the canonical file is what the parser produces, so the ingest can be re-run
    expect(canon.records.length).toBe(columns.length)
    expect(canon.source.title).toBe(VIKIPOEL_TURIM_SOURCE_TITLE)
  })

  it('carries a full date on every single row — which is what makes the wing possible', () => {
    for (const column of columns) {
      expect(column.publishedOn, column.slug).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    }
    // and a partial date is refused rather than padded
    expect(publishedOnFrom({ date: '1986-05' })).toBeNull()
    expect(publishedOnFrom({ date: '1986-13-01' })).toBeNull()
    expect(publishedOnFrom({ date: '' })).toBeNull()
    expect(publishedOnFrom({ date: '1986-05-23' })).toBe('1986-05-23')
  })

  /**
   * **A press column is somebody else's writing**, and this is the guard that keeps it
   * that way. Rule 12's song rule, applied to journalism: the headline, the date, the
   * name and ONE short quotation — never the piece, and never two excerpts of one piece
   * anywhere, because two cards side by side is how a piece gets reassembled.
   */
  it('never stores the column, only one short quotation of it', () => {
    for (const column of columns) {
      expect(Object.keys(column), column.slug).not.toContain('text')
      expect((column.quoteHe ?? '').length, column.slug).toBeLessThanOrEqual(QUOTE_MAX + 1)
    }
    // one quotation per column, across the WHOLE canonical file
    const bySlug = new Map<string, number>()
    for (const column of canon.records) bySlug.set(column.slug, (bySlug.get(column.slug) ?? 0) + 1)
    expect([...bySlug.values()].every((n) => n === 1)).toBe(true)
    // `quote2` exists in the export and is deliberately not ingested — a second excerpt
    // beside the first is exactly the thing this rule forbids
    expect(canonText).not.toContain('quote2')
    // and the file is nowhere near the size of 1,385 columns of prose
    const rawSize = readFileSync(join(ROOT, 'content/raw/vikipoel-turim.json'), 'utf8').length
    expect(canonText.length).toBeLessThan(rawSize / 3)
  })

  it('cuts a quotation at a sentence or a word, never mid-word', () => {
    expect(shortQuote('')).toBeNull()
    expect(shortQuote('משפט קצר.')).toBe('משפט קצר.')
    const long = `${'מילה '.repeat(80)}סוף`
    const cut = shortQuote(long) as string
    expect(cut.length).toBeLessThanOrEqual(QUOTE_MAX + 1)
    expect(cut.endsWith('…') || cut.endsWith('.')).toBe(true)
    expect(cut).not.toMatch(/מיל…$/)
    // entities are decoded once, in the ingest, not left for a component to print raw
    expect(shortQuote('הפועל ת&quot;א')).toBe('הפועל ת"א')
  })

  it('names who the wiki credits without turning a paper into a person', () => {
    const bylines = new Set(columns.map((column) => column.bylineHe))
    expect(bylines.size).toBeGreaterThan(1)
    for (const column of columns) expect(column.bylineHe.length, column.slug).toBeGreaterThan(1)
  })

  it('re-runs to the same rows — the raw export is the only input', () => {
    const again = parseTurim(raw)
    expect(again.columns.map((column) => column.slug)).toEqual(columns.map((column) => column.slug))
    expect(new Set(columns.map((column) => column.slug)).size).toBe(columns.length)
  })
})

describe('שער 12 — היום לפני, והידעת', () => {
  it('answers from the archive for a date the archive holds', () => {
    // 23.5.1986 is the day before the 1985/86 decider; the column corpus carries a
    // "בשער" piece from it, which is the row this corner was built to reach.
    const day = onThisDay('2026-05-23')
    expect(day.empty).toBe(false)
    expect(day.columns.some((column) => column.year === 1986)).toBe(true)
    for (const column of day.columns) {
      expect(column.sourceTitle.length).toBeGreaterThan(10)
      expect(column.publishedOn.slice(5)).toBe('05-23')
    }
    for (const match of day.matches) expect(match.playedOn.slice(5)).toBe('05-23')
  })

  /**
   * **The empty answer is a real answer, and it is measured rather than assumed.**
   *
   * Measured 17.9.2026: every one of the 366 calendar days carries at least three items,
   * so a visitor will not meet this sentence today. It is kept, and tested, because the
   * alternative is a corner that CANNOT say "the archive holds nothing for today" — and
   * the first thing a wing like that does, the day a filter narrows the archive, is
   * reach for the nearest date instead.
   */
  it('says nothing rather than reaching for a nearby date', () => {
    const empty = onThisDay('2026-02-30')
    expect(empty.empty).toBe(true)
    expect(empty.matches).toEqual([])
    expect(empty.columns).toEqual([])
  })

  it('leaves trophies out of the day, because a trophy row has no day', () => {
    // `trophies.json` holds a SEASON — `1999/00`, `1938`. "On this day the club won the
    // double" would be a date this archive does not hold.
    for (let month = 1; month <= 12; month += 1) {
      const day = onThisDay(`2026-${String(month).padStart(2, '0')}-01`)
      expect(Object.keys(day)).toEqual(['monthDay', 'matches', 'columns', 'empty'])
    }
    const trophyCards = factDeck().filter((card) => card.kind === 'trophy')
    expect(trophyCards.length).toBeGreaterThan(20)
    for (const card of trophyCards) expect(card.whenHe).not.toMatch(/^\d{1,2} /)
  })

  it('prints a date as a Hebrew sentence, from the archive’s own ISO string', () => {
    expect(longDateHe('1986-05-24')).toBe('24 במאי 1986')
    expect(longDateHe('1999-01-03')).toBe('3 בינואר 1999')
  })

  it('gives every fact a source on the card — rule 16', () => {
    for (const card of factDeck()) {
      expect(card.sourceTitle.length, card.id).toBeGreaterThan(5)
      expect(card.titleHe.length, card.id).toBeGreaterThan(0)
      // a column card carries a quotation and no body; nothing carries both, so no card
      // can grow into a second excerpt of the same piece
      if (card.kind === 'column') expect(card.bodyHe, card.id).toBeNull()
    }
  })

  it('deals a unique id every time — rule 31, over 300 seeds', () => {
    const ids = factDeck().map((card) => card.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (let seed = 1; seed <= 300; seed += 1) {
      const deal = dealFacts(seed, seed % 7)
      expect(deal.cards.length).toBeGreaterThan(0)
      expect(new Set(deal.cards.map((card) => card.id)).size).toBe(deal.cards.length)
    }
  })

  it('deals something else on the next visit, and the same thing from the same link', () => {
    const first = dealFacts(4242, 0)
    const again = dealFacts(4242, 0)
    const next = dealFacts(4242, 1)
    expect(again.cards.map((card) => card.id)).toEqual(first.cards.map((card) => card.id))
    // rule 24's standing demand — a different deal per visit, and a different one again
    // the same day
    expect(next.cards.map((card) => card.id)).not.toEqual(first.cards.map((card) => card.id))
    const other = dealFacts(99, 0)
    expect(other.cards.map((card) => card.id)).not.toEqual(first.cards.map((card) => card.id))
  })

  it('counts what it holds instead of promising it', () => {
    const figures = archiveFigures()
    expect(figures.columns).toBe(pressColumns.length)
    expect(figures.columns).toBeGreaterThan(1300)
    expect(figures.datedMatches).toBeGreaterThan(3000)
    expect(figures.earliest).toMatch(/^\d{4}-/)
    expect(Number(figures.latest?.slice(0, 4))).toBeGreaterThan(Number(figures.earliest?.slice(0, 4)))
  })
})

describe('הקיר — שער 12 ושער 9 פתוחים', () => {
  const gate = (number: number) => GATES.find((row) => row.number === number)

  it('hangs gate 12 on a route that exists', () => {
    expect(gate(12)?.href).toBe('/archive')
    expect(gate(12)?.playable).toBe(true)
    expect(gate(12)?.seeded).toBe(true)
    expect(gateFor('/archive')?.number).toBe(12)
    expect(gateSeeded('/archive')).toBe(true)
    // and it has a help sheet, because it now has a screen to describe
    expect(helpForRoute('/archive')?.help.whatKey).toBe('help.archive.dock.what')
  })

  /** Gate 9 is now the seeded, playable Royal Rumble route. */
  it('opens gate 9 as Royal Rumble and counts it as playable', () => {
    expect(gate(9)?.href).toBe('/royal-rumble')
    expect(gate(9)?.playable).toBe(true)
    expect(gate(9)?.seeded).toBe(true)
    expect(PLAYABLE_GATES.map((row) => row.number)).toContain(9)
    expect(allGates().map((row) => row.number)).toContain(9)
    expect(gateFor('/royal-rumble')?.number).toBe(9)
    expect(gateSeeded('/royal-rumble')).toBe(true)
    expect(GATES.filter((row) => !isOpen(row)).map((row) => row.number)).not.toContain(9)
  })

  it('keeps the wall a grid — the curva first, everything else in order', () => {
    const order = wallOrder(GATES)
    expect(order.length).toBe(GATES.length)
    expect(order[0]?.plate).toBe('curva')
    expect(order.filter((row) => row.plate === 'curva').length).toBe(1)
    expect(new Set(order.map((row) => row.number)).size).toBe(GATES.length)
  })

  it('never lets a plate with no route reach a link', () => {
    const plate = readFileSync(join(ROOT, 'components/gates/GatePlate.tsx'), 'utf8')
    expect(plate).toContain('gate.href === null')
    for (const path of ['app/sitemap.ts', 'app/tik/Standing.tsx', 'app/hapoel/page.tsx']) {
      expect(readFileSync(join(ROOT, path), 'utf8'), path).toContain('isOpen')
    }
  })
})

describe('שער 12 v10 — הארכיון החי, over the Entity Graph', () => {
  const DAY = '2026-05-19'

  it('deals five Today chips, each by its own rule, each seeded (rule 24)', () => {
    const decks = todayDecks(DAY, 4242, 0)
    for (const card of decks.today) expect(card.when, card.id).toMatch(/^19\.5\.\d{4}$/)
    const facts = new Set(factDeck().map((card) => card.id))
    for (const card of decks.know) expect(facts.has(card.id), card.id).toBe(true)
    for (const card of decks.shelf) expect(['kit', 'object', 'song', 'fans', 'press']).toContain(card.type)
    for (const card of decks.forgotten) {
      expect(card.type).toBe('person')
      const e = entity(card.id)!
      expect(e.attrs.currentSquad).not.toBe(true)
      const seasons = neighbors(card.id).filter(({ edge }) => edge.type === 'played_in')
      expect(seasons.length).toBeGreaterThanOrEqual(1)
      expect(seasons.length).toBeLessThanOrEqual(2)
    }
    for (const card of decks.discover) expect(card.degree).toBeGreaterThanOrEqual(3)
    for (const chip of ['know', 'shelf', 'forgotten', 'discover'] as const) {
      expect(decks[chip].length, chip).toBeGreaterThan(0)
      expect(new Set(decks[chip].map((card) => card.id)).size).toBe(decks[chip].length)
    }
    // the same two numbers deal the same cards; the next visit deals others
    expect(JSON.stringify(todayDecks(DAY, 4242, 0))).toBe(JSON.stringify(decks))
    expect(todayDecks(DAY, 4242, 1).shelf.map((c) => c.id)).not.toEqual(decks.shelf.map((c) => c.id))
    expect(shelfPool().length).toBeGreaterThan(20)
    expect(forgottenPool().length).toBeGreaterThan(20)
    expect(discoverPool().length).toBeGreaterThan(100)
  })

  it('digs the same way twice, never back onto the trail, and changes type when it can', () => {
    const tikva = search('שלום תקוה')[0]!.id
    const walk = (seed: number) => {
      const trail = [tikva]
      for (let depth = 0; depth < 8; depth += 1) {
        const next = rabbitDetail(trail[trail.length - 1]!, seed, depth, trail)
        if (!next) break
        expect(trail, `seed ${seed} depth ${depth}`).not.toContain(next.card.id)
        trail.push(next.card.id)
      }
      return trail
    }
    for (const seed of [1, 7, 99, 4242]) {
      const a = walk(seed)
      expect(a.length).toBeGreaterThan(3)
      expect(walk(seed)).toEqual(a)
      // never three of one type in a row when the graph offered something else
      for (let i = 2; i < a.length; i += 1) {
        const types = [a[i - 2], a[i - 1], a[i]].map((id) => entity(id!)!.type)
        if (types[0] === types[1] && types[1] === types[2]) {
          const others = neighbors(a[i - 1]!).filter(({ other }) => other.type !== types[1] && !a.slice(0, i).includes(other.id))
          expect(others.length, `seed ${seed}: ${a.slice(i - 2, i + 1).join(' → ')}`).toBe(0)
        }
      }
    }
    expect(walk(1)).not.toEqual(walk(4242))
  })

  it('shows related items two per type, each with the label of its edge', () => {
    for (const id of ['season:1999/00', 'goal:chelsea-2001-gershon-88', 'place:בלומפילד', search('ערן זהבי')[0]!.id]) {
      const groups = related(id)
      expect(groups.length).toBeGreaterThan(0)
      for (const group of groups) {
        expect(group.items.length).toBeLessThanOrEqual(2)
        expect(new Set(group.items.map((item) => item.entity.type))).toEqual(new Set([group.type]))
      }
    }
  })

  it('finds a player by any spelling the Player Master holds — one search, no second index', () => {
    const withAlias = playerMaster.players.find((p) => p.aliases.he.length > 0 && p.aliases.he[0] !== p.displayName)!
    expect(withAlias).toBeDefined()
    const found = searchCards(withAlias.aliases.he[0]!, null).map((card) => card.id)
    expect(found).toContain(withAlias.id)
    expect(searchCards('בלומפילד', 'place')[0]?.id).toBe('place:בלומפילד')
    expect(searchCards('', null)).toEqual([])
  })

  it('deals the box by seed, shuffle and decade', () => {
    const a = boxDeal(11, null, 0)
    expect(a).toHaveLength(8)
    expect(boxDeal(11, null, 0)).toEqual(a)
    expect(boxDeal(11, null, 1).map((c) => c.id)).not.toEqual(a.map((c) => c.id))
    for (const card of boxDeal(11, 1990, 0)) expect(card.decade).toBe(1990)
  })

  it('opens a season hub from the time machine, trophies first', () => {
    const cards = seasonCards('1999/00')
    expect(cards.length).toBeGreaterThan(10)
    expect(cards[0]!.type).toBe('trophy')
    expect(seasonCards('1850/51')).toEqual([])
  })

  it('prints only what the archive holds in the drawer, with confidence words and read dates', () => {
    const column = detailOf(factDeck().find((card) => card.kind === 'column')!.id)!
    expect(column.what.kind).toBe('quote')
    expect(column.sources[0]!.readOn).toBe('2026-09-17')
    expect(column.sources[0]!.confidence).toBe('low')
    const match = detailOf(neighbors('trophy:גביע-המדינה:1998/99').find(({ other }) => other.type === 'match')!.other.id)!
    expect(match.what.kind).toBe('match')
    for (const src of match.sources) expect(src.readOn).toBeNull()
    for (const group of match.related) for (const item of group.items) expect(item.labelKey).toMatch(/^graph\.rel\./)
    expect(match.before?.type).toBe('match')
    // the prototype's invented prose has no field to live in
    expect(JSON.stringify(match)).not.toMatch(/spicy|secret/)
    // `?at=` takes a legacy id
    expect(detailOf('euro:2001-uefa-r2-chelsea')?.card.id).toBe('tie:2001-uefa-r2-chelsea')
    expect(detailOf('no-such-id')).toBeNull()
  })

  it('never shows a kit’s maker, sponsor or crest — those are gate 4’s answers', () => {
    const kit = detailOf('kit-2009-10-home')!
    expect(kit.what.kind).toBe('kit')
    const blob = JSON.stringify(kit)
    for (const answer of ['umbro', 'סובארו', 'SUBARU', 'circle-1927', 'אמברו']) expect(blob).not.toContain(answer)
  })

  it('keeps Mine as a parity toggle, so an un-save survives the union merge', () => {
    const id = 'goal:chelsea-2001-gershon-88'
    const ctx = { date: '2026-09-21' }
    const saved = applyEvent(emptyProfile(), { type: 'archive_saved', entityId: id, on: true }, ctx).profile
    expect(isOn('archive.mine', id, saved)).toBe(true)
    const unsaved = applyEvent(saved, { type: 'archive_saved', entityId: id, on: false }, ctx).profile
    expect(isOn('archive.mine', id, unsaved)).toBe(false)
    // another device still holds the old "saved" — the merge keeps the un-save
    expect(isOn('archive.mine', id, mergeDeviceProfiles(unsaved, saved))).toBe(false)
  })
})

describe('what gate 10 reads from gate 12', () => {
  it('describes the saves, derives a favourite decade, and lists the matches marked "there"', () => {
    const final99 = neighbors('trophy:גביע-המדינה:1998/99').find(({ other }) => other.type === 'match')!.other.id
    const identity = archiveIdentity({
      saved: ['season:1998/99', 'trophy:גביע-המדינה:1998/99', final99, 'euro:2001-uefa-r2-chelsea', 'nothing-here'],
      seen: ['a', 'a', 'b'],
      reactions: [`there:${final99}`, 'moved:season:1998/99'],
    })
    expect(identity.saved.map((card) => card.id)).toContain('tie:2001-uefa-r2-chelsea')
    expect(identity.unknown).toEqual(['nothing-here'])
    expect(identity.favouriteDecade).toEqual({ decade: 1990, count: 3 })
    expect(identity.seen).toBe(2)
    expect(identity.beenThere.map((card) => card.id)).toEqual([final99])
    expect(archiveIdentity({ saved: ['season:1998/99'], seen: [], reactions: [] }).favouriteDecade).toBeNull()
  })
})
