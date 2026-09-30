'use client'

import dynamic from 'next/dynamic'
import Image from 'next/image'
import { useCallback, useEffect, useRef, useState } from 'react'

import { KitShirt } from '@/components/kit/KitShirt'
import { MerchLinks } from '@/components/life/MerchLinks'
import { t } from '@/lib/i18n'
import type { WardrobeReading } from '@/lib/life/profile'
import { artUrl } from '@/lib/life/runtime/art'

import css from './personal.module.css'

/** delta 91 — the shirt he made is drawn from its marks by the bench's own read-only renderer, loaded only when one hangs here */
const CraftOutputView = dynamic(() => import('@/components/mechanics/craft/CraftOutputView').then((mod) => ({ default: mod.CraftOutputView })), { ssr: false, loading: () => null })

/**
 * הארון שלי — the shirts on a rail, one in your hand, the rest on their hangers (§23–24).
 *
 * The shirt is drawn the two ways the product draws a shirt and no third: Maor's own
 * photograph when he owns the shirt, or the club archive's spec through the same
 * `KitShirt` the kits screen uses. The one in the middle is at full size; the neighbours
 * hang back, smaller and quieter. Under it, its biography — the season, the sponsor, the
 * sentence read off the photograph, and every day he wore it (`wardrobeReading`, the
 * same rows the shop's card reads; no second data system).
 *
 * The rail is the one deliberate sideways scroll in the dossier (§41). It is not the only
 * way through it: the two arrows and the keyboard's ← → do the same (WCAG — a swipe
 * always has a tap alternative), and it opens on the newest shirt.
 */
/**
 * The same rail, asked a question (delta 92, plan §4): before a match the world opens this
 * wardrobe — not a second one — with one action under the shirt in your hand. `noteFor`
 * is the line that makes it a memory ("לבשת אותה לאחרונה ב…").
 */
export type WardrobeAction = {
  labelFor: (id: string) => string
  onPick: (id: string) => void
  noteFor?: (id: string) => string | null
}

export function WardrobeRail({
  wardrobe,
  action = null,
  merch = false,
}: {
  wardrobe: WardrobeReading[]
  action?: WardrobeAction | null
  /** the shop links under the shirt — in the bag, never inside the pre-match ritual */
  merch?: boolean
}) {
  const rail = useRef<HTMLUListElement | null>(null)
  const [active, setActive] = useState(Math.max(0, wardrobe.length - 1))

  const scrollTo = useCallback((index: number, smooth = true) => {
    const node = rail.current?.children[index] as HTMLElement | undefined
    node?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', inline: 'center', block: 'nearest' })
  }, [])

  // open on the newest shirt
  useEffect(() => {
    scrollTo(Math.max(0, wardrobe.length - 1), false)
  }, [scrollTo, wardrobe.length])

  const onScroll = () => {
    const box = rail.current
    if (!box) return
    const mid = box.getBoundingClientRect().left + box.clientWidth / 2
    let best = 0
    let bestDistance = Infinity
    Array.from(box.children).forEach((child, i) => {
      const r = (child as HTMLElement).getBoundingClientRect()
      const distance = Math.abs(r.left + r.width / 2 - mid)
      if (distance < bestDistance) {
        bestDistance = distance
        best = i
      }
    })
    if (best !== active) setActive(best)
  }

  const go = (step: number) => {
    const next = Math.min(wardrobe.length - 1, Math.max(0, active + step))
    setActive(next)
    scrollTo(next)
  }

  if (wardrobe.length === 0) {
    return (
      <div className="flex min-h-0 flex-1 items-center px-6" data-life="bag-wardrobe">
        <p className="whitespace-pre-line font-body text-[14px] leading-relaxed text-concrete">
          <bdi>{t('life90h.bag.wardrobeEmpty')}</bdi>
        </p>
      </div>
    )
  }

  const shirt = wardrobe[active] ?? wardrobe[0]!

  return (
    <div className={`${css.drawer} flex min-h-0 flex-1 flex-col pb-[max(12px,env(safe-area-inset-bottom))]`} data-life="bag-wardrobe">
      {/* the rail itself — a hairline to hang from */}
      <div className="relative shrink-0">
        <span aria-hidden="true" className="absolute inset-x-4 top-[10px] h-[2px] bg-concrete/50" />
        <ul
          ref={rail}
          data-own-swipe
          tabIndex={0}
          aria-label={t('life90h.bag.wardrobe')}
          onScroll={onScroll}
          onKeyDown={(event) => {
            // RTL: the next shirt is to the left
            if (event.key === 'ArrowLeft') {
              event.preventDefault()
              event.stopPropagation()
              go(1)
            } else if (event.key === 'ArrowRight') {
              event.preventDefault()
              event.stopPropagation()
              go(-1)
            }
          }}
          className={`${css.rail} gap-2 px-[calc(50%-72px)] pb-2 pt-[14px] outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-red`}
        >
          {wardrobe.map((item, i) => (
            <li key={item.id} data-active={i === active} className={`${css.hanger} shrink-0`} data-life="wardrobe-shirt">
              <button
                type="button"
                tabIndex={-1}
                onClick={() => {
                  setActive(i)
                  scrollTo(i)
                }}
                aria-label={item.nameHe}
                className="flex h-[clamp(120px,32dvh,250px)] min-h-tap w-[144px] items-center justify-center"
              >
                {item.craft ? (
                  <span className="relative block h-full w-full" data-life="wardrobe-crafted" data-worn={item.craftedHe === t('life91m.bag.craftedWorn') ? '1' : '0'}>
                    <CraftOutputView output={item.craft} className="h-full w-full" />
                  </span>
                ) : item.spec ? (
                  <KitShirt spec={item.spec} className="h-full" title={item.nameHe} />
                ) : (
                  <span className="relative block h-full w-full">
                    <Image src={artUrl(item.art)} alt="" aria-hidden="true" fill sizes="160px" className="object-contain" />
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex shrink-0 items-center justify-between gap-2 px-4 md:px-6">
        <button
          type="button"
          onClick={() => go(-1)}
          disabled={active === 0}
          aria-label={t('life90h.bag.prevShirt')}
          className="min-h-tap min-w-tap font-display text-[20px] text-sheet disabled:text-concrete/30"
        >
          ›
        </button>
        <p className="font-mono tabular-nums text-[10px] uppercase tracking-[0.14em] text-concrete">
          <bdi>{shirt.sponsorHe}</bdi>
        </p>
        <button
          type="button"
          onClick={() => go(1)}
          disabled={active === wardrobe.length - 1}
          aria-label={t('life90h.bag.nextShirt')}
          className="min-h-tap min-w-tap font-display text-[20px] text-sheet disabled:text-concrete/30"
        >
          ‹
        </button>
      </div>

      {/* the ritual's one action sits above the biography, never scrolled away under it */}
      {action && (
        <div className="flex shrink-0 flex-col gap-1.5 px-4 pb-2 md:px-6" data-life="wardrobe-action">
          {action.noteFor?.(shirt.id) ? (
            <p className="font-body text-[12.5px] leading-snug text-sheet">
              <bdi>{action.noteFor(shirt.id)}</bdi>
            </p>
          ) : null}
          <button
            type="button"
            data-life="wardrobe-wear"
            onClick={() => action.onPick(shirt.id)}
            className="min-h-tap self-start border-rule border-sheet bg-red px-5 font-display text-[17px] text-sheet transition-transform duration-press ease-stamp focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sheet active:scale-[.97] motion-reduce:transition-none"
          >
            <bdi>{action.labelFor(shirt.id)}</bdi>
          </button>
        </div>
      )}
      {/* the biography of the shirt in your hand */}
      <div key={shirt.id} className={`${css.drawer} min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 md:px-6`} aria-live="polite" data-life="wardrobe-bio">
        <p className="font-poster text-[40px] leading-none tabular-nums text-sheet">
          <span dir="ltr">{shirt.yearsHe}</span>
        </p>
        <p className="mt-1 font-display text-[16px] leading-tight text-sheet">
          <bdi>{shirt.nameHe}</bdi>
        </p>
        <p className="mt-1.5 font-body text-[13px] leading-snug text-concrete">
          <bdi>{shirt.noteHe}</bdi>
        </p>
        {shirt.craft ? (
          <p className="mt-3 border-t-hair border-red/40 pt-2 font-body text-[12px] leading-snug text-sheet" data-life="wardrobe-crafted-line">
            <bdi>{shirt.craftedHe}</bdi>
          </p>
        ) : shirt.wornHe.length > 0 ? (
          <div className="mt-3 border-t-hair border-red/40 pt-2">
            <p className="font-mono tabular-nums text-[9px] uppercase tracking-[0.14em] text-red">
              <bdi>{t('life.shop.worn')}</bdi>
            </p>
            <ul>
              {shirt.wornHe.map((day) => (
                <li key={day.id} className="mt-1 font-body text-[12px] leading-snug text-sheet">
                  <span aria-hidden="true" className="me-1.5 inline-block h-[6px] w-[6px] bg-red align-middle" />
                  <bdi>{day.titleHe}</bdi>
                  <span className="px-1.5 text-concrete">·</span>
                  <bdi className="text-concrete">{day.dateHe}</bdi>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="mt-3 font-body text-[12px] leading-snug text-concrete/80">
            <bdi>{t('life90h.bag.notWorn')}</bdi>
          </p>
        )}
        {merch && !shirt.craft ? <MerchLinks shirtId={shirt.id} season={shirt.yearsHe} tone="dark" className="pb-2" /> : null}
      </div>
    </div>
  )
}
