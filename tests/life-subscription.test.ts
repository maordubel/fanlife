import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { CHAPTERS, playableChapters } from '@/lib/life/content/chapters'
import { apply, emptyState } from '@/lib/life/events'
import { shekels } from '@/lib/life/prices'
import {
  OFFERED,
  SEASONS,
  heldSeasons,
  holdsSeason,
  renewal,
  seasonFor,
  seasonOnSaleIn,
  streakOf,
  subFlag,
  subNewsFlag,
  subscriptionReading,
} from '@/lib/life/subscription'
import type { LifeState, PlayerIdentity } from '@/lib/life/types'
import { ALL_SCENES, SCENE, TICKET_OFFICE, exitInEra } from '@/lib/life/world/scenes'

/**
 * המנוי — nine photographed cards, one run, and one window to renew at.
 *
 * Maor, 16.9.2026: *"בוא נעשה שצריך בכל שנה לקנות מנוי, תעשה מחירים צמודים לשוק של אותה
 * שנה, יהיה ממש מדד של רצף מנויים."*
 *
 * The three things this suite exists to stop, in the order they would happen:
 *  1. somebody filling the two gaps in the archive with a plausible number (rule 11),
 *  2. somebody replacing the derived run with a stored counter, which drifts,
 *  3. somebody moving a season to a chapter and quietly making it unbuyable (rule 66).
 */

const PLAYABLE = playableChapters()
/** rule 45: a life suite never types a year — it reads the one `CHAPTERS` declares */
const YEAR = (id: string): number => CHAPTERS.find((chapter) => chapter.id === id)?.year ?? 0
const IDENTITY = { birthYear: (PLAYABLE[0]?.year ?? 0) - 6, nameHe: 'פוגי' } as unknown as PlayerIdentity

const life = (flags: Record<string, boolean> = {}, agorot = 0, chapter = '2000-double'): LifeState => {
  const base = emptyState(IDENTITY, PLAYABLE[0]?.year ?? 0)
  return { ...base, agorot, chapter, flags: { ...base.flags, ...flags } as LifeState['flags'] }
}
const holding = (...seasons: string[]) =>
  Object.fromEntries(seasons.map((season) => [subFlag(season), true])) as Record<string, boolean>

// --------------------------------------------------------------------------- הארכיון ---

describe('הכרטיסים — מה שהם מדפיסים, ומה שאין להם', () => {
  it('כל שורה מתומחרת נושאת מקור, וכל שורה בלי כרטיס לא נושאת מספר', () => {
    for (const season of SEASONS) {
      if (season.price === null) {
        // רול 11 בצורתו הכי פשוטה: אין כרטיס ⟸ אין מחיר, אין הנחה, אין מקור, אין מכירה.
        expect(season.sourceHe, `${season.id} has no card but claims a source`).toBeNull()
        expect(season.listPrice, `${season.id} has no card but carries a list price`).toBeUndefined()
        expect(season.discount, `${season.id} has no card but carries a discount`).toBeUndefined()
        expect(season.onSaleIn, `${season.id} has no card and may not be sold`).toBeNull()
      } else {
        expect(season.sourceHe, `${season.id} prints a price with no source`).toBeTruthy()
        expect(season.price, `${season.id} is priced at ${season.price}`).toBeGreaterThan(0)
        expect(Number.isInteger(season.price), `${season.id} is not whole shekels`).toBe(true)
      }
    }
  })

  /**
   * שתי העונות בלי כרטיס, בשמן.
   *
   * Named rather than counted, because "two rows have no price" stays true if somebody
   * prices 1992/93 and blanks 1994/95 by mistake. The gap is a fact about the shoebox,
   * so the fact is what the test holds.
   */
  it('1992/93 ו-1997/98 הן העונות שאין להן כרטיס — ורק הן', () => {
    const blank = SEASONS.filter((season) => season.price === null).map((season) => season.id)
    expect(blank).toEqual(['1992/93', '1997/98'])
  })

  it('אף מחיר אינו אינטרפולציה של שכניו', () => {
    // The shape a helpful refactor takes: 1992/93 sitting halfway between 350 and 550.
    for (const season of SEASONS) {
      if (season.price !== null) continue
      const at = SEASONS.indexOf(season)
      const before = SEASONS[at - 1]?.price ?? null
      const after = SEASONS[at + 1]?.price ?? null
      expect(before === null || after === null || season.price === null).toBe(true)
    }
  })

  it('1990/91 שומר את שלושת המספרים שהכרטיס מדפיס, ומשלם את השלישי', () => {
    const season = seasonFor('1990/91')
    expect(season?.listPrice).toBe(150)
    expect(season?.discount).toBe(15)
    expect(season?.price).toBe(135)
    expect((season?.listPrice ?? 0) - (season?.discount ?? 0)).toBe(season?.price)
  })

  /**
   * הקטגוריות שונות בין הכרטיסים, וזה הילד שגדל.
   *
   * אב ובן ב-1991 ו-1993, ילד/נוער/חייל באמצע, חבר ב-2000. A pass that decided nine
   * products were one product would flatten exactly this, and it would look tidier.
   */
  it('הקטגוריה משתנה לאורך החיים ואינה שדה אחיד', () => {
    expect(seasonFor('1991/92')?.category).toBe('fatherAndSon')
    expect(seasonFor('1993/94')?.category).toBe('fatherAndSon')
    expect(seasonFor('1994/95')?.category).toBe('youth')
    expect(seasonFor('1996/97')?.category).toBe('soldier')
    expect(seasonFor('2000/01')?.category).toBe('member')
    expect(new Set(SEASONS.map((season) => season.category)).size).toBeGreaterThan(3)
  })

  it('העונה שהמנוע כותב איננה העונה שהכרטיס מדפיס, ושתיהן נשמרות', () => {
    // `id` is persisted (rule 35) and `printedHe` is what that year's card actually says.
    expect(seasonFor('1990/91')?.printedHe).toBe('90/91')
    expect(seasonFor('1994/95')?.printedHe).toBe('94/95')
    expect(seasonFor('1999/00')?.printedHe).toBe('99/00')
    for (const season of SEASONS) expect(season.id).toMatch(/^\d{4}\/\d{2}$/)
  })

  it('העונות בסדר עולה ואין כפילות', () => {
    const ids = SEASONS.map((season) => season.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect([...ids]).toEqual([...ids].sort())
  })
})

// ----------------------------------------------------------------------- איפה נמכרות ---

describe('איפה ומתי — כל עונה שנמכרת נמכרת בפרק שקיים', () => {
  it('כל `onSaleIn` הוא פרק שהמשחק באמת משחק', () => {
    const ids = PLAYABLE.map((chapter) => chapter.id)
    for (const season of OFFERED) expect(ids, `${season.id} → ${season.onSaleIn}`).toContain(season.onSaleIn)
  })

  it('שני פרקים לא פותחים את אותה עונה, ופרק לא פותח שתיים', () => {
    const chapters = OFFERED.map((season) => season.onSaleIn as string)
    expect(new Set(chapters).size).toBe(chapters.length)
  })

  it('הפרק שמוכר עונה הוא פרק מהשנה שבה היא נפתחה', () => {
    // A subscription for 1996/97 goes on sale in 1996. A row that drifts a year is a row
    // selling a card that does not exist yet, and nothing else would notice.
    for (const season of OFFERED) {
      expect(YEAR(season.onSaleIn as string), `${season.id} in ${season.onSaleIn}`).toBe(Number(season.id.slice(0, 4)))
    }
  })

  /**
   * 1995/96 — כרטיס אמיתי בקיץ שאין בו פרק.
   *
   * Asserted by name so that adding a 1995 chapter is a deliberate act with a test that
   * says what it changed, rather than a row that silently starts selling.
   */
  it('1995/96 היא הכרטיס היחיד שיש לו מחיר ואין לו קיץ במשחק', () => {
    const stranded = SEASONS.filter((season) => season.price !== null && season.onSaleIn === null)
    expect(stranded.map((season) => season.id)).toEqual(['1995/96'])
    expect(PLAYABLE.some((chapter) => chapter.year === 1995)).toBe(false)
  })
})

// ---------------------------------------------------------------------------- הדלת ---

/**
 * ------------------------------------------------------------------------------------
 * **ההחלטה השתנתה ב-17.9.2026, ולכן ארבעה שומרים כאן מחליפים צד ולא נמחקים.**
 *
 * This block used to be called *"דלת אחת, חדר אחד, וציור שלא היה בשימוש"* and it asserted,
 * in four places, that the ticket office IS `undercroft` — the concourse under Bloomfield's
 * stand — and that its one door hangs off the gate seven forecourt. Every one of those was
 * true and every one of them was right to be asserted.
 *
 * Maor changed the decision, in his own words:
 *
 *   *"אני רוצה לייצר משרד כרטיסים בפני עצמו ולא כחלק ממקום קיים, אלא לפתוח מקום חדש."*
 *
 * — with a painting to go with it: an interior signed **קופת כרטיסים - תל אביב**, with a
 * street through its left-hand doorway. So the room is a shop in town, its painting is
 * `ticketOffice`, and its one door is on Allenby.
 *
 * This is rule 47's distinction and rule 68's precedent: *"תמחק, הבדיקה אדומה" אסור;
 * "ההחלטה השתנתה, בעל הבית אמר, השומר משנה צד" — זה מה ששומר על החלטה מלהיסחף חזרה
 * בריפקטור חצי שנה מהיום.* What the four guards protect is UNCHANGED and is the whole
 * point of keeping them: one room, one painting nobody else uses, exactly one way in,
 * exactly the years that have a card to sell, and a route to the door that exists in
 * every one of them. Only the names in them moved.
 * ------------------------------------------------------------------------------------
 */
describe('קופת כרטיסים — דלת אחת, חדר אחד, וציור משלו', () => {
  const office = SCENE[TICKET_OFFICE as keyof typeof SCENE]

  it('החדר קיים, ויש ממנו דרך החוצה', () => {
    expect(office).toBeDefined()
    expect(office.exits.length).toBeGreaterThan(0)
    expect(office.exits.every((exit) => exit.to === 'allenby')).toBe(true)
  })

  it('הוא משתמש ב-`ticketOffice` — הציור שנמסר בשבילו, ובשום חדר אחר', () => {
    expect(office.art).toBe('ticketOffice')
    const others = ALL_SCENES.filter((scene) => scene.id !== office.id)
    // one room, one painting: if a second scene ever takes it, this says so out loud
    expect(others.some((scene) => scene.art === 'ticketOffice')).toBe(false)
    // and `undercroft` is not the office: from 16.9.2026 it was a painting with no scene, and
    // from 27.9.2026 it is its own room — under Bloomfield's stand, 1990 (`world/city2027/
    // stadiumSide.ts`). Flipped, not deleted (rule 80): exactly one room, and never this one.
    expect(ALL_SCENES.filter((scene) => scene.art === 'undercroft').map((scene) => scene.id)).toEqual(['undercroft'])
  })

  it('הדלת יוצאת מאלנבי ורק משם', () => {
    const ways = ALL_SCENES.filter((scene) => scene.exits.some((exit) => exit.to === TICKET_OFFICE))
    expect(ways.map((scene) => scene.id)).toEqual(['allenby'])
  })

  /**
   * ודלת שנפתחת לפני שיש מה לקנות היא תוכן מת (כלל 66).
   *
   * The first season ticket in the archive is 90/91, so the door is a nineties door. The
   * two statements have to agree or one of them is wrong.
   */
  it('הדלת פתוחה בדיוק בפרקים שיש בהם מנוי למכור', () => {
    const gate = SCENE['allenby'].exits.find((exit) => exit.id === 'tickets')
    expect(gate).toBeDefined()
    for (const chapter of PLAYABLE) {
      const sells = OFFERED.some((season) => season.onSaleIn === chapter.id)
      if (sells) expect(exitInEra(gate!, chapter.id), `${chapter.id} sells a season behind a shut door`).toBe(true)
    }
    // …and it is not open in Stage A, where nothing is on sale
    expect(exitInEra(gate!, 'a4-shirt')).toBe(false)
  })

  it('הפינה שאפשר להגיע דרכה אליו קיימת בכל שנה', () => {
    // The office hangs off Allenby, so Allenby has to be reachable from the neighbourhood
    // in every year — the door in and the door on are one route or neither works.
    const town = SCENE['street'].exits.find((exit) => exit.to === 'allenby')
    expect(town).toBeDefined()
    expect(town!.era).toBeUndefined()
    expect(town!.when, 'the way into town may not be gated — the office hangs off it').toBeUndefined()
  })
})

// ---------------------------------------------------------------------------- הדגל ---

describe('הדגל — מנוי שורד יום חדש ושנה חדשה', () => {
  /**
   * The same proof `tests/life-wallet.test.ts` gives the wallet, for the same reason.
   * `personFlags()` erases everything at `day.entered`/`year.entered` except nine
   * prefixes, and a subscription is worth nothing at all if it is one of the ones erased:
   * a run of seasons that resets every chapter is not a run.
   */
  it('`own:sub:` שורד `day.entered`', () => {
    const after = apply(life(holding('1990/91'), 500), {
      t: 'day.entered',
      dayId: 'a5-first',
      year: YEAR('a5-first'),
      weekday: 6,
      minute: 780,
    })
    expect(after.flags[subFlag('1990/91')]).toBe(true)
  })

  it('`own:sub:` שורד `year.entered` — עשר שנים אחר כך הוא עדיין מנוי', () => {
    let state = life(holding('1990/91', '1991/92'), 0)
    for (const chapter of ['1993-cup', '1996-army', '2000-double']) {
      state = apply(state, { t: 'year.entered', year: YEAR(chapter), weekday: 6, minute: 780 })
    }
    expect(heldSeasons(state).map((season) => season.id)).toEqual(['1990/91', '1991/92'])
  })

  it('גם דגל ההכרזה שורד, כדי שהפופ-אפ לא יחזור מחר', () => {
    const after = apply(life({ [subNewsFlag('1996/97')]: true }), {
      t: 'year.entered',
      year: YEAR('1998-laces'),
      weekday: 6,
      minute: 780,
    })
    expect(after.flags[subNewsFlag('1996/97')]).toBe(true)
  })

  it('שני הדגלים יושבים על התחילית ששורדת, ולא על שם דומה לה', () => {
    expect(subFlag('1994/95')).toBe('own:sub:1994/95')
    expect(subNewsFlag('1994/95')).toBe('own:subnews:1994/95')
  })
})

// ---------------------------------------------------------------------------- הרצף ---

describe('עונה אחרי עונה — נמדד מהדגלים, לא נשמר', () => {
  it('אפס בלי מנוי, ואחד אחרי הראשון', () => {
    expect(streakOf(life({}, 0, '1990'))).toBe(0)
    expect(streakOf(life(holding('1990/91'), 0, '1990'))).toBe(1)
  })

  it('עולה עונה-עונה לכל אורך החיים', () => {
    const all = OFFERED.map((season) => season.id)
    expect(streakOf(life(holding(...all), 0, '2000-double'))).toBe(all.length)
  })

  it('קיץ שפוספס עוצר את הספירה, וזה כל העניין', () => {
    const state = life(holding('1990/91', '1991/92', '1993/94', '1996/97', '1998/99'), 0, '1998-laces')
    // 1994/95 was skipped, so the run he is ON is 1996/97 → 1998/99 and not the whole file
    expect(streakOf(state)).toBe(2)
  })

  /**
   * ועונה שהמשחק לא הציע אינה קיץ שהוא פספס.
   *
   * 1995/96 has a card and no chapter to sell it in; 1992/93 and 1997/98 have no card at
   * all. Counting the run on the calendar would print, on the player's own card, that he
   * let the subscription lapse in a year nobody could have renewed in — a claim about the
   * man built out of a gap in a shoebox.
   */
  it('העונות שאי אפשר לקנות אינן שוברות את הרצף', () => {
    const unbuyable = ['1992/93', '1995/96', '1997/98']
    const state = life(holding('1994/95', '1996/97'), 0, '1996-army')
    expect(streakOf(state)).toBe(2)
    for (const id of unbuyable) expect(holdsSeason(state, id)).toBe(false)
  })

  it('סופר רק את מה שהחיים כבר הגיעו אליו', () => {
    // Holding 2000/01 in 1991 is not a run of eight; nothing after the current chapter counts.
    const state = life(holding('1990/91', '1991/92', '2000/01'), 0, '1991')
    expect(streakOf(state)).toBe(2)
  })

  it('אין מונה בסטייט — הרצף הוא קריאה', () => {
    const source = readFileSync(join(process.cwd(), 'lib/life/subscription.ts'), 'utf8')
    // a stored counter would need a writer; there is none, and there must not be one
    expect(source).not.toMatch(/streak\s*[+-]=|streak:\s*state\./)
    const state = life(holding('1990/91'), 0, '1990')
    expect(Object.keys(state).some((key) => key.toLowerCase().includes('streak'))).toBe(false)
  })
})

// --------------------------------------------------------------------------- הקנייה ---

describe('החידוש — מה יוצא מהכיס, ולמה זה לא המחיר המלא', () => {
  it('משלם את מה שיש, עד המחיר, ולעולם לא יותר', () => {
    const season = seasonFor('1994/95')!
    expect(renewal(season, life({}, 0)).fromPocket).toBe(0)
    expect(renewal(season, life({}, 1200)).fromPocket).toBe(1200)
    expect(renewal(season, life({}, 999_999)).fromPocket).toBe(shekels(250))
    expect(renewal(season, life({}, 999_999)).covered).toBe(0)
  })

  it('מה שחסר נאמר, ולא נבלע', () => {
    const season = seasonFor('1993/94')!
    const { fromPocket, covered, priceAgorot } = renewal(season, life({}, 4000))
    expect(fromPocket + covered).toBe(priceAgorot)
    expect(covered).toBe(shekels(550) - 4000)
  })

  /**
   * וזאת הסיבה שהסף אינו המחיר, במספרים.
   *
   * `npm run life:budget` (16.9.2026) gives the cumulative agorot ceiling at each chapter
   * that opens a season — every positive money delta the whole game can declare up to
   * that point, all taken by one player, with no clock and no exclusivity. SEVEN of the
   * eight printed prices are above it. A `minAgorot: shekels(price)` gate would therefore
   * have been seven branches nobody could ever take: rule 66, and precisely the defect
   * that made `own:heart:shirt85` unreachable in the chapter named after that shirt.
   *
   * **The eighth is 1999/00, and it is worth knowing which one it is.** 410 ₪ against a
   * 442 ₪ ceiling — a boy who took every single agora available in thirteen chapters and
   * spent none of it could cover that one card in full, and nothing else. A design built
   * on "nobody can ever pay" would have been built on a claim that is false for one row.
   *
   * The ceilings are written down here rather than recomputed, on purpose: this test is
   * the RECORD of the measurement that shaped the design. If the economy grows enough for
   * another price to become payable in full, this fails and somebody gets to decide out
   * loud whether the counter should start refusing people.
   */
  it('שבעה מתוך שמונה המחירים אינם ברי-השגה מהכיס, ו-1999/00 הוא היחיד שכן', () => {
    const CEILING: Record<string, number> = {
      '1990': 7800,
      '1991': 7800,
      '1993-galil': 15900,
      '1995-sinai': 15900,
      '1996-army': 24400,
      '1998-laces': 32200,
      '1999-cup': 44200,
      '2000-double': 67200,
    }
    const payable: string[] = []
    for (const season of OFFERED) {
      const ceiling = CEILING[season.onSaleIn as string]
      expect(ceiling, `no measured ceiling for ${season.onSaleIn}`).toBeDefined()
      if (shekels(season.price as number) <= (ceiling as number)) payable.push(season.id)
    }
    expect(payable, 'the set of seasons a saint could pay for in full has changed').toEqual(['1999/00'])
  })

  it('ולכן החלון לעולם לא מסרב — יש תמיד דרך אחת בלי תנאי (כלל 42)', () => {
    for (const season of OFFERED) {
      const { fromPocket, priceAgorot } = renewal(season, life({}, 0))
      expect(fromPocket).toBe(0)
      expect(priceAgorot).toBeGreaterThan(0)
    }
  })
})

// --------------------------------------------------------------------------- הכרטיס ---

describe('מה שהכרטיס בפרופיל מקבל', () => {
  it('ריק לגמרי כשאין מנוי — הכרטיס לא מצייר מדף ריק', () => {
    const reading = subscriptionReading(life())
    expect(reading.seasonsHe).toEqual([])
    expect(reading.currentHe).toBeNull()
    expect(reading.streak).toBe(0)
  })

  it('העונות מהישנה לחדשה, והאחרונה היא זו שבכיס', () => {
    const reading = subscriptionReading(life(holding('1991/92', '1990/91', '1998/99'), 0, '1998-laces'))
    expect(reading.seasonsHe).toEqual(['1990/91', '1991/92', '1998/99'])
    expect(reading.currentHe).toBe('1998/99')
  })

  it('הכרטיס מקבל מספר אחד בלבד, והוא מצויר כסימנים', () => {
    // rule 46 / 63א: the profile card answers "who are you", never "how much"
    const reading = subscriptionReading(life(holding('1990/91', '1991/92'), 0, '1991'))
    expect(reading.streak).toBe(2)
    // delta 90-H: the bag's money drawer draws the card now (`ProfileCard` routes to it)
    const card = readFileSync(join(process.cwd(), 'components/life/profile/MoneyAndSubscriptions.tsx'), 'utf8')
    expect(card).toContain('<Marks n={Math.min(subscription.streak, 12)} />')
    expect(card).not.toMatch(/\{subscription\.streak\}/)
  })
})

// ------------------------------------------------------------------------ המילה ---

describe('השפה', () => {
  /**
   * `tests/life-story.test.ts` bans 'רצף' from authored content, and it bans it because
   * it is the vocabulary of a leaderboard. The word this system uses to a player is
   * **עונה אחרי עונה** — what somebody actually says about a subscription they never let
   * lapse — and it is the word `ProfileCard` was already built around (`life.bag.subRun`).
   */
  it('שום מחרוזת שהשחקן קורא איננה בשפה של טבלת ניקוד', () => {
    const files = ['lib/life/subscription.ts', 'components/life/SeasonTicket.tsx']
    for (const file of files) {
      const text = readFileSync(join(process.cwd(), file), 'utf8')
      for (const banned of ['הישג', 'ניקוד', 'תג ']) {
        expect(text.includes(banned), `${file} carries "${banned}"`).toBe(false)
      }
    }
  })

  it('הכרטיס לא מחזיק מנוע ולא שולח אירועים — הקופה בקליפה (כמו ShopCard)', () => {
    const card = readFileSync(join(process.cwd(), 'components/life/SeasonTicket.tsx'), 'utf8')
    expect(card).not.toMatch(/dispatch\(/)
    expect(card).not.toMatch(/\{\s*t:\s*'/)
  })

  it('אין מחיר כתוב בקוד — כל מספר בא מהשורה של הכרטיס', () => {
    /**
     * Comments and class names are stripped first, and that is not a loophole — it is the
     * difference between the two things a digit can be in a `.tsx`. `text-[13px]` and a
     * paragraph explaining that the 1990/91 card prints 150/15/135 are both fine; a `135`
     * the renderer can reach is a second copy of an archive row (rule 59).
     */
    const raw = readFileSync(join(process.cwd(), 'components/life/SeasonTicket.tsx'), 'utf8')
    const card = raw
      .replace(/\/\*[\s\S]*?\*\//g, ' ')
      .replace(/\/\/[^\n]*/g, ' ')
      .replace(/className="[^"]*"/g, ' ')
      .replace(/className=\{`[^`]*`\}/g, ' ')
    for (const season of SEASONS) {
      if (season.price === null) continue
      expect(card.includes(String(season.price)), `${season.price} is typed into the card`).toBe(false)
    }
  })
})

describe('הפופ-אפ נורה מהמקום שבו נורים השניים האחרים', () => {
  it('`WorldScene` מכריז על המנוי ליד החולצה והאלבום', () => {
    const scene = readFileSync(join(process.cwd(), 'lib/life/runtime/scenes/WorldScene.ts'), 'utf8')
    expect(scene).toContain('this.announceNewShirts()')
    expect(scene).toContain('this.announceNewAlbums()')
    expect(scene).toContain('this.announceSeasonTicket()')
    // and the announcement is once per season, on the prefix that survives a new day
    expect(scene).toContain('subNewsFlag(season.id)')
  })

  it('`seasonOnSaleIn` עונה בדיוק לפרקים שמוכרים', () => {
    for (const chapter of PLAYABLE) {
      const expected = OFFERED.find((season) => season.onSaleIn === chapter.id) ?? null
      expect(seasonOnSaleIn(chapter.id)?.id ?? null).toBe(expected?.id ?? null)
    }
  })
})
