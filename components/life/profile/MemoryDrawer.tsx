'use client'

import { useState } from 'react'

import { BoxObject } from '@/components/life/BoxObject'
import { Num } from '@/components/ui/Num'
import { t } from '@/lib/i18n'
import type { MemoryThing } from '@/lib/life/personal'

import css from './personal.module.css'

/**
 * קופסת הזיכרונות — the Red Box, laid out on a desk (spec §25–27).
 *
 * The Red Box stays the source of truth: `boxContents` (the same view the tin in the
 * bedroom opens) decides what is in it and what each thing looks like; `BoxObject` draws
 * it. The bag only changes the table — scattered gently, each at the stable tilt of its
 * own id, not a masonry wall.
 *
 * Tap one (§26): it is lifted a little, the rest go quiet, and a detail layer says the
 * year, the day, the sentence written when it went in, a provenance word if it is not an
 * ordinary thing (a word — never a loot tier), and — for a kept row — the way out:
 * `cardForMemory`, the share flow that already existed, untouched.
 */
export function MemoryDrawer({ things, onShare }: { things: MemoryThing[]; onShare: (thing: MemoryThing) => void }) {
  const [picked, setPicked] = useState<string | null>(null)
  const chosen = things.find((thing) => thing.id === picked) ?? null

  if (things.length === 0) {
    return (
      <div className="flex min-h-0 flex-1 items-center px-6" data-life="bag-memories">
        <p className="whitespace-pre-line font-body text-[14px] leading-relaxed text-concrete">
          <bdi>{t('life90h.bag.memoriesEmpty')}</bdi>
        </p>
      </div>
    )
  }

  return (
    <div className={`${css.drawer} flex min-h-0 flex-1 flex-col px-4 pb-[max(12px,env(safe-area-inset-bottom))] md:px-6`} data-life="bag-memories">
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain border-hair border-concrete/30 bg-sheet/[0.03] p-3">
        <ul className="grid min-h-full grid-cols-3 content-center gap-x-3 gap-y-4 sm:grid-cols-4 md:grid-cols-5">
          {things.map((thing, i) => (
            <li
              key={thing.id}
              className={`${css.liftable} ${picked === thing.id ? css.lifted : picked ? css.lowered : ''}`}
              style={{ marginTop: i % 3 === 1 ? 10 : 0 }}
            >
              <button
                type="button"
                data-life="memory-thing"
                data-kind={thing.kind}
                aria-pressed={picked === thing.id}
                onClick={() => setPicked(picked === thing.id ? null : thing.id)}
                className="flex min-h-tap w-full flex-col items-stretch"
              >
                <span className="block aspect-square w-full">
                  <BoxObject id={thing.id} kind={thing.kind} art={thing.art} plate={thing.plate} year={thing.year} label={thing.titleHe ?? thing.nameHe} />
                </span>
                <span className="mx-auto -mt-1 bg-sheet px-1.5 py-0.5 font-sign text-[10px] leading-none text-ink">
                  <Num>{thing.year}</Num>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
      <div className="min-h-[100px] shrink-0 pt-2.5" aria-live="polite" data-life="memory-detail">
        {chosen ? (
          <div key={chosen.id} className={css.drawer}>
            <p className="flex items-baseline gap-2">
              <span className="font-poster text-[26px] leading-none tabular-nums text-red">
                <Num>{chosen.year}</Num>
              </span>
              <span className="min-w-0 flex-1 truncate font-display text-[16px] leading-none text-sheet">
                <bdi>{chosen.titleHe ?? chosen.nameHe}</bdi>
              </span>
              {chosen.rarityHe ? (
                <span className="shrink-0 -rotate-2 border-hair border-red px-1 py-[2px] font-mono tabular-nums text-[9px] uppercase leading-none tracking-[0.12em] text-red">
                  <bdi>{chosen.rarityHe}</bdi>
                </span>
              ) : null}
            </p>
            {chosen.titleHe && chosen.nameHe && chosen.titleHe !== chosen.nameHe ? (
              <p className="mt-1 font-mono tabular-nums text-[10px] leading-none text-concrete">
                <bdi>{chosen.nameHe}</bdi>
              </p>
            ) : null}
            {chosen.noteHe ? (
              <p className="mt-1.5 line-clamp-3 font-body text-[13px] leading-snug text-concrete">
                <bdi>{chosen.noteHe}</bdi>
              </p>
            ) : null}
            {chosen.keepsake ? (
              <button
                type="button"
                data-life="share-memory"
                onClick={() => onShare(chosen)}
                className="group mt-1 flex min-h-tap items-center"
              >
                <span className="flex h-[34px] items-center border-hair border-sheet/50 px-3 font-sign text-[12px] leading-none text-sheet transition-colors duration-press group-active:bg-red motion-reduce:transition-none">
                  <bdi>{t('life.share.take')}</bdi>
                </span>
              </button>
            ) : null}
          </div>
        ) : (
          <p className="font-body text-[12px] leading-relaxed text-concrete/80">
            <bdi>{t('life.box.touch')}</bdi>
          </p>
        )}
      </div>
    </div>
  )
}
