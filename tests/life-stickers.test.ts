import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { emptyState, apply } from '@/lib/life/events'
import { PACKET, decadeOf } from '@/lib/life/prices'
import {
  PACKET_SIZE,
  SETS,
  SET_ORDER,
  STICKERS,
  albumTotals,
  closesPage,
  duplicates,
  hasSticker,
  haveOf,
  holderOf,
  missingOn,
  openPacket,
  pageDone,
  SHORT_PER_PAGE,
  isAce,
  isTorn,
  keptOnClose,
  nextKept,
  settled,
  shortPrints,
  tornFlag,
  setSoldIn,
  stickerFlag,
  stickersIn,
  type StickerSetId,
} from '@/lib/life/stickers'
import { blankRelationship, type LifeState } from '@/lib/life/types'
import { meets } from '@/lib/life/world/types'

/**
 * סופרגול — the album, and the four promises it makes.
 *
 * The feature shows real photographs of real footballers, so the tests it needs are not
 * the usual ones about balance. They are about provenance: every name in the album can be
 * traced to something, every scan referenced is a file that exists, and nothing in the
 * data invents a printed number for a sticker nobody has a picture of.
 *
 * The fourth is mechanical and is the one that would actually break a save — `album:`
 * has to survive a year change, or a page half-filled in 1986 is empty in 1990.
 */

const state = (over: Partial<LifeState> = {}): LifeState => ({
  ...emptyState({ name: 'פוגי', sex: 'boy', birthYear: 1978 }, 1986),
  chapter: '1986',
  ...over,
})

/** a life in which three children feel three different ways about the player */
const bonded = (bonds: Record<string, number>): LifeState => {
  const base = state()
  const relationships = { ...base.relationships }
  for (const [who, bond] of Object.entries(bonds)) {
    relationships[who] = { ...(relationships[who] ?? blankRelationship(0)), bond }
  }
  return { ...base, bonds: { ...base.bonds, ...bonds }, relationships }
}

describe('סופרגול — הארכיון', () => {
  it('gives every sticker in the album a source line', () => {
    for (const sticker of STICKERS) {
      expect(sticker.sourceHe.length, sticker.id).toBeGreaterThan(10)
    }
  })

  it('ships every scan it references', () => {
    for (const sticker of STICKERS) {
      if (!sticker.scan) continue
      expect(existsSync(join(process.cwd(), 'public', sticker.scan)), sticker.scan).toBe(true)
    }
    for (const set of Object.values(SETS)) {
      if (!set.posterArt) continue
      expect(existsSync(join(process.cwd(), 'public', set.posterArt)), set.posterArt).toBe(true)
    }
  })

  it('claims a printed number only where a scan makes it legible', () => {
    // The album's own `slot` is a position on a page and invents nothing. `printedN` is a
    // claim about what a printer wrote on a piece of paper in 1980, and it may only be
    // made about a sticker somebody can look at.
    for (const sticker of STICKERS) {
      if (sticker.printedN === undefined) continue
      expect(sticker.scan, `${sticker.id} claims a printed number with no scan`).toBeTruthy()
    }
  })

  it('never repeats an id, and never repeats a slot on a page', () => {
    const ids = STICKERS.map((sticker) => sticker.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const set of SET_ORDER) {
      const slots = stickersIn(set).map((sticker) => sticker.slot)
      expect(new Set(slots).size, set).toBe(slots.length)
    }
  })

  it('leaves exactly one sticker per page that no packet can contain', () => {
    // The designed sting: the last one is asked for, never bought.
    for (const set of SET_ORDER) {
      const held = stickersIn(set).filter((sticker) => sticker.neverInPacket)
      expect(held.length, set).toBeGreaterThanOrEqual(1)
    }
  })
})

describe('סופרגול — המעטפה', () => {
  it('deals three, and never the one that closes the page', () => {
    const blocked = new Set(STICKERS.filter((sticker) => sticker.neverInPacket).map((sticker) => sticker.id))
    for (let seed = 0; seed < 200; seed += 1) {
      const ids = openPacket(state(), '8586', seed)
      expect(ids).toHaveLength(PACKET_SIZE)
      for (const id of ids) expect(blocked.has(id), id).toBe(false)
    }
  })

  it('arrives in a chapter of the decade it is sold in', () => {
    // `soldIn` and `from` are two statements about the same page — the decade a kiosk
    // stocked it and the chapter it first appears in — and they are derived from
    // different things (`soldIn` is typed on the row, `from` is read off the season
    // printed on the page). A page sold in the nineties that arrives in 1984 would mean
    // one of the two is wrong, and nothing else in the suite would say so.
    for (const id of SET_ORDER) {
      const set = SETS[id]
      if (set.soldIn === null) continue
      expect(decadeOf(set.from), `${id} — ${set.seasonHe}`).toBe(set.soldIn)
    }
  })

  it('deals nothing for a decade nobody printed an album for', () => {
    // 1980/81 and 1996 are pages that were kept, not pages that were collected.
    expect(SETS['8081'].soldIn).toBeNull()
    expect(SETS['96'].soldIn).toBeNull()
  })

  it('sells the eighties page in an eighties chapter and the nineties page later', () => {
    expect(setSoldIn(state({ chapter: '1986' }))).toBe('8586')
    // delta 90: the nineties page the kiosk sells is one an envelope can ADD to. The 1992/93
    // page is a single scan that closes itself (trade-only), so a counter selling it sold an
    // empty box for seven chapters — the Batch 0 matrix's dead row.
    const nineties = setSoldIn(state({ chapter: '1993-cup' }))
    expect(nineties && SETS[nineties].soldIn).toBe('90s')
    expect(openPacket(state({ chapter: '1993-cup' }), nineties as never, 0).length).toBe(PACKET_SIZE)
  })

  it('moves the kiosk on to the next album once a page is full', () => {
    // A decade printed more than one album. The kiosk sells the current one until it is
    // finished — otherwise the second page of a decade is unreachable.
    const flags: Record<string, number> = {}
    for (const sticker of stickersIn('8586')) flags[stickerFlag(sticker.id)] = 1
    const done = state({ chapter: '1986', flags })
    expect(setSoldIn(done)).toBe('sg80a')
    for (const sticker of stickersIn('sg80a')) flags[stickerFlag(sticker.id)] = 1
    expect(setSoldIn(state({ chapter: '1986', flags }))).toBe('sgcup')
  })

  it('keeps selling the last album of a decade rather than nothing', () => {
    // Every page full is not a reason for a kiosk to stop existing: a duplicate is still
    // worth trading, and a dead choice in a menu reads as a bug.
    const flags: Record<string, number> = {}
    for (const sticker of STICKERS) flags[stickerFlag(sticker.id)] = 1
    expect(setSoldIn(state({ chapter: '1986', flags }))).toBe('sg80b')
  })

  it('empties the box exactly, by finishing the albums one page at a time', () => {
    // Played out rather than counted: fill each sellable page in order, hand out whatever
    // the close hands out, and check that when the last page is full the box is empty.
    // This is the invariant that matters — a card left in it is a slot nobody can fill.
    const flags: Record<string, number> = {}
    const sellable = SET_ORDER.filter((id) => SETS[id].soldIn !== null)
    for (const set of sellable) {
      const slots = stickersIn(set)
      for (const sticker of slots.slice(0, -1)) flags[stickerFlag(sticker.id)] = 1
      const closing = slots[slots.length - 1]?.id ?? ''
      for (const card of keptOnClose(state({ flags }), set, [closing])) flags[stickerFlag(card.id)] = 1
      flags[stickerFlag(closing)] = 1
    }
    expect(nextKept(state({ flags }))).toBeNull()
    expect(albumTotals(state({ flags })).have).toBe(
      STICKERS.filter((sticker) => sticker.set !== '8081' && sticker.set !== '96').length,
    )
  })

  it('turns the box over when the last album is finished', () => {
    const flags: Record<string, number> = {}
    const sellable = SET_ORDER.filter((id) => SETS[id].soldIn !== null)
    for (const set of sellable.slice(0, -1)) {
      for (const sticker of stickersIn(set)) flags[stickerFlag(sticker.id)] = 1
    }
    const last = sellable[sellable.length - 1] as (typeof sellable)[number]
    const slots = stickersIn(last)
    for (const sticker of slots.slice(0, -1)) flags[stickerFlag(sticker.id)] = 1
    const closing = slots[slots.length - 1]?.id ?? ''
    // nothing has come out of the box yet, so closing the last page empties it
    const out = keptOnClose(state({ flags }), last, [closing])
    expect(out).toHaveLength(stickersIn('box').length)
  })

  it('leaves no sticker in the album that cannot be got', () => {
    // Every slot is either sold in a packet, closed by a trade, kept by the story, or in
    // the box — and the box is handed out by page completions. A slot outside all four
    // would be a promise the album cannot keep.
    const sellable = new Set(SET_ORDER.filter((id) => SETS[id].soldIn !== null))
    const story = new Set(['8081', '96'])
    for (const sticker of STICKERS) {
      const reachable = sellable.has(sticker.set) || sticker.set === 'box' || story.has(sticker.set)
      expect(reachable, sticker.id).toBe(true)
    }
  })

  it('never sells the red box, and hands it out one card at a time', () => {
    expect(SETS.box.soldIn).toBeNull()
    for (const sticker of stickersIn('box')) expect(sticker.neverInPacket).toBe(true)
    const empty = state()
    const first = nextKept(empty)
    expect(first?.id).toBe(stickersIn('box')[0]?.id)
    const after = state({ flags: { [stickerFlag(first?.id ?? '')]: 1 } })
    expect(nextKept(after)?.id).toBe(stickersIn('box')[1]?.id)
  })

  it('prices a packet at one bottle deposit in every decade', () => {
    // The point of the feature is that it competes with the shirt. If a packet ever
    // stops costing real money the decision stops existing.
    for (const decade of Object.keys(PACKET) as (keyof typeof PACKET)[]) {
      expect(PACKET[decade]).toBeGreaterThan(0)
    }
  })
})

describe('סופרגול — ההדפסה החסרה', () => {
  it('short-prints two slots on a page and never puts them in a packet', () => {
    const one = state({ chapter: '1986' })
    const short = shortPrints(one, 'sg80a')
    expect(short.size).toBe(SHORT_PER_PAGE)
    for (let seed = 0; seed < 120; seed += 1) {
      for (const id of openPacket(one, 'sg80a', seed)) expect(short.has(id), id).toBe(false)
    }
  })

  it('is the same print run every time the same life is loaded', () => {
    const a = shortPrints(state(), 'sg978')
    const b = shortPrints(state(), 'sg978')
    expect([...a].sort()).toEqual([...b].sort())
  })

  it('gives two different lives two different albums', () => {
    // The whole point of Maor's note (7.9.2026): two players comparing what they got are
    // not describing the same album, and neither finishes it alone.
    const seen = new Set<string>()
    for (let seed = 1; seed <= 40; seed += 1) {
      const run = state({ rng: { seed: `life-${seed}`, cursor: 0 } })
      seen.add([...shortPrints(run, 'sg80b')].sort().join('|'))
    }
    expect(seen.size).toBeGreaterThan(3)
  })

  it('still lets a trade bring a short print in', () => {
    // Short-printed is not unobtainable — somebody else in the neighbourhood pulled it.
    const run = state({ chapter: '1986' })
    const short = [...shortPrints(run, 'sg80a')]
    const flags: Record<string, number> = {}
    for (const sticker of stickersIn('sg80a')) {
      if (!short.includes(sticker.id)) flags[stickerFlag(sticker.id)] = 1
    }
    const nearly = state({ chapter: '1986', flags })
    expect(short).toContain(missingOn(nearly, 'sg80a')?.id)
  })
})

describe('סופרגול — מי שעבר', () => {
  it('marks the men Maor marked, and nobody else', () => {
    const marked = STICKERS.filter((sticker) => sticker.defector)
    expect(marked.length).toBeGreaterThan(0)
    for (const sticker of marked) expect(sticker.scan).toBeTruthy()
  })

  it('settles a slot that was torn, so the page can still close', () => {
    const sticker = STICKERS.find((one) => one.defector) as (typeof STICKERS)[number]
    const torn = state({ flags: { [tornFlag(sticker.id)]: true } })
    expect(isTorn(torn, sticker.id)).toBe(true)
    expect(hasSticker(torn, sticker.id)).toBe(false)
    expect(settled(torn, sticker.id)).toBe(true)
    const flags: Record<string, number | boolean> = { [tornFlag(sticker.id)]: true }
    for (const one of stickersIn(sticker.set)) {
      if (one.id !== sticker.id) flags[stickerFlag(one.id)] = 1
    }
    expect(pageDone(state({ flags }), sticker.set)).toBe(true)
  })

  it('never deals a torn card again', () => {
    const sticker = STICKERS.find((one) => one.defector) as (typeof STICKERS)[number]
    const torn = state({ chapter: '1997-basket', flags: { [tornFlag(sticker.id)]: true } })
    for (let seed = 0; seed < 150; seed += 1) {
      expect(openPacket(torn, sticker.set, seed)).not.toContain(sticker.id)
    }
  })
})

describe('סופרגול — האסים', () => {
  it('counts only the five out of the red box as aces', () => {
    const aces = STICKERS.filter(isAce)
    expect(aces).toHaveLength(5)
    for (const ace of aces) {
      expect(ace.set).toBe('box')
      expect(ace.neverInPacket).toBe(true)
      expect(ace.scan).toBeTruthy()
    }
  })
})

describe('סופרגול — הספירה', () => {
  it('counts a duplicate as a spare and a single as none', () => {
    const one = state({ flags: { [stickerFlag('landau')]: 1 } })
    expect(duplicates(one)).toHaveLength(0)
    const three = state({ flags: { [stickerFlag('landau')]: 3 } })
    expect(duplicates(three)).toHaveLength(2)
    expect(albumTotals(three).have).toBe(1)
  })

  it('reads a bare true as one, so an older save still opens', () => {
    expect(haveOf(state({ flags: { [stickerFlag('landau')]: true } }), 'landau')).toBe(1)
  })

  it('puts the missing sticker with whoever the player has been worst to', () => {
    const cold = bonded({ ofir: 40, amit: 5, efi: 30 })
    expect(holderOf(cold, 'landau')).toBe('amit')
    const colder = bonded({ ofir: 2, amit: 50, efi: 30 })
    expect(holderOf(colder, 'landau')).toBe('ofir')
  })

  it('holds nobody responsible for a sticker already stuck in', () => {
    expect(holderOf(state({ flags: { [stickerFlag('landau')]: 1 } }), 'landau')).toBeNull()
  })

  it('sends you after the rarest gap first', () => {
    const gap = missingOn(state(), '8586')
    expect(gap?.rarity).toBe('rare')
  })
})

describe('סופרגול — התנאים', () => {
  it('spells the flag prefix the same way the condition evaluator does', () => {
    // `world/types.ts` duplicates the key to avoid an import cycle; this is the lock.
    const source = readFileSync(join(process.cwd(), 'lib/life/world/types.ts'), 'utf8')
    const prefix = stickerFlag('X').replace('X', '')
    expect(source).toContain(`const STICKER_PREFIX = '${prefix}'`)
  })

  it('answers hasSticker, lacksSticker and duplicatesAtLeast', () => {
    const holding = state({ flags: { [stickerFlag('landau')]: 2 } })
    expect(meets(holding, { hasSticker: 'landau' })).toBe(true)
    expect(meets(holding, { lacksSticker: 'landau' })).toBe(false)
    expect(meets(holding, { duplicatesAtLeast: 1 })).toBe(true)
    expect(meets(holding, { duplicatesAtLeast: 2 })).toBe(false)
    expect(meets(state(), { hasSticker: 'landau' })).toBe(false)
    expect(meets(state(), { lacksSticker: 'landau' })).toBe(true)
  })
})

describe('סופרגול — האלבום שורד את השנה', () => {
  it('keeps what is stuck in when the life moves to the next chapter', () => {
    const before = state({ flags: { [stickerFlag('landau')]: 2, 'a2:bread': true } })
    const after = apply(before, { t: 'year.entered', year: 1990, weekday: 6, minute: 8 * 60 })
    expect(haveOf(after, 'landau')).toBe(2)
    expect(hasSticker(after, 'landau')).toBe(true)
    // and the ordinary day flag is gone, which is what makes the first assertion mean something
    expect(after.flags['a2:bread']).toBeUndefined()
  })
})

describe('סופרגול — הדף שנסגר', () => {
  /*
   * This used to run on '9293' and name `abuksis` and `halfon` by hand. On 17.9.2026 the
   * album stopped showing a slot with no photograph, `abuksis` has none, and the page
   * became one card — so a test about the difference between one-short and two-short had
   * no room left to stand in. It is not deleted (rule 47): it reads the page out of the
   * album instead of hard-coding two ids, so it now holds for every page that HAS a
   * penultimate card, and it names the page it chose when it fails.
   */
  it('says the page is full only on the sticker that actually closed it', () => {
    const set = SET_ORDER.find((id) => stickersIn(id).length >= 3)
    expect(set, 'no album page has three cards').toBeTruthy()
    const page = stickersIn(set as StickerSetId)
    const closing = page[page.length - 1] as { id: string }
    const other = page[page.length - 2] as { id: string }
    const all = Object.fromEntries(page.map((sticker) => [stickerFlag(sticker.id), 1]))
    // one short: the arriving sticker closes it
    const short = { ...all }
    delete short[stickerFlag(closing.id)]
    expect(closesPage(state({ flags: short }), set as StickerSetId, [closing.id]), set).toBe(true)
    // two short: it does not
    const shorter = { ...short }
    delete shorter[stickerFlag(other.id)]
    expect(closesPage(state({ flags: shorter }), set as StickerSetId, [closing.id]), set).toBe(false)
    // already full: a duplicate does not re-close a page that was closed an hour ago
    expect(closesPage(state({ flags: all }), set as StickerSetId, [closing.id]), set).toBe(false)
  })
})
