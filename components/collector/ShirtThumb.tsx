'use client'

import { shirtDateText } from '@/lib/collector/cards'
import type { CollectorShirt } from '@/lib/collector/types'
import { t } from '@/lib/i18n'

/**
 * החולצה בארון — the archive's own photograph of a shirt, never a collector's upload.
 *
 * A plain `<img data-archive-photo>`: the bytes that ship are the bytes that were measured
 * (rule 69 §5), and the sweep hides it and counts what is left (§3). A shirt Gate 4 can still
 * deal arrives SHIELDED on somebody else's closet — no photograph at all, not even a hidden one —
 * exactly like the archive's own shield. Nothing here reads or writes the game's collection:
 * the caller decides `shielded`.
 */
export function ShirtThumb({
  shirt,
  shielded = false,
  onUncover,
  className = '',
}: {
  shirt: CollectorShirt | undefined
  shielded?: boolean
  /** the shield asks before it shows — present, and a tap uncovers it (the archive's own rule) */
  onUncover?: () => void
  className?: string
}) {
  if (shirt && shielded && onUncover) {
    return (
      <button
        type="button"
        onClick={onUncover}
        aria-label={t('kits.shield.aria', { date: shirtDateText(shirt) })}
        className={`flex aspect-square min-h-tap w-full flex-col items-center justify-center gap-1 border-hair border-dashed border-ink/40 bg-paper px-2 text-center ${className}`}
      >
        <span className="font-display text-[15px] leading-tight text-ink">{t('kits.shield.title')}</span>
        <span className="font-body text-[10.5px] leading-snug text-muted">{t('kits.shield.body')}</span>
      </button>
    )
  }
  if (!shirt || shielded) {
    return (
      <span
        className={`flex aspect-square w-full flex-col items-center justify-center gap-1 border-hair border-dashed border-ink/40 bg-paper px-2 text-center ${className}`}
      >
        {shirt ? <span className="font-display text-[15px] leading-tight text-ink">{t('kits.shield.title')}</span> : null}
      </span>
    )
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- the measured bytes ship unchanged (rule 69 §5)
    <img
      src={shirt.src}
      alt={`${shirt.variantHe} · ${shirtDateText(shirt)}`}
      width={760}
      height={760}
      loading="lazy"
      decoding="async"
      data-archive-photo=""
      className={`block aspect-square h-auto w-full object-contain ${className}`}
    />
  )
}
