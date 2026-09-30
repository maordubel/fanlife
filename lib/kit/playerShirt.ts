import 'server-only'

import { playerById, resolvePlayer, type PlayerMasterRecord } from '@/lib/archive/player-master'
import { archiveShirts, type ArchiveShirt, type ArchiveVariant } from './archive'
import { homeKits, type SeasonKit } from './seasons'
import type { KitSpec } from './spec'

/**
 * החולצה של השחקן — THE resolver: which shirt a man wears on every pitch (delta 88).
 *
 * Maor, 24.9.2026: *"אני רוצה להצמיד לכל שחקן את החולצה המקורית שלו מאותה תקופה, רק אם אין
 * תמונה מקורית להצמיד את הגרפיקה שלנו"* and, for gate 9, *"אסור שיהיה שחקן ללא חולצה"*.
 * So this answers for every one of the 657 men and never returns null, and a PHOTOGRAPH
 * of a real shirt always beats a drawing.
 *
 * The era is the man's own: his spells (`player-master.json` → `spells[].seasons`,
 * `kitSeason`), or his `years` where the squad table has no season for him. The order, per
 * spell (the asked season's spell only, when `opts.season` pins one — an XI "version"
 * must wear a shirt from that version):
 *
 *   1. an exact-season photograph (footballkitarchive labels by season) — home first,
 *      a keeper's shirt first for a keeper;
 *   2. another variant of the same season (away, third…) — never a one-off "special";
 *   3. a ויקיפועל photograph whose single year falls inside the spell (its year is a
 *      season's opening OR closing year — the archive says so — so both are admitted);
 *   4. a photograph within ±1 season of the spell — `approx: true`, and the screen may
 *      say "בערך";
 *   5. the kit engine's drawing of a season inside the spell;
 *   6. a photograph two to five seasons off (`approx`) — nearer than any drawing for the
 *      early eras, where the engine's first home shirt is 1978/79 — and only then the
 *      engine's drawing of the nearest season to his era — `approx: true`;
 *   7. a man with no era at all — or whose nearest drawing is more than a decade away —
 *      gets the plain red home shirt (`seasonLabel: ''`), which claims no season.
 *
 * Pure and deterministic: the same inputs give the same shirt, in any order of calls.
 * The photographs are the 168 already measured for yellow in `kit-photos.json`
 * (`public/kits/` is the ledger's exemption) — this module adds no image.
 */

export type PhotoShirt = {
  kind: 'photo'
  src: string
  /** the season this shirt stands for on HIS career — `1999/00` */
  seasonLabel: string
  variant: ArchiveVariant
  /** the photograph's source, to credit */
  credit: string
  /** true where the photo is a neighbouring season, not one he played */
  approx: boolean
}

export type EngineShirt = {
  kind: 'engine'
  spec: KitSpec
  seasonLabel: string
  approx: boolean
}

export type ShirtLook = PhotoShirt | EngineShirt

/** A man with no era on record: plain red, no crest, no sponsor — a shirt that claims nothing. */
export const PLAIN_HOME_SPEC: KitSpec = {
  seasonLabel: '',
  variant: 'home',
  base: 'red',
  pattern: 'solid',
  patternInk: 'cream',
  sleeves: 'raglan',
  sleeveInk: 'cream',
  collar: 'crew',
  collarInk: 'cream',
  sponsorHe: null,
  makerHe: null,
  nameset: 'block-solid',
  number: null,
  shorts: 'cream',
  socks: 'red',
  crestKey: null,
}

/* ------------------------------------------------------------------ indexes (built once) */

type Photos = {
  /** season label → exact photographs, archive order (home first) */
  exact: Map<string, ArchiveShirt[]>
  /** bare year → ויקיפועל photographs */
  byYear: Map<number, ArchiveShirt[]>
}

let photoIndex: Photos | null = null
let engineIndex: { bySeason: Map<string, SeasonKit>; dated: Array<{ year: number; kit: SeasonKit }> } | null = null

/** One-off shirts (pink October, a cup-final special) are not what a man played in. */
function wearable(shirt: ArchiveShirt): boolean {
  return shirt.variant !== 'special' && !/-fan$/.test(shirt.slug)
}

function photos(): Photos {
  if (photoIndex) return photoIndex
  const exact = new Map<string, ArchiveShirt[]>()
  const byYear = new Map<number, ArchiveShirt[]>()
  for (const shirt of archiveShirts()) {
    if (!wearable(shirt)) continue
    if (!shirt.seasonAmbiguous && shirt.seasonLabel) {
      exact.set(shirt.seasonLabel, [...(exact.get(shirt.seasonLabel) ?? []), shirt])
    } else if (shirt.yearRaw !== null) {
      byYear.set(shirt.yearRaw, [...(byYear.get(shirt.yearRaw) ?? []), shirt])
    }
  }
  photoIndex = { exact, byYear }
  return photoIndex
}

function engine() {
  if (engineIndex) return engineIndex
  const kits = homeKits()
  engineIndex = {
    bySeason: new Map(kits.map((kit) => [kit.seasonLabel, kit])),
    dated: kits.map((kit) => ({ year: openingYear(kit.seasonLabel), kit })).sort((a, b) => a.year - b.year),
  }
  return engineIndex
}

/* ------------------------------------------------------------------ seasons */

function openingYear(label: string): number {
  return Number(label.slice(0, 4))
}

/** 1999 → `1999/00` — the label every file in the archive uses. */
export function seasonOf(year: number): string {
  return `${year}/${String((year + 1) % 100).padStart(2, '0')}`
}

type Era = { seasons: string[] }

/** His spells as runs of seasons: the pinned/primary one first, then the rest. */
function erasOf(player: PlayerMasterRecord | null, pinned?: string): { eras: Era[]; strict: boolean } {
  const spells = (player?.spells ?? []).filter((spell) => spell.seasons.length > 0)
  let eras: Array<Era & { weight: number; kitSeason: string | null }> = spells.map((spell) => ({
    seasons: [...spell.seasons].sort(),
    weight: spell.primary ? 2 : 1,
    kitSeason: spell.kitSeason,
  }))
  if (eras.length === 0 && player?.years && (player.years.from || player.years.to)) {
    const from = player.years.from ?? player.years.to ?? 0
    const to = Math.max(from, (player.years.to ?? from) - 1)
    const seasons: string[] = []
    for (let year = from; year <= to; year += 1) seasons.push(seasonOf(year))
    eras = [{ seasons, weight: 2, kitSeason: null }]
  }
  if (pinned) {
    const year = openingYear(pinned)
    // the spell that holds the season, or the one nearest to it
    const holding =
      eras.find((era) => era.seasons.includes(pinned)) ??
      [...eras].sort((a, b) => distance(a.seasons, year) - distance(b.seasons, year))[0]
    const seasons = holding ? holding.seasons : [pinned]
    const order = [...seasons].sort(
      (a, b) => Math.abs(openingYear(a) - year) - Math.abs(openingYear(b) - year) || a.localeCompare(b),
    )
    return { eras: [{ seasons: order.includes(pinned) ? order : [pinned, ...order] }], strict: true }
  }
  eras.sort((a, b) => b.weight - a.weight || b.seasons.length - a.seasons.length || a.seasons[0]!.localeCompare(b.seasons[0]!))
  return {
    eras: eras.map((era) => {
      // the curated shirt season (trophy first, then the run — lib/kit/playerKit.ts) leads
      const lead = era.kitSeason && era.seasons.includes(era.kitSeason) ? era.kitSeason : null
      return { seasons: lead ? [lead, ...era.seasons.filter((season) => season !== lead)] : era.seasons }
    }),
    strict: false,
  }
}

function distance(seasons: string[], year: number): number {
  return Math.min(...seasons.map((season) => Math.abs(openingYear(season) - year)))
}

/* ------------------------------------------------------------------ the pick */

function variantRank(variant: ArchiveVariant, keeper: boolean): number {
  const order: ArchiveVariant[] = keeper
    ? ['gk', 'home', 'away', 'third', 'fourth']
    : ['home', 'away', 'third', 'fourth']
  const index = order.indexOf(variant)
  return index === -1 ? 99 : index
}

/** The best of several photographs: variant order, then the least yellow, then archive order. */
function best(list: ArchiveShirt[] | undefined, keeper: boolean, homeOnly: boolean): ArchiveShirt | null {
  if (!list || list.length === 0) return null
  const ok = list.filter((shirt) => {
    const rank = variantRank(shirt.variant, keeper)
    if (rank === 99) return false
    return homeOnly ? shirt.variant === 'home' || (keeper && shirt.variant === 'gk') : true
  })
  return [...ok].sort(
    (a, b) =>
      variantRank(a.variant, keeper) - variantRank(b.variant, keeper) ||
      a.yellowPx - b.yellowPx ||
      a.slug.localeCompare(b.slug),
  )[0] ?? null
}

function photoLook(shirt: ArchiveShirt, seasonLabel: string, approx: boolean): PhotoShirt {
  return { kind: 'photo', src: shirt.src, seasonLabel, variant: shirt.variant, credit: shirt.sourceTitle, approx }
}

/** Steps 1–3 over one era. */
function photoInEra(seasons: string[], keeper: boolean): PhotoShirt | null {
  const { exact, byYear } = photos()
  for (const season of seasons) {
    const hit = best(exact.get(season), keeper, true)
    if (hit) return photoLook(hit, season, false)
  }
  for (const season of seasons) {
    const hit = best(exact.get(season), keeper, false)
    if (hit) return photoLook(hit, season, false)
  }
  for (const homeOnly of [true, false]) {
    for (const season of seasons) {
      const year = openingYear(season)
      // opening year first, then the closing one — ויקיפועל uses both
      const hit = best(byYear.get(year), keeper, homeOnly) ?? best(byYear.get(year + 1), keeper, homeOnly)
      if (hit) return photoLook(hit, season, false)
    }
  }
  return null
}

/** Step 4 — a photograph one season either side of the era. */
function photoNear(seasons: string[], keeper: boolean, before = Infinity): PhotoShirt | null {
  const years = seasons.map(openingYear)
  const first = Math.min(...years)
  const last = Math.max(...years)
  const around = [first - 1, last + 1].filter((year) => year < before)
  for (const year of around) {
    const hit = photoInEra([seasonOf(year)], keeper)
    if (hit) return { ...hit, approx: true }
  }
  return null
}

function engineLook(kit: SeasonKit, approx: boolean): EngineShirt {
  return { kind: 'engine', spec: { ...kit.spec, number: null }, seasonLabel: kit.seasonLabel, approx }
}

function isKeeper(player: PlayerMasterRecord | null): boolean {
  const codes = player?.positions?.codes ?? []
  return codes.length > 0 && codes.every((code) => code === 'GK')
}

export type PlayerRef = PlayerMasterRecord | string | null | undefined

function recordOf(ref: PlayerRef): PlayerMasterRecord | null {
  if (!ref) return null
  if (typeof ref !== 'string') return ref
  return playerById(ref) ?? resolvePlayer(ref)
}

/**
 * The shirt. `opts.season` pins it to the spell holding that season (a gate-3 match, an XI
 * version); without it, his primary spell leads and the others follow. `opts.before` (THE
 * WORKER LIFE's year) keeps every season, photo and drawing to seasons that had BEGUN before
 * it — a man in 1993 wears a shirt the living room has already seen (rules 45, 88).
 */
export function playerShirt(ref: PlayerRef, opts: { season?: string | null; before?: number | null; keeper?: boolean } = {}): ShirtLook {
  const player = recordOf(ref)
  // `opts.keeper` is for a slot that IS the goalkeeper's (gate 3's GK band) when no man is named
  const keeper = opts.keeper ?? isKeeper(player)
  const before = typeof opts.before === 'number' && Number.isFinite(opts.before) ? opts.before : Infinity
  const found = erasOf(player, opts.season ?? undefined)
  const strict = found.strict
  let eras = found.eras
  if (before !== Infinity) {
    eras = eras
      .map((era) => ({ seasons: era.seasons.filter((season) => openingYear(season) < before) }))
      .filter((era) => era.seasons.length > 0)
    if (eras.length === 0 && found.eras.length > 0) eras = [{ seasons: [seasonOf(before - 1)] }]
  }

  for (const era of eras) {
    const hit = photoInEra(era.seasons, keeper)
    if (hit) return hit
  }
  for (const era of eras) {
    const hit = photoNear(era.seasons, keeper, before)
    if (hit) return hit
  }
  const { bySeason, dated: allDated } = engine()
  const dated = allDated.filter((row) => row.year < before)
  for (const era of eras) {
    for (const season of era.seasons) {
      const kit = bySeason.get(season)
      if (kit) return engineLook(kit, false)
    }
  }
  // a photograph a few seasons off still beats a drawing decades off: the engine's
  // earliest home shirt is 1978/79, and a man of the forties is nearer the 1949/50 photo
  for (const era of eras) {
    const years = era.seasons.map(openingYear)
    for (let gap = 2; gap <= 5; gap += 1) {
      for (const year of [Math.min(...years) - gap, Math.max(...years) + gap]) {
        if (year >= before) continue
        const hit = photoInEra([seasonOf(year)], keeper)
        if (hit) return { ...hit, approx: true }
      }
    }
  }
  const target = eras[0]
  if (target && dated.length > 0) {
    const years = target.seasons.map(openingYear)
    const mid = strict ? (years[0] as number) : (Math.min(...years) + Math.max(...years)) / 2
    const nearest = [...dated].sort((a, b) => Math.abs(a.year - mid) - Math.abs(b.year - mid) || a.year - b.year)[0]
    // a drawing more than a decade from his years would be a claim about a shirt he never
    // saw (a 1927 man in the 1978/79 shirt) — the plain home shirt claims nothing instead
    if (nearest && Math.abs(nearest.year - mid) <= 10) return engineLook(nearest.kit, true)
  }
  return { kind: 'engine', spec: PLAIN_HOME_SPEC, seasonLabel: '', approx: true }
}

/* ------------------------------------------------------------------ the wire */

/**
 * ארון הבגדים — many men's shirts in the shape a client screen can hold: every distinct
 * shirt ONCE (`shirts`), and each key (a slug, a `slug@version`, an id) pointing at one by
 * index. 657 men wear ~110 distinct shirts, so a phone is not sent the same photo path
 * or the same eight-layer spec a hundred times.
 */
export type Wardrobe = { shirts: ShirtLook[]; by: Record<string, number> }

export function wardrobe(
  rows: Iterable<{ key: string; player: PlayerRef; season?: string | null; before?: number | null }>,
): Wardrobe {
  const shirts: ShirtLook[] = []
  const index = new Map<string, number>()
  const by: Record<string, number> = {}
  for (const row of rows) {
    const look = playerShirt(row.player, { season: row.season, before: row.before })
    const id = look.kind === 'photo' ? `p|${look.src}|${look.seasonLabel}|${look.approx}` : `e|${look.spec.seasonLabel}|${look.seasonLabel}|${look.approx}`
    let at = index.get(id)
    if (at === undefined) {
      at = shirts.length
      shirts.push(look)
      index.set(id, at)
    }
    by[row.key] = at
  }
  return { shirts, by }
}
