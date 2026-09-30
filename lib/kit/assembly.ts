import assemblyFile from '@/content/manual/kit-assembly.json'

import type { KitSpec, KitVariant } from './spec'

export type KitPlacement = { x: number; y: number; w: number; h: number }
export type KitMarkAsset = {
  src: string
  label: string
  fit: 'contain' | 'cover'
  defaultPlacement: KitPlacement
}

export type KitAssemblySeason = {
  seasonLabel: string
  variant: KitVariant
  master: string
  alternateMaster?: string
  sheet: string
  sourceTitle: string
  sourceUrl: string | null
  confidence: number
  noteHe: string
  spec: Omit<KitSpec, 'seasonLabel' | 'variant'>
  placements: Partial<Record<'sponsor' | 'maker' | 'crest', KitPlacement>>
  parts: Record<string, string>
  gate4: {
    enabled: boolean
    parts: string[]
    truthUsesMaster: boolean
  }
  gate5: {
    enabled: boolean
    historicalPreset: boolean
    editable: string[]
  }
}

type AssemblyFile = {
  version: number
  marks: {
    sponsors: Record<string, KitMarkAsset>
    makers: Record<string, KitMarkAsset>
  }
  seasons: KitAssemblySeason[]
}

const data = assemblyFile as unknown as AssemblyFile
const seasons = data.seasons

export function kitAssemblySeasons(): KitAssemblySeason[] {
  return seasons
}

export function kitAssemblyForSeason(
  seasonLabel: string,
  variant: KitVariant = 'home',
): KitAssemblySeason | null {
  return seasons.find((row) => row.seasonLabel === seasonLabel && row.variant === variant) ?? null
}

export function historicalMasterFor(
  seasonLabel: string,
  variant: KitVariant = 'home',
): string | null {
  return kitAssemblyForSeason(seasonLabel, variant)?.master ?? null
}

export function historicalAssemblyForYears(fromYear: number | null, toYear: number | null): KitAssemblySeason | null {
  if (fromYear === null && toYear === null) return null
  const start = fromYear ?? toYear ?? 0
  const end = toYear ?? fromYear ?? start
  const midpoint = (start + end) / 2
  const candidates = seasons
    .map((season) => ({ season, year: Number(season.seasonLabel.slice(0, 4)) }))
    .filter((row) => Number.isFinite(row.year) && row.year >= start && row.year <= end)
    .sort((a, b) => Math.abs(a.year - midpoint) - Math.abs(b.year - midpoint))
  return candidates[0]?.season ?? null
}

export function sponsorAssetFor(name: string | null): KitMarkAsset | null {
  if (!name) return null
  return data.marks.sponsors[name] ?? null
}

export function makerAssetFor(name: string | null): KitMarkAsset | null {
  if (!name) return null
  return data.marks.makers[name] ?? null
}

export function placementFor(
  spec: Pick<KitSpec, 'seasonLabel' | 'variant'>,
  kind: 'sponsor' | 'maker' | 'crest',
  fallback: KitPlacement,
): KitPlacement {
  return kitAssemblyForSeason(spec.seasonLabel, spec.variant)?.placements[kind] ?? fallback
}
