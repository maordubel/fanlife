/**
 * בונה ה-Kit Master — one index of every shirt the archive knows, with the source of every field.
 *
 * `npm run kits:master` runs this and writes `content/generated/kit-master.json`; the reader is
 * `lib/kit/kit-master.ts` (server-only). It is shaped like `player-master.json` and it exists for
 * the same reason: the kit facts were spread over seven files and read differently by each gate —
 * the crest came from a timeline in one place and from a delivery in another, the maker was
 * cross-checked nowhere, and a year-only photograph was one careless join away from being a
 * season. Here each field is resolved ONCE, with its source, its confidence, the alternatives
 * another source gives, and the conflict between them written down rather than decided (rule 60 §3).
 *
 * Pure: it reads the manual JSON by import and writes nothing, so `tests/kit-master.test.ts` can
 * rebuild it and fail when the committed file no longer describes the data.
 */
import assemblyFile from '../../content/manual/kit-assembly.json'
import crestFile from '../../content/manual/crest-versions.json'
import designsFile from '../../content/manual/kit-designs.json'
import photosFile from '../../content/manual/kit-photos.json'
import dealsFile from '../../content/manual/sponsor-deals.json'
import sponsorsFile from '../../content/manual/sponsors.json'
import supplyFile from '../../content/manual/kit-supply.json'
import yearsFile from '../../content/manual/sponsor-years.json'

import { bodyTemplateForSeason, type KitBodyTemplateId } from './body-templates'
import { describeKit } from './describe'
import { crestMark } from './crestMarks'
import { markFor, type MakerMarkId } from './maker-marks'
import { grantedMaker, grantedSponsor } from './mark-library'
import { photoGeometry, photoMissing } from './photo'
import type { CollarId, KitColour, KitVariant, PatternId, SleeveId } from './spec'

export type FieldSource = 'kit-designs' | 'kit-assembly' | 'crest-versions' | 'kit-supply' | 'sponsor-deals'

export type KitField<T> = {
  value: T | null
  source: FieldSource | null
  confidence: number
  /** values another source gives for the same field — grading accepts them (tolerant) */
  alternates: T[]
  /** the disagreement, in words, when there is one; null when the sources agree */
  conflict: string | null
}

export type KitMasterPhoto = {
  file: string
  src: string
  source: string
  sourceTitle: string
  sourceUrl: string | null
  creditHe: string | null
  /** set on a year-only photograph: the year the source printed, never a season */
  yearRaw: number | null
}

export type KitReview = {
  conflictType: 'source-dispute' | 'period-variant' | 'competition-variant' | 'unknown'
  resolved: boolean
  noteHe: string
  sources: string[]
  reviewedOn: string
}

export type KitMasterRecord = {
  id: string
  legacyKey: string
  seasonLabel: string
  variant: KitVariant
  decade: number
  bodyTemplateId: KitBodyTemplateId
  fields: {
    base: KitField<KitColour>
    secondary: KitField<KitColour>
    pattern: KitField<PatternId>
    collar: KitField<{ id: CollarId; ink: KitColour }>
    sleeves: KitField<{ id: SleeveId; ink: KitColour }>
    crest: KitField<{ key: string; yearOnBadge: number | null }>
    maker: KitField<{ name: string; markId: MakerMarkId | null; supplySpell: string | null }>
    sponsor: KitField<{ name: string; slug: string | null }>
    shorts: KitField<KitColour>
    socks: KitField<KitColour>
  }
  evidence: {
    exactPhoto: KitMasterPhoto | null
    candidatePhotos: KitMasterPhoto[]
    assemblyMaster: string | null
    /** year-only sponsor rows (ויקיפועל) near this season — shown as "בערך", never joined as fact */
    sponsorYearRows: { yearRaw: string; mainSponsorHe: string }[]
  }
  render: {
    vector: true
    photo: { template: KitBodyTemplateId; available: boolean; complete: boolean; missing: string[] }
    marks: { crest: 'print' | 'none'; maker: 'alt-set' | 'granted'; sponsor: 'lettered' | 'granted' }
  }
  gate4: { playable: boolean; reason: string | null }
  /** an OPEN historical dispute about this shirt (Deep QA 29.9.2026) — blocks Gate 4 until resolved */
  review: KitReview | null
  gate5: { dnaFields: string[] }
  source: FieldSource
  sourceTitle: string
  sourceUrl: string | null
  confidence: number
  noteHe: string
}

export type KitMaster = {
  schemaVersion: 1
  counts: {
    kits: number
    playable: number
    exactPhoto: number
    candidateOnly: number
    noPhoto: number
    conflicts: number
    photoComplete: number
  }
  kits: KitMasterRecord[]
}

type Row = Record<string, unknown>
const rows = (doc: unknown): Row[] => ((doc as { records?: Row[] }).records ?? [])
const str = (value: unknown): string | null => (typeof value === 'string' && value.trim() !== '' ? value : null)

/** `2009/10` → 2009 */
function startYear(seasonLabel: string): number {
  return Number(seasonLabel.slice(0, 4))
}

/** `2009/10` + home → `kit-2009-10-home` — the id gates 12/13 use for the kit entity */
export function kitId(seasonLabel: string, variant: string): string {
  return `kit-${seasonLabel.replace('/', '-')}-${variant}`
}

/** season labels compare as their start year; `null` on the right means "still running" */
function inSpell(seasonLabel: string, from: string | null, to: string | null): boolean {
  const year = startYear(seasonLabel)
  const a = from ? startYear(from) : -Infinity
  const b = to ? startYear(to) : Infinity
  return year >= a && year <= b
}

function field<T>(value: T | null, source: FieldSource | null, confidence: number): KitField<T> {
  return { value, source: value === null ? null : source, confidence: value === null ? 0 : confidence, alternates: [], conflict: null }
}

/* ------------------------------------------------------------------ the crest, from the timeline */
type CrestRow = { fromYear: number; toYear: number | null; imageKey: string | null; yearOnBadge: number | null; nameHe: string; confidence: number }
const CRESTS: CrestRow[] = rows(crestFile).map((row) => ({
  fromYear: row.fromYear as number,
  toYear: (row.toYear as number | null) ?? null,
  imageKey: str(row.imageKey),
  yearOnBadge: (row.yearOnBadge as number | null) ?? null,
  nameHe: String(row.nameHe),
  confidence: row.confidence as number,
}))

/**
 * The eras a season falls in. A season that starts in a year two eras share (1997, 2008, 2022)
 * sits in both; the one with artwork is the value and the other is written down. An era the
 * archive has no artwork for is NOT filled from the era before it — that was a guess the old
 * resolver made for 1999/00, and rule 25 says print it or leave the slot empty.
 */
function crestFor(seasonLabel: string): KitField<{ key: string; yearOnBadge: number | null }> {
  const year = startYear(seasonLabel)
  const eras = CRESTS.filter((row) => year >= row.fromYear && (row.toYear === null || year <= row.toYear)).sort(
    (a, b) => b.fromYear - a.fromYear,
  )
  const drawn = eras.filter((row) => row.imageKey !== null && crestMark(row.imageKey) !== null)
  const primary = drawn[0]
  if (!primary) {
    const out = field<{ key: string; yearOnBadge: number | null }>(null, null, 0)
    out.conflict = eras.length > 0 ? `era-without-artwork: ${eras.map((row) => row.nameHe).join(' / ')}` : 'no-era'
    return out
  }
  const out = field({ key: primary.imageKey as string, yearOnBadge: primary.yearOnBadge }, 'crest-versions', primary.confidence)
  const undrawn = eras.filter((row) => row.imageKey === null)
  if (undrawn.length > 0) out.conflict = `era-boundary: ${undrawn.map((row) => `${row.nameHe} (${row.fromYear}–${row.toYear ?? ''})`).join(', ')} — אין לו איור בארכיון`
  for (const other of drawn.slice(1)) {
    if (other.imageKey === primary.imageKey) continue
    out.alternates.push({ key: other.imageKey as string, yearOnBadge: other.yearOnBadge })
    out.conflict = [out.conflict, `era-boundary: ${primary.imageKey} (${primary.fromYear}–${primary.toYear ?? ''}) and ${other.imageKey} (${other.fromYear}–${other.toYear ?? ''}) both cover this season`]
      .filter(Boolean)
      .join('; ')
  }
  return out
}

/* ------------------------------------------------------------------ the maker, cross-checked */
type Spell = { slug: string; from: string | null; to: string | null; confidence: number }
const SPELLS: Spell[] = rows(supplyFile).map((row) => ({
  slug: String(row.manufacturerSlug),
  from: str(row.fromLabel),
  to: str(row.toLabel),
  confidence: row.confidence as number,
}))

function makerFor(seasonLabel: string, name: string | null, confidence: number, source: FieldSource): KitMasterRecord['fields']['maker'] {
  const spells = SPELLS.filter((spell) => spell.confidence >= 2 && inSpell(seasonLabel, spell.from, spell.to))
  const spell = spells[0] ?? null
  const spellLabel = spell ? `${spell.slug} ${spell.from ?? ''}–${spell.to ?? ''}` : null
  if (!name) {
    const out = field<{ name: string; markId: MakerMarkId | null; supplySpell: string | null }>(null, null, 0)
    out.conflict = spell ? `the kit row names no maker; kit-supply has ${spellLabel}` : null
    return out
  }
  const out = field({ name, markId: markFor(name, seasonLabel), supplySpell: spellLabel }, source, confidence)
  if (spell && spell.slug.toLowerCase() !== name.toLowerCase()) {
    out.conflict = `kit row says ${name}; kit-supply says ${spellLabel}`
    out.alternates.push({ name: spell.slug, markId: markFor(spell.slug, seasonLabel), supplySpell: spellLabel })
  }
  return out
}

/* ------------------------------------------------------------------ the sponsor, cross-checked */
type Sponsor = { slug: string; nameHe: string; nameEn: string }
const SPONSORS: Sponsor[] = rows(sponsorsFile).map((row) => ({ slug: String(row.slug), nameHe: String(row.nameHe), nameEn: String(row.nameEn) }))

function norm(value: string): string {
  return value.normalize('NFKD').toLowerCase().replace(/[׳״'"’`\-_.()\s]/g, '')
}

function sponsorSlug(name: string): string | null {
  const key = norm(name)
  const hit = SPONSORS.find((row) => norm(row.slug) === key || norm(row.nameHe) === key || norm(row.nameEn.split(' ')[0] ?? '') === key || norm(row.nameHe).startsWith(key))
  return hit?.slug ?? null
}

/** the name a kit row uses for a deal's sponsor, so an alternate reads like the options do */
function sponsorDisplay(slug: string): string {
  const row = SPONSORS.find((sponsor) => sponsor.slug === slug)
  if (!row) return slug
  // the kit rows letter the Latin brands in capitals (ARKIA, SUBARU, KETER) and the Hebrew ones as written
  return /^[A-Za-z]/.test(row.nameEn) && !/[֐-׿]/.test(slug.replace(/-/g, '')) ? row.nameEn.split(' ')[0]!.toUpperCase() : row.nameHe.split(' ')[0]!
}

type Deal = { slug: string; from: string | null; to: string | null; competition: string | null; confidence: number; noteHe: string | null }
const DEALS: Deal[] = rows(dealsFile).map((row) => ({
  slug: String(row.sponsorSlug),
  from: str(row.fromLabel),
  to: str(row.toLabel),
  competition: str(row.competitionSlug),
  confidence: row.confidence as number,
  noteHe: str(row.noteHe),
}))

function sponsorFor(seasonLabel: string, name: string | null, confidence: number, source: FieldSource): KitMasterRecord['fields']['sponsor'] {
  // a deal counts only when it has a start (a deal known only by its end is not a season) and
  // confidence ≥ 2; a competition-only deal (Champions League) is a different shirt, not this one
  const deals = DEALS.filter((deal) => deal.confidence >= 2 && deal.from !== null && deal.competition === null && inSpell(seasonLabel, deal.from, deal.to))
  if (!name) return field<{ name: string; slug: string | null }>(null, null, 0)
  const slug = sponsorSlug(name)
  const out = field({ name, slug }, source, confidence)
  const others = deals.filter((deal) => deal.slug !== slug)
  if (others.length > 0) {
    out.conflict = `kit row says ${name}; sponsor-deals also covers this season with ${others.map((deal) => `${deal.slug} ${deal.from}–${deal.to ?? ''}${deal.noteHe ? ` (${deal.noteHe})` : ''}`).join('; ')}`
    for (const deal of others) out.alternates.push({ name: sponsorDisplay(deal.slug), slug: deal.slug })
  }
  return out
}

function sponsorYearRows(seasonLabel: string): { yearRaw: string; mainSponsorHe: string }[] {
  const year = startYear(seasonLabel)
  return rows(yearsFile)
    .filter((row) => row.seasonAmbiguous === true)
    .filter((row) => [String(year), String(year + 1)].includes(String(row.yearLabelRaw)))
    .map((row) => ({ yearRaw: String(row.yearLabelRaw), mainSponsorHe: String(row.mainSponsorHe) }))
}

/* ------------------------------------------------------------------ the photographs */
type PhotoRow = { file: string; source: string; variant: string; seasonLabel: string | null; seasonAmbiguous: boolean; yearRaw: number | null; sourceTitle: string; sourceUrl: string | null }
const PHOTO_DOC = photosFile as unknown as { sources: { key: string; credit?: string }[]; records: PhotoRow[] }
const CREDIT = new Map(PHOTO_DOC.sources.map((row) => [row.key, row.credit ?? null]))

function photo(row: PhotoRow): KitMasterPhoto {
  return {
    file: row.file,
    src: `/kits/${row.file}`,
    source: row.source,
    sourceTitle: row.sourceTitle,
    sourceUrl: row.sourceUrl ?? null,
    creditHe: CREDIT.get(row.source) ?? null,
    yearRaw: row.seasonAmbiguous ? row.yearRaw : null,
  }
}

function evidenceFor(seasonLabel: string, variant: string) {
  const exact = PHOTO_DOC.records.find((row) => !row.seasonAmbiguous && row.seasonLabel === seasonLabel && row.variant === variant)
  const year = startYear(seasonLabel)
  const candidates = PHOTO_DOC.records.filter(
    (row) => row.seasonAmbiguous && row.variant === variant && row.yearRaw !== null && (row.yearRaw === year || row.yearRaw === year + 1),
  )
  return { exactPhoto: exact ? photo(exact) : null, candidatePhotos: candidates.map(photo) }
}

/* ------------------------------------------------------------------ the rows */
type DesignRow = {
  seasonLabel: string
  variant: KitVariant
  makerHe: string | null
  sponsorHe: string | null
  base: KitColour
  pattern: PatternId
  patternInk: KitColour
  sleeves: SleeveId
  sleeveInk: KitColour
  collar: CollarId
  collarInk: KitColour
  shorts: KitColour
  socks: KitColour
  noteHe: string
  review?: KitReview
  confidence: number
  sourceTitle: string
  sourceUrl: string | null
  crestKey?: string | null
  master?: string | null
  source: FieldSource
}

function designRows(): DesignRow[] {
  const merged = new Map<string, DesignRow>()
  for (const row of rows(designsFile)) {
    const r = row as unknown as DesignRow
    merged.set(`${r.seasonLabel}|${r.variant}`, { ...r, sourceUrl: r.sourceUrl ?? null, source: 'kit-designs' })
  }
  // a later supplied master wins over an older generic reconstruction of the same kit (as seasons.ts did)
  for (const row of (assemblyFile as unknown as { seasons: Row[] }).seasons) {
    const spec = row.spec as Record<string, unknown>
    const key = `${row.seasonLabel}|${row.variant}`
    merged.set(key, {
      seasonLabel: String(row.seasonLabel),
      variant: row.variant as KitVariant,
      makerHe: str(spec.makerHe),
      sponsorHe: str(spec.sponsorHe),
      base: spec.base as KitColour,
      pattern: spec.pattern as PatternId,
      patternInk: spec.patternInk as KitColour,
      sleeves: spec.sleeves as SleeveId,
      sleeveInk: spec.sleeveInk as KitColour,
      collar: spec.collar as CollarId,
      collarInk: spec.collarInk as KitColour,
      shorts: spec.shorts as KitColour,
      socks: spec.socks as KitColour,
      noteHe: String(row.noteHe ?? ''),
      confidence: row.confidence as number,
      sourceTitle: String(row.sourceTitle),
      sourceUrl: str(row.sourceUrl),
      crestKey: str(spec.crestKey),
      master: str(row.master),
      source: 'kit-assembly',
    })
  }
  return [...merged.values()]
}

function record(row: DesignRow): KitMasterRecord {
  const { seasonLabel, variant, source, confidence } = row
  const template = bodyTemplateForSeason(seasonLabel).id

  const crest = crestFor(seasonLabel)
  if (row.crestKey && crestMark(row.crestKey)) {
    // the delivery names the crest outright — it is the value; the timeline, where it disagrees, is kept
    const timeline = crest.value
    const explicit = field({ key: row.crestKey, yearOnBadge: CRESTS.find((c) => c.imageKey === row.crestKey)?.yearOnBadge ?? null }, source, confidence)
    if (timeline && timeline.key !== row.crestKey) {
      explicit.alternates.push(timeline)
      explicit.conflict = `${source} says ${row.crestKey}; crest-versions says ${timeline.key} for this season`
    }
    Object.assign(crest, explicit)
  }

  const fields: KitMasterRecord['fields'] = {
    base: field(row.base, source, confidence),
    secondary: field(row.patternInk, source, confidence),
    pattern: field(row.pattern, source, confidence),
    collar: field({ id: row.collar, ink: row.collarInk }, source, confidence),
    sleeves: field({ id: row.sleeves, ink: row.sleeveInk }, source, confidence),
    crest,
    maker: makerFor(seasonLabel, row.makerHe, confidence, source),
    sponsor: sponsorFor(seasonLabel, row.sponsorHe, confidence, source),
    shorts: field(row.shorts, source, confidence),
    socks: field(row.socks, source, confidence),
  }

  const missing = photoMissing(template, { pattern: row.pattern, collar: row.collar, sleeves: row.sleeves })
  const reasons: string[] = []
  if (!fields.crest.value) reasons.push('crest-art-missing')
  if (!fields.maker.value) reasons.push('maker-unknown')
  if (!fields.sponsor.value) reasons.push('sponsor-unknown')
  if (confidence < 2) reasons.push('low-confidence')
  if (row.review && !row.review.resolved) reasons.push(`unresolved-${row.review.conflictType}`)
  const evidence = evidenceFor(seasonLabel, variant)

  return {
    id: kitId(seasonLabel, variant),
    legacyKey: `${seasonLabel}|${variant}`,
    seasonLabel,
    variant,
    decade: Math.floor(startYear(seasonLabel) / 10) * 10,
    bodyTemplateId: template,
    fields,
    evidence: {
      ...evidence,
      assemblyMaster: row.master ?? null,
      sponsorYearRows: sponsorYearRows(seasonLabel),
    },
    render: {
      vector: true,
      photo: { template, available: photoGeometry(template) !== null, complete: missing.length === 0, missing },
      marks: {
        crest: fields.crest.value ? 'print' : 'none',
        maker: grantedMaker(row.makerHe, seasonLabel) ? 'granted' : 'alt-set',
        sponsor: grantedSponsor(row.sponsorHe) ? 'granted' : 'lettered',
      },
    },
    gate4: { playable: reasons.length === 0, reason: reasons.length ? reasons.join(',') : null },
    review: row.review ?? null,
    gate5: { dnaFields: (Object.keys(fields) as (keyof KitMasterRecord['fields'])[]).filter((key) => fields[key].value !== null) },
    source,
    sourceTitle: row.sourceTitle,
    sourceUrl: row.sourceUrl,
    confidence,
    // generated from the same fields that draw and grade the shirt (lib/kit/describe.ts)
    noteHe: describeKit({ base: row.base, pattern: row.pattern, patternInk: row.patternInk, sleeves: row.sleeves, sleeveInk: row.sleeveInk, collar: row.collar, collarInk: row.collarInk, makerHe: row.makerHe, sponsorHe: row.sponsorHe }),
  }
}

export function buildKitMaster(): KitMaster {
  const kits = designRows()
    .map(record)
    .sort((a, b) => b.seasonLabel.localeCompare(a.seasonLabel) || a.variant.localeCompare(b.variant))
  const conflicts = kits.reduce(
    (sum, kit) => sum + Object.values(kit.fields).filter((f) => (f as KitField<unknown>).alternates.length > 0).length,
    0,
  )
  return {
    schemaVersion: 1,
    counts: {
      kits: kits.length,
      playable: kits.filter((kit) => kit.gate4.playable).length,
      exactPhoto: kits.filter((kit) => kit.evidence.exactPhoto).length,
      candidateOnly: kits.filter((kit) => !kit.evidence.exactPhoto && kit.evidence.candidatePhotos.length > 0).length,
      noPhoto: kits.filter((kit) => !kit.evidence.exactPhoto && kit.evidence.candidatePhotos.length === 0).length,
      conflicts,
      photoComplete: kits.filter((kit) => kit.render.photo.available && kit.render.photo.complete).length,
    },
    kits,
  }
}
