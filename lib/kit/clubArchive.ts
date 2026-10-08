import 'server-only'

import zrinjski from '@/content/manual/kit-photos-zrinjski-mostar.json'
import olympiacos from '@/content/manual/kit-photos-olympiacos.json'

/**
 * Per-club shirt archives (FAN LIFE) — the same shape Hapoel Tel Aviv's `archive.ts` reads, one
 * manifest per club: `content/manual/kit-photos-<club>.json`, files in `public/kits/<club>/`.
 * Hapoel Tel Aviv keeps its own module (THE WORKER); this one is for every other open club.
 * Playbook: docs/fanlife/kit-archive-playbook.md
 */
export type ClubKitRecord = {
  slug: string
  file: string
  seasonLabel: string | null
  seasonAmbiguous: boolean
  variant: 'home' | 'away' | 'third' | 'fourth' | 'fifth' | 'gk' | 'special'
  design: string | null
  colors: string | null
  manufacturer: string | null
  sponsor: string | null
  palette: string[]
  parts: Record<'base' | 'pattern' | 'sleeves' | 'collar' | 'crest' | 'maker' | 'sponsor' | 'nameset', unknown>
  photoKind: 'flat' | 'worn'
  cutQuality: 'ok' | 'review'
  usableInApp: boolean
  yellowPct: number
  sourcePage: string
  photoCredit: string | null
}
export type ClubKitArchive = { club: string; records: ClubKitRecord[]; sources: { title: string; url: string; readOn: string }[] }

const ARCHIVES: Record<string, ClubKitArchive> = {
  'zrinjski-mostar': zrinjski as unknown as ClubKitArchive,
  'olympiacos': olympiacos as unknown as ClubKitArchive,
}

export function clubKitArchive(club: string): ClubKitArchive | null {
  return ARCHIVES[club] ?? null
}

/** Only shirts a screen may show: a clean cut-out of the shirt itself, never a player wearing it. */
export function usableClubKits(club: string): ClubKitRecord[] {
  return (ARCHIVES[club]?.records ?? [])
    .filter((r) => r.usableInApp)
    .sort((a, b) => (a.seasonLabel ?? '').localeCompare(b.seasonLabel ?? ''))
}
