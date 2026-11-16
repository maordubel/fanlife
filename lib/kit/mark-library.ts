import type { KitPlacement } from './assembly'
import { photoMarkFile } from './photo'
import { sponsorMark } from '@/lib/clubs/marks'
import type { KitVariant } from './spec'
import {WORKER_ROUTE_CLUB} from '@/lib/goals-auto/types'

/**
 * הסימנים שאושרו — the real maker and sponsor logos, for gates 4 and 5 only.
 *
 * Rule 25 says a manufacturer's trademark is not ours to redraw and the sponsor is lettered on
 * the cloth. On 21.9.2026 Maor answered the question "real logos or rule 25?" for gates 4 and 5:
 * **real logos** (CLAUDE.md, the dated paragraph under rule 25). Everywhere else the rule stands,
 * which is why the engine takes `marks: 'granted' | 'rule25'` and defaults to the rule.
 *
 * Two kinds of file, one table:
 *  · `mono` — a one-colour mark stored as a white SHAPE. The engine prints it through an SVG mask
 *    in the shirt's contrast ink, the way a real applique takes the cloth's second colour; the file
 *    itself carries no colour, so it cannot carry yellow.
 *  · `colour` — a logo whose colours ARE the logo. Arkia's stripes crossed rule 8 and were
 *    recoloured into palette tones by `scripts/kits/build-photo-templates.py`, measured on decode.
 *
 * A maker or sponsor with no file here falls back to the alternative set / the lettering — the
 * name on the card stays the archive's either way. adidas is granted only for the trefoil era the
 * file shows; a later adidas shirt takes the alternative mark rather than the wrong era's logo.
 */

export type GrantedMark = {
  src: string
  label: string
  /** width / height of the artwork, so a slot fits it without distortion */
  aspect: number
  print: 'mono' | 'colour'
}

function webp(name: string, label: string, print: GrantedMark['print']): GrantedMark | null {
  const file = photoMarkFile(name)
  return file ? { src: file.src, label, aspect: file.w / file.h, print } : null
}

const MAKERS: Record<string, (seasonYear: number | null) => GrantedMark | null> = {
  nike: (year) => year === 1999 ? { src: '/club-kits/marks/nike-swoosh-white.svg', label: 'NIKE', aspect: 24 / 8.4, print: 'colour' } : null,
  umbro: () => ({ src: '/kits/assembly/2009-10/parts/maker-umbro.svg', label: 'umbro', aspect: 110 / 60, print: 'mono' }),
  adidas: (year) => (year !== null && year < 1992
    ? { src: '/kits/assembly/1985-86/parts/maker-adidas.svg', label: 'adidas', aspect: 80 / 82, print: 'mono' }
    : null),
  puma: () => webp('maker-puma', 'PUMA', 'mono'),
  macron: () => webp('maker-macron', 'MACRON', 'mono'),
}

const SPONSORS: Record<string, () => GrantedMark | null> = {
  // The wide 2000 wordmark printed as the shirt sponsor in the 2008/09 archive.
  umbro: () => ({ src: '/club-kits/marks/umbro-wordmark-2000.svg', label: 'UMBRO', aspect: 124.53647 / 45.913306, print: 'mono' }),
  visa: () => ({ src: '/kits/assembly/1985-86/parts/sponsor-visa.svg', label: 'VISA', aspect: 430 / 250, print: 'colour' }),
  subaru: () => ({ src: '/kits/assembly/2009-10/parts/sponsor-subaru.svg', label: 'SUBARU', aspect: 360 / 180, print: 'colour' }),
  // Official one-colour lockup used on the 2025/26 home and away shirts.
  // https://www.ibi.co.il/wp-content/uploads/2021/01/logo.svg
  ibi: () => ({ src: '/kits/marks/sponsor-ibi.svg', label: 'IBI', aspect: 108 / 75, print: 'mono' }),
  fujitsu: () => webp('sponsor-fujitsu', 'FUJITSU', 'mono'),
  arkia: () => webp('sponsor-arkia', 'ARKIA', 'colour'),
}

function normalized(value: string): string {
  return value.normalize('NFKD').toLowerCase().replace(/[׳״'"’`\-_.()\s]/g, '')
}

function yearOf(seasonLabel?: string): number | null {
  if (!seasonLabel) return null
  const year = Number(seasonLabel.slice(0, 4))
  return Number.isFinite(year) ? year : null
}

export function grantedMaker(maker: string | null, seasonLabel?: string): GrantedMark | null {
  if (!maker) return null
  return MAKERS[normalized(maker)]?.(yearOf(seasonLabel)) ?? null
}

export function grantedSponsor(sponsor: string | null, seasonLabel?: string, variant?: KitVariant, base?: string): GrantedMark | null {
  if (!sponsor) return null
  const key = normalized(sponsor)
  if (seasonLabel && variant) {
    const mark = sponsorMark(sponsor, { club: WORKER_ROUTE_CLUB, season: seasonLabel, variant, base })
    if (mark?.kind === 'svg' && mark.src && mark.print) {
      const [, , width, height] = mark.viewBox.split(' ').map(Number)
      return { src: mark.src, label: sponsor, aspect: width! / height!, print: mark.print }
    }
  }
  return SPONSORS[key]?.() ?? null
}

/** Every file the granted table can ask for — the asset test checks each one is on disk. */
export function grantedFiles(): string[] {
  const out = new Set<string>()
  for (const make of Object.values(MAKERS)) {
    for (const year of [1985, 1999, 2010]) {
      const mark = make(year)
      if (mark) out.add(mark.src)
    }
  }
  for (const make of Object.values(SPONSORS)) {
    const mark = make()
    if (mark) out.add(mark.src)
  }
  const doubleShirtSponsor = grantedSponsor('כתר', '1999/00', 'home')
  if (doubleShirtSponsor) out.add(doubleShirtSponsor.src)
  return [...out]
}

/* ---------------------------------------------------------------- the older shape, kept
 * `MarkArtwork` and the studio's mark panel read a `MarkAsset`. It is the same table. */

export type MarkKind = 'maker' | 'sponsor'
export type MarkAsset = { src: string; label: string; defaultPlacement: KitPlacement; monochrome?: boolean; atlas?: { col: number; row: number; cols: number; rows: number } }

const MAKER_SLOT: KitPlacement = { x: 30, y: 22, w: 11, h: 9 }
const SPONSOR_SLOT: KitPlacement = { x: 27, y: 44, w: 46, h: 15 }

function asAsset(mark: GrantedMark | null, slot: KitPlacement): MarkAsset | null {
  return mark ? { src: mark.src, label: mark.label, defaultPlacement: slot, monochrome: mark.print === 'mono' } : null
}

export function makerAssetForName(maker: string | null, seasonLabel?: string): MarkAsset | null {
  return asAsset(grantedMaker(maker, seasonLabel), MAKER_SLOT)
}
export function sponsorAssetForName(sponsor: string | null, seasonLabel?: string, variant?: KitVariant, base?: string): MarkAsset | null {
  return asAsset(grantedSponsor(sponsor, seasonLabel, variant, base), SPONSOR_SLOT)
}
export function markAsset(kind: MarkKind, value: string | null, seasonLabel?: string): MarkAsset | null {
  return kind === 'maker' ? makerAssetForName(value, seasonLabel) : sponsorAssetForName(value)
}
