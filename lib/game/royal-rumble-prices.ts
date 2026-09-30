import type { RoyalRumblePrice } from './royal-rumble-public'

export { ROYAL_RUMBLE_BALANCE_VERSION } from './royal-rumble-public'

/**
 * THE TEN (Gate 9 V3, 29.9.2026) — the only players who cost €5M. A reviewed list, not a
 * quota: the pipeline ranks and prices everybody else in €1–€4 and has no way to create an
 * eleventh (`pool()` throws if an override or a rounding ever tries). Chosen by one
 * question — who is named first by a supporter of any era — checked against the documented
 * evidence (`npm run rumble:audit` prints it) and spread across eras and all four positions
 * so €5 is a choice at every line of the five. To change the ten, change this list and the
 * exact-set test beside it; both are decisions for the owner.
 *
 * `reasonHe` is what the audit prints beside a canonical five — the evidence in the archive,
 * never a superlative.
 */
export const ROYAL_RUMBLE_CANONICAL_FIVES: ReadonlyArray<{ slug: string; reasonHe: string }> = [
  { slug: 'יעקב-חודורוב', reasonHe: 'שוער · 15 עונות מתועדות · 2 תארים' },
  { slug: 'ריפעת-טורק', reasonHe: '12 עונות מתועדות · 2 תארים' },
  { slug: 'משה-סיני', reasonHe: '110 שערים מתועדים · 13 עונות, 4 תארים' },
  { slug: 'יוסי-אבוקסיס', reasonHe: '12 עונות · 4 תארים · 30 שערים מתועדים' },
  { slug: 'סלים-טועמה', reasonHe: '7 תארים · 10 עונות · 57 שערים מתועדים' },
  { slug: 'שלום-תקוה', reasonHe: 'קשר · 5 עונות · 3 תארים · 21 שערים מתועדים' },
  { slug: 'דוד-פרימו', reasonHe: 'בלם · 9 עונות בשתי תקופות · 3 תארים' },
  { slug: 'שייע-פייגנבוים', reasonHe: '85 שערים מתועדים · חלוץ 13 עונות' },
  { slug: 'גילי-לנדאו', reasonHe: '16 עונות · 51 שערים מתועדים · שער הניצחון של 24.5.1986' },
  { slug: 'שבתאי-לוי', reasonHe: '67 שערים מתועדים · 12 עונות' },
]

export const ROYAL_RUMBLE_FIVE_COUNT = 10

/**
 * Canonical price overrides — the LAST step of the price pipeline (spec §12–§13):
 *
 *     historicalRating → suggested price → position calibration → canonical override
 *
 * The automated price is a percentile of documented evidence, and evidence is uneven
 * across a century: a 1930s man has a handful of squad rows, a 2010s squad man has a
 * season of scorer tables. These are the men the formula is allowed to be wrong about,
 * reviewed by hand against the audit's ladder (`npm run rumble:audit`, §67–§68) and
 * priced by one question only — *does this price make a fun, sensible choice?* — never
 * "who is bigger historically". Keys are Player Master slugs; the pricing test fails on a
 * slug the master does not know and on the list growing past sixty (§13: overrides are
 * for icons, sparse data, short peaks and automated mispricing — not for hand-pricing the
 * archive).
 *
 * Three groups (V3, 29.9.2026 — no override may be a €5; `CANONICAL_FIVES` is the only door):
 *  · ICONS one notch under the ten, pinned at €4 — the large elite tier.
 *  · EVIDENCE-INFLATED → €4: founding-era rows where longevity is the only fact on
 *    file, one-spell peaks the scorer table over-rewards, and current-squad men with no
 *    honours yet. A "major Hapoel player" price is the honest one, and it is what makes
 *    €5 rare (§10: 8–12%).
 *  · CULT PICKS priced as bargains: the men the terrace sings about (`songs.json`) who
 *    played two or three seasons. A €2 card with a song behind it is exactly the
 *    "רגע — הוא רק €2M? אני לוקח" the spec is after.
 */
export const ROYAL_RUMBLE_PRICE_OVERRIDES: Readonly<Record<string, RoyalRumblePrice>> = {
  // the ten greatest are CANONICAL_FIVES below, never an override: an override cannot be a €5
  // the icons the terrace names first, one notch under the ten — €4 is the large elite tier
  'יחזקאל-חזום': 4,
  'רחביה-רוזנבוים': 4,
  'וואליד-באדיר': 4,
  'וינסנט-אניימה': 4,
  'אריה-בזרנו': 4,
  'שביט-אלימלך': 4,
  // evidence-inflated — founding era, longevity only
  'וילי-ברגר': 4,
  'משה-פוליאקוב': 4,
  'שלמה-פוליאקוב': 4,
  'אברהם-נודלמן': 4,
  'זלמן-פרידמן': 4,
  'אשר-בלוט': 4,
  'חיים-נוריאלי': 4,
  'דני-בורסוק': 4,
  // evidence-inflated — one spell, or no honours yet
  'אייל-בן-עמי': 4,
  'יהודה-עמר': 4,
  'אישטוואן-פישונט': 4,
  'מהראן-לאלה': 4,
  'עומרי-אלטמן': 4,
  'סתיו-טוריאל': 4,
  'ערן-זהבי': 4,
  'שמעון-גרשון': 4,
  // owner ruling 29.9.2026: the weak elites are €1
  'אלכס-באסוק': 1,
  'טל-איילה': 1,
  'יקיר-לוסקי': 1,
  'משה-דננבאום': 1,
  'פיליפ-מנה': 1,
  'ציקי-קוטלר': 1,
  'שי-אייזן': 1,
  // owner ruling 29.9.2026: €3
  'אלון-חזן': 3,
  'אלון-מזרחי': 3,
  // cult picks — a song, a short spell, a bargain
  'יניב-מזרחי': 2,
  'גיא-צרפתי': 2,
  'עומר-פדידה': 2,
  'יורגן-קולין': 3,
  'דניאל-דה-רידר': 3,
  'חזי-שירזי': 3,
}
