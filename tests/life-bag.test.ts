import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { apply, emptyState } from '@/lib/life/events'
import { CHAPTERS } from '@/lib/life/content/chapters'
import { ITEMS } from '@/lib/life/content/chapter1986'
import { RARITY_LABEL } from '@/lib/life/redbox'
import { SHIRTS, shirtFlag, wornFlag } from '@/lib/life/shirts'
import { SHIRT, TICKET, decadeOf } from '@/lib/life/prices'
import {
  carriedReading,
  clothingIsShirt,
  presenceReading,
  purseReading,
  redBoxReading,
  wardrobeReading,
} from '@/lib/life/profile'
import type { LifeState, PlayerIdentity, PresenceMode, RedBoxItem } from '@/lib/life/types'

/**
 * התיק שלי — the bag, and the one sentence this suite exists to hold.
 *
 * Maor calls `life.profile` "התיק שלי". A bag is **what you are carrying and what you
 * kept**, and for four passes this screen was a character sheet: the Red Heart, wellbeing,
 * personality, relationships, and one shelf of objects at the very bottom. Six fields of
 * `LifeState` were authored, folded, tested and invisible — `inventory`, `savings`,
 * `clothing`, `presence`, `memories` and `RedBoxItem.rarity`.
 *
 * Two rules are load-bearing and both are guarded here:
 *
 *  · **Rule 46, restated as 63א on 15.9.2026.** Maor kept the percentages on
 *    `GaugesSheet` and kept them off this card: *"הגיליון עונה 'כמה', הכרטיס עונה 'מי
 *    אתה'."* So a bag that prints "7 items, 340 ₪" fails however handsome it is. Money is
 *    a word read against what that decade's money actually buys; a count is DRAWN as that
 *    many objects; rarity is a word about provenance and never a tier.
 *  · **Rule 68 — the wallet continues with the character.** The pocket and the tin are two
 *    pockets and the difference is the point: `agorot` goes everywhere with him,
 *    `savings` waits under the bed for something big. The HUD has only ever shown the
 *    first one.
 *
 * `tests/life-systems.test.ts` already holds `ProfileCard` to "no bars, no numbers". This
 * file WIDENS that to every file the bag is drawn out of, because a guard that names one
 * path is a guard you get around by adding a second file — and this pass added one.
 */

const ROOT = join(__dirname, '..')

/** rule 45: a life suite never types a year — it reads the one `CHAPTERS` declares */
const PLAYABLE = CHAPTERS.filter((chapter) => chapter.playable !== false)
const FIRST = PLAYABLE[0]
const IDENTITY = { name: 'פוגי', sex: 'boy', birthYear: (FIRST?.year ?? 0) - 6 } as PlayerIdentity

/** the chapter whose own id is the anchor key — the Saturday, not the alley two years before */
const SATURDAY = CHAPTERS.find((chapter) => chapter.id === chapter.anchorKey)

function life(over: Partial<LifeState> = {}, chapter = FIRST?.id ?? ''): LifeState {
  return { ...emptyState(IDENTITY, FIRST?.year ?? 0), chapter, ...over }
}

const keepsake = (over: Partial<RedBoxItem> = {}): RedBoxItem => ({
  id: 'k1',
  year: FIRST?.year ?? 0,
  atMinute: 900,
  sourceEventId: 'chapter:test',
  titleHe: 'ספח כרטיס',
  noteHe: 'קרטון קטן.',
  item: 'ticket-stub',
  rarity: 'rare',
  ...over,
})

// ---------------------------------------------------------------------------------
describe('בלי מספרים, בלי ברים — והשומר מכסה עכשיו את כל התיק', () => {
  /**
   * The list, not the file. `life-systems.test.ts` reads `ProfileCard.tsx` by name; this
   * pass split the bag's own drawing primitives into a second component, and a guard that
   * names one path would have stopped covering the half that moved.
   */
  // delta 90-H: the dossier's own components live in `components/life/profile/` — every one
  const DRAWN = [
    'components/life/ProfileCard.tsx',
    'components/life/BagShelf.tsx',
    ...readdirSync(join(ROOT, 'components/life/profile'))
      .filter((name) => name.endsWith('.tsx'))
      .map((name) => `components/life/profile/${name}`),
  ]

  it('draws no progress bar and prints no percentage anywhere the bag is drawn', () => {
    for (const path of DRAWN) {
      const text = readFileSync(join(ROOT, path), 'utf8')
      expect(/%\s*<\/|toFixed|Math\.round\(.*100/.test(text), `${path} is printing a value`).toBe(false)
      expect(text, path).not.toContain('role="progressbar"')
    }
  })

  it('never formats money on the bag — the pocket is a word, not a price tag', () => {
    // `formatMoney` is the shop's and the HUD's; importing it here is how "340 ₪" gets
    // onto a screen that is not allowed to carry a figure.
    for (const path of DRAWN) {
      const text = readFileSync(join(ROOT, path), 'utf8')
      expect(text, path).not.toContain('formatMoney')
      expect(text, path).not.toContain('state.agorot')
      expect(text, path).not.toContain('state.savings')
    }
  })

  it('carries no achievement vocabulary', () => {
    // Rule 63ב allows achievements now; it does NOT allow a single score, and the bag is
    // the last screen that should grow one.
    for (const path of [...DRAWN, 'lib/life/profile.ts', 'lib/life/personal.ts']) {
      const text = readFileSync(join(ROOT, path), 'utf8')
      for (const banned of ['הישג', 'ניקוד', 'תג ']) {
        expect(text.includes(banned), `${path} says ${banned}`).toBe(false)
      }
    }
  })
})

// ---------------------------------------------------------------------------------
describe('בכיס עכשיו — מה שהוא מחזיק, ורק להיום', () => {
  it('turns the inventory into named objects with the chapter’s own drawing', () => {
    const rows = carriedReading(life({ inventory: { bottle: 2, 'ticket-stub': 1 } }))
    const bottle = rows.find((row) => row.item === 'bottle')
    expect(bottle?.nameHe).toBe(ITEMS.bottle.nameHe)
    expect(bottle?.copies).toBe(2)
    expect(bottle?.more).toBe(false)
    expect(rows.find((row) => row.item === 'ticket-stub')?.art).toBeTruthy()
  })

  it('caps a very full pocket and SAYS it capped, rather than showing a smaller one', () => {
    const rows = carriedReading(life({ inventory: { bottle: 40 } }))
    expect(rows[0]?.copies).toBeLessThanOrEqual(8)
    expect(rows[0]?.more).toBe(true)
  })

  it('drops nothing it can name and names nothing it cannot draw', () => {
    const rows = carriedReading(life({ inventory: { bottle: 0, coin: 3 } }))
    expect(rows.map((row) => row.item)).toEqual(['coin'])
  })
})

// ---------------------------------------------------------------------------------
describe('שני כיסים — הארנק והפחית, וההבדל הוא כל העניין', () => {
  const decade = decadeOf(FIRST?.id ?? '')
  const ticket = TICKET[decade] * 100
  const shirt = SHIRT[decade] * 100

  it('reads each purse against the thing that purse is FOR', () => {
    const rich = purseReading(life({ agorot: ticket, savings: shirt }))
    expect(rich.find((row) => row.purse === 'pocket')?.band).toBe(3)
    expect(rich.find((row) => row.purse === 'tin')?.band).toBe(3)
  })

  it('does not read the tin as if it were the pocket', () => {
    // The tin is measured against a shirt and the pocket against a turnstile, so the same
    // agorot in the two pockets do not have to say the same thing. If a shirt and a ticket
    // ever cost the same in some decade this assertion is vacuous rather than wrong, and
    // the table (`prices.ts`) says they never do.
    expect(shirt).toBeGreaterThan(ticket)
    const rows = purseReading(life({ agorot: ticket, savings: ticket }))
    expect(rows.find((row) => row.purse === 'pocket')?.band).toBe(3)
    expect(rows.find((row) => row.purse === 'tin')?.band).toBeLessThan(3)
  })

  it('says empty in words, and says it about the right pocket', () => {
    const rows = purseReading(life({ agorot: 0, savings: 0 }))
    for (const row of rows) {
      expect(row.band).toBe(0)
      expect(row.readingHe.length).toBeGreaterThan(2)
      expect(/\d/.test(row.readingHe), 'a purse reading printed a figure').toBe(false)
    }
    // Two pockets, two different words: "ריק" is a pocket and "ריקה" is a tin.
    expect(rows[0]?.readingHe).not.toBe(rows[1]?.readingHe)
  })

  it('never returns a figure for any amount, in any decade', () => {
    for (const chapter of PLAYABLE) {
      for (const agorot of [0, 1, 500, 3000, 99000]) {
        for (const row of purseReading(life({ agorot, savings: agorot }, chapter.id))) {
          expect(/\d/.test(row.readingHe), `${chapter.id}/${agorot}`).toBe(false)
        }
      }
    }
  })
})

// ---------------------------------------------------------------------------------
describe('הארון — החולצה שנקנתה ב-1985 עדיין שם', () => {
  const owned = SHIRTS[0]

  it('shows an owned shirt with the provenance the archive holds for it', () => {
    const rows = wardrobeReading(life({ flags: { [shirtFlag(owned!.id)]: true } }))
    expect(rows).toHaveLength(1)
    expect(rows[0]?.nameHe).toBe(owned!.nameHe)
    expect(rows[0]?.sponsorHe).toBe(owned!.sponsorHe)
    expect(rows[0]?.yearsHe).toBe(owned!.yearsHe)
  })

  it('says every day he actually wore it, dated off the chapter registry', () => {
    const day = PLAYABLE[0]!
    const rows = wardrobeReading(
      life({ flags: { [shirtFlag(owned!.id)]: true, [wornFlag(owned!.id, day.id)]: true } }),
    )
    expect(rows[0]?.wornHe.map((entry) => entry.id)).toEqual([day.id])
    expect(rows[0]?.wornHe[0]?.dateHe).toBe(day.dateHe)
  })

  it('is empty for a boy who never bought one', () => {
    expect(wardrobeReading(life())).toEqual([])
  })

  /**
   * One purchase, two records. A4's `buy` dispatches BOTH `{ e: 'own', item: 'shirt85' }`
   * and `{ e: 'shirt', id: 'tveria85' }` for one shirt on one counter, so the wardrobe
   * reads the rich record and `clothingIsShirt` is what stops the plain one hanging beside
   * it as a second, poorer copy of the same garment. An `own:` item that is neither mapped
   * nor a shirt id would be a wardrobe row with no Hebrew behind it — this fails on one
   * rather than letting the screen quietly drop it.
   */
  it('accounts for every clothing item the content can grant', () => {
    const dir = join(ROOT, 'lib/life/content')
    const items = new Set<string>()
    for (const file of readdirSync(dir).filter((name) => name.endsWith('.ts'))) {
      const text = readFileSync(join(dir, file), 'utf8')
      for (const match of text.matchAll(/e:\s*'own',\s*item:\s*'([^']+)'/g)) items.add(match[1]!)
    }
    expect(items.size).toBeGreaterThan(0)
    for (const item of items) {
      const linked = clothingIsShirt(item) ?? item
      expect(
        SHIRTS.some((shirt) => shirt.id === linked),
        `clothing '${item}' has no shirt row and no entry in CLOTHING_IS_SHIRT`,
      ).toBe(true)
    }
  })
})

// ---------------------------------------------------------------------------------
describe('הקופסה האדומה — המילה שהייתה כתובה ואף פעם לא הודפסה', () => {
  it('prints the rarity every stored item has always carried', () => {
    const rows = redBoxReading(life({ redBox: [keepsake()] }))
    expect(rows[0]?.rarityHe).toBe(RARITY_LABEL.rare)
  })

  it('has a word for every rarity the box can roll', () => {
    for (const rarity of Object.keys(RARITY_LABEL) as (keyof typeof RARITY_LABEL)[]) {
      const rows = redBoxReading(life({ redBox: [keepsake({ rarity })] }))
      expect(rows[0]?.rarityHe, rarity).toBe(RARITY_LABEL[rarity])
      expect(/\d/.test(rows[0]!.rarityHe), rarity).toBe(false)
    }
  })

  it('does not turn five rarities into five tiers', () => {
    // `common` gets no plate. The moment a scale is legible somebody starts climbing it,
    // and the Red Box is the one object in this game that must never be farmed.
    expect(redBoxReading(life({ redBox: [keepsake({ rarity: 'common' })] }))[0]?.standout).toBe(false)
    expect(redBoxReading(life({ redBox: [keepsake({ rarity: 'unique_memory' })] }))[0]?.standout).toBe(true)
  })

  it('hands the share button the row it needs, unchanged', () => {
    const item = keepsake()
    expect(redBoxReading(life({ redBox: [item] }))[0]?.source).toBe(item)
  })
})

// ---------------------------------------------------------------------------------
describe('איפה הייתי — נוכחות היא מסלול, לא ריק', () => {
  const anchor = SATURDAY?.anchorKey ?? ''

  it('turns a recorded presence into a dated row with a Hebrew word', () => {
    const state = apply(life(), { t: 'presence.recorded', anchorId: anchor, mode: 'late' })
    const rows = presenceReading(state)
    expect(rows).toHaveLength(1)
    expect(rows[0]?.dateHe).toBe(SATURDAY?.dateHe)
    expect(rows[0]?.modeHe?.length).toBeGreaterThan(1)
    expect(rows[0]?.wasThere).toBe(true)
  })

  it('has a word for every way a person can be present', () => {
    const modes: PresenceMode[] = [
      'inside',
      'late',
      'outside',
      'radio',
      'television',
      'army',
      'working',
      'heard-from-friend',
      'travelling',
      'archive-later',
    ]
    for (const mode of modes) {
      const state = apply(life(), { t: 'presence.recorded', anchorId: anchor, mode })
      expect(presenceReading(state)[0]?.modeHe, mode).toBeTruthy()
    }
  })

  it('keeps a day he was NOT at, because missing it is a route and not a blank', () => {
    const state = apply(life(), { t: 'anchor.missed', anchorId: anchor })
    const rows = presenceReading(state)
    expect(rows).toHaveLength(1)
    expect(rows[0]?.wasThere).toBe(false)
    expect(rows[0]?.modeHe).toBeNull()
  })

  /**
   * Seven chapters share the 1986 anchor key. The row is about the day the anchor happened
   * on, so the chapter whose own id IS the key wins — the Saturday, not the alley two
   * years before it. Picking the first match would have dated the championship to 1984.
   */
  it('dates an anchor to the chapter it belongs to, not to the first one that shares its key', () => {
    const sharing = CHAPTERS.filter((chapter) => chapter.anchorKey === anchor)
    expect(sharing.length).toBeGreaterThan(1)
    const state = apply(life(), { t: 'presence.recorded', anchorId: anchor, mode: 'inside' })
    expect(presenceReading(state)[0]?.titleHe).toBe(SATURDAY?.titleHe)
  })

  it('joins the keepsake the day left to the day it was left on', () => {
    let state = apply(life(), { t: 'presence.recorded', anchorId: anchor, mode: 'inside' })
    state = apply(state, {
      t: 'memory.kept',
      memory: { id: 'm1', item: 'ticket-stub', atMinute: 900, year: state.year, anchorId: anchor },
    })
    expect(presenceReading(state)[0]?.keepsake?.nameHe).toBe(ITEMS['ticket-stub'].nameHe)
  })

  it('is empty on a life that has not reached a match yet', () => {
    expect(presenceReading(life())).toEqual([])
  })
})
