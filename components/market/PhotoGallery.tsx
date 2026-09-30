'use client'

import { useCallback, useRef, useState } from 'react'

import { UserPhoto } from '@/components/collector/UserPhoto'
import type { CollectorShirt } from '@/lib/collector/types'
import { t } from '@/lib/i18n'

import { ArchivePhoto } from './ShirtBits'

/**
 * התמונות של העותק — a strip you swipe on a phone (scroll-snap, the browser's own gesture, in the
 * page's own direction), with thumbnails under it and the arrows from `sm` up. Never a floating
 * lightbox (spec §73): the photographs are part of the page, where the facts are.
 *
 * A copy with no photographs yet shows the ARCHIVE photograph, labelled as what it is — the model,
 * not this object (§6) — and says a photo can be asked for in the conversation.
 */
export function PhotoGallery({ photos, shirt }: { photos: readonly string[]; shirt: CollectorShirt | null }) {
  const strip = useRef<HTMLDivElement>(null)
  const [index, setIndex] = useState(0)

  const onScroll = useCallback(() => {
    const el = strip.current
    if (!el || el.clientWidth === 0) return
    // RTL strips scroll into negative scrollLeft in every current engine; the distance is what counts
    setIndex(Math.min(photos.length - 1, Math.round(Math.abs(el.scrollLeft) / el.clientWidth)))
  }, [photos.length])

  const go = useCallback(
    (next: number) => {
      const el = strip.current
      const slide = el?.children[Math.max(0, Math.min(photos.length - 1, next))] as HTMLElement | undefined
      slide?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' })
    },
    [photos.length],
  )

  if (photos.length === 0) {
    return (
      <figure className="border-plate border-ink bg-paper" data-market-gallery="archive">
        <div className="mx-auto max-w-[420px] p-4">{shirt ? <ArchivePhoto shirt={shirt} eager /> : null}</div>
        <figcaption className="border-t-hair border-ink/30 px-3 py-2 font-body text-[12px] leading-snug text-ink">
          <span className="block font-extrabold text-sign">{t('market.item.archivePhoto')}</span>
          <span className="block text-muted">{t('market.item.gallery.none')}</span>
        </figcaption>
      </figure>
    )
  }

  return (
    <section aria-label={t('market.item.gallery')} className="border-plate border-ink bg-paper" data-market-gallery="copy">
      <div
        ref={strip}
        onScroll={onScroll}
        className="flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {photos.map((path, i) => (
          <div
            key={path}
            className="aspect-[4/5] w-full shrink-0 snap-center snap-always bg-sheet"
            aria-roledescription="slide"
            aria-label={t('market.item.gallery.count', { i: String(i + 1), n: String(photos.length) })}
          >
            <UserPhoto path={path} />
          </div>
        ))}
      </div>
      {photos.length > 1 ? (
        <div className="flex items-center gap-2 border-t-hair border-ink/30 p-2">
          <button
            type="button"
            onClick={() => go(index - 1)}
            disabled={index === 0}
            aria-label={t('market.item.gallery.prev')}
            className="hidden min-h-tap w-tap shrink-0 items-center justify-center border-rule border-ink bg-sheet font-body text-step-1 text-ink disabled:opacity-30 sm:flex"
          >
            →
          </button>
          <ul className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto">
            {photos.map((path, i) => (
              <li key={path} className="shrink-0">
                <button
                  type="button"
                  onClick={() => go(i)}
                  aria-label={t('market.item.gallery.count', { i: String(i + 1), n: String(photos.length) })}
                  aria-current={i === index ? 'true' : undefined}
                  className={`block h-tap min-h-tap w-tap overflow-hidden border-rule ${i === index ? 'border-red' : 'border-ink/30'}`}
                >
                  <UserPhoto path={path} />
                </button>
              </li>
            ))}
          </ul>
          <p className="shrink-0 font-body text-[11px] font-bold text-muted" aria-live="polite">
            {t('market.item.gallery.count', { i: String(index + 1), n: String(photos.length) })}
          </p>
          <button
            type="button"
            onClick={() => go(index + 1)}
            disabled={index === photos.length - 1}
            aria-label={t('market.item.gallery.next')}
            className="hidden min-h-tap w-tap shrink-0 items-center justify-center border-rule border-ink bg-sheet font-body text-step-1 text-ink disabled:opacity-30 sm:flex"
          >
            ←
          </button>
        </div>
      ) : null}
    </section>
  )
}
