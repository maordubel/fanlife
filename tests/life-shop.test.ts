import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { CHAPTERS } from '@/lib/life/content/chapters'
import { emptyState } from '@/lib/life/events'
import { PACKET, decadeOf } from '@/lib/life/prices'
import {
  CHAPTER_ORDER,
  LATER,
  SHIRTS,
  arrivedBetween,
  chapterIndex,
  chapterOnOrAfter,
  chapterYear,
  isNewThisChapter,
  onSale,
  previousChapter,
  shirtFlag,
  shopShelves,
} from '@/lib/life/shirts'
import {
  SETS,
  SET_ORDER,
  newSetsIn,
  packetShekels,
  setSoldIn,
  setsArrivedBetween,
  setsBy,
  stickerFlag,
  stickersIn,
  stuckIn,
} from '@/lib/life/stickers'
import type { LifeState } from '@/lib/life/types'

/**
 * החנות — the rail, the counter, and the arrival nobody could announce.
 *
 * Maor asked for three things on 16.9.2026: a fan shop that is *"יותר נכון, יותר מרשים,
 * יותר כייפי"*, *"מקום ברור לקניית סופרגול"*, and *"התראות על עונת סופרגול חדשה שנכנסה
 * לחנות"*. The third is the one that needed a model rather than a screen — a `StickerSet`
 * knew which DECADE it was sold in and nothing finer, so every eighties page was
 * simultaneously the current one in 1984, 1985 and 1986 and no chapter boundary could
 * ever hold one up and say it had just come in.
 *
 * This suite tests the model, not the pixels: what is on a rail in a given chapter, in
 * what order, what a counter is selling, what arrived since last time, and what the shop
 * refuses to sell and says so. The two source-reading guards at the foot are the two
 * things a rendering test would never catch and a player would meet immediately.
 */

const ROOT = join(__dirname, '..')

const state = (over: Partial<LifeState> = {}): LifeState => ({
  ...emptyState({ name: 'פוגי', sex: 'boy', birthYear: 1978 }, 1986),
  chapter: '1986',
  ...over,
})

// ---------------------------------------------------------------------------------
describe('החנות — לוח השנה של הקולב', () => {
  it('reads the chapter order off the registry instead of keeping a second copy', () => {
    // `shirts.ts` used to hold nineteen ids AND a table of their years, both copies of
    // `content/chapters.ts`. The copies had already drifted on two rows (a6-radio and
    // 1995-sinai) and nothing noticed, because no kit happened to fall in the gap. This
    // is rule 59 in miniature: the copy nothing runs is the one that is free to be wrong.
    expect([...CHAPTER_ORDER]).toEqual(CHAPTERS.filter((row) => row.playable).map((row) => row.id))
    expect(CHAPTER_ORDER.length).toBeGreaterThan(10)
  })

  it('gives every chapter on the spine a year the registry agrees with', () => {
    for (const chapter of CHAPTER_ORDER) {
      expect(chapterYear(chapter), chapter).toBe(CHAPTERS.find((row) => row.id === chapter)?.year)
    }
  })

  it('places a season on the first chapter that is on or after it, and refuses the rest', () => {
    expect(chapterOnOrAfter(1978)).toBe(CHAPTER_ORDER[0])
    expect(chapterYear(chapterOnOrAfter(1992))).toBeGreaterThanOrEqual(1992)
    /**
     * **"a season this life never reaches" is a moving line, and it moved** (21.9.2026).
     *
     * This asked for `2025` by name, because 2025 was past the end of the spine. Stage C
     * reached it, and the assertion went red — describing a world that had grown, not a
     * defect (rule 80). What it actually protects is the FALLBACK: the first version of
     * `chapterOnOrAfter` returned chapter one, which hung a 2025 Macron shirt in 1984.
     *
     * So the year is read off the registry instead of typed. A season one year past the
     * last chapter can never be placed, whatever the spine grows to — and the year that
     * IS the last chapter's now resolves to a real chapter, which is the other half of
     * the same claim and was never checked before.
     */
    const last = Math.max(...CHAPTERS.filter((row) => row.playable).map((row) => row.year))
    expect(chapterOnOrAfter(last + 1)).toBe(LATER)
    expect(chapterYear(chapterOnOrAfter(last))).toBe(last)
    expect(chapterIndex(LATER)).toBe(-1)
  })

  it('walks back one chapter, and stops at the start of the life', () => {
    expect(previousChapter(CHAPTER_ORDER[0] as string)).toBeNull()
    expect(previousChapter('1986')).toBe('a7-week')
    expect(previousChapter('nowhere')).toBeNull()
  })
})

// ---------------------------------------------------------------------------------
describe('החנות — המדפים', () => {
  it('puts the newest season at the front of every shelf', () => {
    // The old screen drew the rail in the order the archive generator emitted its rows,
    // which is oldest first — so the kit the club is wearing this season, the one thing a
    // supporter walks in for, was at the bottom of the second screen.
    for (const shelf of shopShelves(state({ chapter: '2000-double' }), '2000-double')) {
      const places = shelf.shirts.map((shirt) => chapterIndex(shirt.from))
      expect([...places].sort((a, b) => b - a), shelf.id).toEqual(places)
    }
  })

  it('never hangs the same shirt on two shelves, and never invents one', () => {
    const chapter = '1998-laces'
    const rail = onSale(chapter)
    const hung = shopShelves(state({ chapter }), chapter).flatMap((shelf) => shelf.shirts)
    expect(new Set(hung.map((shirt) => shirt.id)).size).toBe(hung.length)
    expect(hung).toHaveLength(rail.length)
    for (const shirt of hung) expect(rail.some((row) => row.id === shirt.id), shirt.id).toBe(true)
  })

  it('moves a shirt you own to the back of the rail', () => {
    const chapter = '1998-laces'
    const owned = onSale(chapter)[0] as (typeof SHIRTS)[number]
    const shelves = shopShelves(state({ chapter, flags: { [shirtFlag(owned.id)]: true } }), chapter)
    const wardrobe = shelves.find((shelf) => shelf.id === 'wardrobe')
    expect(wardrobe?.shirts.map((shirt) => shirt.id)).toContain(owned.id)
    for (const shelf of shelves) {
      if (shelf.id === 'wardrobe') continue
      expect(shelf.shirts.map((shirt) => shirt.id), shelf.id).not.toContain(owned.id)
    }
  })

  it('drops an empty shelf rather than printing a heading with nothing under it', () => {
    for (const chapter of CHAPTER_ORDER) {
      for (const shelf of shopShelves(state({ chapter }), chapter)) {
        expect(shelf.shirts.length, `${chapter}/${shelf.id}`).toBeGreaterThan(0)
      }
    }
  })

  it('filters the rail by sport, because this club has two teams', () => {
    const chapter = '2000-double'
    const vests = shopShelves(state({ chapter }), chapter, 'basketball').flatMap((s) => s.shirts)
    expect(vests.length).toBeGreaterThan(0)
    for (const shirt of vests) expect(shirt.kind).toBe('basketball')
    const kits = shopShelves(state({ chapter }), chapter, 'football').flatMap((s) => s.shirts)
    expect(vests.length + kits.length).toBe(onSale(chapter).length)
  })

  it('marks as new exactly what arrived since the last chapter', () => {
    for (const chapter of CHAPTER_ORDER) {
      const fresh = arrivedBetween(previousChapter(chapter), chapter).map((shirt) => shirt.id)
      const marked = onSale(chapter)
        .filter((shirt) => isNewThisChapter(shirt, chapter))
        .map((shirt) => shirt.id)
      expect(marked.sort(), chapter).toEqual([...fresh].sort())
    }
    // and the first chapter of a life has no news: everything is new, so nothing is
    expect(arrivedBetween(null, CHAPTER_ORDER[0] as string)).toEqual([])
  })
})

// ---------------------------------------------------------------------------------
describe('סופרגול — מתי הדף הגיע לדלפק', () => {
  it('gives every page an arrival chapter derived from its own season', () => {
    for (const id of SET_ORDER) {
      const set = SETS[id]
      expect(typeof set.from, id).toBe('string')
      expect(chapterIndex(set.from), `${id} arrives in a chapter this life plays`).toBeGreaterThanOrEqual(0)
      const season = /(\d{4})/.exec(set.seasonHe)
      if (!season) continue
      // the page says a year on its own face: it cannot reach a counter before it
      expect(chapterYear(set.from) ?? 0, `${id} — ${set.seasonHe}`).toBeGreaterThanOrEqual(
        Number(season[1]),
      )
    }
  })

  it('keeps the 1985/86 album off a counter in 1984', () => {
    // The defect the `from` field exists for. Before it, `setSoldIn` answered '8586' in
    // every eighties chapter, so Rafi was selling packets of a season that had not been
    // played — the exact thing `onSale` has stopped a SHIRT doing since 5.9.2026.
    expect(SETS['8586'].from).toBe('a4-shirt')
    expect(setsBy('a2-alley').map((set) => set.id)).not.toContain('8586')
    expect(setSoldIn(state({ chapter: 'a2-alley' }))).not.toBe('8586')
    expect(setsBy('a4-shirt').map((set) => set.id)).toContain('8586')
    expect(setSoldIn(state({ chapter: 'a4-shirt' }))).toBe('8586')
  })

  it('never puts a page that was only ever kept on a counter', () => {
    const counters = new Set(setsBy('2000-double').map((set) => set.id))
    for (const id of SET_ORDER) {
      if (SETS[id].soldIn === null) expect(counters.has(id), id).toBe(false)
    }
  })

  it('answers what arrived between two chapters, and nothing at the start of a life', () => {
    expect(setsArrivedBetween(null, '1990')).toEqual([])
    expect(setsArrivedBetween('a7-week', '1986')).toEqual([])
    expect(setsArrivedBetween('1991', '1993-cup').map((set) => set.id)).toEqual(['9293'])
  })

  it('actually has arrivals to announce, in more than one decade', () => {
    // Rule 66: a threshold nothing can reach is dead content. An announcement nothing
    // ever triggers is the same defect wearing a different hat — so the feature is
    // asserted to FIRE, by name, rather than merely to compile.
    const news = CHAPTER_ORDER.flatMap((chapter) =>
      newSetsIn(chapter).map((set) => `${chapter}:${set.id}`),
    )
    expect(news).toContain('a4-shirt:8586')
    expect(news).toContain('1990:sg90')
    expect(news).toContain('1993-cup:9293')
    expect(news.length).toBeGreaterThanOrEqual(3)
  })

  it('announces each album exactly once in a life', () => {
    const seen = CHAPTER_ORDER.flatMap((chapter) => newSetsIn(chapter).map((set) => set.id))
    expect(new Set(seen).size).toBe(seen.length)
  })
})

// ---------------------------------------------------------------------------------
describe('סופרגול — הדלפק', () => {
  it('prices a packet in the money of the chapter it is standing in', () => {
    for (const chapter of CHAPTER_ORDER) {
      expect(packetShekels(chapter), chapter).toBe(PACKET[decadeOf(chapter)])
    }
    expect(packetShekels('1986')).toBe(PACKET['80s'])
    expect(packetShekels('2000-title')).toBe(PACKET['00s'])
  })

  it('counts the page the counter is selling, so the stand can print a real progress', () => {
    const id = setSoldIn(state()) as NonNullable<ReturnType<typeof setSoldIn>>
    expect(stuckIn(state(), id)).toBe(0)
    const two = stickersIn(id).slice(0, 2)
    const flags = Object.fromEntries(two.map((sticker) => [stickerFlag(sticker.id), 1]))
    expect(stuckIn(state({ flags }), id)).toBe(2)
  })

  it('shuts the counter in a decade nobody printed an album for, and does not invent one', () => {
    // Maor's folder holds 1980/81, 1985/86, three eighties sheets, 1992/93, a nineties
    // sheet, 1997/98 and 1996. Nothing from the 2000s — so the last two chapters have no
    // album, `setSoldIn` answers null, and the honest thing is to SAY so. A page of names
    // for a season nobody photographed would be the fabrication rule 11 forbids.
    for (const chapter of ['2000-title', '2000-double']) {
      expect(decadeOf(chapter)).toBe('00s')
      expect(setSoldIn(state({ chapter })), chapter).toBeNull()
    }
    // and it is shut for want of stock, not because the whole feature died: the album is
    // still there and the boy still owns what he stuck in
    expect(setsBy('2000-double').length).toBeGreaterThan(0)
  })
})

// ---------------------------------------------------------------------------------
/**
 * שני שומרים שקוראים מקור, ושניהם על באגים שמסך לא מראה.
 *
 * A rendering test would have passed on both of these: the shop looked perfect, and the
 * thing that was wrong only appeared when a SECOND overlay opened on top of it.
 */
describe('החנות — מה שאי אפשר לראות בצילום מסך', () => {
  const read = (path: string) => readFileSync(join(ROOT, path), 'utf8')
  /**
   * Comments are stripped FIRST, and that is not tidiness.
   *
   * The first draft read the raw file, and the first `z-[…]` in this component is the
   * sentence in its own header explaining that it used to be `z-[95]` — so the guard
   * reported 95 on a file that renders 60, i.e. it read the story instead of the code.
   * The same shape as `tests/brand.test.ts` stripping comments before hunting colours.
   */
  const code = (text: string) =>
    text
      .replace(/\/\*[\s\S]*?\*\//g, ' ')
      .split('\n')
      .filter((line) => !line.trim().startsWith('//'))
      .join('\n')
  const zOf = (path: string) => {
    const hit = /z-\[(\d+)\]/.exec(code(read(path)))
    return Number(hit?.[1] ?? 0)
  }

  it('sits UNDER the two cards it opens', () => {
    // The shop was `z-[95]`. `PacketCard` is `z-[62]` and `ShirtCard` is `z-[95]` rendered
    // EARLIER in `app/life/LifeStage.tsx`, and at an equal z-index the later sibling wins
    // — so the shirt reveal that a purchase in this screen fires was painting behind the
    // screen that fired it, and a packet opened at the counter would have done the same.
    // It is a sheet and it now sits at the sheet's own `z-[60]`, like the album.
    const shop = zOf('components/life/ShopCard.tsx')
    expect(shop).toBe(60)
    expect(shop).toBeLessThan(zOf('components/life/PacketCard.tsx'))
    expect(shop).toBeLessThan(zOf('components/life/ShirtCard.tsx'))
    // and being a dialog is what puts it inside the rule-33 guard at all
    expect(read('components/life/ShopCard.tsx')).toContain('role="dialog"')
  })

  it('never dispatches — the counter asks the engine, it does not spend the money', () => {
    // `{ e: 'packet' }` in `lib/life/runtime/dialogue.ts` takes the shekels, deals three
    // stickers, may close a page and may turn the red box over. A component that did any
    // of that itself would be a second, quieter copy of the economy.
    const text = read('components/life/ShopCard.tsx')
    expect(/\bdispatch\s*\(/.test(text), 'the shop dispatches an event').toBe(false)
    expect(/\{\s*t:\s*'/.test(text), 'the shop builds a life event').toBe(false)
    expect(text).toContain('onPacket')
  })
})
