'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

import { Plate } from '@/components/life/Plate'
import { firePickFxAt } from '@/components/stage/PickFx'
import { t } from '@/lib/i18n'
import { SETS, isAce, stickerFor, type StickerDef } from '@/lib/life/stickers'

/**
 * המעטפה — the four seconds that are the whole reason anybody buys one.
 *
 * A packet is not a reward screen. It is a small paper envelope that you tear along the
 * top, and the thing that makes it worth a shekel is that for one second you do not know.
 * So this card has exactly two states — SHUT and TORN — and the shut one is the point:
 * it sits there, closed, with the year printed on it, until a thumb touches it.
 *
 * Then the three come out ONE AT A TIME, four hundred milliseconds apart, and each one
 * says only whether it is new. `כבר יש` on a duplicate rather than a red cross, because a
 * duplicate is not a failure — it is the currency you go and trade with, and the game
 * should not teach the player to be sad about the thing it wants them to use.
 *
 * 7.9.2026, on Maor's note: the tear is now animated rather than instant. The envelope
 * shakes once, splits along its top and falls away, and each card turns face-up out of
 * the gap — three hundred milliseconds of paper before any information arrives. And the
 * same component does the RED BOX (`fromBox`): one card, twice the size, held on the
 * screen with a star behind it, because a card you were given for finishing an album
 * should not arrive the way the fourth Eli Cohen of the afternoon does.
 *
 * Delta 90 (§21): the card is PRESENTATION ONLY. By the time it mounts, the money is gone
 * and the stickers are stuck in (`purchasePacket` in `stickers.ts`, one dispatch), so every
 * way out of it is safe — Escape mid-tear, a reload (the reveal replays from the pending
 * mark), a remount (the same ids, never a second grant). It ends in TWO doors: `לאלבום`,
 * and `סגור` straight back to the room the player was standing in.
 */
export function PacketCard({
  ids,
  before,
  fromBox = false,
  onClose,
}: {
  /** what came out, in the order it comes out */
  ids: readonly string[]
  /** how many of each one was already stuck in, BEFORE this packet — so `חדש` is true */
  before: Readonly<Record<string, number>>
  /** out of the red box rather than out of a packet: no envelope, one card, held */
  fromBox?: boolean
  /** `album` — open the album on the page; `room` — back to the same room */
  onClose: (to: 'album' | 'room') => void
}) {
  const [torn, setTorn] = useState(fromBox)
  const [tearing, setTearing] = useState(false)
  const [shown, setShown] = useState(0)
  // keyed on the ids, not the array: a parent that re-renders every clock tick must not
  // restart the reveal's timer every tick (the cards would never come out)
  const key = ids.join(',')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const cards = useMemo(() => ids.map((id) => stickerFor(id)).filter((one): one is StickerDef => one !== null), [key])
  const set = cards[0] ? SETS[cards[0].set] : null
  // new = not in the album before AND the first of its kind in this envelope: the same face
  // twice in one packet is one new card and one to trade, never two "חדש"
  const freshAt = (index: number) => {
    const sticker = cards[index]
    if (!sticker) return false
    return (before[sticker.id] ?? 0) === 0 && cards.findIndex((one) => one.id === sticker.id) === index
  }

  /* the envelope has to actually come apart before anything is behind it */
  useEffect(() => {
    if (!tearing) return
    const timer = window.setTimeout(() => setTorn(true), 520)
    return () => window.clearTimeout(timer)
  }, [tearing])

  useEffect(() => {
    if (!torn || shown >= cards.length) return
    // an ace is held a beat longer than a packet card, on the way in as well as out
    const wait = cards[shown] && isAce(cards[shown] as StickerDef) ? 760 : 420
    const timer = window.setTimeout(() => setShown((n) => n + 1), wait)
    return () => window.clearTimeout(timer)
  }, [torn, shown, cards])

  const done = torn && shown >= cards.length
  const big = fromBox || cards.some((card) => isAce(card))
  const grid = useRef<HTMLDivElement>(null)

  /* each card out of the gap is a hit — new ones in red, a duplicate quietly in ink */
  useEffect(() => {
    if (!torn || shown === 0) return
    const card = grid.current?.children[shown - 1]
    const sticker = cards[shown - 1]
    if (!card || !sticker) return
    const fresh = freshAt(shown - 1)
    firePickFxAt(card, { tone: fresh ? 'red' : 'ink', big: isAce(sticker) || fromBox, haptic: fresh ? 'lock' : 'tap' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [torn, shown])

  /* Escape is always safe — the transaction was settled before this card existed */
  const close = useRef(onClose)
  close.current = onClose
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close.current('room')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div
      dir="rtl"
      role="dialog"
      aria-modal="true"
      aria-label={t('life.packet.name')}
      data-life="packet"
      data-torn={torn ? '1' : '0'}
      className="pointer-events-auto absolute inset-0 z-[62] flex flex-col items-center justify-center bg-ink/95 px-5"
    >
      {!torn ? (
        <button
          type="button"
          onClick={() => setTearing(true)}
          disabled={tearing}
          data-life="packet-open"
          className="min-h-tap"
        >
          <Plate
            tone="red"
            className={`flex aspect-[3/4] w-[62vw] max-w-[15rem] items-center justify-center shadow-lamp sm:w-[18rem] ${
              tearing ? 'packet-tearing' : ''
            }`}
          >
            <span className="flex flex-col items-center px-3 py-6">
              <span className="font-poster text-[34px] leading-none tracking-[0.04em]">{t('life.packet.name')}</span>
              <span className="pt-2 font-sign text-[13px] opacity-90">{set?.seasonHe ?? ''}</span>
              <span className="pt-6 font-body text-[12px] opacity-80">{t('life.packet.open')}</span>
            </span>
          </Plate>
        </button>
      ) : (
        <div className={`flex w-full flex-col items-center ${big ? 'max-w-[22rem]' : 'max-w-[26rem]'}`}>
          {big && (
            <span aria-hidden className="ace-burst pointer-events-none absolute inset-0" />
          )}
          <div ref={grid} className={`grid w-full gap-2 ${big ? 'mx-auto max-w-[15rem] grid-cols-1' : 'grid-cols-3'}`}>
            {cards.map((sticker, index) => {
              const isNew = freshAt(index)
              const out = index < shown
              return (
                <div
                  key={`${sticker.id}-${index}`}
                  data-life="packet-card"
                  data-new={isNew ? '1' : '0'}
                  className={`sticker flex aspect-[3/4] flex-col overflow-hidden bg-sheet ${
                    isAce(sticker) ? 'sticker-ace' : ''
                  } ${out ? 'packet-turn opacity-100' : 'opacity-0'}`}
                  /* a card held up on its own is held straight; a packet fans */
                  style={{ ['--tilt' as string]: big ? '0deg' : `${(index - 1) * 1.6}deg` }}
                >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={sticker.scan} alt={sticker.nameHe} className="h-full w-full object-contain" />
                </div>
              )
            })}
          </div>

          <div className={`grid w-full gap-2 pt-1 ${big ? 'mx-auto max-w-[15rem] grid-cols-1' : 'grid-cols-3'}`}>
            {cards.map((sticker, index) => (
              <span
                key={`${sticker.id}-label-${index}`}
                data-life="packet-label"
                data-new={freshAt(index) ? '1' : '0'}
                className={`mx-auto px-2 py-0.5 text-center font-sign text-[11px] tracking-[0.14em] transition-transform duration-200 motion-reduce:transition-none ${
                  index < shown ? 'scale-100' : 'scale-0'
                } ${freshAt(index) || isAce(sticker) ? 'bg-red text-sheet' : 'border-hair border-concrete/70 text-concrete'}`}
              >
                {isAce(sticker) ? t('life.packet.ace') : t(freshAt(index) ? 'life.packet.new' : 'life.packet.dup')}
              </span>
            ))}
          </div>

          <div
            className={`mt-5 flex w-full justify-center gap-2 transition-opacity duration-200 motion-reduce:transition-none ${
              done ? 'opacity-100' : 'pointer-events-none opacity-0'
            }`}
          >
            <button
              type="button"
              onClick={() => onClose('album')}
              data-life="packet-close"
              className="min-h-tap border-rule border-sheet bg-red px-6 font-sign text-[14px] text-sheet active:bg-sign"
            >
              {fromBox ? t('life.packet.fromBox') : t('life.packet.toAlbum')}
            </button>
            {!fromBox && (
              <button
                type="button"
                onClick={() => onClose('room')}
                data-life="packet-back"
                className="min-h-tap border-rule border-sheet px-6 font-sign text-[14px] text-sheet active:bg-red"
              >
                {t('life90b.packet.back')}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
