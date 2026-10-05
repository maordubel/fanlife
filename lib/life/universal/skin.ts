/**
 * The ClubSkin: everything the voxel rooms need to know about a club, as data.
 *
 * A room is built once, for everybody (public/life/voxel). What makes the same kiosk stand in
 * Piraeus or in Mostar is this object and nothing else: colours, the cut of the shirt, the word
 * over the kiosk, the numbers on the gates. No engine file names a club.
 *
 * Two things are deliberately NOT guessed here:
 *  · the name of the ground prints on a wall only when the pack carries an approved venue;
 *  · a crest is printed artwork the club (or the owner) has rights to, or it is a monogram.
 */
import {contrast, forbiddenColor, type ClubTheme} from '@/lib/clubs/theme'

export const KIT_PATTERNS = ['solid', 'stripes', 'hoops', 'halves', 'sash', 'checkers'] as const
export type KitPattern = typeof KIT_PATTERNS[number]
export const SIGN_KEYS = ['kiosk', 'ticket', 'school', 'club', 'news', 'bus', 'ground', 'gate', 'stand', 'away', 'cafe', 'snack', 'since', 'shop', 'market'] as const
export type SignKey = typeof SIGN_KEYS[number]
export type SkinStatus = 'approved' | 'review'

export type LifeSkinManifest = {
  schemaVersion: 1
  clubId: string
  shortName?: string
  colors?: {secondary?: string; trim?: string}
  kit?: {pattern: string; /** 'secondary' = the cloth is the second colour and the pattern is drawn in the first (a white shirt with a red sash) */ base?: 'primary' | 'secondary'; status: string; kitId?: string; sourceIds?: string[]; note?: string}
  gateNumbers?: number[]
  signage?: Partial<Record<SignKey | 'script', string>>
  venue?: {name: string; status: string; approvedBy?: string; placeId?: string; sourceIds?: string[]; note?: string} | null
  crest?: {mode: string; crest?: string; shirt?: string; rights?: string}
}

export type VoxelSkin = {
  name: string
  short: string
  initials: string
  p: string
  s: string
  t: string
  pattern: KitPattern
  /** inverse kit: the shirt's cloth is `s` and its pattern is `p` */
  ik?: boolean
  crest: 'real' | 'monogram'
  art: {crest: string; shirt: string | null} | null
  nums: [number, number, number]
  stadium: string | null
  city: string
  strings: Partial<Record<SignKey, string>>
  policy: {hue: [number, number]; minSaturation: number; minValue: number}[]
}

const HEX = /^#[\da-f]{6}$/i
const NEUTRAL_CLOTH = '#EFE9DE'
const INK = '#12151C'

function mix(a: string, b: string, k: number): string {
  const p = (h: string) => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16))
  const x = p(a), y = p(b)
  return '#' + x.map((v, i) => Math.round(v + (y[i]! - v) * k).toString(16).padStart(2, '0')).join('')
}

export type SkinSubject = {id: string; name: string; city: string; initials: string}

/** Build the skin and say what is wrong with it. A skin with issues still renders; it does not ship as READY. */
export function buildSkin(club: SkinSubject, theme: ClubTheme, manifest: LifeSkinManifest | null): {skin: VoxelSkin; issues: string[]} {
  const issues: string[] = []
  if (manifest && (manifest.schemaVersion !== 1 || manifest.clubId !== club.id)) issues.push('SKIN_MANIFEST_MISMATCH')
  const m = manifest && !issues.length ? manifest : null
  const p = theme.primary
  let s = m?.colors?.secondary ?? NEUTRAL_CLOTH
  let t = m?.colors?.trim ?? mix(p, INK, 0.78)
  if (!HEX.test(s)) { issues.push('SKIN_SECONDARY_INVALID'); s = NEUTRAL_CLOTH }
  if (!HEX.test(t)) { issues.push('SKIN_TRIM_INVALID'); t = mix(p, INK, 0.78) }
  for (const [key, colour] of [['primary', p], ['secondary', s], ['trim', t]] as const) if (forbiddenColor(theme, colour)) issues.push(`SKIN_FORBIDDEN_${key.toUpperCase()}`)
  // a sign is lettered in the cloth colour on the trim, and a shirt has to read against its own second colour
  if (contrast(s, t) < 4.5) issues.push('SKIN_SIGN_CONTRAST')
  if (contrast(p, s) < 2.5) issues.push('SKIN_KIT_CONTRAST')
  const raw = m?.kit?.pattern ?? 'solid'
  const pattern = (KIT_PATTERNS as readonly string[]).includes(raw) ? raw as KitPattern : 'solid'
  if (raw !== pattern) issues.push('SKIN_PATTERN_UNKNOWN')
  const g = m?.gateNumbers
  const nums: [number, number, number] = g && g.length >= 3 && g.slice(0, 3).every(n => Number.isInteger(n) && n > 0 && n < 100) ? [g[0]!, g[1]!, g[2]!] : [1, 2, 3]
  const strings: Partial<Record<SignKey, string>> = {}
  for (const key of SIGN_KEYS) { const v = m?.signage?.[key]; if (typeof v === 'string' && v.trim()) strings[key] = v.trim().slice(0, 28) }
  const printed = m?.crest?.mode === 'printed' && typeof m.crest.crest === 'string' && m.crest.crest.startsWith('/life/voxel/tex/')
  if (m?.crest?.mode === 'printed' && !printed) issues.push('SKIN_CREST_PATH')
  const venueOk = m?.venue && m.venue.status === 'approved' && m.venue.name.trim()
  return {
    issues,
    skin: {
      name: club.name,
      short: (m?.shortName ?? club.name).toUpperCase().slice(0, 22),
      initials: club.initials.toUpperCase().slice(0, 3),
      p, s, t, pattern,
      ...(m?.kit?.base === 'secondary' && pattern !== 'solid' ? {ik: true} : {}),
      crest: printed ? 'real' : 'monogram',
      art: printed ? {crest: m!.crest!.crest!, shirt: m!.crest!.shirt?.startsWith('/life/voxel/tex/') ? m!.crest!.shirt : null} : null,
      nums,
      stadium: venueOk ? m!.venue!.name.trim() : null,
      city: club.city,
      strings,
      policy: theme.colorPolicy.legacyRules.map(r => ({hue: [r.hue[0], r.hue[1]], minSaturation: r.minSaturation, minValue: r.minValue})),
    },
  }
}
