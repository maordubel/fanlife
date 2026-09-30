'use client'

import { useEffect, useState } from 'react'

import { Chip, SheetHead } from '@/components/life/Plate'
import { useDialog } from '@/components/ui/useDialog'
import { t } from '@/lib/i18n'
import { characterName } from '@/lib/life/characters'
import {
  SETS,
  SET_ORDER,
  albumTotals,
  duplicates,
  hasSticker,
  haveOf,
  holderOf,
  isAce,
  isTorn,
  missingOn,
  newSetsIn,
  stickersIn,
  type StickerDef,
  type StickerSet,
  type StickerSetId,
} from '@/lib/life/stickers'
import type { LifeState } from '@/lib/life/types'
import { SourceNote } from '@/components/ui/SourceNote'

/**
 * האלבום — twenty-two rectangles, six of which are photographs.
 *
 * The object this draws is specific and it is not a card collection screen. It is a
 * 1980s Israeli sticker album: a printed page of empty frames with the names already
 * under them, and the ones you have stuck on top, crooked, with the corner lifting. So
 * the empty slot is the DESIGN and not the absence of it — a page of dashed rectangles
 * with eleven names under them is what a boy actually looked at for a whole summer, and
 * flattening that into a grey grid of question marks would be drawing a different object.
 *
 * Three things this sheet will not do:
 * · **It never draws a face, and since 17.9.2026 it never prints a nameplate instead of
 *   one either.** A slot is a photograph or it is not on the page. Thirteen printed
 *   frames on the 1985/86 page read as thirteen images that had failed to load, and
 *   the owner's call was to take them off. `withScans` in `lib/life/stickers.ts` is
 *   where that happens; nothing in this file can show a sticker without a scan,
 *   because `StickerDef.scan` is required (rule 11 still holds: no drawn footballer).
 * · **It never captions a scan with a meaning.** `sourceHe` says where the paper came
 *   from and stops. The one exception is `handHe`, which is Maor's OWN sentence off his
 *   OWN album, drawn as what it is — tape stuck under the sticker with a line on it.
 * · **It never says how rare something is.** No stars, no percentage, no "1 in 40". A
 *   child does not know the odds; he knows nobody in his class has Landau.
 */
export function AlbumSheet({
  state,
  onTear,
  onClose,
}: {
  state: LifeState
  onTear: (id: string, nameHe: string) => void
  onClose: () => void
}) {
  const first = SET_ORDER.find((id) => stickersIn(id).some((sticker) => hasSticker(state, sticker.id))) ?? '8586'
  const [page, setPage] = useState<StickerSetId>(first)
  const [open, setOpen] = useState<StickerDef | null>(null)
  const set = SETS[page]
  const slots = stickersIn(page)
  const totals = albumTotals(state)
  const spare = duplicates(state)
  /*
   * מי מחזיק את מה שחסר — the whole point of the feature, said out loud.
   *
   * The rule is that the card you are missing is with whoever you have treated worst
   * (`holderOf`), and a rule the player cannot see is not a rule, it is a coincidence. So
   * the page names the child who has the next hole on it — only once you have a spare to
   * offer him, because before that the information is just a taunt.
   */
  const wanted = missingOn(state, page)
  const holder = spare.length > 0 && wanted ? holderOf(state, wanted.id) : null
  /* which pages landed on a counter this chapter — read from the save's own chapter, so
     the album answers the same question the shop's counter does and cannot disagree */
  const fresh = new Set(newSetsIn(state.chapter).map((one) => one.id))

  /**
   * Escape puts down whatever is in your hand: a held-up sticker first, the album after.
   * Two objects, one key, in the order somebody actually holds them — the same rule the
   * booklet reader follows. `useDialog` is what actually listens for the key; this file
   * only decides, on every render, which of the two objects Escape should put down —
   * so the callback below is intentionally re-read on every close, not fixed at mount.
   */
  const dialogRef = useDialog<HTMLDivElement>(open ? () => setOpen(null) : onClose)

  /* nine pages do not fit across a phone, so the tab of the page you are on brings itself
     into view rather than leaving you to find it by dragging */
  useEffect(() => {
    const tab = document.querySelector<HTMLElement>('[data-life="album-tab"][data-on="1"]')
    tab?.scrollIntoView({ block: 'nearest', inline: 'center' })
  }, [page])

  return (
    <div
      ref={dialogRef}
      tabIndex={-1}
      dir="rtl"
      role="dialog"
      aria-modal="true"
      aria-label={t('life.album.title')}
      data-life="album"
      data-page={page}
      className="pointer-events-auto absolute inset-0 z-[60] flex flex-col bg-paper outline-none"
    >
      {/* the same header every sheet in this game has: a sign plate on its arm, ✕ at the end */}
      <SheetHead
        title={t('life.album.title')}
        kicker={`${totals.have}/${totals.total}`}
        onClose={onClose}
        closeLabel={t('life.album.close')}
      />

      {/* the pages, as the tabs down the side of a real album's contents */}
      <div className="flex shrink-0 gap-1.5 overflow-x-auto border-b-rule border-ink bg-paper px-2.5 pb-1.5">
        {SET_ORDER.map((id) => {
          const on = id === page
          const held = stickersIn(id).filter((sticker) => hasSticker(state, sticker.id)).length
          return (
            <Chip
              key={id}
              live={on}
              onClick={() => {
                setPage(id)
                setOpen(null)
              }}
              data-life="album-tab"
              data-on={on ? '1' : '0'}
              data-new={fresh.has(id) ? '1' : '0'}
              className="shrink-0"
            >
              <span dir="ltr">{SETS[id].shortHe}</span>
              <span className="font-mono text-[10px] tabular-nums opacity-75">
                {t('life.album.page', { have: String(held), total: String(stickersIn(id).length) })}
              </span>
              {/*
               * עונה חדשה — the page that reached a counter in THIS chapter, marked where
               * a collector would actually look for it.
               *
               * `StickerSet` had no arrival date until 16.9.2026, so this tab could never
               * have been drawn: every eighties page was equally "current" in every
               * eighties chapter. `newSetsIn` is the twin of the shirts' `arrivedBetween`,
               * and the mark is on the TAB rather than in a card because a card is seen
               * once and a boy who was somewhere else that minute still has to be able to
               * find out which album is the new one.
               */}
              {fresh.has(id) && (
                <span
                  className={`border-hair px-1 font-sign text-[9px] leading-tight ${
                    on ? 'border-sheet/60 text-sheet' : 'border-red text-red'
                  }`}
                >
                  {t('life.album.new')}
                </span>
              )}
            </Chip>
          )
        })}
      </div>

      <div className="paper min-h-0 flex-1 overflow-y-auto px-3 pt-2.5 pb-[max(16px,env(safe-area-inset-bottom))]">
        {set.posterArt && (
          <figure className="mb-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={set.posterArt} alt={set.titleHe} className="w-full object-contain shadow-lamp" />
            {set.posterSourceHe && (
              <figcaption className="pt-1 text-center font-body text-[10px] leading-snug text-muted">
                <bdi>{set.posterSourceHe}</bdi>
              </figcaption>
            )}
          </figure>
        )}

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {slots.map((sticker) => (
            <Slot
              key={sticker.id}
              sticker={sticker}
              have={haveOf(state, sticker.id)}
              torn={isTorn(state, sticker.id)}
              frame={set.frame}
              onOpen={() => setOpen(sticker)}
            />
          ))}
        </div>

        {spare.length > 0 && (
          <div className="mt-4 border-t-hair border-ink/30 pt-2" data-life="album-spares">
            <p className="font-sign text-[12px] text-ink">{t('life.album.spares', { n: String(spare.length) })}</p>
            <p className="pt-0.5 font-body text-[11px] leading-snug text-muted">
              {spare.map((one) => one.nameHe).join(' · ')}
            </p>
            <p className="pt-1 font-body text-[11px] leading-snug text-muted">
              {holder && wanted
                ? t('life.album.holder', { name: characterName(holder), card: wanted.nameHe })
                : t('life.album.trade')}
            </p>
          </div>
        )}
      </div>

      {open && (
        <button
          type="button"
          aria-label={t('life.album.close')}
          data-life="album-held"
          onClick={() => setOpen(null)}
          className="min-h-tap absolute inset-0 z-10 flex cursor-default flex-col items-center justify-center bg-ink/95 px-5"
        >
          {isAce(open) && (
            <span aria-hidden className="ace-burst pointer-events-none absolute inset-0" />
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={open.scan}
            alt={open.nameHe}
            className={`sticker sticker-held max-h-[62vh] max-w-full object-contain ${isAce(open) ? 'sticker-ace' : ''}`}
          />
          {isAce(open) && (
            <span className="mt-2 bg-red px-3 py-1 font-poster text-[13px] uppercase tracking-[0.2em] text-sheet">
              {t('life.album.ace')}
            </span>
          )}
          {open.handHe && (
            <span className="mt-2 max-w-[26rem] bg-red px-3 py-1.5 text-center font-body text-[13px] leading-snug text-sheet">
              <bdi>{open.handHe}</bdi>
            </span>
          )}
          {/* where the paper came from is on /credits (spec §0.3, 22.9.2026) */}
          {open.sourceHe !== '' && (
            <p className="pt-2 text-center">
              <SourceNote newTab tone="dark" group="assets" />
            </p>
          )}
          {open.defector && hasSticker(state, open.id) && (
            <span className="flex flex-col items-center gap-1.5 pt-3">
              <span className="max-w-[24rem] text-center font-body text-[12px] leading-snug text-sheet">
                {t('life.album.defector')}
              </span>
              <span className="flex gap-2">
                <span
                  role="button"
                  tabIndex={0}
                  data-life="album-keep"
                  onClick={(event) => {
                    event.stopPropagation()
                    setOpen(null)
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') setOpen(null)
                  }}
                  className="min-h-tap flex items-center border-rule border-sheet px-3 py-1 font-sign text-[13px] text-sheet"
                >
                  {t('life.album.keep')}
                </span>
                <span
                  role="button"
                  tabIndex={0}
                  data-life="album-tear"
                  onClick={(event) => {
                    event.stopPropagation()
                    onTear(open.id, open.nameHe)
                    setOpen(null)
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      onTear(open.id, open.nameHe)
                      setOpen(null)
                    }
                  }}
                  className="min-h-tap flex items-center bg-red px-3 py-1 font-sign text-[13px] text-sheet"
                >
                  {t('life.album.tear')}
                </span>
              </span>
            </span>
          )}
        </button>
      )}
    </div>
  )
}

/**
 * הזווית — how crooked this one went in, decided once and never again.
 *
 * Nobody has ever stuck a sticker in straight, and a page of perfectly aligned rectangles
 * is a spreadsheet. The angle comes off the sticker's own id so it survives every
 * re-render and every reload: the same sticker is always crooked the same way, which is
 * what makes it read as a thing somebody stuck down rather than an animation.
 */
function tiltOf(id: string): string {
  let hash = 0
  for (let i = 0; i < id.length; i += 1) hash = (hash * 31 + id.charCodeAt(i)) % 1000
  return `${(hash % 9) / 2 - 2}deg`
}

/** one rectangle on the page: a lit card on its slot, or the printed slot on its own */
function Slot({
  sticker,
  have,
  torn,
  frame,
  onOpen,
}: {
  sticker: StickerDef
  have: number
  torn: boolean
  frame: StickerSet['frame']
  onOpen: () => void
}) {
  /*
   * קרוע — an empty slot with a decision in it.
   *
   * A slot nobody filled and a slot somebody emptied must not look the same. The X is
   * drawn across the whole frame in the album's own red, big enough to read at a glance
   * from the top of the page, because that is the point of tearing a card out.
   */
  if (torn) {
    return (
      <div
        data-life="album-slot"
        data-have="0"
        data-torn="1"
        className="slot-torn relative flex aspect-[3/4] flex-col items-center justify-end border-hair border-dashed border-red/50 bg-sheet/40 p-1.5"
      >
        <span className="text-center font-body text-[11px] leading-tight text-red/80 line-through">
          <bdi>{sticker.nameHe}</bdi>
        </span>
      </div>
    )
  }
  if (have === 0) {
    return (
      <div
        data-life="album-slot"
        data-have="0"
        className="slot-marks relative flex aspect-[3/4] flex-col items-center justify-end border-hair border-dashed border-ink/35 bg-sheet/40 p-1.5"
      >
        <span className="absolute start-1.5 top-1 font-mono text-[10px] tabular-nums text-muted/60">
          {sticker.printedN ?? sticker.slot}
        </span>
        <span className="text-center font-body text-[11px] leading-tight text-muted">
          <bdi>{sticker.nameHe}</bdi>
        </span>
      </div>
    )
  }
  return (
    <button
      type="button"
      onClick={onOpen}
      data-life="album-slot"
      data-have={String(have)}
      className="min-h-tap slot-marks relative flex aspect-[3/4] w-full items-center justify-center p-[6%]"
    >
      {/* the bloom lives on the OUTER span: `overflow-hidden` on the same element clips
          its own ::before, which is how the first pass shipped a halo nobody could see */}
      <span
        className={`sticker block h-full w-full ${isAce(sticker) ? 'sticker-ace' : ''}`}
        style={{ ['--tilt' as string]: tiltOf(sticker.id) }}
      >
        <span className="relative block h-full w-full overflow-hidden bg-sheet/0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={sticker.scan}
            alt={sticker.nameHe}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-contain"
          />
        </span>
      </span>
      {have > 1 && (
        <span className="absolute end-0 top-0 z-[2] bg-ink px-1 font-mono text-[10px] tabular-nums text-sheet">
          ×{have}
        </span>
      )}
    </button>
  )
}

