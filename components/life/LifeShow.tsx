'use client'

import { useMemo, useState } from 'react'

import { Marks, Shelf, Tag, Thing } from '@/components/life/BagShelf'
import { ShareSheet } from '@/components/life/ShareSheet'
import { useDialog } from '@/components/ui/useDialog'
import { t, type MessageKey } from '@/lib/i18n'
import {
  SHOW_ITEMS,
  SHOW_MEMORIES,
  phrasingsFor,
  showEvents,
  type ShowMemoryPick,
} from '@/lib/life/achievements'
import { presenceReading, redBoxReading } from '@/lib/life/profile'
import { cardForMoment, type ShareCard } from '@/lib/life/share'
import type { LifeEvent } from '@/lib/life/events'
import type { LifeState } from '@/lib/life/types'

/**
 * שואו אישי בסיום תקופה — three things, two days, and one sentence he picked.
 *
 * The spec asks for a show rather than a summary, and the difference is who chooses:
 *
 *   > השחקן בוחר שלושה פריטים, שני זיכרונות ותיאור קצר מתוך ניסוחים שהמצב מאפשר […]
 *   > בכרטיס מוצגים רק פרטים שהשחקן בחר. אין אחוז הצלחה בחיים ואין דירוג מול אנשים אחרים.
 *
 * So this is `ProfileCard`'s sibling and not its cousin: the same printed sheet on ink,
 * the same `BagShelf` objects, the same refusal. Rule 46 keeps that card free of numbers
 * and 63א restated why — *"הגיליון עונה 'כמה', הכרטיס עונה 'מי אתה'"* — and a show is
 * even further along that line, because it is the one screen where the player is the
 * author. **Nothing on it is counted.** The three slots are three marks, not "0/3"; a
 * fourth pick replaces the oldest rather than being refused with a number; there is no
 * completion, no percentage and no comparison with anybody.
 *
 * **The line is generated, never typed.** `phrasingsFor` builds the available sentences
 * out of what the save holds — a presence of `radio` becomes *"את הגביע הזה שמעתי
 * מהסלון"*, a shared ticket becomes *"הכרטיס שלי הגיע לאופיר"* — which is how a personal
 * caption stays something the game can stand behind (rule 11 applied to the player's own
 * claims). A day he missed can say *"סיפרו לי"*; it can never say *"הייתי שם"*.
 *
 * **Sharing is an exit, not a reward.** The spec: *"אפשר ליצור תמונת שיתוף, אבל אין פרס
 * על לחיצה שתף ואין שליחה אוטומטית לאחרים."* The show is complete the moment it is put
 * together; the picture is a door next to it, drawn by the share system that already
 * exists, from the player's own sentence — so `tests/life-share.test.ts` holds it to the
 * same privacy rules as every other card, unchanged.
 */

/** כלל 32 — a runtime-built key, checked by `tests/life-achievements.test.ts` instead. */
const show = (name: string) => t(`life.show.${name}` as MessageKey)

/** pick, or un-pick; a full set drops its oldest so a choice is never refused by a limit */
function toggle(list: string[], id: string, max: number): string[] {
  if (list.includes(id)) return list.filter((entry) => entry !== id)
  const next = [...list, id]
  return next.length > max ? next.slice(next.length - max) : next
}

export function LifeShow({
  state,
  onPublish,
  onClose,
}: {
  state: LifeState
  /**
   * The events the show writes. It is a callback rather than an engine reference for the
   * same reason every other screen in this folder takes one: `lib/life/` owns the life and
   * a component owns pixels, so the shell dispatches and this file never imports a store.
   */
  onPublish: (events: LifeEvent[]) => void
  onClose: () => void
}) {
  const dialogRef = useDialog<HTMLDivElement>(onClose)

  const keepsakes = useMemo(() => redBoxReading(state), [state])
  const days = useMemo(() => presenceReading(state), [state])

  const [items, setItems] = useState<string[]>([])
  const [memories, setMemories] = useState<string[]>([])
  const [lineHe, setLineHe] = useState<string | null>(null)
  const [card, setCard] = useState<ShareCard | null>(null)

  const chosenItems = keepsakes.filter((row) => items.includes(row.id))
  const chosenDays: ShowMemoryPick[] = days
    .filter((row) => memories.includes(row.anchorId))
    .map((row) => ({ id: row.anchorId, titleHe: row.titleHe, mode: row.mode, wasThere: row.wasThere }))

  const phrasings = useMemo(
    () => phrasingsFor(state, { items: chosenItems, memories: chosenDays }),
    // the picks are what change; the state behind them is the same object for a whole sheet
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state, items.join(','), memories.join(',')],
  )

  const ready = items.length >= SHOW_ITEMS && memories.length >= SHOW_MEMORIES && lineHe !== null

  function publish() {
    if (!ready || lineHe === null) return
    onPublish(showEvents({ items, memories, lineHe }))
  }

  return (
    <div
      ref={dialogRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label={show('title')}
      className="pointer-events-auto absolute inset-0 z-[60] flex items-stretch justify-center bg-ink/90 p-gutter outline-none"
      data-life="life-show"
    >
      <div className="max-h-full w-full max-w-md overflow-y-auto border-rule border-sheet bg-ink">
        <div className="flex items-start justify-between gap-3 px-5 pt-5">
          <div>
            <div className="h-[6px] w-14 bg-red" aria-hidden="true" />
            <h2 className="mt-3 font-display text-step-2 leading-none text-sheet">
              <bdi>{show('title')}</bdi>
            </h2>
            <p className="mt-1.5 font-body text-[11px] leading-snug text-concrete">
              <bdi>{show('lede')}</bdi>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex min-h-tap items-center border-hair border-concrete/50 px-3 font-body text-[11px] text-sheet transition-colors duration-press active:bg-red motion-reduce:transition-none"
          >
            {show('close')}
          </button>
        </div>

        <div className="space-y-4 px-5 pb-6 pt-4">
          {/* שלושה פריטים */}
          <Shelf titleHe={show('items')} noteHe={show('itemsNote')}>
            <div className="mb-3">
              <Marks n={items.length} />
            </div>
            {keepsakes.length === 0 ? (
              <p className="font-body text-[12px] leading-snug text-concrete">
                <bdi>{show('itemsEmpty')}</bdi>
              </p>
            ) : (
              <ul className="space-y-2">
                {keepsakes.map((row) => {
                  const on = items.includes(row.id)
                  return (
                    <li key={row.id}>
                      <button
                        type="button"
                        aria-pressed={on}
                        onClick={() => setItems((list) => toggle(list, row.id, SHOW_ITEMS))}
                        className={`block w-full min-h-tap border-hair p-2 text-start transition-colors duration-press motion-reduce:transition-none ${
                          on ? 'border-red bg-red/15' : 'border-concrete/35'
                        }`}
                      >
                        <Thing
                          art={row.art}
                          nameHe={row.titleHe}
                          noteHe={row.noteHe}
                          standout={row.standout}
                          tags={row.standout ? <Tag tone="red">{row.rarityHe}</Tag> : null}
                        />
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </Shelf>

          {/* שני זיכרונות */}
          <Shelf titleHe={show('memories')} noteHe={show('memoriesNote')}>
            <div className="mb-3">
              <Marks n={memories.length} />
            </div>
            {days.length === 0 ? (
              <p className="font-body text-[12px] leading-snug text-concrete">
                <bdi>{show('memoriesEmpty')}</bdi>
              </p>
            ) : (
              <ul className="space-y-2">
                {days.map((row) => {
                  const on = memories.includes(row.anchorId)
                  return (
                    <li key={row.anchorId}>
                      <button
                        type="button"
                        aria-pressed={on}
                        onClick={() => setMemories((list) => toggle(list, row.anchorId, SHOW_MEMORIES))}
                        className={`flex w-full min-h-tap flex-col justify-center gap-1 border-hair px-3 py-2 text-start transition-colors duration-press motion-reduce:transition-none ${
                          on ? 'border-red bg-red/15' : 'border-concrete/35'
                        }`}
                      >
                        <span className="font-display text-[14px] leading-none text-sheet">
                          <bdi>{row.titleHe}</bdi>
                        </span>
                        <span className="font-body text-[11px] leading-none text-concrete">
                          <bdi>
                            {row.dateHe}
                            {row.modeHe ? ` · ${row.modeHe}` : ''}
                          </bdi>
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </Shelf>

          {/* משפט אחד, מתוך מה שהמצב מאפשר */}
          <Shelf titleHe={show('line')} noteHe={show('lineNote')}>
            {phrasings.length === 0 ? (
              <p className="font-body text-[12px] leading-snug text-concrete">
                <bdi>{show('lineEmpty')}</bdi>
              </p>
            ) : (
              <ul className="space-y-2">
                {phrasings.map((phrase) => {
                  const on = lineHe === phrase
                  return (
                    <li key={phrase}>
                      <button
                        type="button"
                        aria-pressed={on}
                        onClick={() => setLineHe(on ? null : phrase)}
                        className={`block w-full min-h-tap border-hair px-3 py-2 text-start font-body text-[12px] leading-snug transition-colors duration-press motion-reduce:transition-none ${
                          on ? 'border-red bg-red/15 text-sheet' : 'border-concrete/35 text-concrete'
                        }`}
                      >
                        <bdi>{phrase}</bdi>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </Shelf>

          <div className="flex flex-wrap items-center gap-2 border-t-hair border-concrete/25 pt-4">
            <button
              type="button"
              onClick={publish}
              disabled={!ready}
              data-life="show-publish"
              className="flex min-h-tap items-center border-hair border-sheet px-4 font-body text-[12px] text-sheet transition-colors duration-press active:bg-red disabled:border-concrete/35 disabled:text-concrete/60 motion-reduce:transition-none"
            >
              {show('publish')}
            </button>
            {/*
              הדלת החוצה, ולא פרס. The picture is drawn from HIS sentence by the share
              system that already exists, so nothing here invents a card shape and
              `tests/life-share.test.ts` keeps governing what may be on one.
            */}
            <button
              type="button"
              onClick={() => lineHe && setCard(cardForMoment(state, 'show', lineHe))}
              disabled={lineHe === null}
              className="flex min-h-tap items-center border-hair border-concrete/50 px-4 font-body text-[12px] text-concrete transition-colors duration-press active:bg-red active:text-sheet disabled:opacity-50 motion-reduce:transition-none"
            >
              {show('take')}
            </button>
          </div>
          <p className="font-body text-[11px] leading-snug text-concrete/80">
            <bdi>{show('noReward')}</bdi>
          </p>
        </div>
      </div>

      {card && <ShareSheet card={card} onClose={() => setCard(null)} />}
    </div>
  )
}
