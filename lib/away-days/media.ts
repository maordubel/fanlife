import ledgerJson from '@/content/manual/away-media.json'
import { t } from '@/lib/i18n'

/**
 * AWAY DAYS — the media layer (spec §29, 25.9.2026).
 *
 * A separate ledger, never a URL inside a component: `content/manual/away-media.json`,
 * written only by `scripts/away-days/ingest-media.mjs`, one row per photograph of a ground
 * with its source page, credit, licence and the year it was TAKEN. Any venue in the
 * registry can get a row later — Intertoto grounds included — without touching the page:
 * a venue with no row simply keeps the typography it has always had (§29 fallback).
 *
 * The label is part of the contract, not decoration: a picture is always printed with
 * "צילום מ-<year>" (or "צילום משנות ה-80" when only the decade is known), so a photo of
 * today's stands is never read as the ground on the night Hapoel played there.
 */

export type MediaKind = 'stadium' | 'ticket' | 'newspaper' | 'supporters' | 'video'

export type AwayMediaFile = {
  path: string
  width: number
  height: number
  bytes: number
  sha256: string
  sourceYellowPx: number
  yellowPx: number
}

export type AwayMedia = {
  id: string
  venueId?: string
  matchId?: string
  kind: MediaKind
  /** 1600×900 */
  assetUrl: string
  /** 900×1200 */
  assetUrlTall?: string
  sourceUrl?: string | null
  sourceTitle?: string | null
  credit?: string
  license?: string
  licenseUrl?: string | null
  capturedYear?: number
  capturedApprox?: 'year' | 'decade'
  deYellowed?: boolean
  files: AwayMediaFile[]
}

/** What a client component needs — no measurement, no hashes. */
export type MediaLite = {
  id: string
  wide: string
  tall: string | null
  credit: string
  license: string
  sourceUrl: string | null
  capturedYear: number | null
  decade: boolean
  treated: boolean
}

export const AWAY_MEDIA = (ledgerJson as unknown as { records: AwayMedia[] }).records

function lite(row: AwayMedia): MediaLite {
  return {
    id: row.id,
    wide: row.assetUrl,
    tall: row.assetUrlTall ?? null,
    credit: row.credit ?? '',
    license: row.license ?? '',
    sourceUrl: row.sourceUrl ?? null,
    capturedYear: row.capturedYear ?? null,
    decade: row.capturedApprox === 'decade',
    treated: row.deYellowed === true,
  }
}

/** The stadium photo of a ground, or null — the first row wins (the ledger is sorted). */
export function venuePhoto(venueId: string): MediaLite | null {
  const row = AWAY_MEDIA.find((m) => m.kind === 'stadium' && m.venueId === venueId)
  return row ? lite(row) : null
}

/** Every venue id that has a photo — for the coverage line in the report and the test. */
export function venuesWithPhotos(): Set<string> {
  return new Set(AWAY_MEDIA.filter((m) => m.kind === 'stadium' && m.venueId).map((m) => m.venueId as string))
}

/** "צילום מ-2019" · "צילום משנות ה-80" · "צילום, שנה לא ידועה" */
export function photoLabel(media: MediaLite): string {
  if (media.capturedYear === null) return t('away89.photo.noYear')
  if (media.decade) {
    const decade = Math.floor(media.capturedYear / 10) * 10
    return t('away89.photo.decade', { d: decade >= 2000 ? String(decade) : String(decade % 100) })
  }
  return t('away89.photo.year', { y: String(media.capturedYear) })
}

/** "Jane Doe · CC BY-SA 4.0" — the attribution a free licence requires, beside the picture. */
export function creditLine(media: MediaLite): string {
  const parts = [media.credit]
  if (media.license && media.license !== 'owner-upload') parts.push(media.license)
  if (media.treated) parts.push(t('away89.photo.treated'))
  return parts.filter(Boolean).join(' · ')
}
