import { chapterIndex } from './shirts'
import { shekels } from './prices'
import type { SubscriptionReading } from './profile'
import type { LifeState } from './types'

/**
 * המנוי — nine season tickets Maor kept, and the one object in this game that has to be
 * bought AGAIN every year.
 *
 * Maor, 16.9.2026: *"בוא נעשה שצריך בכל שנה לקנות מנוי, תעשה מחירים צמודים לשוק של אותה
 * שנה, יהיה ממש מדד של רצף מנויים… + בוא נוסיף 'משרד כרטיסים' גם במקום שצריך ללכת אליו."*
 *
 * Every other purchase in the life is a decision taken once: the shirt goes in the
 * wardrobe, the album keeps its page, the ticket stub goes in the red box. A subscription
 * is the opposite shape — it expires on its own, every summer, whatever you did last year,
 * and the only way to keep a run going is to go back and renew it. That is what a
 * supporter's life actually is, and until now nothing in the game measured it.
 *
 * ------------------------------------------------------------------------------------
 * **THE PRICES ARE PRIMARY SOURCES, and they are not a curve.**
 *
 * `prices.ts` is a per-DECADE table Maor set on 5.9.2026 — a ticket is 15/30/60/90, a
 * shirt is 30/60/110/160 — because those are prices nobody kept a receipt for. A season
 * ticket is the other case entirely: he photographed nine of his own, and each one PRINTS
 * its price, its category, its gate and its sponsor. So a subscription does not belong in
 * that table and does not take a decade's word for anything. Each row below is what one
 * card says, the way `content/manual/matches.json` carries `sourceTitle` and
 * `shirts.ts` carries `sourceHe` (rule 16 — the source is printed on the card the player
 * reads, not buried in a comment).
 *
 * **The categories differ between the cards, and that difference IS the boy growing up.**
 * 1991/92 and 1993/94 are אב ובן — one card with his father's name on it beside his own.
 * 1994/95 through 1998/99 are ילד / נוער / חייל — his own card, at the club's own
 * reduced rate, and in 1998/99 still "בליווי מבוגר בלבד". 2000/01 is חבר: a member.
 * Flattening nine different PRODUCTS into one price curve would have thrown away the only
 * thing the nine cards agree on, which is that they are not the same thing.
 *
 * **Two seasons in the span have no card, and they get no number.**
 * `1992/93` and `1997/98` are in the list with `price: null` and `sourceHe: null`. They
 * are here rather than absent because a silent gap looks like an oversight and a stated
 * gap is a fact: the shoebox has nine cards and eleven seasons passed. Nothing in this
 * file interpolates between 550 and 250, and `tests/life-subscription.test.ts` fails if a
 * price is ever invented for either of them. Rule 11, applied to a price.
 * The game already says one of these out loud, and said it before this file existed: the
 * cashier in `chapter1996army.ts` answers *"מנויים לעונה הבאה? עוד לא פתחנו"* — and the
 * season she is refusing to sell is 1997/98, the one with no card.
 *
 * **1995/96 is a real card that this build cannot sell**, because the playable life jumps
 * 1994 → 1996 and there is no chapter standing in the summer of 1995 for it to go on sale
 * in. `onSaleIn` is null and it is not counted as a break in the run (see `streakOf`).
 * The day a 1995 chapter is written, `onSaleIn` becomes its id and nothing else here
 * changes — the same promise rule 49 made about the 1986 placeholder, and kept.
 */
export type SeasonCategory =
  /** ילד — the club's child rate, his own card */
  | 'child'
  /** ילד / נוער — the same rate, printed with the older age on it too */
  | 'youth'
  /** ילד / חייל, or נוער with חייל beside it — the years the army rate applies to him */
  | 'soldier'
  /** אב ובן — one card, two people, and the father is the one who pays */
  | 'fatherAndSon'
  /** חבר — a member of the club, which is what he is at twenty-two */
  | 'member'

export type Season = {
  /**
   * '1990/91' — canonical, four digits, and NOT what the card prints.
   *
   * The club wrote the season three different ways across nine cards (`90/91`,
   * `1991/92`, `94/95`) and `printedHe` keeps each one. This is the id the save writes
   * into a flag and the order the run is counted in, so it may never follow the printing:
   * a persisted identifier is not a label (rule 35).
   */
  id: string
  /** exactly how THIS card writes its own season */
  printedHe: string
  category: SeasonCategory
  /** the category as the card prints it — `ילד , נוער`, `משולב אב ובן`, `חבר` */
  categoryHe: string
  /**
   * whole shekels, and the number the holder actually PAID.
   *
   * 1990/91 prints three numbers — המחיר 150, הנחה 15, תשלום 135 — and 135 is the one
   * that left a pocket. `listPrice`/`discount` keep the other two rather than losing
   * them, because a card that states a discount is a card that says something about the
   * club as well as about the price.
   *
   * `null` is a season with no card in the set. It is not a zero and not a guess.
   */
  price: number | null
  listPrice?: number
  discount?: number
  /** the gate printed on the card — Bloomfield's own numbering (rule 9) */
  gateHe: string | null
  /** one line of whatever else that particular card carries */
  noteHe: string
  /** rule 16 — printed on the purchase card, never only in a comment */
  sourceHe: string | null
  /**
   * the chapter whose first room puts this season on the counter, or null for a season
   * the playable life never stands in the summer of.
   */
  onSaleIn: string | null
}

/**
 * The cards, oldest first.
 *
 * Six of the nine were read off the scans in this session and their rows say so. Three —
 * 1995/96, 1996/97 and 2000/01 — are Maor's own transcription of cards in the same set,
 * and they carry HIS name as the source rather than a photograph's (rule 18: he is a
 * source, cited as one, not dressed up as something else).
 */
const CARD_HE = 'מנוי עונה מהארכיון של צוות The Worker — צילום הכרטיס, 16.9.2026'
const TOLD_HE = 'ידע אישי — צוות The Worker, הכרטיס נמסר ב-16.9.2026'

export const SEASONS: readonly Season[] = [
  {
    id: '1990/91',
    printedHe: '90/91',
    category: 'youth',
    categoryHe: 'מנוי לעונת המשחקים',
    price: 135,
    listPrice: 150,
    discount: 15,
    gateHe: 'שער 4–5',
    noteHe: 'מועדון הכדורגל הפועל תל-אביב. על הכרטיס פס שחור: "בנרגילה מוכרים כיף תימני". מספר מנוי 5673.',
    sourceHe: CARD_HE,
    onSaleIn: '1990',
  },
  {
    id: '1991/92',
    printedHe: '1991/92',
    category: 'fatherAndSon',
    categoryHe: 'אב ובן',
    price: 350,
    gateHe: 'שער 4',
    noteHe: 'מועדון הכדורגל הפועל תל-אביב, איצטדיון בלומפילד ביפו. מס׳ מנוי 1768.',
    sourceHe: CARD_HE,
    onSaleIn: '1991',
  },
  {
    /**
     * 1992/93 — אין כרטיס.
     *
     * There is no card for this season in the set, so there is no price for it here and
     * the game prints none. The life has no chapter in 1992 either, which is why this row
     * costs nothing to leave honest: it documents the gap instead of hiding it.
     */
    id: '1992/93',
    printedHe: '1992/93',
    category: 'youth',
    categoryHe: 'לא מתועד',
    price: null,
    gateHe: null,
    noteHe: 'אין כרטיס מהעונה הזאת בארכיון. לא יודעים כמה הוא עלה.',
    sourceHe: null,
    onSaleIn: null,
  },
  {
    id: '1993/94',
    printedHe: '1993/94',
    category: 'fatherAndSon',
    categoryHe: 'משולב אב ובן',
    price: 550,
    gateHe: 'שער 3',
    noteHe: 'מנוי ליגה לאומית, איצטדיון בלומפילד ביפו. בשוליים טור נקבים לגביע הטוטו. No. 1961.',
    sourceHe: CARD_HE,
    onSaleIn: '1993-galil',
  },
  {
    id: '1994/95',
    printedHe: '94/95',
    category: 'youth',
    categoryHe: 'ילד , נוער',
    price: 250,
    gateHe: 'שערים 4–5',
    noteHe: 'הפועל תל-אביב, איצטדיון בלומפילד ביפו. No. 2226.',
    sourceHe: CARD_HE,
    onSaleIn: '1995-sinai',
  },
  {
    /**
     * 1995/96 — כרטיס אמיתי, קיץ שהמשחק לא עוצר בו.
     *
     * The playable chapters go 1994 (`1995-sinai`) → 1996 (`1996-army`). Nothing stands
     * in the summer of 1995, so nobody can be sold this card, and `onSaleIn` says so
     * rather than an arbitrary chapter pretending. It is NOT a break in the run: see
     * `streakOf` — the run is counted over the seasons the game actually put on a
     * counter, because a year the game never played is not a year he skipped.
     */
    id: '1995/96',
    printedHe: '1995/96',
    category: 'soldier',
    categoryHe: 'ילד / נוער',
    price: 360,
    gateHe: 'שערים 4–5',
    noteHe: 'על אותו כרטיס מודפס גם התעריף לחייל.',
    sourceHe: TOLD_HE,
    onSaleIn: null,
  },
  {
    id: '1996/97',
    printedHe: '1996/97',
    category: 'soldier',
    categoryHe: 'ילד / חייל',
    price: 450,
    gateHe: 'שערים 4–5',
    noteHe: 'התעריף שהוא נכנס אליו בגיל שמונה־עשרה, מהצד השני של אותה מילה.',
    sourceHe: TOLD_HE,
    onSaleIn: '1996-army',
  },
  {
    /**
     * 1997/98 — אין כרטיס, והמשחק כבר אמר את זה.
     *
     * `chapter1996army.ts` has a cashier answering "מנויים לעונה הבאה? עוד לא פתחנו.
     * כשיהיה ברור — יהיה." That line was written in November 1996 and the season she is
     * talking about is this one. It is the season with no card in the set, and 1997 is the
     * year the club was in trouble (rule 46's B6 signs outside the ground). Two records
     * agreeing is worth more than either.
     */
    id: '1997/98',
    printedHe: '1997/98',
    category: 'youth',
    categoryHe: 'לא מתועד',
    price: null,
    gateHe: null,
    noteHe: 'אין כרטיס מהעונה הזאת בארכיון. "כשיהיה ברור — יהיה."',
    sourceHe: null,
    onSaleIn: null,
  },
  {
    id: '1998/99',
    printedHe: '1998/99',
    category: 'child',
    categoryHe: 'ילד — בליווי מבוגר בלבד',
    price: 500,
    gateHe: 'שער 2',
    noteHe: 'הפועל "כתר" ת״א, NIKE, איצטדיון בלומפילד ביפו. שורה 22, כסא 44. No. 3137.',
    sourceHe: CARD_HE,
    onSaleIn: '1998-laces',
  },
  {
    id: '1999/00',
    printedHe: '99/00',
    category: 'member',
    categoryHe: 'מנוי אכי״א',
    price: 410,
    gateHe: 'שערים 4–5',
    noteHe: 'הפועל "כתר" תל-אביב, NIKE. "סיבוב שלישי" בראש הכרטיס, וטור נקבים לגביע הטוטו. No. 905.',
    sourceHe: CARD_HE,
    onSaleIn: '1999-cup',
  },
  {
    id: '2000/01',
    printedHe: '2000/01',
    category: 'member',
    categoryHe: 'חבר',
    price: 900,
    gateHe: 'שער 13',
    noteHe: 'לא ילד, לא נוער, לא חייל. חבר.',
    sourceHe: TOLD_HE,
    onSaleIn: '2000-double',
  },
]

/** the seasons a life can actually be sold — the rest are archive, and say why */
export const OFFERED: readonly Season[] = SEASONS.filter((season) => season.onSaleIn !== null)

export const seasonFor = (id: string): Season | null => SEASONS.find((season) => season.id === id) ?? null

/** what this chapter puts on the counter, if anything */
export const seasonOnSaleIn = (chapter: string): Season | null =>
  OFFERED.find((season) => season.onSaleIn === chapter) ?? null

/**
 * `own:sub:1994/95` — and the prefix is the whole design.
 *
 * `personFlags()` in `events.ts` erases every flag at `day.entered` and `year.entered`
 * except nine prefixes, and `own:` is one of them. A season held in 1990 therefore has to
 * still be held in 2000 for the run to mean anything, and it is — by the same mechanism
 * that keeps a shirt in the wardrobe for fifteen years (rule 58, rule 68). A counter in
 * state would have been a counter to migrate, to reset by accident, and to drift; a flag
 * per season is a fact per season and the run is READ off them.
 */
export const subFlag = (season: string) => `own:sub:${season}`

/** the once-per-season announcement flag, on the same surviving prefix */
export const subNewsFlag = (season: string) => `own:subnews:${season}`

export const holdsSeason = (state: LifeState, season: string): boolean => Boolean(state.flags[subFlag(season)])

/** every season he holds a card for, oldest first */
export const heldSeasons = (state: LifeState): Season[] => SEASONS.filter((season) => holdsSeason(state, season.id))

/**
 * מה זה עולה לו עכשיו — and why it is not simply the price.
 *
 * `npm run life:budget` walks every chapter in order and adds up every positive money
 * delta the game can declare, as if one player took all of them (rule 66). Measured on
 * 16.9.2026, the cumulative ceiling at each chapter that opens a season is:
 *
 *   1990 · 78 ₪     against a 135 ₪ card
 *   1991 · 78 ₪     against 350
 *   1993-galil · 159 ₪ against 550
 *   1995-sinai · 159 ₪ against 250
 *   1996-army · 244 ₪  against 450
 *   1998-laces · 322 ₪ against 500
 *   1999-cup · 442 ₪   against 410  ← the ONE exception, and it matters that it exists
 *   2000-double · 672 ₪ against 900
 *
 * So a plain `minAgorot: shekels(price)` gate on the counter would have been SEVEN of
 * eight branches nobody in any life could ever take — the exact defect rule 66 was
 * written against, and one this game has already shipped once (`own:heart:shirt85`,
 * rule 68). The eighth is 1999/00 at 410 against a ceiling of 442: a boy who took every
 * agora in thirteen chapters and spent none of them could pay for exactly one of his nine
 * cards in full. A design built on "nobody can ever pay" would have been built on a
 * sentence that is false for one row, which is why the row is named here and in
 * `tests/life-subscription.test.ts` rather than rounded away.
 *
 * The answer is not to bend the prices, because the prices are sources. It is to charge
 * what the CARD says is being charged to whom: 1991/92 and 1993/94 are אב ובן, one card
 * with the father's name printed on it, and the other seven are the club's child, youth,
 * soldier and member rates on a household's money. A boy of twelve did not put a hundred
 * and thirty-five shekels on a counter in 1990 and this game will not pretend he did. He
 * puts in what he has; the rest is covered; and the game says, on the card, exactly how
 * much of it was his. A summer he saved is a summer he paid for more of it.
 *
 * That keeps the door unconditional (rule 42 — there is always one way through) while
 * leaving the wallet the thing it has been since the ARNAK decision: what he decides to
 * spend, where, and on what.
 */
export function renewal(season: Season, state: LifeState): { priceAgorot: number; fromPocket: number; covered: number } {
  const priceAgorot = season.price === null ? 0 : shekels(season.price)
  const fromPocket = Math.max(0, Math.min(state.agorot, priceAgorot))
  return { priceAgorot, fromPocket, covered: priceAgorot - fromPocket }
}

/**
 * What the ledger writes beside the money. It lives here and not in `app/` because it is
 * a sentence a player can end up reading (rule 10), and because the season it names is
 * the card's own printing rather than the save's id.
 */
export const renewalWhyHe = (season: Season) => `מנוי ${season.printedHe}`

/**
 * עונה אחרי עונה — the run, DERIVED, never stored.
 *
 * A stored counter is a counter that drifts: it has to be incremented in the one place a
 * card is bought, decremented in the one place a summer is missed, and migrated the day a
 * season is added between two others. There is no such place and there never will be.
 * The flags are the record; this walk is the reading.
 *
 * **What "consecutive" is counted over, and why it is not the calendar.** Two seasons in
 * the span have no card at all (1992/93, 1997/98) and one has a card the life never
 * stands in the summer of (1995/96). Counting on the calendar would break the run at
 * exactly those three points — which would state, on the player's own card, that he let
 * his subscription lapse in a year the GAME never offered him one. That is a claim about
 * the man made out of a gap in a shoebox, and rule 11 is the same rule whether the
 * invented thing is a date or an absence. So the run is counted over `OFFERED`, in order:
 * every summer the game put a card on the counter and he took it.
 *
 * It counts BACKWARDS from the last season the life has reached, so it is the run he is
 * on now rather than the best run he ever had. A run you broke is over, and a card that
 * said otherwise would be a score.
 */
export function streakOf(state: LifeState, chapter: string = state.chapter): number {
  const reached = OFFERED.filter((season) => chapterIndex(season.onSaleIn as string) <= chapterIndex(chapter))
  let run = 0
  for (let i = reached.length - 1; i >= 0; i -= 1) {
    const season = reached[i] as Season
    if (!holdsSeason(state, season.id)) break
    run += 1
  }
  return run
}

/**
 * What `ProfileCard` draws — and it draws the run as MARKS, never as a figure (rule 46,
 * rule 63א). The card answers "who are you"; the number is not the answer.
 *
 * `currentHe` is the card in his hand: the most recent season he holds. It is deliberately
 * not "the season that is on now", because a boy who let last summer go is carrying
 * nothing, and an empty hand is the honest thing to draw.
 */
export function subscriptionReading(state: LifeState): SubscriptionReading {
  const held = heldSeasons(state)
  return {
    seasonsHe: held.map((season) => season.id),
    currentHe: held.length > 0 ? (held[held.length - 1] as Season).id : null,
    streak: streakOf(state),
  }
}
