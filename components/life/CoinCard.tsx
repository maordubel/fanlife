'use client'

import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'

import { t } from '@/lib/i18n'
import type { LifeBusEvents } from '@/lib/life/runtime/bus'

type Side = 'tree' | 'pali'

/**
 * עץ או פלי — the oldest game in the neighbourhood, and the only one you can lose.
 *
 * Maor asked for it as a real coin flip with real numbers: a shekel to play, five if you
 * call it. The coin is his own photograph of a half shekel — the lyre face is עץ, the
 * numeral face is פלי — and it spins by swapping the two images faster than the eye can
 * follow, then slowing, which is what a coin does.
 *
 * The line on a win is his too, word for word, because it is what the terrace shouts and
 * not what a game says: **היידה הפועל! תוקפים נכון.**
 *
 * The stake leaves the pocket the moment the coin goes up. That is the whole reason the
 * game is worth having: the child can walk away from this one with less than he came
 * with, and every other way of earning money in this world cannot do that.
 */
export function CoinCard({
  coin,
  canAfford,
  onDone,
}: {
  coin: NonNullable<LifeBusEvents['coin']>
  canAfford: boolean
  onDone: (result: { played: boolean; won: boolean }) => void
}) {
  const [phase, setPhase] = useState<'call' | 'spin' | 'done'>('call')
  const [face, setFace] = useState<Side>('tree')
  const [called, setCalled] = useState<Side | null>(null)
  const [landed, setLanded] = useState<Side | null>(null)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])

  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  function flip(pick: Side) {
    if (phase !== 'call' || !canAfford) return
    setCalled(pick)
    setPhase('spin')
    const result: Side = Math.random() < 0.5 ? 'tree' : 'pali'
    // A coin does not spin at a constant speed. Eleven swaps, each a little slower than
    // the last, and the last one lands on the face it actually landed on.
    let at = 0
    for (let i = 0; i < 11; i += 1) {
      at += 70 + i * 26
      const side: Side = i % 2 === 0 ? 'pali' : 'tree'
      timers.current.push(setTimeout(() => setFace(side), at))
    }
    timers.current.push(
      setTimeout(() => {
        setFace(result)
        setLanded(result)
        setPhase('done')
      }, at + 420),
    )
  }

  const won = landed !== null && landed === called

  return (
    <div
      dir="rtl"
      className="absolute inset-0 z-[95] flex flex-col items-center justify-center bg-ink px-5 py-6 text-center"
      data-life="coin-card"
    >
      <p className="font-display text-[13px] uppercase tracking-[0.22em] text-red">{t('life.coin.kicker')}</p>

      <h2 className="mt-2 max-w-[24ch] font-display text-[22px] leading-tight text-sheet sm:text-[26px]">
        {phase === 'done'
          ? won
            ? t('life.coin.won')
            : t('life.coin.lost')
          : phase === 'spin'
            ? t('life.coin.air')
            : t('life.coin.call')}
      </h2>

      <div className="relative my-5 aspect-square w-[min(46vw,220px)]">
        <Image
          src={`/life/art/${face === 'tree' ? 'coinTree' : 'coinPali'}.webp`}
          alt={face === 'tree' ? t('life.coin.tree') : t('life.coin.pali')}
          fill
          sizes="(max-width: 640px) 46vw, 220px"
          className={`object-contain ${phase === 'spin' ? 'animate-[coin-toss_260ms_ease-in-out_infinite_alternate]' : ''}`}
          priority
        />
      </div>

      {phase === 'call' && (
        <>
          <p className="mb-3 font-mono text-[12px] tabular-nums text-concrete">
            {t('life.coin.stake', { n: String(coin.stake), win: String(coin.prize) })}
          </p>
          <div className="flex w-full max-w-[320px] gap-3">
            {(['tree', 'pali'] as const).map((side) => (
              <button
                key={side}
                type="button"
                disabled={!canAfford}
                onClick={() => flip(side)}
                className="min-h-tap flex-1 border-rule border-red bg-red px-4 py-3 font-display text-[16px] leading-none text-sheet transition-transform duration-press ease-stamp active:scale-[.98] disabled:border-concrete/40 disabled:bg-transparent disabled:text-concrete motion-reduce:transition-none"
              >
                {side === 'tree' ? t('life.coin.tree') : t('life.coin.pali')}
              </button>
            ))}
          </div>
          {!canAfford && <p className="mt-3 font-body text-[13px] text-concrete">{t('life.coin.broke')}</p>}
          <button
            type="button"
            onClick={() => onDone({ played: false, won: false })}
            className="min-h-tap mt-4 px-4 py-2 font-body text-[13px] text-concrete underline underline-offset-4"
          >
            {t('life.coin.away')}
          </button>
        </>
      )}

      {phase === 'done' && (
        <>
          <p className="font-body text-[14px] text-concrete">
            {t('life.coin.landed', {
              side: landed === 'tree' ? t('life.coin.tree') : t('life.coin.pali'),
            })}
          </p>
          <button
            type="button"
            onClick={() => onDone({ played: true, won })}
            className="min-h-tap mt-5 w-full max-w-[320px] border-rule border-red bg-red px-4 py-3 font-display text-[16px] leading-none text-sheet transition-transform duration-press ease-stamp active:scale-[.99] motion-reduce:transition-none"
          >
            {won ? t('life.coin.take', { n: String(coin.prize) }) : t('life.coin.next')}
          </button>
        </>
      )}
    </div>
  )
}
