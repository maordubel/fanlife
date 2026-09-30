'use client'

import Image from 'next/image'

import { BoxObject } from '@/components/life/BoxObject'
import { KitShirt } from '@/components/kit/KitShirt'
import { t } from '@/lib/i18n'
import type { BagOverview as BagReading } from '@/lib/life/personal'
import { artUrl } from '@/lib/life/runtime/art'

import { CarriedObject } from './PhysicalObject'
import css from './personal.module.css'

export type BagPage = 'carry' | 'wardrobe' | 'memories' | 'money'

/**
 * ארבעה תאים — the bag opened on the table (spec §17).
 *
 * Not four cards: four compartments of one bag. The bag is a heavy frame with a stitched
 * hairline inside it; the compartments are cut into it, each with its name on a mono
 * label, its sentence, and the things themselves lying at the bottom of it — the pocket's
 * contents, the newest shirt on its hanger, the last three things put in the box, the
 * season card's red edge. Nothing is counted: an empty compartment says so in words.
 *
 * Pressing one pulls its drawer open (the page mounts with `.drawer`).
 */
function Compartment({
  page,
  titleHe,
  lineHe,
  children,
  onOpen,
  delay,
}: {
  page: BagPage
  titleHe: string
  lineHe: string
  children?: React.ReactNode
  onOpen: () => void
  delay: number
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      data-life={`bag-door-${page}`}
      className={`${css.press} ${css.paperLayer} ${css.drawer} relative flex min-h-tap flex-col overflow-hidden border-rule border-sheet/70 bg-ink p-3 text-start`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <span aria-hidden="true" className="pointer-events-none absolute inset-[4px] border-hair border-dashed border-sheet/20" />
      <span className="relative flex items-start justify-between gap-2">
        <span className="font-display text-[17px] leading-none text-sheet md:text-[20px]">
          <bdi>{titleHe}</bdi>
        </span>
        <span aria-hidden="true" className="font-display text-[16px] leading-none text-red">‹</span>
      </span>
      <span className="relative mt-1.5 line-clamp-2 whitespace-pre-line font-body text-[11px] leading-snug text-concrete md:text-[12px]">
        <bdi>{lineHe}</bdi>
      </span>
      <span className="relative flex min-h-0 flex-1 items-center justify-center pt-2" aria-hidden="true">
        {children}
      </span>
    </button>
  )
}

export function BagOverview({ reading, onOpen }: { reading: BagReading; onOpen: (page: BagPage) => void }) {
  const { carried, wardrobe, memories, purses, card } = reading
  const newest = wardrobe[wardrobe.length - 1] ?? null
  const peek = memories.slice(-3).reverse()
  const pocket = purses.find((row) => row.purse === 'pocket')
  const tin = purses.find((row) => row.purse === 'tin')

  return (
    <div className="grid min-h-0 flex-1 grid-cols-2 grid-rows-2 gap-2.5 px-4 pb-[max(12px,env(safe-area-inset-bottom))] md:gap-4 md:px-6" data-life="bag-overview">
      <Compartment
        page="carry"
        titleHe={t('life90h.bag.carry')}
        lineHe={carried.length > 0 ? carried.map((row) => row.nameHe).slice(0, 3).join(' · ') : card ? t('life.bag.subCurrent') : t('life.bag.carriedNone')}
        onOpen={() => onOpen('carry')}
        delay={120}
      >
        <span className="flex items-end justify-center">
          {carried.slice(0, 3).map((thing, i) => (
            <span key={thing.item} className={i > 0 ? '-ms-7' : ''}>
              <CarriedObject id={`peek:${thing.item}`} item={thing.item} art={thing.art} label="" size="sm" />
            </span>
          ))}
          {card ? <span className="ms-1 block h-[34px] w-[54px] -rotate-3 border-hair border-sheet bg-sheet" style={{ borderInlineStartWidth: 8, borderInlineStartColor: 'rgb(var(--red))' }} /> : null}
        </span>
      </Compartment>

      <Compartment
        page="wardrobe"
        titleHe={t('life90h.bag.wardrobe')}
        lineHe={newest ? newest.nameHe : t('life90h.bag.wardrobeEmptyShort')}
        onOpen={() => onOpen('wardrobe')}
        delay={180}
      >
        {newest ? (
          <span className="relative flex h-full max-h-[170px] w-full items-end justify-center">
            {newest.spec ? (
              <KitShirt spec={newest.spec} className="h-full max-h-[170px]" title={newest.nameHe} density="mini" />
            ) : (
              <span className="relative block h-full min-h-[60px] w-full">
                <Image src={artUrl(newest.art)} alt="" fill sizes="140px" className="object-contain object-bottom" />
              </span>
            )}
          </span>
        ) : null}
      </Compartment>

      <Compartment
        page="memories"
        titleHe={t('life90h.bag.memories')}
        lineHe={peek[0] ? peek[0].titleHe ?? peek[0].nameHe : t('life90h.bag.memoriesEmptyShort')}
        onOpen={() => onOpen('memories')}
        delay={240}
      >
        <span className="flex w-full items-end justify-center">
          {peek.map((thing, i) => (
            <span key={thing.id} className={`block h-[64px] w-[64px] shrink-0 md:h-[96px] md:w-[96px] ${i > 0 ? '-ms-5' : ''}`}>
              <BoxObject id={thing.id} kind={thing.kind} art={thing.art} plate={thing.plate} year={thing.year} label="" />
            </span>
          ))}
        </span>
      </Compartment>

      <Compartment
        page="money"
        titleHe={t('life90h.bag.money')}
        lineHe={[pocket ? `${t('life.bag.pocket')} · ${pocket.readingHe}` : null, tin ? `${t('life.bag.tin')} · ${tin.readingHe}` : null].filter(Boolean).join('\n')}
        onOpen={() => onOpen('money')}
        delay={300}
      >
        <span className="flex w-full items-end justify-center gap-3">
          {/* the tin under the bed, drawn: a lid, a body, and as many coins as the word says */}
          <span className="flex flex-col items-center">
            <span className="block h-[7px] w-[62px] border-hair border-sheet/60 bg-ink" />
            <span className="-mt-px flex h-[42px] w-[56px] flex-wrap content-end items-end justify-center gap-[3px] border-hair border-sheet/60 p-1.5">
              {Array.from({ length: tin?.band ?? 0 }, (_, i) => (
                <span key={i} className="block h-[7px] w-[7px] bg-red" />
              ))}
            </span>
          </span>
          {card ? (
            <span className="block -rotate-2 border-rule border-sheet bg-sheet px-2 py-1.5">
              <span className="block font-display text-[10px] leading-none text-red">
                <bdi>{t('life90h.sub.word')}</bdi>
              </span>
              <span className="mt-0.5 block font-poster text-[20px] leading-none text-ink" dir="ltr">
                {card.seasonHe}
              </span>
            </span>
          ) : null}
        </span>
      </Compartment>
    </div>
  )
}
