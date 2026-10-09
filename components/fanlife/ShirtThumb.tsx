'use client'

import { KitPlate } from '@/components/clubs/games/KitPlate'
import type { CollectorShirt } from '@/lib/collector/types'
import { shirtDateText } from '@/lib/fanlife/collector/cards'

type Drawn = { kit?: { id: string; design: string | null; colours: string[]; season: string } | null; clubName?: string }

/**
 * A shirt in FAN LIFE's closet, market and auction: the archive's photograph where the club has
 * one (Hapoel Tel Aviv), otherwise the kit drawn from the club's documented season, maker and
 * colours. Never a collector's upload (that is UserPhoto). Same props as The Worker's ShirtThumb;
 * nothing is shielded in FAN LIFE.
 */
export function ShirtThumb({ shirt, className = '' }: { shirt: (CollectorShirt & Drawn) | undefined; shielded?: boolean; onUncover?: () => void; className?: string }) {
  if (!shirt) return <span className={`fl-thumb-empty block aspect-square w-full ${className}`} />
  const alt = `${shirt.variantHe} · ${shirtDateText(shirt)}`
  if (!shirt.src && !shirt.kit && (shirt as { world?: unknown }).world) {
    // a club outside the archive and no photograph yet: a printed shirt-shaped tag with the club's name, never a guess at its colours
    return (
      <span className={`fl-thumb-world ${className}`} role="img" aria-label={alt} data-world-thumb="">
        <svg viewBox="0 0 100 100" aria-hidden="true" focusable="false">
          <path d="M30 10 L10 24 L19 40 L27 35 L27 90 L73 90 L73 35 L81 40 L90 24 L70 10 Q50 24 30 10 Z" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round" strokeDasharray="5 3" />
        </svg>
        <b>{shirt.clubName}</b>
      </span>
    )
  }
  if (!shirt.src && shirt.kit) {
    return (
      <span className={`fl-thumb-drawn block aspect-square w-full ${className}`} role="img" aria-label={alt}>
        <KitPlate kit={shirt.kit} label={false} />
      </span>
    )
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- the measured archive bytes ship unchanged
    <img src={shirt.src} alt={alt} width={760} height={760} loading="lazy" decoding="async" data-archive-photo="" className={`block aspect-square h-auto w-full object-contain ${className}`} />
  )
}
