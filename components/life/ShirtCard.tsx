'use client'

import Image from 'next/image'

import { KitShirt } from '@/components/kit/KitShirt'

import { t } from '@/lib/i18n'
import type { LifeBusEvents } from '@/lib/life/runtime/bus'
import { SourceNote } from '@/components/ui/SourceNote'

/**
 * החולצה שקנית — the only purchase in this game that stops the world.
 *
 * Everything else a child buys here is a toast: a line of text that slides in and goes.
 * A shirt is not a purchase, it is the day you became a supporter with your own money,
 * and the first one gets a card that says so in as many words. It holds the shirt at the
 * size the shirt deserves — full width of a phone, nothing else on the glass — with the
 * sponsor and the years under it, because a kit is a date, and the collection count in
 * the corner so the second one already reads as a set with a gap in it.
 *
 * Tapping anywhere closes it. There is no button: a card you dismiss with a button is a
 * dialog, and this is a moment. It covers the glass completely and sits above the
 * dialogue box — the sentence that sold you the shirt has had its turn.
 */
export function ShirtCard({ shirt, onClose }: { shirt: NonNullable<LifeBusEvents['shirt']>; onClose: () => void }) {
  return (
    <button
      type="button"
      onClick={onClose}
      dir="rtl"
      aria-label={t('life.shirt.close')}
      className="min-h-tap absolute inset-0 z-[95] flex flex-col items-center justify-center bg-ink px-5 py-6 text-center"
      data-life="shirt-card"
    >
      <p className="font-display text-[13px] uppercase tracking-[0.22em] text-red">{t('life.shirt.club')}</p>

      <h2 className="mt-2 max-w-[22ch] font-display text-[22px] leading-tight text-sheet sm:text-[28px]">
        {shirt.titleHe}
      </h2>

      {/*
        שתי דרכים לצייר חולצה — a photograph, or the club's own spec.
        The seven Maor photographed are held up as photographs. The archive's season kits
        have no photograph and never will, so they are DRAWN, by the same component the
        kits screen draws them with: same cut, same crest, same lettered sponsor. A
        collection that mixed a photograph with a placeholder would be a collection with
        holes in it; this one has thirty-three shirts nobody had to photograph.
      */}
      <div className="my-4 flex aspect-square w-[min(62vw,320px)] items-center justify-center">
        {shirt.spec ? (
          <KitShirt spec={shirt.spec} className="h-full w-full" title={shirt.nameHe} />
        ) : (
          <div className="relative h-full w-full">
            <Image
              src={`/life/art/${shirt.art}.webp`}
              alt={shirt.nameHe}
              fill
              sizes="(max-width: 640px) 62vw, 320px"
              className="object-contain"
              priority
              // the bytes shipped are the bytes measured for yellow (rule 61) — no re-encode
              unoptimized
            />
          </div>
        )}
      </div>

      <p className="font-body text-[15px] text-sheet">{shirt.nameHe}</p>
      <p className="mt-1 font-mono text-[12px] tracking-wide text-concrete">
        <bdi>{shirt.sponsorHe}</bdi>
        <span className="px-2 text-red">·</span>
        <bdi>{shirt.yearsHe}</bdi>
      </p>

      <p className="mt-3 max-w-[34ch] font-body text-[13px] leading-relaxed text-concrete">{shirt.noteHe}</p>

      {/* which photograph the shirt was drawn from is on /credits (spec §0.3) */}
      {shirt.sourceHe && <SourceNote newTab tone="dark" className="mt-2" />}

      {/*
        A purchase counts; an ARRIVAL does not. "3 / 9" under a shirt you have just been
        told exists, and do not own, reads as a scoreline you are losing. The arrival card
        says what it is and what it costs to want it, and nothing else.
      */}
      <p className="mt-5 border-hair border-red px-3 py-1.5 font-mono text-[12px] tabular-nums text-sheet">
        {shirt.kind === 'arrived'
          ? t('life.shirt.onRail')
          : `${shirt.have} / ${shirt.total} ${t('life.shirt.collection')}`}
      </p>

      <p className="mt-4 font-body text-[11px] text-concrete/70">{t('life.shirt.tap')}</p>
    </button>
  )
}
