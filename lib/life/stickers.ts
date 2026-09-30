/**
 * סופרגול — האלבום.
 *
 * Maor sent a folder called "סופרגול כללי" in September 2026: five stickers photographed
 * out of an album with the ruled notebook paper still showing behind them, one modern
 * card, and a squad spread from 1992/93 with the Hertz board behind the players. Two of
 * the stickers have his own handwriting on the tape underneath — "אב כל הנשמות. האחד
 * והיחיד." under Eli Cohen, "אין מלים. הוויינר הגדול אי פעם" under Gili Landau. That
 * handwriting is the design brief. An album is not a checklist; it is a place a child
 * wrote down what he thought of a man.
 *
 * Three rules hold this file together, and all three are the archive's rather than the
 * game's:
 *
 * · **A sticker IS a scan.** Nothing here draws a player, and since 17.9.2026 nothing
 *   here prints a nameplate in place of one either. Maor, looking at the 1985/86 page:
 *   *"לא להציג קלפי סופרגול שאין עליהם תמונה."* Until then the page carried seventeen
 *   slots and four photographs, and the thirteen printed frames read on screen exactly
 *   like thirteen images that had failed to load — which is how the defect was reported.
 *   `scan` is therefore REQUIRED on `StickerDef`, and `withScans()` is the one door a
 *   page passes through: a drafted slot with no photograph never becomes a sticker, so
 *   no counter, no packet, no page total and no album percentage can ever see it.
 *   The names are not lost — they are in `content/manual/people.json` with their sources,
 *   and the slot comes back the day the photograph does, by adding one `scan:` line.
 * · **Every name is sourced.** The 1985/86 page is the squad `content/manual/people.json`
 *   carries against the ynet piece on Landau's 86th minute; the 1992/93 page is the three
 *   men whose names are printed large enough on the scans to be certain of. Names that
 *   would have to be read off a blurred caption are not in the album — a misread name is
 *   a fabricated one (rule 11).
 * · **The numbers are the album's, not the printer's.** `slot` is a position on a page.
 *   `printedN` exists only where a number is legible on the scan itself — 5 on Bezredno,
 *   231 on Shalom Tikva — and nothing else claims to know what a sticker was numbered.
 *
 * The economy is the child's: a packet costs one bottle deposit, so an afternoon of
 * collecting bottles is an afternoon of packets, and the shirt in the shop gets further
 * away every time you buy one. That is the decision the feature exists to force.
 */
import type { LifeEvent } from './events'
import type { CharacterId, LifeState } from './types'
import { relationshipOf } from './types'
import { Roller } from './rng'
import { PACKET, decadeOf, type Decade } from './prices'
import { CHAPTER_ORDER, chapterIndex, chapterOnOrAfter, previousChapter } from './shirts'

export type StickerSetId =
  | '8081'
  | '8586'
  | 'sg80a'
  | 'sgcup'
  | 'sg80b'
  | '9293'
  | 'sg90'
  | 'sg978'
  | 'sg0203'
  | 'sg00'
  | '96'
  | 'box'

export type StickerRarity = 'common' | 'uncommon' | 'rare' | 'kept'

/**
 * העשור של הדף — the decade a page belongs to, read off its own face (`eraOf`).
 *
 * The type names five decades; the archive holds pages from two. `STICKER_ERA_COVERAGE`
 * below says which is which, out loud, so a screen can never advertise "every decade"
 * while three of them are empty (27.9.2026).
 */
export type StickerEra = '80s' | '90s' | '00s' | '10s' | '20s'

/**
 * איך הדף מגיע לידיים — how the life hands a page over, as the code already does it:
 * `packet` is a kiosk envelope (`soldIn` set), `gift` is somebody giving it (Rafi's till,
 * 1996), `archive` is something older found in the house (the drawer booklet, the red box).
 * `special` is reserved for a page that arrives by none of these; no page uses it yet.
 */
export type StickerAcquisition = 'packet' | 'gift' | 'archive' | 'special'

/** what the page is FOR in the story — the boy's own album, a kept thing, or a thing come back */
export type StickerNarrativeRole = 'childhood' | 'nostalgia' | 'callback'

export type StickerSet = {
  id: StickerSetId
  titleHe: string
  /** the season the page is, said the way a page of an album says it */
  seasonHe: string
  /** the same season on a tab 60px wide — a phone has four of these in a row */
  shortHe: string
  /** the frame the stickers of this year were printed in — the sheet draws it */
  frame: '80' | '86' | '93' | '96' | '98'
  /** the decade a kiosk sells this packet in; `null` means it was never sold, only kept */
  soldIn: Decade | null
  /**
   * הפרק שבו הדף מגיע לדלפק — the chapter this album first exists in, and NOT typed here.
   *
   * This is `Shirt.from` for an album, and until 16.9.2026 there was no such field. A set
   * carried a `Decade` and nothing else, so every eighties page was simultaneously the
   * current one in 1984, in 1985 and in 1986 — the 1985/86 album was on Rafi's counter a
   * year and a half before that season was played, and no chapter boundary could ever say
   * "a new one is in". Maor asked for exactly the announcement that field was missing:
   * *"תעשה התראות על עונת סופרגול חדשה שנכנסה לחנות."* You cannot announce an arrival
   * without a date of arrival.
   *
   * It is DERIVED (`fromOf`), for the same reason `Shirt.price` is derived: a page whose
   * season is written on its own face should not also carry a hand-typed chapter that can
   * disagree with it.
   */
  from: string
  /** the poster that opens the page, when the archive has one */
  posterArt?: string
  posterSourceHe?: string
  /** the decade of the page — DERIVED (`eraOf`), never typed on a row that prints a year */
  era: StickerEra
  acquisition: StickerAcquisition
  narrativeRole?: StickerNarrativeRole
}

/**
 * A page as authored. `era` is derived like `from`; only a page whose face prints neither a
 * year nor a decade it was sold in (the red box) states it, and the test says which one.
 */
type SetRow = Omit<StickerSet, 'from' | 'era'> & { era?: StickerEra }

export type StickerDef = {
  id: string
  set: StickerSetId
  /** where it sits on the page — the album's own numbering */
  slot: number
  nameHe: string
  /** מגן, קשר, חלוץ, שוער, מאמן — only where the card itself prints it */
  roleHe?: string
  /** the number printed on the sticker itself, where a scan makes it legible */
  printedN?: number
  /** the photograph. REQUIRED — a slot with no scan is not a sticker (17.9.2026) */
  scan: string
  /** where the NAME came from — a source, never a meaning */
  sourceHe: string
  /** what Maor wrote under it in his own album, in his own hand */
  handHe?: string
  rarity: StickerRarity
  /**
   * מי שעבר — a player Maor marks as having gone over to the other side.
   *
   * The game says nothing about WHY, and never a date or a club: that would be a claim
   * the archive has not given it (rule 11). It says only that this one is on his list,
   * and hands the decision to the player — keep him in the album or tear him out.
   */
  defector?: boolean
  /**
   * לא נמכר במעטפה — the sticker a packet will never contain.
   *
   * One per page, and the whole design of the feature. The last slot is the one you have
   * to ask somebody for, and who has it is decided by how you have treated people
   * (`holderOf`). A collection you can finish alone is not a collection, it is a shop.
   */
  neverInPacket?: boolean
}

const SET_ROWS: Record<StickerSetId, SetRow> = {
  '8081': {
    id: '8081',
    titleHe: 'סופרגול · 1980/81',
    seasonHe: 'עונת 1980/81',
    shortHe: '80/81',
    frame: '80',
    soldIn: null,
    acquisition: 'archive',
    narrativeRole: 'nostalgia',
  },
  '8586': {
    id: '8586',
    titleHe: 'סופרגול · 1985/86',
    seasonHe: 'עונת 1985/86',
    shortHe: '85/86',
    frame: '86',
    soldIn: '80s',
    acquisition: 'packet',
    narrativeRole: 'childhood',
  },
  sg80a: {
    id: 'sg80a',
    titleHe: 'סופרגול · הסגל',
    seasonHe: 'הסגל, שנות השמונים',
    shortHe: 'הסגל',
    frame: '86',
    soldIn: '80s',
    acquisition: 'packet',
    narrativeRole: 'childhood',
  },
  sgcup: {
    id: 'sgcup',
    titleHe: 'הגביע הוא שלנו',
    seasonHe: 'עונת הגביע, שנות השמונים',
    shortHe: 'הגביע',
    frame: '86',
    soldIn: '80s',
    acquisition: 'packet',
    narrativeRole: 'childhood',
  },
  sg80b: {
    id: 'sg80b',
    titleHe: 'הפועל תל־אביב · במספרים',
    seasonHe: 'הסגל לפי מספרים, שנות השמונים',
    shortHe: 'מספרים',
    frame: '86',
    soldIn: '80s',
    acquisition: 'packet',
    narrativeRole: 'childhood',
  },
  '9293': {
    id: '9293',
    titleHe: 'סופרגול · 1992/93',
    seasonHe: 'עונת 1992/93',
    shortHe: '92/93',
    frame: '93',
    soldIn: '90s',
    posterArt: '/life/docs/sg-squad-93.jpg',
    posterSourceHe: 'תצלום הסגל, עונת 1992/93 — מהחומרים של צוות The Worker.',
    acquisition: 'packet',
    narrativeRole: 'childhood',
  },
  sg90: {
    id: 'sg90',
    titleHe: 'הפועל תל־אביב · שנות התשעים',
    seasonHe: 'הסגל, שנות התשעים',
    shortHe: '90s',
    frame: '93',
    soldIn: '90s',
    acquisition: 'packet',
    narrativeRole: 'childhood',
  },
  sg978: {
    id: 'sg978',
    titleHe: 'הפועל · 1997/8',
    seasonHe: 'עונת 1997/98',
    shortHe: '97/98',
    frame: '98',
    soldIn: '90s',
    acquisition: 'packet',
    narrativeRole: 'childhood',
  },
  sg0203: {
    id: 'sg0203',
    titleHe: 'הפועל · 2002/03',
    seasonHe: 'עונת 2002/03',
    shortHe: '02/03',
    frame: '98',
    soldIn: '00s',
    acquisition: 'packet',
    narrativeRole: 'callback',
  },
  sg00: {
    id: 'sg00',
    titleHe: 'הפועל תל־אביב · שנות האלפיים',
    seasonHe: 'מדבקות מהאלבום, 2002–2007',
    shortHe: '00s',
    frame: '98',
    soldIn: '00s',
    acquisition: 'packet',
    narrativeRole: 'callback',
  },
  '96': {
    id: '96',
    titleHe: 'סופרגול · 1996',
    seasonHe: '1996',
    shortHe: '1996',
    frame: '96',
    soldIn: null,
    acquisition: 'gift',
    narrativeRole: 'callback',
  },
  box: {
    id: 'box',
    titleHe: 'הקופסה של אבא',
    seasonHe: 'מה שנשמר בקופסה האדומה',
    shortHe: 'הקופסה',
    frame: '80',
    soldIn: null,
    acquisition: 'archive',
    narrativeRole: 'nostalgia',
    // the cards are older than the life; the page enters it in the eighties, at the front
    era: '80s',
  },
}

/**
 * מאיזה פרק הדף קיים — read off the page's own face, in two steps and never a third.
 *
 * 1. **The season, when the page prints one.** `עונת 1985/86` is a four-digit year on the
 *    album's own cover, so the page reaches a counter the first chapter of the life that
 *    is on or after it — the identical rule `Shirt.from` follows, through the identical
 *    function (`chapterOnOrAfter`), so a shirt and an album of the same season can never
 *    disagree about which year they belong to.
 * 2. **The decade, when it prints only that.** Four of the ten pages say `שנות השמונים`
 *    or `שנות התשעים` and no season: they are squad sheets, not a year's album. The
 *    honest reading of "the eighties" is the first chapter of the eighties — the page
 *    claims a decade, so it gets the decade, and nothing here invents a finer date than
 *    the paper carries (rule 11).
 *
 * A page nobody ever sold (`soldIn: null` — 1980/81, 1996, the red box) has no arrival to
 * announce and sits at the front of the life, because it was in somebody's drawer before
 * the boy was born.
 */
function fromOf(row: SetRow): string {
  const season = /(\d{4})/.exec(row.seasonHe)
  if (season) return chapterOnOrAfter(Number(season[1]))
  if (row.soldIn) {
    const first = CHAPTER_ORDER.find((chapter) => decadeOf(chapter) === row.soldIn)
    if (first) return first
  }
  return CHAPTER_ORDER[0] as string
}

/** `1985` → `'80s'`, `2004` → `'00s'` — the decade a four-digit year sits in */
export function eraOfYear(year: number): StickerEra {
  if (year < 1990) return '80s'
  if (year < 2000) return '90s'
  if (year < 2010) return '00s'
  if (year < 2020) return '10s'
  return '20s'
}

/**
 * העשור של הדף — the same two steps as `fromOf`, and a third only where neither applies:
 * the season printed on the page, else the decade a kiosk sold it in, else what the row
 * states (the red box alone, whose face prints no year and which no kiosk sold).
 */
function eraOf(row: SetRow): StickerEra {
  const season = /(\d{4})/.exec(row.seasonHe)
  if (season) return eraOfYear(Number(season[1]))
  if (row.soldIn) return row.soldIn
  if (row.era) return row.era
  throw new Error(`sticker set ${row.id} has no season, no decade and no stated era`)
}

export const SETS: Record<StickerSetId, StickerSet> = Object.fromEntries(
  (Object.keys(SET_ROWS) as StickerSetId[]).map((id) => {
    const row = SET_ROWS[id] as SetRow
    return [id, { ...row, era: eraOf(row), from: fromOf(row) }]
  }),
) as Record<StickerSetId, StickerSet>

export const STICKER_ERAS: readonly StickerEra[] = ['80s', '90s', '00s', '10s', '20s']

export type StickerEraCoverage = { status: 'verified' } | { status: 'asset-gap'; noteHe: string }

const GAP_NOTE_HE =
  'אין באוסף סריקות אמיתיות של אלבומים או מדבקות של הפועל תל אביב מהעשור הזה. העשור ייפתח רק כשיגיעו סריקות אמיתיות — לא ממציאים דף.'

/**
 * כיסוי העשורים — which decades a real, scanned page stands behind, and which are a gap.
 *
 * COMPUTED, not typed: a decade is `verified` the moment one set of that era exists (and a
 * set only exists if it survives `withScans`), and `asset-gap` otherwise. So the day a real
 * 2000s scan arrives and a page is added, this flips on its own; nobody edits a status.
 */
const COVERED_ERAS = new Set(Object.values(SETS).map((set) => set.era))

export const STICKER_ERA_COVERAGE: Record<StickerEra, StickerEraCoverage> = Object.fromEntries(
  STICKER_ERAS.map((era) => [
    era,
    COVERED_ERAS.has(era) ? { status: 'verified' } : { status: 'asset-gap', noteHe: GAP_NOTE_HE },
  ]),
) as Record<StickerEra, StickerEraCoverage>

/**
 * "כל העשורים" — false while any decade is a gap. A screen that wants to say the album spans
 * every decade asks this first, and says nothing of the kind while it is false.
 */
export const ALL_DECADES_COMPLETE: boolean = STICKER_ERAS.every((era) => STICKER_ERA_COVERAGE[era].status === 'verified')

/** the line that goes under every scan on this page, and says only where it came from */
const FROM_ALBUM = 'מדבקת סופרגול מהאלבום של צוות The Worker.'
const FROM_YNET = 'ynet — הדרמה של 1986, גילי לנדאו בדקה ה-86.'
/** the four printed sheets that arrived on 7.9.2026, each named by what it prints */
const FROM_SHEET_A = 'גיליון קלפים — הסגל, שנות השמונים; מהחומרים של צוות The Worker.'
const FROM_SHEET_CUP = 'גיליון קלפים — "הגביע הוא שלנו"; מהחומרים של צוות The Worker.'
const FROM_SHEET_B = 'גיליון קלפים ממוספר, שנות השמונים; מהחומרים של צוות The Worker.'
const FROM_SHEET_98 = 'גיליון קלפים — 1997/8; מהחומרים של צוות The Worker.'
const FROM_SHEET_90 = 'גיליון קלפים, שנות התשעים; מהחומרים של צוות The Worker.'

/**
 * הדף של אבא — one sticker, and the rest of the album gone.
 *
 * It is not collectible and there is nothing to complete. It is in the box because
 * somebody kept it for forty-five years, which is the only reason anything is in the box.
 */
const S8081: StickerDef[] = [
  {
    id: 'bezredno',
    set: '8081',
    slot: 1,
    nameHe: 'אריה בזדרנו',
    roleHe: 'שוער',
    printedN: 5,
    scan: '/life/docs/sg-bezredno-80.jpg',
    sourceHe: FROM_ALBUM,
    rarity: 'kept',
    neverInPacket: true,
  },
]

/** הדף של 86 — the squad the archive names, in the order a page would print them */
const NAMES_86: ReadonlyArray<[string, string, string?]> = [
  ['landau', 'גילי לנדאו'],
  ['sinai', 'משה סיני'],
  ['eli-cohen', 'אלי "קוקוס" כהן'],
  ['talias', 'יום טוב טליאס'],
  ['amar', 'יהודה עמר'],
  ['ekhoiz', 'יעקב אקהויז'],
  ['zana', 'יוסי זאנה'],
  ['hershkovitz', 'דוד הרשליקוביץ׳'],
  ['yaakov-cohen', 'יעקב כהן'],
  ['barnes', 'אליאור ברנס'],
  ['zano', 'מוריס ז׳אנו'],
  ['shabtai-levi', 'שבתאי לוי'],
  ['yani', 'אלי יאני'],
  ['schweitzer', 'דוד שוויצר'],
  ['sharir', 'צבי שריר'],
  ['avi-ran', 'אבי רן'],
  ['sharf', 'שלמה שרף', 'מאמן'],
]

const S8586: StickerDraft[] = NAMES_86.map(([id, nameHe, roleHe], index) => ({
  id,
  set: '8586' as const,
  slot: index + 1,
  nameHe,
  ...(roleHe ? { roleHe } : {}),
  sourceHe: FROM_YNET,
  rarity: (index < 3 ? 'rare' : index < 8 ? 'uncommon' : 'common') as StickerRarity,
}))

// the two the archive actually holds a scan of, and the two Maor wrote under
S8586[0] = {
  ...(S8586[0] as StickerDef),
  scan: '/life/docs/sg-landau-86.jpg',
  sourceHe: FROM_ALBUM,
  handHe: 'אין מלים. הוויינר הגדול אי פעם',
}
S8586[2] = {
  ...(S8586[2] as StickerDef),
  scan: '/life/docs/sg-elicohen-86.jpg',
  sourceHe: FROM_ALBUM,
  handHe: 'אב כל הנשמות. האחד והיחיד.',
}
// two more out of his own album, and his own file names date them: "יעקב אקהויז 86",
// "מוריס זאנו 86". A page named after a season takes a card that says that season.
S8586[5] = {
  ...(S8586[5] as StickerDef),
  scan: '/life/docs/hand-ekhoiz.jpg',
  sourceHe: FROM_ALBUM,
}
S8586[10] = {
  ...(S8586[10] as StickerDef),
  scan: '/life/docs/hand-zano.jpg',
  sourceHe: FROM_ALBUM,
}
// The page's closing card used to be named here (שלמה שרף) and he has no photograph, so
// after 17.9.2026 he is not on the page at all. `withScans` closes whichever card SURVIVES
// instead — a page still needs one slot a packet will never hand you (`neverInPacket`), or
// the whole trading half of the feature has nothing to hang on.

/**
 * שלושה גיליונות שלמים — every card below is a cut from a printed sheet.
 *
 * `cut-cards.py` measures the sheet and writes one file per card; the name, the role and
 * the number here are read off THAT file at four times its printed size and nowhere else.
 * Where a number sits under the crop line it is simply absent — the album says less
 * rather than guessing, the same rule the 1992/93 page has always obeyed.
 */
type Row = [file: string, nameHe: string, roleHe?: string, printedN?: number, defector?: boolean]

const page = (
  set: StickerSetId,
  prefix: string,
  source: string,
  rows: readonly Row[],
): StickerDef[] =>
  rows.map(([file, nameHe, roleHe, printedN, defector], index) => ({
    // a file carries its extension only when it is not a JPEG: three of the cup cards
    // are PNG because the encoder kept ringing one pixel back into the yellow band
    id: `${prefix}-${file.replace(/\.\w+$/, '')}`,
    set,
    slot: index + 1,
    nameHe,
    ...(roleHe ? { roleHe } : {}),
    ...(printedN ? { printedN } : {}),
    ...(defector ? { defector: true } : {}),
    scan: `/life/docs/${file.includes('.') ? file : `${file}.jpg`}`,
    sourceHe: source,
    rarity: (index < 2 ? 'rare' : index < 7 ? 'uncommon' : 'common') as StickerRarity,
    ...(index === rows.length - 1 ? { neverInPacket: true, rarity: 'rare' as StickerRarity } : {}),
  }))

const SG80A: StickerDef[] = page('sg80a', 'a', FROM_SHEET_A, [
  ['sg80a-00', 'יעקב אקהויז', 'מגן', 4],
  ['sg80a-01', 'נמרוד דרייפוס', 'מגן', 2],
  ['sg80a-02', 'אריה בז׳רנו', 'שוער', 1],
  ['sg80a-04', 'יוסי זאנה', 'מגן', 5],
  ['sg80a-05', 'אלי כהן', 'קשר', 3],
  ['sg80a-06', 'מוריס ז׳אנו', 'קשר'],
  ['sg80a-07', 'ג׳ימי טורק', 'קשר', 17],
  ['sg80a-08', 'מאיר נחמיאס', 'קשר', 16],
  ['sg80a-09', 'שבתאי יחבס', 'קשר', 8],
  ['sg80a-10', 'משה סיני', 'קשר', 7],
  ['sg80a-11', 'אייל אקשטיין', 'קשר', 14],
  ['sg80a-13', 'גיל לנדאו', 'חלוץ', 9],
  ['sg80a-14', 'שבתאי לוי', 'חלוץ', 11],
  ['sg80a-12', 'דוד שווייצר', 'מאמן'],
  ['sg80a-03', 'סמל הקבוצה'],
])

const SGCUP: StickerDef[] = page('sgcup', 'c', FROM_SHEET_CUP, [
  ['sgcup-00', 'יוסי זאנה'],
  ['sgcup-01.png', 'יעקב אקהויז'],
  ['sgcup-02', 'אריה בז׳רנו'],
  ['sgcup-03', 'צביקה רוזן'],
  ['sgcup-04', 'ג׳ימי טורק'],
  ['sgcup-05', 'אלי כהן'],
  ['sgcup-06', 'מוריס ז׳אנו'],
  ['sgcup-07.png', 'שבתאי יחבס'],
  ['sgcup-08', 'שבתאי לוי'],
  ['sgcup-09', 'משה סיני'],
  ['sgcup-10', 'גילי לנדאו'],
  ['sgcup-11.png', 'דב רמלר'],
  ['sgcup-13', 'גדי מכנס ורמי ארמה'],
  ['sgcup-12', '"יאשין"'],
])

// the sheet prints 16 twice — on רמי ארמה and on אילן שוקרון. Both are written down as
// they are printed; the album is a record of a sheet, not a correction of one.
const SG80B: StickerDef[] = page('sg80b', 'b', FROM_SHEET_B, [
  ['sg80b-03', 'יום טוב טליאס', undefined, 1],
  ['sg80b-04', 'אריה אלטר', undefined, 1],
  ['sg80b-02', 'יהודה עמר', undefined, 2],
  ['sg80b-01', 'אלי כהן', undefined, 3],
  ['sg80b-00', 'יעקב אקהויז', undefined, 4],
  ['sg80b-09', 'יוסי זאנה', undefined, 5],
  ['sg80b-08', 'קובי סגל', undefined, 6],
  ['sg80b-07', 'משה סיני', undefined, 7],
  ['sg80b-06', 'מיקי בן־שיטרית', undefined, 8],
  ['sg80b-05', 'אליאור ברנס', undefined, 9],
  ['sg80b-14', 'מוריס ז׳אנו', undefined, 10],
  ['sg80b-13', 'שבתאי לוי', undefined, 11],
  ['sg80b-12', 'רפי שמואל', undefined, 12],
  ['sg80b-11', 'דוד הרשליקוביץ׳', undefined, 13],
  ['sg80b-10', 'אחמד מוסה', undefined, 14],
  ['sg80b-16', 'רמי ארמה', undefined, 16],
  ['sg80b-17', 'אילן שוקרון', undefined, 16],
  ['sg80b-15', 'גל הרשליקוביץ׳', undefined, 18],
  ['sg80b-18', 'יצחק שניאור', 'מאמן'],
])

const SG978: StickerDef[] = page('sg978', 'd', FROM_SHEET_98, [
  ['sg978-00', 'פליקס חלפון'],
  ['sg978-01', 'שביט אלימלך'],
  ['sg978-02', 'אלי כהן'],
  ['sg978-04', 'אסי דומב'],
  ['sg978-05', 'יניב ירון'],
  ['sg978-06', 'יעקב הילל'],
  ['sg978-07', 'שמעון גרשון', undefined, undefined, true],
  ['sg978-08', 'ישראל כהן'],
  ['sg978-09', 'שחר כהן'],
  ['sg978-10', 'מירו מסטרוביץ׳'],
  ['sg978-11', 'דמיאן גייזר'],
  ['sg978-12', 'גילי רגב'],
  ['sg978-14', 'אבי אזולאי'],
  ['sg978-15', 'אייל בן־עמי'],
  ['sg978-17', 'אודי כפיר'],
  ['kt-dreslia', 'גיורגי דרסליה'],
  ['kt-moskal', 'קאז׳ימיש מוסקאל'],
  ['hand-shitrit', 'עופר שיטרית'],
  ['kt-simrotic', 'סבסטיאן סימרוטיץ׳'],
  ['kt-tikva', 'שלום תקוה'],
  ['sg978-03', 'סמל הקבוצה'],
])

/**
 * הדף של 93 — three names and a squad photograph.
 *
 * The spread carries a printed caption naming eleven men. Nine of them are legible only
 * as shapes at this scan resolution, and a name guessed off a blurred caption is a name
 * this project invented. So the page holds the three that are certain — Halfon's own card
 * prints his name across it, Sinai and Abuksis are in the archive — and the photograph
 * itself sits at the top of the page with everybody in it, uncaptioned, which is the
 * honest way to show eleven men whose names you cannot all read.
 */
/**
 * הדף של התשעים — with the advertisement on it, because it was on it.
 *
 * Every card on this sheet carries a cigarette banner across its head: that is what a
 * sticker a child collected in 1993 looked like, and Maor asked for it kept (7.9.2026).
 * The game does not repeat the slogan anywhere in its own voice; it shows a card that
 * exists, and a card that exists is a fact about the decade, not an endorsement of it.
 */
const SG90: StickerDef[] = page('sg90', 'e', FROM_SHEET_90, [
  ['sg90-00', 'דוד הרשליקוביץ׳'],
  ['sg90-01', 'טל אוסובסקי'],
  ['sg90-02', 'גל הרשליקוביץ׳'],
  ['sg90-03', 'פיטר קרמנס'],
  ['sg90-05.png', 'רפי שמואל'],
  ['sg90-06.png', 'אלי כהן'],
  ['sg90-07', 'רמי ארמה'],
  ['sg90-08', 'משה מוסטרלי'],
  ['sg90-09', 'יעקב אקהויז'],
  ['sg90-10', 'אחמד מוסא'],
  ['sg90-11.png', 'משה סיני'],
  ['sg90-12', 'חזי שירזי'],
  ['sg90-13', 'יובל פילוס'],
  ['sg90-04', 'סמל הקבוצה'],
])

const S9293: StickerDraft[] = [
  {
    id: 'halfon',
    set: '9293',
    slot: 1,
    nameHe: 'פליקס חלפון',
    scan: '/life/docs/sg-halfon-93.jpg',
    sourceHe: 'כרטיס סופרגול, עונת 1992/93 — מהחומרים של צוות The Worker.',
    rarity: 'rare',
  },
  {
    id: 'sinai-93',
    set: '9293',
    slot: 2,
    nameHe: 'משה סיני',
    roleHe: 'מנהל',
    sourceHe: 'תצלום הסגל, עונת 1992/93 — מהחומרים של צוות The Worker.',
    rarity: 'uncommon',
  },
  {
    id: 'abuksis',
    set: '9293',
    slot: 3,
    nameHe: 'יוסי אבוקסיס',
    sourceHe: 'תצלום הסגל, עונת 1992/93 — מהחומרים של צוות The Worker.',
    rarity: 'common',
    neverInPacket: true,
  },
]

/** הדף של 96 — one sticker, given rather than bought */
const S96: StickerDef[] = [
  {
    id: 'tikva',
    set: '96',
    slot: 1,
    nameHe: 'שלום תקוה',
    printedN: 231,
    scan: '/life/docs/sg-tikva-96.jpg',
    sourceHe: FROM_ALBUM,
    rarity: 'kept',
    neverInPacket: true,
  },
]

/**
 * הקופסה של אבא — the page no kiosk sells.
 *
 * Five men who played before the boy was born, and five cards out of Maor's own album
 * with the tape and his handwriting still on them. None of it is in a packet. One card
 * comes out of the box each time a page of the album is finished, which is the only
 * honest way a child ever got a card like this: somebody older decided he had earned it.
 */
const BOX_ROWS: ReadonlyArray<[string, string, string?]> = [
  ['ace-chodorov', 'יעקב חודורוב', 'שוער'],
  ['ace-levkovich', 'אמצייה לבקוביץ׳'],
  ['ace-tish', 'גדעון טיש'],
  ['ace-primo', 'דוד פרימו'],
  ['ace-feingboim', 'שייע פייגנבוים'],
  ['hand-hershkovitz', 'דוד (צ׳ילה) הרשליקוביץ׳'],
  ['hand-rufnik', 'דבור רופניק'],
]

const SBOX: StickerDef[] = BOX_ROWS.map(([file, nameHe, roleHe], index) => ({
  id: `box-${file}`,
  set: 'box' as const,
  slot: index + 1,
  nameHe,
  ...(roleHe ? { roleHe } : {}),
  scan: `/life/docs/${file.includes('.') ? file : `${file}.jpg`}`,
  sourceHe: file.startsWith('ace-')
    ? 'קלף אס — מהחומרים של צוות The Worker.'
    : FROM_ALBUM,
  rarity: 'kept' as StickerRarity,
  neverInPacket: true,
}))

/**
 * טיוטת דף — a page as it is AUTHORED, before it is a page.
 *
 * Authoring a slot without a photograph is still allowed and still useful: the name, the
 * source and the role are real research and they stay in the file. What changed on
 * 17.9.2026 is that such a slot no longer reaches a screen.
 */
type StickerDraft = Omit<StickerDef, 'scan'> & { scan?: string }

/**
 * הדלת — the only way a drafted page becomes stickers.
 *
 * Three things happen here and each one is a bug that would otherwise ship:
 * · a slot with no `scan` is DROPPED, which is the decision itself;
 * · `slot` is renumbered 1..n, because a page that kept its authored numbers would show
 *   1, 3, 6, 11 and read as four missing stickers rather than a page of four;
 * · the surviving last card inherits `neverInPacket`, because the card you have to ask
 *   somebody for is a property of the PAGE, not of whoever happened to be authored last.
 *
 * Pages that are photographs end to end pass through unchanged, and `page()` already
 * closes them, so `withScans` leaves an existing `neverInPacket` alone.
 */
function withScans(rows: readonly StickerDraft[]): StickerDef[] {
  const kept = rows.filter((row): row is StickerDraft & { scan: string } => Boolean(row.scan))
  const out = kept.map((row, index) => ({ ...row, slot: index + 1 }))
  const last = out[out.length - 1]
  if (last && !out.some((row) => row.neverInPacket)) {
    out[out.length - 1] = { ...last, rarity: 'rare', neverInPacket: true }
  }
  return out
}


/**
 * שנות האלפיים — the decade the gap document said had no scans (27.9.2026). It had: the
 * approved folder carries a full 2002/03 card set (thirteen men and the squad card), the
 * pair of Diadora stickers from the same season, and three album stickers from 2004 and
 * 2007 with the tape under them in his own hand. Names are the ones printed on the cards.
 */
const FROM_SET_0203 = 'סדרת קלפים, עונת 2002/03; מהחומרים של צוות The Worker.'
const FROM_SHEET_00 = 'מדבקות מהאלבום, שנות האלפיים; מהחומרים של צוות The Worker.'

const SG0203: StickerDef[] = page('sg0203', 'e', FROM_SET_0203, [
  ['sg0203-00', 'יגאל אנטבי'],
  ['sg0203-08', 'שביט אלימלך'],
  ['sg0203-02', 'סלים טועמה'],
  ['sg0203-03', 'גאבור הלמאי'],
  ['sg0203-04', 'שי אבוטבול'],
  ['sg0203-05', 'סרגיי קלשנקו'],
  ['sg0203-06.png', 'יוסי אבוקסיס'],
  ['sg0203-07', 'פיני בלילי'],
  ['sg0203-09', 'כפיר אודי'],
  ['sg0203-10', 'דניס אונישנקו'],
  ['sg0203-11', 'אסי דומב'],
  ['sg0203-12', 'בן לוז'],
  ['sg0203-01', 'דרור קשטן', 'מאמן'],
  ['sg0203-13', 'הקבוצה'],
])

const HAND_00: Record<string, string> = {
  'hand-antebi': 'סגר את אגף שמאל לעשר שנים. חצי מתאומי המגדל',
  'hand-talchen': 'נשמה, הגנה, מלחמה',
  'hand-avrbrl': 'מהספסל לגמר הגביע',
}

const SG00: StickerDef[] = page('sg00', 'f', FROM_SHEET_00, [
  ['sg00-balili.png', 'פיני בלילי'],
  ['sg00-elimelech.png', 'שביט אלימלך'],
  ['hand-antebi.png', 'יגאל אנטבי'],
  ['hand-talchen.png', 'טל חן'],
  ['hand-avrbrl.png', 'ניל אברבנל'],
]).map((sticker) => {
  const key = Object.keys(HAND_00).find((k) => sticker.scan.includes(k))
  return key ? { ...sticker, handHe: HAND_00[key] } : sticker
})

export const STICKERS: readonly StickerDef[] = [
  ...S8081,
  ...withScans(S8586),
  ...SG80A,
  ...SGCUP,
  ...SG80B,
  ...withScans(S9293),
  ...SG90,
  ...SG978,
  ...SG0203,
  ...SG00,
  ...S96,
  ...SBOX,
]

export const stickerFor = (id: string): StickerDef | null =>
  STICKERS.find((sticker) => sticker.id === id) ?? null

export const stickersIn = (set: StickerSetId): StickerDef[] =>
  STICKERS.filter((sticker) => sticker.set === set).sort((a, b) => a.slot - b.slot)

export const SET_ORDER: readonly StickerSetId[] = [
  '8081',
  '8586',
  'sg80a',
  'sgcup',
  'sg80b',
  '9293',
  'sg90',
  'sg978',
  'sg0203',
  'sg00',
  '96',
  'box',
]

// ---------------------------------------------------------------------------------
// המצב — how many of each one you have. `album:` survives a year change (`personFlags`),
// because an album is the one object in this game that is explicitly about outliving the
// afternoon it was filled in.
// ---------------------------------------------------------------------------------

export const stickerFlag = (id: string) => `album:sg:${id}`

/** the flag that says this album has been opened at least once — the world can notice */
export const ALBUM_SEEN = 'album:seen'

export function haveOf(state: LifeState, id: string): number {
  const value = state.flags[stickerFlag(id)]
  return typeof value === 'number' ? value : value === true ? 1 : 0
}

export const hasSticker = (state: LifeState, id: string) => haveOf(state, id) > 0

/**
 * קרוע — the slot a player decided to empty on purpose.
 *
 * Maor, 7.9.2026: a man who went over to the other side is still in the album, and the
 * boy gets to decide. Tearing him out is not losing the card — it is spending it. The
 * slot is settled either way: a torn page still closes, because the album is the boy's
 * and he has said what he thinks.
 */
export const TORN_PREFIX = 'album:torn:'
export const tornFlag = (id: string) => `${TORN_PREFIX}${id}`
export const isTorn = (state: LifeState, id: string) => state.flags[tornFlag(id)] === true

/** decided, one way or the other: stuck in, or torn out on purpose */
export const settled = (state: LifeState, id: string) => hasSticker(state, id) || isTorn(state, id)

/** how many DIFFERENT stickers of a page are stuck in */
export function stuckIn(state: LifeState, set: StickerSetId): number {
  return stickersIn(set).filter((sticker) => hasSticker(state, sticker.id)).length
}

/** every duplicate you are holding, one entry per spare copy */
export function duplicates(state: LifeState): StickerDef[] {
  const out: StickerDef[] = []
  for (const sticker of STICKERS) {
    const spare = haveOf(state, sticker.id) - 1
    for (let i = 0; i < spare; i += 1) out.push(sticker)
  }
  return out
}

/** the pages that are finished, and the ones that never can be */
export function pageDone(state: LifeState, set: StickerSetId): boolean {
  const page = stickersIn(set)
  return page.length > 0 && page.every((sticker) => settled(state, sticker.id))
}

/**
 * הדף נסגר — is this page finished once these arrive?
 *
 * Asked BEFORE the events are applied, because the toast has to be queued in the same
 * turn as the sticker that closed the page. `extra` is what is about to be counted in.
 */
export function closesPage(state: LifeState, set: StickerSetId, extra: Iterable<string>): boolean {
  const arriving = new Set(extra)
  const page = stickersIn(set)
  if (page.length === 0) return false
  const already = page.filter((sticker) => settled(state, sticker.id)).length
  if (already === page.length) return false
  return page.every((sticker) => settled(state, sticker.id) || arriving.has(sticker.id))
}

export function albumTotals(state: LifeState): { have: number; total: number; torn: number } {
  return {
    have: STICKERS.filter((sticker) => hasSticker(state, sticker.id)).length,
    total: STICKERS.length,
    torn: STICKERS.filter((sticker) => isTorn(state, sticker.id)).length,
  }
}

/**
 * אס — the five men who played before the boy was born.
 *
 * They are not in any packet and not in any shop. They come out of the red box, one for
 * each album finished, and the game treats them differently everywhere it can: bigger on
 * the reveal, held longer, a star behind them. A card that is handed to you for finishing
 * something should not arrive the same way as the fourth Eli Cohen of the afternoon.
 */
export const isAce = (sticker: StickerDef) => sticker.set === 'box' && sticker.id.startsWith('box-ace-')

/**
 * הדפסה — what this particular print run was short of.
 *
 * Maor, 7.9.2026: *"אני רוצה שיהיה מצב שמתמודד לא ימלא לגמרי את האלבום... ומתמודדים שונים
 * ישיגו קלפים שונים."* So two slots on every sellable page are short-printed, chosen from
 * the run's own seed: no packet in this life will ever contain them. They are still
 * gettable — somebody else in the neighbourhood pulled them, and a trade still works —
 * but only by asking, and only if you have kept a spare and the bond to ask with.
 *
 * Two consequences, both wanted: an album is hard to finish in one life, and two players
 * telling each other what they got are not describing the same album.
 */
export const SHORT_PER_PAGE = 2

export function shortPrints(state: LifeState, set: StickerSetId): Set<string> {
  const pool = stickersIn(set).filter((sticker) => !sticker.neverInPacket)
  if (pool.length <= SHORT_PER_PAGE + 1) return new Set()
  // seeded on the run and the page, never on the clock: the same life short-prints the
  // same cards every time it is loaded, which is what makes it a print run and not a bug
  const roller = new Roller({ seed: state.rng.seed + hash(set), cursor: 0 })
  const left = [...pool]
  const out = new Set<string>()
  for (let i = 0; i < SHORT_PER_PAGE; i += 1) {
    const [taken] = left.splice(Math.floor(roller.next() * left.length), 1)
    if (taken) out.add(taken.id)
  }
  return out
}

function hash(text: string): number {
  let n = 0
  for (let i = 0; i < text.length; i += 1) n = (n * 31 + text.charCodeAt(i)) % 100000
  return n
}

// ---------------------------------------------------------------------------------
// המעטפה — what a packet costs, what is in it, and what it will never contain.
// ---------------------------------------------------------------------------------

/** what the money line says when a packet is paid for */
export const PACKET_WHY_HE = 'מעטפת סופרגול'

/**
 * שלוש התשובות שהמעטפה לא ידעה לתת — the three ways buying one can fail.
 *
 * They are here rather than in the runtime because they are facts about the PRODUCT:
 * which decade printed an album, what a packet costs, and what is left in the box. The
 * runtime only chooses which one to say. Before 16.9.2026 it said none of them and the
 * effect ended on a bare `break` — so from `2000-title` on, where no album exists, the
 * kiosk's most-offered choice did nothing at all and looked exactly like a dead button.
 */
export const PACKET_NONE_HE = 'אין פה מעטפות סופרגול בשנים האלה. האלבומים נגמרו עם העשור.'
export const PACKET_SHORT_HE = 'אין לך מספיק. חסר'
export const PACKET_EMPTY_HE = 'הקופסה ריקה. מה שהיה בה כבר אצלך.'

/** how many stickers come out of one — three, the way they did */
export const PACKET_SIZE = 3

/** what one packet costs where this chapter is standing, in whole shekels of its decade */
export const packetShekels = (chapter: string) => PACKET[decadeOf(chapter)]

/**
 * מה שהגיע לדלפק עד עכשיו — every album a counter could be selling by this chapter.
 *
 * The twin of `onSale` for shirts: cumulative, in `SET_ORDER`, and gated on `from` so an
 * album cannot be on a counter before the season printed on it happened. Pages that were
 * never sold at all are not stock and are not here.
 */
export function setsBy(chapter: string): StickerSet[] {
  const now = chapterIndex(chapter)
  if (now < 0) return []
  return SET_ORDER.map((id) => SETS[id]).filter((set) => {
    if (set.soldIn === null) return false
    const at = chapterIndex(set.from)
    return at >= 0 && at <= now
  })
}

/**
 * עונה חדשה של סופרגול נכנסה לחנות — the twin of `arrivedBetween`, and the thing this
 * file had no way of answering until now.
 *
 * Maor asked for it in one sentence: *"תעשה התראות על עונת סופרגול חדשה שנכנסה לחנות."*
 * A shirt has had this since 5.9.2026 — `Shirt.from`, `arrivedBetween`, `SHIRT_NEW_HE`
 * and a once-per-chapter `own:shopnews:` flag — and an album, which is the thing a child
 * of that age actually waited for, had nothing: no arrival date, so no arrival.
 *
 * Same shape, deliberately, so the runtime announces both through one habit: what is on
 * the counter now, minus what was on it last chapter. `null` previous means the first
 * chapter of the life, where everything is new and therefore nothing is news.
 */
export function setsArrivedBetween(previous: string | null, chapter: string): StickerSet[] {
  if (!previous) return []
  const had = new Set(setsBy(previous).map((set) => set.id))
  return setsBy(chapter).filter((set) => !had.has(set.id))
}

/** the albums that reached the counter in this chapter, asked the way a room asks it */
export const newSetsIn = (chapter: string) => setsArrivedBetween(previousChapter(chapter), chapter)

/**
 * The card is held up ONCE per chapter, and the flag says so. `own:` is one of the six
 * prefixes that survive a new day and a new decade (rule 68), so the announcement cannot
 * come back tomorrow for the same album — exactly what `own:shopnews:` does for a kit.
 * It is spelled here rather than in the scene so the shop and the scene read one key.
 */
export const albumNewsFlag = (chapter: string) => `own:albumnews:${chapter}`

/** what the arrival card calls itself — the twin of `SHIRT_NEW_HE` */
export const SET_NEW_HE = 'עונה חדשה של סופרגול בחנות'

/**
 * מה מוכרים בקיוסק עכשיו — the album the kiosk still has packets for.
 *
 * A decade prints more than one album, and a kiosk does not sell four at once: it sells
 * the current one until it is finished and then the next. So this returns the first page
 * of that decade the boy has not completed, and only when every page of the decade is
 * full does it fall back to the last of them — a kiosk with nothing left to sell you is
 * a kiosk that stops the feature dead, and a duplicate is still worth trading.
 *
 * **It now asks `setsBy` rather than the whole decade**, which is the `from` field doing
 * its job: in 1984 the counter sold the 1985/86 album, a season that had not been played.
 * It sells the squad sheet instead, and the 1985/86 album ARRIVES in `a4-shirt` — which
 * is the moment there is now something to announce.
 *
 * **On the hole at the other end, and why it stays a hole.** Every chapter from
 * `2000-title` is in the `00s`, no page in this album was sold in the 2000s, so this
 * answers `null` — and once, `{ e: 'packet' }` in `runtime/dialogue.ts` broke out doing
 * nothing: money unspent, no card, no sentence (since delta 90 every counter asks
 * `purchasePacket`, which says `PACKET_NONE_HE` before a shekel moves). The fix is NOT to invent a 2000s album: Maor's
 * folder holds 1980/81, 1985/86, three eighties sheets, 1992/93, a nineties sheet,
 * 1997/98 and 1996, and a page of names for a season nobody photographed would be the
 * exact fabrication rule 11 forbids. Nor is it to keep selling the 1997/98 album in 2000
 * at four shekels a packet to a man of twenty-two — that is a fiction about the character
 * as much as about the archive.
 * So `null` is the right ANSWER and the defect is that it is silent: a refusal is an
 * answer and has to be said out loud (rule 11). The shop says it — `ShopCard` prints the
 * counter as shut with a reason instead of hiding the section — and the one thing this
 * file cannot fix from here is the dialogue effect, which needs a `toast` on the empty
 * case. That is written down as a patch request rather than done in somebody else's file.
 */
export function setSoldIn(state: LifeState): StickerSetId | null {
  const decade = decadeOf(state.chapter)
  const inDecade = setsBy(state.chapter).filter((set) => set.soldIn === decade)
  if (inDecade.length === 0) return null
  /**
   * **A page no packet can add to is not what the kiosk sells** (delta 90, Batch 0).
   *
   * The 1992/93 page survives `withScans` as ONE sticker — Halfon — and that one closes the
   * page, so it is `neverInPacket` and the page's packet pool is empty. The kiosk, asked
   * for "the first page not finished", sold that page from 1993-cup to 1999-cup: every
   * packet in seven chapters answered "הקופסה ריקה" to a boy with an empty album. The
   * matrix in `tests/life-economy-matrix.test.ts` found it; the fix is the kiosk rule read
   * properly — it sells the first unfinished page it has envelopes FOR.
   */
  const buyable = (set: StickerSet) => packetPool(state, set.id).length > 0
  const open = inDecade.find((set) => !pageDone(state, set.id) && buyable(set))
  if (open) return open.id
  const last = [...inDecade].reverse().find(buyable)
  return (last ?? inDecade.find((set) => !pageDone(state, set.id)) ?? (inDecade[inDecade.length - 1] as StickerSet)).id
}

/**
 * מה אבא מוציא מהקופסה — the next card out of the red box.
 *
 * The box page is never sold and never in a packet. One card leaves it each time a page
 * of the album is finished, in the order the box happens to be in, which is the order
 * somebody older put it in.
 */
export function nextKept(state: LifeState): StickerDef | null {
  return stickersIn('box').find((sticker) => !hasSticker(state, sticker.id)) ?? null
}

/**
 * מה יוצא מהקופסה כשדף נסגר — one card, or the whole box.
 *
 * There is one card in the box for every page a kiosk sells, so finishing the albums
 * empties it exactly. The last page is the exception: when nothing sellable is left
 * unfinished the box is turned over and whatever is still in it comes out, because an
 * album with a slot that no longer has any way of being filled is a broken promise, and
 * this game has spent a year not making those.
 */
export function keptOnClose(state: LifeState, closing: StickerSetId, extra: Iterable<string>): StickerDef[] {
  const arriving = new Set(extra)
  const done = (set: StickerSetId) =>
    stickersIn(set).every((sticker) => hasSticker(state, sticker.id) || (set === closing && arriving.has(sticker.id)))
  const sellable = SET_ORDER.filter((id) => SETS[id].soldIn !== null)
  const last = sellable.every((id) => done(id))
  const left = stickersIn('box').filter((sticker) => !hasSticker(state, sticker.id))
  if (last) return left
  return left.slice(0, 1)
}

const WEIGHT: Record<StickerRarity, number> = { common: 10, uncommon: 6, rare: 2, kept: 0 }

/**
 * מה יש במעטפה — three stickers, weighted, and never the one that closes the page.
 *
 * A packet leans slightly towards what is missing — 2× on a sticker you do not have —
 * because a real packet does not and a game that does not is unplayable past the tenth
 * one. The lean is small enough that duplicates still happen, which is the entire social
 * mechanic: a duplicate is the only currency you can trade with.
 */
/** what an envelope of this page can hold for this life — never the closing card, a short print or a torn one */
function packetPool(state: LifeState, set: StickerSetId): StickerDef[] {
  const short = shortPrints(state, set)
  return stickersIn(set).filter(
    (sticker) =>
      !sticker.neverInPacket && WEIGHT[sticker.rarity] > 0 && !short.has(sticker.id) && !isTorn(state, sticker.id),
  )
}

export function openPacket(state: LifeState, set: StickerSetId, at = 0): string[] {
  const pool = packetPool(state, set)
  if (pool.length === 0) return []
  const roller = new Roller({ seed: state.rng.seed, cursor: state.rng.cursor + at })
  const out: string[] = []
  for (let i = 0; i < PACKET_SIZE; i += 1) {
    const weights = pool.map(
      (sticker) => WEIGHT[sticker.rarity] * (hasSticker(state, sticker.id) || out.includes(sticker.id) ? 1 : 2),
    )
    const total = weights.reduce((sum, weight) => sum + weight, 0)
    let pick = roller.next() * total
    let chosen = pool[pool.length - 1] as StickerDef
    for (let n = 0; n < pool.length; n += 1) {
      pick -= weights[n] as number
      if (pick <= 0) {
        chosen = pool[n] as StickerDef
        break
      }
    }
    out.push(chosen.id)
  }
  return out
}

// ---------------------------------------------------------------------------------
// הקנייה — ONE transaction, and every counter asks it (delta 90, §21).
// ---------------------------------------------------------------------------------

/**
 * מעטפה ששולמה ועוד לא נפתחה מול העיניים — the packet the economy already settled and the
 * presentation has not finished showing.
 *
 * Money and stickers are state; the tear is presentation (§21.5). So the purchase writes
 * this flag in the SAME dispatch that takes the money and sticks the cards in, and the
 * shell clears it when the reveal is put down (`packetClosed`). A reload in between finds
 * it and plays the reveal again from `packetReplay` — never a second charge, never a
 * second grant. While it is up, a second tap on "קנה" is answered with the same packet:
 * a double tap is one packet, not two. `album:` survives the night (rule 68).
 *
 * Value: `id,id,id|n,n,n` — the ids that came out and how many of each were stuck in
 * BEFORE, so `חדש` stays true on a replay.
 */
export const PACKET_PENDING = 'album:packet:pending'
/** how many packets this life has bought — the roll's cursor, so two packets in one minute differ */
export const PACKET_COUNT = 'album:packets'

export type PacketStatus = 'ok' | 'none' | 'short' | 'empty' | 'pending'

/**
 * מה הדלפק אומר לפני שנוגעים בכסף — the §21.4 card, as data.
 *
 * Every answer is known BEFORE a shekel moves: which album the envelope is from, what it
 * costs, what is in the pocket, and — for the three refusals — the sentence. A counter
 * that shows a price and a wallet and a disabled button with this line under it is a
 * counter nobody mistakes for a dead one (§24.1).
 */
export type PacketQuote = {
  status: PacketStatus
  set: StickerSetId | null
  /** `1985/86` — printed on the envelope */
  seasonHe: string | null
  titleHe: string | null
  /** agorot */
  price: number
  wallet: number
  missing: number
  /** the refusal, in the room's words — null when the packet can be bought */
  sayHe: string | null
}

const shekelText = (agorot: number) => `${Math.round(Math.max(0, agorot) / 100)} ₪`

/** `מעטפה: 1 ₪ · יש לך 0 ₪ · חסר 1 ₪` — the §21.3 line, said before the money is asked for */
export function packetShortHe(price: number, wallet: number): string {
  return `מעטפה: ${shekelText(price)} · יש לך ${shekelText(wallet)} · חסר ${shekelText(price - wallet)}`
}

function pendingOf(state: LifeState): { ids: string[]; before: Record<string, number> } | null {
  const raw = state.flags[PACKET_PENDING]
  if (typeof raw !== 'string' || raw === '') return null
  const [idsPart = '', countsPart = ''] = raw.split('|')
  const ids = idsPart.split(',').filter((id) => stickerFor(id) !== null)
  if (ids.length === 0) return null
  const counts = countsPart.split(',').map((n) => Number(n) || 0)
  const before: Record<string, number> = {}
  ids.forEach((id, index) => {
    if (!(id in before)) before[id] = counts[index] ?? 0
  })
  return { ids, before }
}

/** the reveal a reload owes the player — null when nothing is waiting */
export const packetReplay = (state: LifeState) => pendingOf(state)

export function packetQuote(state: LifeState): PacketQuote {
  const set = setSoldIn(state)
  const price = (PACKET[decadeOf(state.chapter)] ?? 1) * 100
  const wallet = state.agorot
  const base = {
    set,
    seasonHe: set ? SETS[set].seasonHe : null,
    titleHe: set ? SETS[set].titleHe : null,
    price,
    wallet,
    missing: Math.max(0, price - wallet),
  }
  if (pendingOf(state)) return { ...base, status: 'pending', sayHe: null }
  if (!set) return { ...base, status: 'none', sayHe: PACKET_NONE_HE }
  if (wallet < price) return { ...base, status: 'short', sayHe: packetShortHe(price, wallet) }
  // the box is checked BEFORE the money, never after (§21.3: never charge and reveal nothing)
  if (openPacket(state, set, packetCursor(state)).length === 0) return { ...base, status: 'empty', sayHe: PACKET_EMPTY_HE }
  return { ...base, status: 'ok', sayHe: null }
}

/** the roll's offset: the minute, plus how many packets came before — the same save deals the same packets */
function packetCursor(state: LifeState): number {
  const bought = Number(state.flags[PACKET_COUNT] ?? 0) || 0
  return state.minute + bought * 1009
}

/**
 * The purchase — pure. Returns the quote, the events to dispatch (empty on any refusal
 * and on a replay), and what the shell shows. `reveal` is set on success AND on a
 * pending replay; `events` only on success. The caller dispatches `events` in ONE
 * `dispatch` so the money, the cards and the pending mark land together.
 */
export type PacketPurchase = {
  quote: PacketQuote
  events: LifeEvent[]
  reveal: { ids: string[]; before: Record<string, number> } | null
  /** the red-box cards a closed page turns over — shown after the packet is put down */
  kept: string[]
  /** `1985/86 — הדף מלא.` when this packet closed its page */
  fullHe: string | null
  /** true when nothing was charged because this is the packet already paid for */
  replay: boolean
}

export function purchasePacket(state: LifeState): PacketPurchase {
  const quote = packetQuote(state)
  const none: PacketPurchase = { quote, events: [], reveal: null, kept: [], fullHe: null, replay: false }
  if (quote.status === 'pending') return { ...none, reveal: pendingOf(state), replay: true }
  if (quote.status !== 'ok' || !quote.set) return none
  const set = quote.set
  const ids = openPacket(state, set, packetCursor(state))
  const before: Record<string, number> = {}
  for (const id of ids) if (!(id in before)) before[id] = haveOf(state, id)
  const events: LifeEvent[] = [{ t: 'money.changed', agorot: -quote.price, why: PACKET_WHY_HE }]
  const counted: Record<string, number> = { ...before }
  for (const id of ids) {
    counted[id] = (counted[id] ?? 0) + 1
    events.push({ t: 'flag.set', flag: stickerFlag(id), value: counted[id] as number })
  }
  events.push({ t: 'flag.raised', flag: ALBUM_SEEN })
  events.push({ t: 'flag.set', flag: PACKET_COUNT, value: (Number(state.flags[PACKET_COUNT] ?? 0) || 0) + 1 })
  events.push({
    t: 'flag.set',
    flag: PACKET_PENDING,
    value: `${ids.join(',')}|${ids.map((id) => before[id] ?? 0).join(',')}`,
  })
  let kept: string[] = []
  let fullHe: string | null = null
  if (closesPage(state, set, ids)) {
    const cards = keptOnClose(state, set, ids)
    for (const card of cards) events.push({ t: 'flag.set', flag: stickerFlag(card.id), value: 1 })
    kept = cards.map((card) => card.id)
    fullHe = `${SETS[set].titleHe} — הדף מלא.`
  }
  return { quote, events, reveal: { ids, before }, kept, fullHe, replay: false }
}

/** the reveal was put down — the one event that closes the transaction's presentation */
export const packetClosed = (state: LifeState): LifeEvent[] =>
  state.flags[PACKET_PENDING] ? [{ t: 'flag.set', flag: PACKET_PENDING, value: '' }] : []

// ---------------------------------------------------------------------------------
// ההחלפה — who has the one you are missing.
// ---------------------------------------------------------------------------------

/** the three children in this game who collect, in the order a page would ask them */
export const TRADERS: readonly CharacterId[] = ['ofir', 'amit', 'efi']

/**
 * מי מחזיק אותה — the missing sticker is with whoever you have been worst to.
 *
 * Maor's own line for this feature: *"הקלף שחסר לך תמיד אצל מי שהכי פחות נחמד לך."* It
 * is a joke and it is also the truest thing anybody has said about collecting as a
 * child. Implemented literally: lowest bond holds it, ties broken by the fixed order, so
 * the answer is stable within an afternoon and moves when the friendship does.
 */
export function holderOf(state: LifeState, id: string): CharacterId | null {
  const sticker = stickerFor(id)
  if (!sticker || hasSticker(state, id)) return null
  let worst: CharacterId | null = null
  let lowest = Number.POSITIVE_INFINITY
  for (const who of TRADERS) {
    const bond = relationshipOf(state, who).bond
    if (bond < lowest) {
      lowest = bond
      worst = who
    }
  }
  return worst
}

/** what he wants for it: one of your duplicates, and he will name the one he is short of */
export function tradeAsk(state: LifeState, id: string): StickerDef | null {
  const spare = duplicates(state)
  if (spare.length === 0) return null
  const sticker = stickerFor(id)
  const samePage = spare.filter((one) => one.set === sticker?.set)
  return (samePage[0] ?? spare[0]) as StickerDef
}

/** the sticker to go asking for: the rarest one still missing on the page being collected */
export function missingOn(state: LifeState, set: StickerSetId): StickerDef | null {
  const order: StickerRarity[] = ['rare', 'uncommon', 'common', 'kept']
  const missing = stickersIn(set).filter((sticker) => !settled(state, sticker.id))
  missing.sort((a, b) => order.indexOf(a.rarity) - order.indexOf(b.rarity) || a.slot - b.slot)
  return missing[0] ?? null
}
