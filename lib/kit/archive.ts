import 'server-only'

import { verifiedKitSeasons } from '@/lib/game/kits'

import photosFile from '@/content/manual/kit-photos.json'

/**
 * ארכיון החולצות — 168 תצלומים של חולצות אמיתיות, כקריאה אחת.
 *
 * This sits beside `catalog.ts` and is deliberately NOT the same thing, so the split is
 * worth stating once here rather than being rediscovered:
 *
 *   · **`catalog.ts` is what the club's shirts can be DRAWN as.** Thirty-three seasons
 *     graded into five parts — base, pattern, collar, sleeve, crest — which is what
 *     makes gate 4 playable and what makes a locked card meaningful.
 *   · **This module is what the club's shirts LOOKED LIKE.** A photograph cannot be
 *     dealt as a puzzle and should not be: its five parts were never graded and
 *     pretending otherwise would be the archive inventing data. What it can do is be
 *     shown, and be believed, which the drawings cannot.
 *
 * So the archive is evidence and the catalog is the game, and neither is a lesser
 * version of the other. A player who wants to know what the 1985 away shirt looked like
 * gets the photograph; a player who wants to rebuild it from memory gets the drawing.
 *
 * **The dates are two different kinds of fact, and the read-model keeps them apart.**
 * footballkitarchive labels a shirt by season — `2016-17` — so those rows carry a
 * `seasonLabel` and it is true. ויקיפועל labels by a single year — `Foot 2016` — and
 * comparing the two sources showed the mapping is not consistent: some of its years are
 * the season's opening year, some its closing one. Guessing would have produced 114
 * confident wrong seasons, so those rows keep `yearRaw` and the screen prints "בערך"
 * beside the figure. The label is built in the component, from `messages/he.json`: a
 * read-model that returned "1994 בערך" would be a user-facing string living in `lib`
 * (rule 10), and the same row has to serve `alt` text and a table cell as well.
 * Same decision, same reason, as `sponsor-years.json` (rule 11 — not knowing is an
 * answer).
 *
 * **The maker is joined, never stored.** `verifiedKitSeasons()` already resolves the
 * supply spell for a season out of `kit-supply.json`; a photograph with a definite
 * season gets that name for free and a photograph with an ambiguous year gets nothing,
 * because "the 2016 shirt" straddles two spells often enough to matter. Copying the
 * maker into `kit-photos.json` would have made it a second source of truth for a fact
 * that already has one (rule 59).
 *
 * **The yellow.** Every row carries `yellowPct`, measured on the DECODED bytes of the
 * file that ships (rule 61). `public/kits/` is the third yellow exemption
 * (`lib/brand/yellowExemptions.ts`) and this is the module that makes the exemption
 * auditable rather than a licence: the number is on the card, per shirt.
 */

export type ArchiveVariant = 'home' | 'away' | 'third' | 'fourth' | 'gk' | 'special'
export type ArchiveSourceKey = 'vikipoel' | 'fka'

export type ArchiveShirt = {
  /** `vp-1985-away` — stable, and the file name without its extension */
  slug: string
  /** the public path, served as-is: the bytes that were measured are the bytes sent */
  src: string
  source: ArchiveSourceKey
  sourceTitle: string
  sourceUrl: string | null
  variant: ArchiveVariant
  variantHe: string
  competitionHe: string | null
  specialHe: string | null
  /** 2 of 2 shirts that year — printed only when the source held more than one */
  index: number | null
  /** `1994/95` when the source names a season, null when it names a year */
  seasonLabel: string | null
  seasonAmbiguous: boolean
  yearRaw: number | null
  /** the year this sorts on — a season's opening year, or the bare year */
  year: number
  decade: number
  /** resolved from the supply timeline, and only for a shirt whose season is certain */
  makerHe: string | null
  bytes: number
  /** counted pixels, and the share of the visible shirt they are — see the exemption */
  yellowPx: number
  yellowPct: number
}

export type ArchiveSource = {
  key: ArchiveSourceKey
  title: string
  /** the photographer or collection to credit, when the source named one */
  creditHe: string | null
  url: string
  count: number
}

type Row = {
  slug: string
  file: string
  source: string
  variant: string
  variantHe: string
  competitionHe: string | null
  specialHe: string | null
  index: number | null
  bytes: number
  yellowPx: number
  yellowPct: number
  seasonLabel: string | null
  seasonAmbiguous: boolean
  yearRaw: number | null
  sourceTitle: string
  sourceUrl: string | null
  decade: number
}

type PhotosFile = {
  sources: Array<{ key: string; title: string; credit?: string; url: string }>
  records: Row[]
}

const file = photosFile as unknown as PhotosFile

/** `1994/95` → 1994. The label is always four digits then a separator. */
function openingYear(seasonLabel: string): number {
  return Number(seasonLabel.slice(0, 4))
}

/** Season → maker, built once. `verifiedKitSeasons()` is the single source (rule 59). */
const makerBySeason = new Map(verifiedKitSeasons().map((row) => [row.season, row.maker]))

/**
 * The order shirts are read in: newest first, and within a year the first-choice shirt
 * before the rest. A wardrobe is read from the shirt you wore last, same as the catalog.
 */
const VARIANT_ORDER: ArchiveVariant[] = ['home', 'away', 'third', 'fourth', 'gk', 'special']

export function archiveShirts(): ArchiveShirt[] {
  return file.records
    .map((row): ArchiveShirt => {
      const year = row.seasonLabel ? openingYear(row.seasonLabel) : (row.yearRaw ?? 0)
      return {
        slug: row.slug,
        src: `/kits/${row.file}`,
        source: row.source as ArchiveSourceKey,
        sourceTitle: row.sourceTitle,
        sourceUrl: row.sourceUrl,
        variant: row.variant as ArchiveVariant,
        variantHe: row.variantHe,
        competitionHe: row.competitionHe,
        specialHe: row.specialHe,
        index: row.index,
        seasonLabel: row.seasonLabel,
        seasonAmbiguous: row.seasonAmbiguous,
        yearRaw: row.yearRaw,
        year,
        decade: row.decade,
        makerHe: row.seasonLabel ? (makerBySeason.get(row.seasonLabel) ?? null) : null,
        bytes: row.bytes,
        yellowPx: row.yellowPx,
        yellowPct: row.yellowPct,
      }
    })
    .sort(
      (a, b) =>
        b.year - a.year ||
        VARIANT_ORDER.indexOf(a.variant) - VARIANT_ORDER.indexOf(b.variant) ||
        (a.index ?? 0) - (b.index ?? 0) ||
        a.slug.localeCompare(b.slug),
    )
}

/** The two sources, with their counts — the credit line is part of the product. */
export function archiveSources(shirts: ArchiveShirt[]): ArchiveSource[] {
  return file.sources.map((source) => ({
    key: source.key as ArchiveSourceKey,
    title: source.title,
    creditHe: source.credit ?? null,
    url: source.url,
    count: shirts.filter((shirt) => shirt.source === source.key).length,
  }))
}

export type DecadeFacet = { decade: number; count: number }

/** Decades that actually hold a shirt, newest first. An empty decade is not a filter. */
export function archiveDecades(shirts: ArchiveShirt[]): DecadeFacet[] {
  const counts = new Map<number, number>()
  for (const shirt of shirts) counts.set(shirt.decade, (counts.get(shirt.decade) ?? 0) + 1)
  return [...counts.entries()]
    .map(([decade, count]) => ({ decade, count }))
    .sort((a, b) => b.decade - a.decade)
}

export type VariantFacet = { variant: ArchiveVariant; variantHe: string; count: number }

/** Variants present, in wardrobe order — and each carries the label from the data. */
export function archiveVariants(shirts: ArchiveShirt[]): VariantFacet[] {
  const rows = new Map<ArchiveVariant, VariantFacet>()
  for (const shirt of shirts) {
    const existing = rows.get(shirt.variant)
    if (existing) existing.count += 1
    else rows.set(shirt.variant, { variant: shirt.variant, variantHe: shirt.variantHe, count: 1 })
  }
  return [...rows.values()].sort(
    (a, b) => VARIANT_ORDER.indexOf(a.variant) - VARIANT_ORDER.indexOf(b.variant),
  )
}

export type ArchiveSummary = {
  total: number
  /** shirts whose season is certain — the honest denominator for a date filter */
  dated: number
  /** shirts the source dated by a single year, which the card says out loud */
  approximate: number
  firstYear: number
  lastYear: number
  /** how many carry photographed yellow, and the largest share — the exemption, shown */
  withYellow: number
  maxYellowPct: number
}

export function archiveSummary(shirts: ArchiveShirt[]): ArchiveSummary {
  const years = shirts.map((shirt) => shirt.year).filter((year) => year > 0)
  // Counted on PIXELS, not on the percentage: four shirts carry a single yellow pixel,
  // which rounds to 0.000% and is still yellow. Rule 8 does not have a rounding mode.
  const yellow = shirts.filter((shirt) => shirt.yellowPx > 0)
  return {
    total: shirts.length,
    dated: shirts.filter((shirt) => !shirt.seasonAmbiguous).length,
    approximate: shirts.filter((shirt) => shirt.seasonAmbiguous).length,
    firstYear: years.length > 0 ? Math.min(...years) : 0,
    lastYear: years.length > 0 ? Math.max(...years) : 0,
    withYellow: yellow.length,
    maxYellowPct: yellow.reduce((max, shirt) => Math.max(max, shirt.yellowPct), 0),
  }
}
