'use client'

import { useEffect, useRef } from 'react'

import { firePickFxAt } from '@/components/stage/PickFx'
import { t } from '@/lib/i18n'
import type { OpenClue } from '@/lib/game/blind-cow/types'

import { CowMark } from './CowMark'

/**
 * שרשרת הרמזים — every clue opened so far stays on the screen, oldest on top, the newest
 * at the bottom next to the thumb (spec §1.4: "כל רמז חדש נשאר על המסך ומצטרף לשרשרת").
 *
 * The newest one is the printed card: vermilion number plate, the value in Miriam Libre
 * at reading size, and it lands with the pick effect. The older ones fold into one-line
 * rows so ten of them still fit a 640px phone. Only this list may scroll, and only when
 * ten long clues outgrow a small screen — the page itself never does.
 */
export function ClueStack({ clues, total, fresh }: { clues: OpenClue[]; total: number; fresh: number | null }) {
  const listRef = useRef<HTMLOListElement>(null)
  const lastRef = useRef<HTMLLIElement>(null)

  useEffect(() => {
    lastRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    if (fresh !== null && fresh > 1) {
      firePickFxAt(lastRef.current, { label: t('blindcow.hud.clue', { n: String(fresh), total: String(total) }), tone: 'red', haptic: 'tap' })
    }
  }, [fresh, total])

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* the mark takes whatever room the chain has not claimed yet, and gives it back:
          it is sized in container-height units, so ten clues shrink it to a stamp */}
      <div className="bc-stage my-1 flex min-h-[44px] flex-[0_1_210px] items-center justify-center gap-[3cqh] overflow-hidden border-rule border-ink [container-type:size] md:gap-4 md:py-6 md:[container-type:normal]">
        <CowMark dark className="me-1 text-[min(62cqh,150px)] md:text-[110px]" />
        <p className="font-display text-[min(17cqh,36px)] leading-none text-paper md:text-[34px]">{t('blindcow.lobby.title')}</p>
      </div>
      <ol
        ref={listRef}
        aria-label={t('blindcow.stack.label')}
        aria-live="polite"
        className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto overscroll-contain pb-1"
      >
        {clues.map((clue, i) => {
          const last = i === clues.length - 1
          return (
            <li
              key={clue.n}
              ref={last ? lastRef : undefined}
              className={
                last
                  ? 'relative flex shrink-0 items-stretch border-rule border-ink bg-sheet animate-fx-pop'
                  : 'flex shrink-0 items-baseline gap-2 border-hair border-ink/30 bg-sheet px-1.5 py-1'
              }
            >
              {last ? (
                <>
                  <span className="relative grid w-11 shrink-0 place-items-center bg-ink font-poster text-[30px] leading-none" aria-hidden="true">
                    <span className="plate-shift absolute inset-0 grid place-items-center text-sign">{clue.n}</span>
                    <span className="plate-top relative text-red">{clue.n}</span>
                  </span>
                  <span className="min-w-0 flex-1 px-2.5 py-2">
                    <span className="flex items-center gap-1.5 font-body text-[10px] font-extrabold tracking-widest text-sign">
                      {clue.labelHe}
                      <span data-blindcow="new" className="bg-red px-1 py-px text-[9.5px] leading-none text-paper">
                        {t('blindcow.clue.new')}
                      </span>
                    </span>
                    <span className="mt-0.5 block font-sign text-[17px] leading-snug text-ink [@media(max-height:680px)]:text-[15px]">
                      <bdi>{clue.valueHe}</bdi>
                    </span>
                  </span>
                </>
              ) : (
                <>
                  <span className="w-5 shrink-0 text-center font-poster text-[17px] leading-none text-red" aria-hidden="true">
                    {clue.n}
                  </span>
                  <span className="min-w-0 flex-1 font-body text-[12.5px] leading-snug text-ink/70">
                    <span className="font-extrabold text-sign">{clue.labelHe}</span> · <bdi>{clue.valueHe}</bdi>
                  </span>
                </>
              )}
            </li>
          )
        })}
      </ol>
    </div>
  )
}
