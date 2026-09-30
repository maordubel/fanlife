/**
 * מערכת השכבות — a shirt is not a picture, it is a magazine of eight layers.
 *
 * Straight off the Kit Builder handoff. The same stack produces אתא 1978, the red-black
 * stripes of 1989, the 1992 sash and whatever a player invents this afternoon; the
 * renderer takes one JSON object and returns SVG, with no image files anywhere. That
 * matters for two reasons beyond weight: an SVG shirt can be recoloured per season
 * without a new asset, and the archive can state which LAYER a season got wrong, which
 * is what makes "rebuild the 1989 shirt" a gradeable game instead of a vibe check.
 *
 * The order is fixed and the z-index is the order of this file:
 *   1 base · 2 pattern · 3 sleeves · 4 collar · 5 crest · 6 maker · 7 sponsor · 8 nameset
 */

/**
 * הצבעים שערכה יכולה להיות בהם.
 *
 * `concrete` joined on 5.9.2026, and it joined because it was already in the data: the
 * 2020/21 away shirt has grey printed shoulders and `content/manual/kit-designs.json`
 * records it as `concrete`. `seasonKits()` casts the archive's string to this type without
 * checking, so that panel was being drawn with a CSS variable that does not exist — an
 * invisible shoulder on the kits screen, for as long as the row has been there. The token
 * exists in the palette; only this union had not been told.
 */
export type KitColour = 'red' | 'cream' | 'ink' | 'paper' | 'navy' | 'deep' | 'concrete'

/** The palette, as CSS custom properties, so the tokens stay the single source. */
export const COLOUR_VAR: Record<KitColour, string> = {
  red: 'rgb(var(--red))',
  cream: 'rgb(var(--sheet))',
  ink: 'rgb(var(--ink))',
  paper: 'rgb(var(--paper))',
  navy: 'rgb(var(--sign))',
  /** a darker red for tonal work — the one value with no shell token, since it exists
   *  only inside the shirt */
  deep: '#B81C14',
  /** the grey on the 2020/21 away shoulders, as the archive records it */
  concrete: 'rgb(var(--concrete))',
}

export const COLOUR_NAME: Record<KitColour, string> = {
  red: 'אדום',
  cream: 'שמנת',
  ink: 'שחור',
  paper: 'לבן',
  navy: 'נייבי',
  deep: 'אדום כהה',
  concrete: 'אפור בטון',
}

export type PatternId =
  | 'solid'
  | 'stripe-wide'
  | 'pinstripe'
  | 'hoop-tonal'
  | 'jacquard'
  | 'chevron'
  | 'grid-tonal'
  | 'sash'
  | 'yoke-v'
  | 'gradient'
  | 'side-panel'
  | 'halves'
  // added from the season photographs Maor sent on 1.9.2026 — these four are cuts the
  // club actually wore, and without them a third of the history could not be drawn
  | 'chest-band'
  | 'quarters'
  | 'diagonal'
  | 'twin-stripe'
  | 'shoulder-panel'

export const PATTERNS: { id: PatternId; he: string; latin: string }[] = [
  { id: 'solid', he: 'חלק', latin: 'SOLID · 1978' },
  { id: 'stripe-wide', he: 'פסים רחבים', latin: 'STRIPE-WIDE · 1989' },
  { id: 'pinstripe', he: 'פסי שיער', latin: 'PINSTRIPE · 1989 A' },
  { id: 'hoop-tonal', he: 'חישוקים', latin: 'HOOP-TONAL · 2007' },
  { id: 'jacquard', he: 'מעוינים', latin: 'JACQUARD · 1991' },
  { id: 'chevron', he: 'זיגזג', latin: 'CHEVRON · 1991 A' },
  { id: 'grid-tonal', he: 'רשת טונלית', latin: 'GRID-TONAL · 1991' },
  { id: 'sash', he: 'סאש', latin: 'SASH · 1992' },
  { id: 'yoke-v', he: 'וי כתפיים', latin: 'YOKE-V · 1988 A' },
  { id: 'gradient', he: 'מעבר', latin: 'GRADIENT' },
  { id: 'side-panel', he: 'פאנלים צדדיים', latin: 'SIDE-PANEL · 2007 A' },
  { id: 'halves', he: 'חצאים', latin: 'HALVES' },
  { id: 'chest-band', he: 'פס חזה', latin: 'CHEST BAND · 2002' },
  { id: 'quarters', he: 'רבעים', latin: 'QUARTERS · 1990s' },
  { id: 'diagonal', he: 'אלכסונים דקים', latin: 'DIAGONAL · 1980s' },
  { id: 'twin-stripe', he: 'שני פסים', latin: 'TWIN STRIPE · 1999' },
  { id: 'shoulder-panel', he: 'כתפיים', latin: 'SHOULDER PANEL · 2011' },
]

export type CollarId = 'crew' | 'ringer' | 'v-neck' | 'polo' | 'laced'

export const COLLARS: { id: CollarId; he: string }[] = [
  { id: 'crew', he: 'עגול' },
  { id: 'ringer', he: 'רינגר' },
  { id: 'v-neck', he: 'וי' },
  { id: 'polo', he: 'פולו' },
  { id: 'laced', he: 'שרוכים' },
]

export type SleeveId = 'plain' | 'raglan' | 'cuff' | 'shoulder-stripe' | 'arc'

export const SLEEVES: { id: SleeveId; he: string }[] = [
  { id: 'plain', he: 'אחיד' },
  { id: 'raglan', he: 'רגלן ניגודי' },
  { id: 'cuff', he: 'חפת' },
  { id: 'shoulder-stripe', he: 'פסי כתף' },
  { id: 'arc', he: 'קשת' },
]

export type NamesetId = 'block-solid' | 'block-hollow' | 'condensed'

export const NAMESETS: { id: NamesetId; he: string }[] = [
  { id: 'block-solid', he: 'מלא' },
  { id: 'block-hollow', he: 'חלול' },
  { id: 'condensed', he: 'קונדנסד' },
]

export type KitVariant = 'home' | 'away' | 'third'

export type KitSpec = {
  seasonLabel: string
  variant: KitVariant
  base: KitColour
  pattern: PatternId
  /** the second ink the pattern is drawn in */
  patternInk: KitColour
  sleeves: SleeveId
  sleeveInk: KitColour
  collar: CollarId
  collarInk: KitColour
  /** lettered on the chest — the archive knows these per season */
  sponsorHe: string | null
  makerHe: string | null
  nameset: NamesetId
  number: number | null
  /** the rest of the strip. A shirt on its own is a mockup; a kit is three pieces. */
  shorts: KitColour
  socks: KitColour
  /**
   * Which crest the shirt wears, as a key into `/public/brand/crests`.
   *
   * A shirt wears the crest OF ITS ERA — the 1978 shirt carries the worker mark, the
   * 2002 shirt carries the one with KETER inside it, the 2008 shirt says 1927 and the
   * 2018 shirt says 1923. `lib/kit/seasons.ts` resolves it from the season against the
   * crest timeline, so nothing has to be typed twice. Null draws no crest at all, which
   * is correct for a blank designer shirt and for the two eras with no photographed
   * variant.
   */
  crestKey: string | null
}

export const DEFAULT_SPEC: KitSpec = {
  seasonLabel: '1978/79',
  variant: 'home',
  base: 'red',
  pattern: 'solid',
  patternInk: 'cream',
  sleeves: 'raglan',
  sleeveInk: 'cream',
  collar: 'crew',
  collarInk: 'cream',
  sponsorHe: 'אתא',
  makerHe: null,
  nameset: 'block-solid',
  number: 10,
  shorts: 'cream',
  socks: 'red',
  crestKey: 'worker-hapoel',
}

/*
 * The house PRESETS that used to live here are gone. They were eight kits hand-typed
 * from Maor's reference images, and `content/manual/kit-designs.json` now holds
 * THIRTY-TWO of them with a source on every row — so the rack shows the club's real
 * history instead of a designer's shortlist. `lib/kit/seasons.ts` turns those rows into
 * specs.
 */

/** The eight layers, in order, for the rebuild game's scorecard. */
export const LAYERS = [
  { key: 'base', he: 'גוף' },
  { key: 'pattern', he: 'גזרה' },
  { key: 'sleeves', he: 'שרוולים' },
  { key: 'collar', he: 'צווארון' },
  { key: 'crest', he: 'סמל' },
  { key: 'maker', he: 'יצרן' },
  { key: 'sponsor', he: 'ספונסר' },
  { key: 'nameset', he: 'ערכת מספרים' },
] as const

export type LayerKey = (typeof LAYERS)[number]['key']

/** How many of the eight layers two specs agree on — the rebuild game's whole score. */
export function compareSpecs(a: KitSpec, b: KitSpec): Record<LayerKey, boolean> {
  return {
    base: a.base === b.base,
    pattern: a.pattern === b.pattern,
    sleeves: a.sleeves === b.sleeves,
    collar: a.collar === b.collar,
    crest: true,
    maker: a.makerHe === b.makerHe,
    sponsor: a.sponsorHe === b.sponsorHe,
    nameset: a.nameset === b.nameset,
  }
}
