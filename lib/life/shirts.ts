import { ARCHIVE_SHIRTS } from './generated/kitShirts'
import { chapterFor, playableChapters } from './content/chapters'
import { SHIRT as SHIRT_BY_DECADE, decadeOf, decadeOfYear, SHIRT as SHIRT_TABLE } from './prices'
import type { KitSpec } from '../kit/spec'
import { ACTIVITY, activityIn } from './activities'
import type { Conversation } from './content/script'
import type { Condition } from './world/types'
import type { LifeState } from './types'

/**
 * האוסף — the shirts, and the one thing in this game a person keeps for life.
 *
 * Everything else the child owns is cleared at midnight: `day.entered` and `year.entered`
 * empty the pockets and the inventory, because an afternoon is not a bank. A shirt is not
 * an afternoon. It goes in the wardrobe under an `own:` flag, which is one of the six
 * prefixes that survive a new day and a new decade — so the VISA he counts out for on a
 * Sunday in 1985 is still folded in the drawer in 2000, and the collection is the only
 * object in the game that measures the whole life.
 *
 * Each row is a real shirt Maor photographed, dated the way he dates them, and priced in
 * whole shekels of its own decade. `from` is the chapter the shirt first hangs anywhere —
 * a kit cannot be bought before it existed, and the shop is how the years show that they
 * are passing.
 */
export type Shirt = {
  id: string
  /**
   * The PNG this shirt is drawn from — a photograph Maor took of a shirt he owns.
   *
   * Empty for a shirt that comes out of the club's own kit archive: those are DRAWN, from
   * a `KitSpec`, by the same component the kits screen uses. A photograph is a shirt
   * somebody kept; a spec is a shirt the club wore. The collection holds both, and the
   * card knows which it is looking at.
   */
  art: string
  nameHe: string
  sponsorHe: string
  yearsHe: string
  /**
   * whole shekels, in the money of its own decade — and NOT typed here.
   *
   * Maor set the table on 5.9.2026 (30 · 60 · 110 · 160) and a shirt now takes its price
   * from the decade of the chapter it first hangs in, so a row cannot drift from the
   * table and a new shirt cannot invent a price. `SHIRTS` fills this in below.
   */
  price: number
  /** the chapter it first appears on a rail */
  from: string
  noteHe: string
  kind: 'football' | 'basketball'
  /** drawn rather than photographed: the archive's own spec (`lib/kit/spec.ts`) */
  spec?: KitSpec
  /** the season it belongs to, when it came out of the archive */
  seasonLabel?: string
  /** where the row came from, printed on the card — rule 16 */
  sourceHe?: string
}

/**
 * לוח השנה של החנות — the chapters in the order the life plays them, READ off the
 * registry instead of typed beside it.
 *
 * This list used to be nineteen ids written out here, and a second hand-typed table of
 * their years underneath. Both were copies of `content/chapters.ts`, and they had already
 * drifted: the table said `a6-radio` was 1985 and `1995-sinai` was 1995, while the
 * registry — the file the game actually plays from — says 1986 and 1994. Nothing on a
 * rail happened to depend on the two rows that differed, which is the only reason it was
 * invisible. Rule 59's sentence about two copies of a runtime file is the same sentence
 * about two copies of a runtime table.
 *
 * It is exported because the album needs the same spine: an album is stock in the same
 * shop, and `stickers.ts` places a page on the counter by exactly this ordering.
 */
export const CHAPTER_ORDER: readonly string[] = playableChapters().map((chapter) => chapter.id)

/** kept as the old private name so every `from` comparison below still reads the same */
const ORDER = CHAPTER_ORDER

/** where a chapter sits in the life, or -1 for something that is not a chapter */
export const chapterIndex = (chapter: string) => ORDER.indexOf(chapter)

/**
 * The chapter before this one, the way the runtime counts it.
 *
 * `WorldScene.announceNewShirts` walks `playableChapters()` to find what the rail looked
 * like last time, and the album's arrival card has to agree with it to the letter — two
 * definitions of "previous" would announce two different sets of new stock in the same
 * room. `CHAPTER_ORDER` is that same list, so this is that same walk with a name on it.
 */
export function previousChapter(chapter: string): string | null {
  const at = chapterIndex(chapter)
  return at > 0 ? (ORDER[at - 1] as string) : null
}

const SHIRT_ROWS: readonly Omit<Shirt, 'price'>[] = [
  {
    /**
     * החולצה של קיץ 1985 — the one the archive actually holds for that season.
     *
     * A4 is set in the summer of 1985 and it was handing the boy `visa86`: adidas, VISA,
     * white bands. `content/manual/kit-designs.json` files that combination as **1988/89**,
     * three years later, and Stage A §9 forbids inventing a sponsor, a manufacturer or a
     * number. So the shirt in Rafi's window is the archive's 1984/85 home row, at
     * confidence 3, from photographs Maor supplied on 1.9.2026 — adidas, גלאב הוטל טבריה,
     * thin cream and blue diagonals on red, cream v-neck. Maor chose this over keeping the
     * VISA one, on 6.9.2026.
     *
     * The art is a stand-in drawn from that row (`scripts/life/make-shirt-8485.py`) and
     * carries no lettering; the sponsor's name is printed by `ShirtCard` off the archive
     * row, where it has a source attached. `GRAPHICS-REQUESTS` asks for the photograph.
     */
    id: 'tveria85',
    art: 'shirtTveria85',
    nameHe: 'החולצה האדומה, אלכסונים',
    sponsorHe: 'גלאב הוטל טבריה',
    yearsHe: '1984/85',
    from: 'a4-shirt',
    noteHe: 'אדידס. אלכסונים דקים, קרם וכחול, על אדום. צווארון וי קרם. זו החולצה בחלון של רפי.',
    kind: 'football',
  },
  {
    /**
     * (27.9.2026) the first shirt — the one Kobi buys at Rafi's counter in A4. Maor handed
     * over the photograph and named it the gift, so it hangs in the kiosk from the summer of
     * 1985 (`from: 'a4-shirt'`) and the art is that photograph, cut from its backdrop and
     * with VISA's gold band taken to brown (rule 8). The archive files the VISA sponsorship
     * later (1988/89, `kit-designs.json`); this row says "mid-eighties" and names no season,
     * and the owner's instruction is what puts it on the rail — not an archive claim.
     */
    id: 'visa86',
    art: 'shirtVisa86',
    nameHe: 'החולצה האדומה, פסים',
    sponsorHe: 'VISA',
    yearsHe: 'אמצע שנות ה־80',
    from: 'a4-shirt',
    noteHe: 'אדידס, פסי רוחב לבנים על השרוול, וסמל הפועל מעל הלב.',
    kind: 'football',
  },
  {
    id: 'diadoraRed',
    art: 'shirtDiadoraRed',
    nameHe: 'דיאדורה, אדומה',
    sponsorHe: 'diadora',
    yearsHe: 'תחילת שנות ה־90',
    from: '1990',
    noteHe: 'צווארון, אלכסונים בשני אדומים, והלוגו הלבן על כל החזה. החולצה של הילדות שאחרי.',
    kind: 'football',
  },
  {
    id: 'diadoraWhite',
    art: 'shirtDiadoraWhite',
    nameHe: 'דיאדורה, לבנה',
    sponsorHe: 'DIADORA',
    yearsHe: 'שנות ה־90, חוץ',
    from: '1993-cup',
    noteHe: 'החולצה שנוסעים בה. אפור־לבן עם פסים דקים, ואדום רק על השרוול ועל הצווארון.',
    kind: 'football',
  },
  {
    id: 'basket90',
    art: 'shirtBasket90',
    nameHe: 'גופיית הכדורסל',
    sponsorHe: 'בירה מכבי',
    yearsHe: 'שנות ה־90',
    from: '1993-galil',
    noteHe: 'מספר 8. שם של בירה על החזה של הפועל — ככה זה היה, ואף אחד לא צחק.',
    kind: 'basketball',
  },
  {
    id: 'shikun',
    art: 'shirtShikun',
    nameHe: 'שיכון עובדים',
    sponsorHe: 'שיכון עובדים',
    yearsHe: 'אמצע שנות ה־90',
    from: '1996-army',
    noteHe: 'שתי מילים על החזה שאומרות מאיפה המועדון הזה בא. אין עליהן ויכוח.',
    kind: 'football',
  },
  {
    id: 'king',
    art: 'shirtKing',
    nameHe: 'king מוצרי חשמל',
    sponsorHe: 'king',
    yearsHe: 'סוף שנות ה־90',
    from: '1998-laces',
    noteHe: 'העונה של 2.5.98. אם אתה זוכר את החולצה הזאת, אתה זוכר גם איפה עמדת באותו ערב.',
    kind: 'football',
  },
  {
    id: 'crt',
    art: 'shirtCrt',
    nameHe: 'נייקי, crt',
    sponsorHe: 'crt',
    yearsHe: 'שנות ה־2000',
    from: '2000-title',
    noteHe: 'צווארון לבן, שרוולים לבנים, והסמל העגול. החולצה של השנה שהכול קרה בה.',
    kind: 'football',
  },
]

/**
 * המחירון — every shirt priced off `prices.ts`, by the decade it first hangs in.
 *
 * 18 · 95 · 95 · 80 · 110 · 130 · 160 was what these rows said, which is not a price list,
 * it is seven separate opinions. The table is 30 in the eighties, 60 in the nineties, 110
 * in the two-thousands, and the shirt in the window costs what a shirt cost that year.
 */
/** the year a chapter happens in — the registry's own number, never a second copy of it */
export const chapterYear = (chapter: string): number | null => chapterFor(chapter)?.year ?? null

/**
 * The first chapter a shirt from this season could hang in — or `LATER`, for a season
 * this life has not reached.
 *
 * Twenty-six of the archive's thirty-three kits are from seasons after 2000, and the
 * first version of this function fell back to the FIRST chapter for them: a 2025 Macron
 * shirt on Rafi's rail in 1985. `LATER` is not a chapter, `onSale` refuses anything that
 * is not a chapter, and the collection still counts them — they are shirts of this club
 * that the boy has not lived yet.
 */
export const LATER = 'later'

/**
 * המדף שאליו זה מגיע — the first chapter of the life that is on or after this year.
 *
 * A chapter the registry does not know is SKIPPED rather than defaulted. The old version
 * read `CHAPTER_YEAR[chapter] ?? 1984`, which quietly turned an unknown id into 1984 —
 * i.e. into the front of the rail — so a typo in a chapter id would have hung every kit
 * in the game on a counter in Jaffa in 1984 and nothing would have said a word.
 */
export function chapterOnOrAfter(year: number): string {
  const found = ORDER.find((chapter) => {
    const at = chapterYear(chapter)
    return at !== null && at >= year
  })
  return found ?? LATER
}

/** `'1984/85'` → the chapter its kit first hangs in */
const chapterForSeason = (seasonLabel: string) => chapterOnOrAfter(Number(seasonLabel.slice(0, 4)))

/**
 * הארון של המועדון — the archive's thirty-three season kits, as shirts on a rail.
 *
 * Maor, 5.9.2026: "אל תזכור שהאתר הוא מקור המידע שלנו בסוף. אפשר לעשות ממש קולקציה מלאה
 * וכך אני רוצה." So the collection is not seven photographs any more, it is the club's
 * own kit history — season, sponsor, cut, and the note read off the photograph — drawn
 * from the same specs the kits screen draws, priced by the decade of its season.
 *
 * Seven of the thirty-three fall inside the years this life is played in and can actually
 * be bought; the rest are seasons that have not happened yet in 1986, which is exactly
 * what a collection with gaps in it should feel like.
 */
const ARCHIVE_ROWS: readonly Omit<Shirt, 'price'>[] = ARCHIVE_SHIRTS.map((kit) => ({
  id: kit.id,
  art: '',
  nameHe: `${kit.seasonLabel} · ${kit.variantHe}`,
  sponsorHe: kit.sponsorHe ?? '—',
  yearsHe: `עונת ${kit.seasonLabel}`,
  from: chapterForSeason(kit.seasonLabel),
  noteHe: kit.noteHe,
  kind: 'football' as const,
  spec: kit.spec as KitSpec,
  seasonLabel: kit.seasonLabel,
  sourceHe: kit.sourceTitle ?? undefined,
}))

export const SHIRTS: readonly Shirt[] = [...SHIRT_ROWS, ...ARCHIVE_ROWS].map((row) => ({
  ...row,
  price: row.seasonLabel
    ? SHIRT_TABLE[decadeOfYear(Number(row.seasonLabel.slice(0, 4)))]
    : SHIRT_BY_DECADE[decadeOf(row.from)],
}))

export const shirtFlag = (id: string) => `own:shirt:${id}`

export function shirtById(id: string): Shirt | null {
  return SHIRTS.find((shirt) => shirt.id === id) ?? null
}

export function owns(state: LifeState, id: string): boolean {
  return Boolean(state.flags[shirtFlag(id)])
}

export function ownedShirts(state: LifeState): Shirt[] {
  return SHIRTS.filter((shirt) => owns(state, shirt.id))
}

/** Everything a rail can hold in this chapter — earlier kits stay on sale, later ones do not exist. */
export function onSale(chapter: string): Shirt[] {
  const now = chapterIndex(chapter)
  if (now < 0) return []
  return SHIRTS.filter((shirt) => {
    const at = chapterIndex(shirt.from)
    return at >= 0 && at <= now
  })
}

/**
 * כמה יש בכלל — how many shirts exist by this chapter, which is what a collection count
 * should be measured against. "3 / 40" in 1985 is a promise about 2025; "3 / 9" is the
 * rail the boy can actually see.
 */
export function knownBy(chapter: string): Shirt[] {
  return onSale(chapter)
}

/*
 * `SHOP_EMPTY_HE` used to sit here — 'הכול כבר אצלך. תחזור כשיצא דגם חדש.' — exported,
 * imported by nobody, and saying something different from the line the screen actually
 * prints (`life.shop.empty`: 'עוד לא נפתחה. תחזור בשנות התשעים.'). Two empty-shop
 * sentences, one of them dead, is a small version of rule 59: the copy nothing runs is
 * the one that is free to be wrong. The live sentence is in `messages/he.json`, where
 * rule 10 says every user-facing string lives, so the dead one is gone rather than
 * "kept in case". (Rule 26's tombstone is for a FILE somebody might still import; a
 * string with no importer is rule 32's dead key, and dead keys are deleted.)
 */

/**
 * A shirt costs what it costs, and the game already refuses a purchase you cannot afford
 * — so the condition on a shop choice is the price, in agorot, the way every other price
 * in this game is written.
 */
export function affordable(shirt: Shirt): Condition {
  return { minAgorot: shirt.price * 100 }
}


/** the chapters the fan shop is open in — Stage A buys its one shirt off Rafi's rail */
export const SHOP_CHAPTERS = ORDER.slice(ORDER.indexOf('1990'))

export const shopId = (chapter: string) => `fan-shop-${chapter}`

/**
 * חנות האוהדים — built out of the collection rather than typed twice.
 *
 * A shop written by hand goes out of date the first time a shirt is added, so this one is
 * generated: one conversation per chapter, holding the kits that exist by then, priced in
 * the money of their decade, with the ones already in the wardrobe simply not offered
 * again. `when` carries the price — the same condition every other purchase in this game
 * is guarded by, because you cannot buy what you cannot count out on the counter.
 *
 * The rail is therefore also a calendar: two shirts on it in 1990, seven after the double,
 * and the gaps in between are the years you were somewhere else.
 */
/**
 * The order's conversation in every chapter the shop has one, named in full (rule 71): the
 * ids are generated by `gigConversations`, and a generated id that nothing names by its whole
 * name is an id no audit can find. `tests/life-activities.test.ts` holds this table to the
 * activity's own chapters, both ways.
 */
export const SHOP_ORDER_CONVERSATIONS: Readonly<Record<string, string>> = {
  '1990': 'gig-order-shop-1990',
  '1991': 'gig-order-shop-1991',
  'a3-hall': 'gig-order-shop-a3-hall',
  '1993-cup': 'gig-order-shop-1993-cup',
  '1993-galil': 'gig-order-shop-1993-galil',
  '1995-sinai': 'gig-order-shop-1995-sinai',
  '1996-army': 'gig-order-shop-1996-army',
  '1997-basket': 'gig-order-shop-1997-basket',
  '1998-laces': 'gig-order-shop-1998-laces',
  '1999-basket': 'gig-order-shop-1999-basket',
  '1999-cup': 'gig-order-shop-1999-cup',
  '2000-title': 'gig-order-shop-2000-title',
  '2000-double': 'gig-order-shop-2000-double',
}

export function fanShops(): Conversation[] {
  return SHOP_CHAPTERS.map((chapter) => {
    const rail = onSale(chapter).length > 6 ? 'תסתכל טוב. מה שאין פה, אין באף מקום.' : 'מה שיש על הקולב, יש. תבחר.'
    /**
     * ההזמנה — the man at the counter has an order he cannot fill (`order-shop` in `gigs.ts`,
     * played as the shirt game in `activities.ts`). It is asked HERE, at the counter, rather
     * than from a second hotspot on the pavement: the doorway is already the shop's, and
     * two things to press in one doorway is one too many. The gig's own conversation keeps
     * the refusal for a chapter whose work is already done.
     */
    const order = activityIn(ACTIVITY['shop-order'], chapter) ? SHOP_ORDER_CONVERSATIONS[chapter] : undefined
    if (order) {
      return {
        id: shopId(chapter),
        nameHe: 'חנות האוהדים',
        branches: [
          {
            lines: [
              { who: 'המוכר', text: rail },
              { who: 'המוכר', text: 'ורגע — יש לי פה הזמנה שאני לא מספיק. אתה מבין בחולצות?' },
            ],
            choices: [
              { id: 'rail', text: 'להסתכל על הקולב', then: [{ e: 'shop' as const }] },
              { id: 'order', text: 'לשמוע על ההזמנה', then: [{ e: 'goto' as const, node: order }] },
            ],
          },
        ],
      }
    }
    return {
      id: shopId(chapter),
      nameHe: 'חנות האוהדים',
      branches: [{ lines: [{ who: 'המוכר', text: rail }], then: [{ e: 'shop' as const }] }],
    }
  })
}

/** what the card says the first time, and after — kept out of the app folder (rule: no strings there) */
export const SHIRT_FIRST_HE = 'קנית את חולצת הפועל הראשונה שלך!'
export const SHIRT_MORE_HE = 'עוד אחת לארון.'
/** the card that opens when a season's kit reaches the rail for the first time */
export const SHIRT_NEW_HE = 'חולצה חדשה בחנות האוהדים'

/**
 * מה נכנס לחנות מאז — the kits that exist in this chapter and did not in the last one.
 *
 * A rail that fills up silently is a rail nobody looks at twice. This is what the game
 * holds up when a season turns: the kit the club actually started wearing that year, once,
 * the first time it could be bought.
 */
export function arrivedBetween(previous: string | null, chapter: string): Shirt[] {
  const now = onSale(chapter)
  if (!previous) return []
  const had = new Set(onSale(previous).map((shirt) => shirt.id))
  return now.filter((shirt) => !had.has(shirt.id))
}

// ------------------------------------------------------------------- המדפים בחנות ---

/**
 * A shelf of the rail. `id` is a key, never a sentence: the words are `t()`'s job
 * (rule 10) and this file is not allowed to decide what a screen says.
 *
 *  · `new`      — what arrived since the last chapter. The front of the rail.
 *  · `rail`     — everything else the shop has that is not already yours.
 *  · `wardrobe` — the back of the rail: what is already folded in the drawer.
 */
export type ShelfId = 'new' | 'rail' | 'wardrobe'
export type Shelf = { id: ShelfId; shirts: Shirt[] }

/**
 * הקולב, לפי הסדר שאדם מסתכל בו — newest first, and never your own wardrobe first.
 *
 * The shop drew two flat grids for a year: everything for sale, then everything owned,
 * both in the order the rows happen to be declared in — which is the order the archive
 * generator emitted them, i.e. oldest season first. So the kit the club is wearing THIS
 * season, the one thing a supporter walks in for, was at the bottom of the second screen.
 *
 * Three shelves, and the ordering inside each is the same one: the most recent season at
 * the front. `arrivedBetween` already knows what is new — this is the same answer, given
 * a place to stand on the screen instead of only a card that flashes once.
 *
 * Pure, and exported, because a shelf is a decision about stock and not about pixels:
 * `tests/life-shop.test.ts` can then ask what is on the rail in 1993 without rendering
 * anything.
 */
export function shopShelves(state: LifeState, chapter: string, kind?: Shirt['kind']): Shelf[] {
  const rail = onSale(chapter).filter((shirt) => !kind || shirt.kind === kind)
  const fresh = new Set(arrivedBetween(previousChapter(chapter), chapter).map((shirt) => shirt.id))
  // newest season at the front; ties by id so two kits of one season never swap places
  // between renders (the archive ships home and away for the same year)
  const byNewest = (a: Shirt, b: Shirt) =>
    chapterIndex(b.from) - chapterIndex(a.from) || a.id.localeCompare(b.id)
  const shelf = (id: ShelfId, rows: Shirt[]): Shelf => ({ id, shirts: [...rows].sort(byNewest) })
  return [
    shelf('new', rail.filter((shirt) => fresh.has(shirt.id) && !owns(state, shirt.id))),
    shelf('rail', rail.filter((shirt) => !fresh.has(shirt.id) && !owns(state, shirt.id))),
    shelf('wardrobe', rail.filter((shirt) => owns(state, shirt.id))),
  ].filter((row) => row.shirts.length > 0)
}

/** is this one of the kits that reached the rail in this chapter? */
export function isNewThisChapter(shirt: Shirt, chapter: string): boolean {
  return arrivedBetween(previousChapter(chapter), chapter).some((row) => row.id === shirt.id)
}

// --------------------------------------------------------------- הזיכרון של החולצה ---

/**
 * מה לבשת ומתי — the flag that turns a wardrobe into a biography.
 *
 * A collection of forty shirts is a list. A shirt that says "you wore this one on
 * 19.5.1999" is a life. The flag carries the `own:` prefix, so like the shirt itself it
 * survives a new day, a new year and a new decade — a thing you wore to a cup final is not
 * cleared at midnight.
 */
export const wornFlag = (id: string, chapter: string) => `own:worn:${id}:${chapter}`

/**
 * החולצה שהכין בעצמו — עליו (delta 91). Not a `SHIRTS` row: a crafted shirt is a
 * `CraftOutput` kept under `pugi:fan-shirt` (`state.outputs`), and this flag says he put it
 * on. `own:`, so it survives every day and year like the shirts he bought. Read by the bag's
 * wardrobe (`lib/life/callbacks.ts craftedWardrobe`) and the "אני" lines; the world's figure
 * is a cut of a painted board and does not redress.
 */
export const WEAR_CRAFTED_FLAG = 'own:wear:fan-shirt'

export const wearsCrafted = (state: LifeState): boolean => state.flags[WEAR_CRAFTED_FLAG] === true

/**
 * איזו חולצה היית לובש — the newest one you own that already existed by this chapter.
 *
 * Nobody in 1999 puts on the shirt he queued for in 1985 to go to a cup final; he puts on
 * the newest one he has. So: the most recently BOUGHT shirt, read off the event log in
 * order, restricted to the ones that exist by now. A player who owns nothing wore nothing,
 * and the chapter records nothing — which is also true, and is its own kind of memory.
 */
/**
 * מה שנבחר בארון לפני המשחק (Pre-Match Ritual, 27.9.2026) — `own:outfit:<chapter>`, a
 * shirt id or `'plain'`. Declared here rather than in `matchRitual.ts` because the reading
 * below has to honour it and `matchRitual.ts` already reads this file.
 */
export const OUTFIT_PREFIX = 'own:outfit:'
export const outfitFlag = (chapter: string) => `${OUTFIT_PREFIX}${chapter}`
export const PLAIN_OUTFIT = 'plain'

export function wearingAt(state: LifeState, log: readonly { t: string; flag?: string }[], chapter: string): Shirt | null {
  const available = new Set(onSale(chapter).map((shirt) => shirt.id))
  // what he CHOSE before the match wins over what he would have grabbed
  const chosen = state.flags[outfitFlag(chapter)]
  if (chosen === PLAIN_OUTFIT) return null
  if (typeof chosen === 'string' && available.has(chosen) && owns(state, chosen)) return SHIRTS.find((row) => row.id === chosen) ?? null
  let latest: Shirt | null = null
  for (const event of log) {
    if (event.t !== 'flag.raised' || !event.flag?.startsWith('own:shirt:')) continue
    const id = event.flag.slice('own:shirt:'.length)
    if (!available.has(id)) continue
    const shirt = SHIRTS.find((row) => row.id === id)
    if (shirt) latest = shirt
  }
  return latest && owns(state, latest.id) ? latest : null
}

/** every chapter this shirt was worn to, in the order they were lived */
export function wornIn(state: LifeState, id: string): string[] {
  const prefix = `own:worn:${id}:`
  return Object.keys(state.flags)
    .filter((flag) => flag.startsWith(prefix) && state.flags[flag])
    .map((flag) => flag.slice(prefix.length))
}

/**
 * מתי היא כבר הייתה שלו — the earliest chapter this shirt is RECORDED as having been worn.
 *
 * There is no acquisition year on `state.clothing` and there does not need to be one. A
 * wardrobe is a list of ids, but the LOG is not: `own:worn:<id>:<chapter>` is written the
 * evening the shirt is put on, it carries the `own:` prefix so a year does not erase it,
 * and a flag that exists is a fact that happened. So "how long has he had this" is a
 * question the append-only log already answers — the earliest chapter it was on his back —
 * and that is a stronger claim than a stored purchase year would be: it is evidence that
 * he HAD it then, not a number somebody wrote down.
 *
 * Deriving rather than storing is rule 39/46 in its smallest possible form: the same rows,
 * read by a richer reducer. `Object.keys` has no order worth trusting, so the earliest is
 * taken along the chapter spine (`ORDER`) and never off the iteration.
 */
export function firstWornChapter(state: LifeState, id: string): string | null {
  let first: string | null = null
  for (const chapter of wornIn(state, id)) {
    const at = chapterIndex(chapter)
    if (at < 0) continue
    if (first === null || at < chapterIndex(first)) first = chapter
  }
  return first
}
