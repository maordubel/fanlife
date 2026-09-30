import type { ReactNode } from 'react'

import { Num } from '@/components/ui/Num'
import { shirtDateText } from '@/lib/collector/market'
import type { CollectorShirt } from '@/lib/collector/types'
import { t } from '@/lib/i18n'

/**
 * חלקים קטנים שכל מסך בשוק צריך: התצלום של הארכיון, התאריך שלו, והכותרת בשני לוחות.
 *
 * The archive photograph is served as the file that was measured — a plain `<img>` with
 * `data-archive-photo`, never the framework's optimiser (rule 69 §5), so the sweep can hide
 * it and count what is left.
 */
export function ArchivePhoto({ shirt, className = '', eager = false }: { shirt: CollectorShirt; className?: string; eager?: boolean }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- the measured bytes ship unchanged (rule 69 §5)
    <img
      src={shirt.src}
      alt={`${shirt.variantHe} · ${shirtDateText(shirt)}`}
      width={760}
      height={760}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      data-archive-photo=""
      className={`block h-auto w-full ${className}`}
    />
  )
}

/** `1994/95` isolated LTR, or `1994 בערך` with only the figure isolated (rule 69 §7). */
export function ShirtDate({ shirt }: { shirt: CollectorShirt }) {
  if (!shirt.seasonAmbiguous && shirt.seasonLabel) return <Num>{shirt.seasonLabel}</Num>
  return (
    <>
      <Num>{String(shirt.yearRaw ?? '')}</Num> {t('kits.archive.approx')}
    </>
  )
}

/**
 * כותרת בשני לוחות — the navy plate laid first and 3px out, the vermilion on top (rule 8).
 * The navy copy is decoration and hidden from assistive tech; the vermilion one is the text.
 */
export function PlateHeading({
  children,
  as: Tag = 'h2',
  className = 'text-[40px] sm:text-[52px]',
}: {
  children: ReactNode
  as?: 'h2' | 'h3' | 'p'
  className?: string
}) {
  return (
    <Tag className={`relative font-poster leading-none ${className}`}>
      <span aria-hidden="true" className="plate-shift absolute inset-0 text-sign">
        {children}
      </span>
      <span className="plate-top relative text-red">{children}</span>
    </Tag>
  )
}

/** A kicker in the Latin/mono voice of a printed ticket: small, spaced, navy. */
export function Kicker({ children, tone = 'sign' }: { children: ReactNode; tone?: 'sign' | 'paper' | 'muted' }) {
  const colour = tone === 'paper' ? 'text-paper/85' : tone === 'muted' ? 'text-muted' : 'text-sign'
  return <p className={`font-body text-[10.5px] font-extrabold tracking-widest ${colour}`}>{children}</p>
}

/**
 * מגן ספוילר — the same shield as the archive's: a Gate 4 shirt this device has not built stays
 * covered until a tap uncovers it. The market must not be the back door to the puzzle's answer.
 */
export function ShieldTile({ shirt, onUncover }: { shirt: CollectorShirt; onUncover: () => void }) {
  return (
    <button
      type="button"
      onClick={onUncover}
      aria-label={t('kits.shield.aria', { date: shirtDateText(shirt) })}
      className="flex aspect-square min-h-tap w-full flex-col items-center justify-center gap-1.5 border-rule border-dashed border-ink/50 bg-paper px-2 text-center"
    >
      <span className="font-display text-[15px] leading-tight text-ink">{t('kits.shield.title')}</span>
      <span className="font-body text-[10.5px] leading-snug text-muted">{t('kits.shield.body')}</span>
    </button>
  )
}
