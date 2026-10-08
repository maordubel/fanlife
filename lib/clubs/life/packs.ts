/**
 * The LIFE files a club pack may carry. Same shape as the identity catalogue in `lib/clubs/theme.ts`:
 * adding a club's LIFE data is adding a row here, and nothing in `lib/life/universal` names a club.
 *
 *  · `skin.json`     — kit pattern, signage, gate numbers, crest mode (what the voxel world prints)
 *  · `cast.json`     — the names of the fictional family and street (roles keep their own word without it)
 *  · `timeline.json` — the year the supporter is born, when the pack has decided one
 *  · `anchors.json`  — which approved archive rows become nights of this life, and the names the
 *                      archive writes the club by (so a recorded scoreline can be read)
 */
import type {CastManifest} from '@/lib/life/universal/cast'
import type {AnchorSelection, TimelineManifest} from '@/lib/life/universal/compose'
import type {MatchDetail} from '@/lib/life/universal/types'
import type {LifeSkinManifest} from '@/lib/life/universal/skin'
import hapoelSkin from '@/club-packs/hapoel-tel-aviv/life/skin.json'
import hapoelCast from '@/club-packs/hapoel-tel-aviv/life/cast.json'
import hapoelTimeline from '@/club-packs/hapoel-tel-aviv/life/timeline.json'
import hapoelAnchors from '@/club-packs/hapoel-tel-aviv/life/anchors.json'
import zrinjskiSkin from '@/club-packs/zrinjski-mostar/life/skin.json'
import zrinjskiCast from '@/club-packs/zrinjski-mostar/life/cast.json'
import zrinjskiTimeline from '@/club-packs/zrinjski-mostar/life/timeline.json'
import zrinjskiMatches from '@/club-packs/zrinjski-mostar/matches.json'
import zrinjskiAnchors from '@/club-packs/zrinjski-mostar/life/anchors.json'
import olympiacosSkin from '@/club-packs/olympiacos/life/skin.json'
import olympiacosCast from '@/club-packs/olympiacos/life/cast.json'
import aekSkin from '@/club-packs/aek-athens/life/skin.json'
import petahTikvaSkin from '@/club-packs/hapoel-petah-tikva/life/skin.json'
import petahTikvaCast from '@/club-packs/hapoel-petah-tikva/life/cast.json'

export const LIFE_SKINS: Record<string, LifeSkinManifest> = {
  'hapoel-tel-aviv': hapoelSkin as LifeSkinManifest,
  'zrinjski-mostar': zrinjskiSkin as LifeSkinManifest,
  olympiacos: olympiacosSkin as LifeSkinManifest,
  'aek-athens': aekSkin as LifeSkinManifest,
  'hapoel-petah-tikva': petahTikvaSkin as LifeSkinManifest,
}

export const LIFE_CAST: Record<string, CastManifest> = {
  'hapoel-tel-aviv': hapoelCast as CastManifest,
  'zrinjski-mostar': zrinjskiCast as CastManifest,
  olympiacos: olympiacosCast as CastManifest,
  'hapoel-petah-tikva': petahTikvaCast as CastManifest,
}

export const LIFE_TIMELINE: Record<string, TimelineManifest> = {
  'hapoel-tel-aviv': hapoelTimeline as TimelineManifest,
  'zrinjski-mostar': zrinjskiTimeline as TimelineManifest,
}

export const LIFE_ANCHORS: Record<string, AnchorSelection> = {
  'hapoel-tel-aviv': hapoelAnchors as AnchorSelection,
  'zrinjski-mostar': zrinjskiAnchors as AnchorSelection,
}

type MatchRow = {date: string; home: string; away: string; score: string; lineupIds?: string[]; benchUsed?: string[]; goals?: {minute: number | null; scorer: string}[]}

/**
 * The club's own match record by ISO day. Starters and bench are printed as recorded. Goals are
 * printed only when the record lists as many as the club scored: a record that names one scorer
 * of two states nothing about the other, so the line shows none rather than half.
 */
function detailsOf(rows: MatchRow[], club: RegExp): Record<string, MatchDetail> {
  const out: Record<string, MatchDetail> = {}
  for (const r of rows) {
    const n = /(\d+)\s*[-–]\s*(\d+)/.exec(r.score)
    if (!n) continue
    const ours = Number(club.test(r.home) ? n[1] : n[2])
    const goals = r.goals ?? []
    out[r.date] = {
      scorers: goals.length === ours ? goals.map(g => ({name: g.scorer, minute: g.minute ?? null})) : [],
      lineup: r.lineupIds ?? [], bench: r.benchUsed ?? [],
    }
  }
  return out
}

export const LIFE_MATCH_DETAIL: Record<string, Record<string, MatchDetail>> = {
  'zrinjski-mostar': detailsOf(zrinjskiMatches as MatchRow[], /Zrinjski/i),
}
