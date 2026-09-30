'use client'

import { useEffect, useState, type CSSProperties, type MouseEvent, type ReactNode } from 'react'

import { firePickFxAt } from '@/components/stage/PickFx'
import { SlideSheet } from '@/components/stage/SlideSheet'

import { useDialog } from '@/components/ui/useDialog'
import type { ArchiveCard } from '@/lib/archive/graph-types'
import { t } from '@/lib/i18n'
import { voiceAction } from '@/lib/voice'
import { ArtifactMark, CardHeadline, CloseMark, Eyebrow, LATIN } from './EntityCard'

/**
 * קופסת הארכיון — "פשוט תחפור" (brief §22 "Archive Box / Dig").
 *
 * The physical interaction is kept exactly: the first tap LIFTS an item off the table
 * (it rises, turns straight and shows one more line); a second tap on the same item
 * OPENS it. Eight things at a time, seeded by the visit and the number of shuffles
 * (rule 24), optionally from one decade — and the decades are the archive's own.
 *
 * Each item is dressed by what it is — a ticket, a clipping, a file, a pennant, a photo
 * strip — in tokens; nothing is a photograph and nothing pretends to be a real ticket
 * (spec §2: `usable_in_app` is false for props).
 */

const SKIN: Record<ArchiveCard['type'], string> = {
  match: 'border-dashed border-ink bg-sheet',
  press: 'border-ink/60 bg-paper',
  person: 'border-ink bg-sheet',
  season: 'border-red bg-sheet',
  kit: 'border-ink bg-paper',
  trophy: 'border-sign bg-sheet',
  moment: 'border-ink bg-sheet',
  object: 'border-sign bg-paper',
  song: 'border-ink/60 bg-sheet',
  fans: 'border-red bg-paper',
  place: 'border-ink bg-paper',
  team: 'border-ink/60 bg-sheet',
}

/**
 * Where the box's FLOOR is in each photograph, as fractions of the image (measured on the
 * shipped files, delta 88): the item grid is laid exactly on it and the walls frame it, so
 * nothing floats over the picture — Maor 24.9.2026, *"החלון הפנימי לא בגודל נוח, המידע שבתוך
 * החלון הפנימי צף"*. The picture is stretched to put the floor under the grid (it is a plain
 * grey box; its walls survive the stretch), never the grid squeezed into the picture.
 */
const FLOOR = {
  phone: { src: '/archive/dig-table-phone.webp', x0: 153 / 900, x1: 747 / 900, y0: 277 / 1200, y1: 924 / 1200 },
  desk: { src: '/archive/dig-table-desktop.webp', x0: 397 / 1600, x1: 1202 / 1600, y0: 116 / 900, y1: 780 / 900 },
} as const

function floorStyle(f: (typeof FLOOR)[keyof typeof FLOOR]): CSSProperties {
  const w = 1 / (f.x1 - f.x0)
  const h = 1 / (f.y1 - f.y0)
  return {
    position: 'absolute',
    width: `${(w * 100).toFixed(2)}%`,
    height: `${(h * 100).toFixed(2)}%`,
    insetInlineStart: `${(-f.x0 * w * 100).toFixed(2)}%`,
    top: `${(-f.y0 * h * 100).toFixed(2)}%`,
    maxWidth: 'none',
  }
}

function usePhone(): boolean {
  const [phone, setPhone] = useState(() => typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches)
  useEffect(() => {
    const q = window.matchMedia('(max-width: 767px)')
    const on = () => setPhone(q.matches)
    on()
    q.addEventListener('change', on)
    return () => q.removeEventListener('change', on)
  }, [])
  return phone
}

export function ArchiveBox({
  items,
  decades,
  decade,
  busy,
  onDecade,
  onShuffle,
  onOpen,
  onSearch,
  onClose,
}: {
  items: ArchiveCard[]
  decades: number[]
  decade: number | null
  busy: boolean
  onDecade: (decade: number | null) => void
  onShuffle: () => void
  onOpen: (id: string) => void
  onSearch: () => void
  onClose: () => void
}) {
  const phone = usePhone()
  const [lifted, setLifted] = useState<string | null>(null)

  function tap(id: string, event: MouseEvent<HTMLButtonElement>) {
    if (lifted !== id) {
      setLifted(id)
      // lifting an item off the floor is a pick — the one print hit the ground shares
      firePickFxAt(event.currentTarget, { tone: 'ink', haptic: 'tap' })
      return
    }
    onOpen(id)
  }

  const label = (d: number) => t('archive.box.decade', { d: d >= 2000 ? String(d) : String(d % 100).padStart(2, '0') })

  const floor = (
    <BoxFloor items={items} lifted={lifted} busy={busy} onTap={tap} variant={phone ? 'phone' : 'desk'} />
  )
  // §21 — the first tap lifts the item and PREVIEWS it (what it is, when); the second opens it
  const preview = items.find((card) => card.id === lifted) ?? null
  const controls = (
    <>
      {preview && (
        <div className="mb-2 flex items-center gap-2 border-rule border-paper bg-paper px-2.5 py-1.5 text-ink" data-archive="preview" aria-live="polite">
          <div className="min-w-0 flex-1">
            <CardHeadline card={preview} className="block truncate font-sign text-[13.5px] leading-tight text-ink" />
            <p className="truncate font-body text-[11px] text-muted">{[preview.subHe, preview.when].filter(Boolean).join(' · ')}</p>
          </div>
          <button
            type="button"
            onClick={() => onOpen(preview.id)}
            className="min-h-tap shrink-0 border-rule border-ink bg-red px-3 font-body text-[13px] font-extrabold text-paper"
          >
            {voiceAction(12, 'open')}
          </button>
        </div>
      )}
      <div className="-mx-gutter flex gap-1.5 overflow-x-auto px-gutter pb-2" role="group" aria-label={t('archive.time.decade')}>
        <button
          type="button"
          onClick={() => onDecade(null)}
          aria-pressed={decade === null}
          className={`min-h-tap shrink-0 border-rule px-3 font-body text-[13px] font-bold ${decade === null ? 'border-red bg-red text-paper' : 'border-concrete/60 text-paper'}`}
        >
          {t('archive.box.all')}
        </button>
        {decades.map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => onDecade(d)}
            aria-pressed={decade === d}
            className={`min-h-tap shrink-0 border-rule px-3 font-body text-[13px] font-bold ${decade === d ? 'border-red bg-red text-paper' : 'border-concrete/60 text-paper'}`}
          >
            {label(d)}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={() => { setLifted(null); onShuffle() }} disabled={busy} className="min-h-tap border-rule border-paper bg-paper font-body text-[14px] font-extrabold text-ink disabled:opacity-60">
          {t('archive.box.shuffle')}
        </button>
        <button type="button" onClick={onSearch} className="min-h-tap border-rule border-concrete font-body text-[14px] font-bold text-paper">
          {t('archive.drawer.deep')}
        </button>
      </div>
    </>
  )

  if (phone) {
    // the phone: the shared slide sheet, the box filling its body, the controls pinned below
    return (
      <SlideSheet open onClose={onClose} title={voiceAction(12, 'dig') ?? ''} latin="OPEN THE ARCHIVE BOX" size="full" tone="ink" footer={controls}>
        <div className="flex h-full min-h-[300px] flex-col">
          <p className="shrink-0 pb-2 font-body text-[12px] leading-snug text-concrete [@media(max-height:700px)]:hidden">{t('archive.box.lede')}</p>
          {floor}
        </div>
      </SlideSheet>
    )
  }
  return <DeskBox onClose={onClose} controls={controls}>{floor}</DeskBox>
}

function DeskBox({ onClose, controls, children }: { onClose: () => void; controls: ReactNode; children: ReactNode }) {
  const ref = useDialog<HTMLDivElement>(onClose)
  return (
    <div
      ref={ref}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label={t('archive.box.aria')}
      className="fixed inset-0 z-[60] flex flex-col bg-ink outline-none"
    >
      <div className="mx-auto flex w-full max-w-5xl items-start justify-between gap-3 border-b-plate border-red px-gutter pb-3 pt-[max(12px,env(safe-area-inset-top))]">
        <div className="min-w-0">
          <p className="font-latin text-[10px] font-bold tracking-[0.24em] text-red" dir="ltr">
            OPEN THE ARCHIVE BOX
          </p>
          <h2 className="font-display text-step-3 leading-tight text-paper">{voiceAction(12, 'dig')}</h2>
          <p className="font-body text-[12.5px] leading-snug text-concrete">{t('archive.box.lede')}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={t('archive.drawer.close')}
          className="flex min-h-tap min-w-tap shrink-0 items-center justify-center border-rule border-concrete font-poster text-[22px] leading-none text-paper"
        >
          <CloseMark className="stroke-paper" />
        </button>
      </div>
      <div className="mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col px-gutter py-4">{children}</div>
      <div className="mx-auto w-full max-w-5xl border-t-rule border-concrete/40 px-gutter pb-[max(10px,env(safe-area-inset-bottom))] pt-2">{controls}</div>
    </div>
  )
}

/**
 * The box itself: the photograph's walls around, the items on its floor in a fixed grid —
 * two by four on a phone, four by two on a desktop — each tile the same size, text on the
 * tile's own paper, never on the picture.
 *
 * השולחן — `public/archive/dig-table-desktop.webp` (1600×900) and `dig-table-phone.webp`
 * (900×1200), generated 21.9.2026 and supplied by the owner (delta 87); both scanned with
 * zero pixels in the yellow band. Their records are in `content/manual/asset-provenance.json`.
 */
function BoxFloor({
  items,
  lifted,
  busy,
  onTap,
  variant,
}: {
  items: ArchiveCard[]
  lifted: string | null
  busy: boolean
  onTap: (id: string, event: MouseEvent<HTMLButtonElement>) => void
  variant: 'phone' | 'desk'
}) {
  const f = FLOOR[variant]
  const phone = variant === 'phone'
  return (
    <div className={`relative min-h-0 flex-1 overflow-hidden bg-ink ${phone ? 'p-[22px] [@media(max-height:700px)]:p-[16px]' : 'mx-auto aspect-[805/664] max-h-full w-full max-w-4xl p-[34px]'}`}>
      <div className="relative h-full w-full">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={f.src} alt="" aria-hidden="true" className="pointer-events-none block select-none" style={floorStyle(f)} />
        {items.length === 0 ? (
          <p className="absolute inset-0 m-auto h-fit max-w-[16rem] border-hair border-ink/40 bg-sheet px-3 py-3 text-center font-body text-[13px] text-ink">{t('archive.box.empty')}</p>
        ) : (
          <ul className={`absolute inset-0 grid gap-2 p-2 ${phone ? 'grid-cols-2 grid-rows-4 [@media(max-height:700px)]:gap-1.5 [@media(max-height:700px)]:p-1' : 'grid-cols-4 grid-rows-2 gap-3 p-3'}`} aria-busy={busy}>
            {items.slice(0, 8).map((card, index) => {
              const up = lifted === card.id
              return (
                <li key={card.id} className="min-h-0">
                  <button
                    type="button"
                    onClick={(event) => onTap(card.id, event)}
                    aria-pressed={up}
                    aria-describedby={up ? `lift-${index}` : undefined}
                    className={`grid h-full w-full grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden border-rule text-start ${phone ? 'p-1.5' : 'p-2'} transition-transform duration-stamp ease-stamp motion-reduce:transition-none ${SKIN[card.type]} ${
                      up ? '-translate-y-1.5 scale-[1.03] outline outline-4 outline-red' : ''
                    }`}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate font-latin text-[8.5px] font-bold tracking-[0.2em] text-sign" dir="ltr">
                        {LATIN[card.type]}
                      </span>
                      <ArtifactMark card={card} className={`${phone ? 'h-5 w-5' : 'h-8 w-8'} shrink-0`} />
                    </span>
                    <span className="flex min-h-0 items-center overflow-hidden">
                      <CardHeadline card={card} className={`font-sign leading-[1.15] text-ink ${phone ? 'text-[12px]' : 'text-[14px]'}`} />
                    </span>
                    {up ? (
                      <span id={`lift-${index}`} className="block truncate border-t-hair border-ink/30 pt-0.5 font-body text-[11px] font-bold leading-snug text-red">
                        {t('archive.box.lifted')}
                      </span>
                    ) : (
                      <Eyebrow card={card} className="truncate pt-0.5 !text-[10.5px]" />
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
