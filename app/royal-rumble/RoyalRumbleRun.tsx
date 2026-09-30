'use client'

import { GateLogo } from '@/components/gates/GateLogo'
import { useEffect, useMemo, useState, type MouseEvent } from 'react'

import { RecordRun } from '@/components/play/RecordRun'
import { FitBox } from '@/components/stage/FitBox'
import { firePickFx, firePickFxAt } from '@/components/stage/PickFx'
import { SlideSheet } from '@/components/stage/SlideSheet'
import type {
  RoyalRumbleDraft,
  RoyalRumbleOffer,
  RoyalRumblePitchPlayer,
  RoyalRumblePublicPlayer,
  RoyalRumbleResult,
} from '@/lib/game/royal-rumble'
import {
  canPickRoyalRumbleOffer,
  countPicked,
  formationShape,
  lineupCost,
  resolvePublicFormation,
  slotLabel,
  toSelection,
  type Position,
  type RoyalRumbleFormation,
  type RoyalRumbleHistoryItem,
  type RoyalRumblePick,
  type RoyalRumbleSelection,
  type RoyalRumbleSlotRule,
} from '@/lib/game/royal-rumble-public'
import type { KitSpec } from '@/lib/kit/spec'
import type { Embedded } from '@/lib/mechanics/types'
import { t } from '@/lib/royal-rumble/i18n'
import { ExitNext } from '@/components/result/UniversalExit'
import { CompareCard } from '@/components/share/CompareCard'
import { RoyalRumbleChallenge } from './RoyalRumbleChallenge'
import { track } from '@/lib/analytics/meter'
import type { NextAction } from '@/lib/results/types'
import { voice, voiceAction, type ResultTier } from '@/lib/voice'
import { nextAfterRumble, submitRoyalRumble } from './actions'
import { RoyalRumbleSlotReveal } from './RoyalRumbleSlotReveal'
import { RumbleLooks, RumbleShirt } from './RumbleShirt'
import type { Wardrobe } from '@/lib/kit/playerShirt'

type Phase = 'draft' | 'reveal' | 'match' | 'result'
type EraKit = { seasonLabel: string; spec: KitSpec }

const POSITION_SHORT: Record<Position, string> = {
  GK: 'GK',
  DF: 'DEF',
  MF: 'MID',
  FW: 'ATT',
}

export function positionHe(position: Position): string {
  if (position === 'GK') return t('goalkeeper')
  if (position === 'DF') return t('defence')
  if (position === 'MF') return t('midfield')
  return t('attack')
}

/** what the rail and the header call a slot */
export function slotShort(rule: RoyalRumbleSlotRule): string {
  return POSITION_SHORT[slotLabel(rule)]
}

/** the budget's crown (comps, 29.9.2026) — drawn, one ink, no colour of its own */
function Crown({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 22" className={className} aria-hidden="true" focusable="false">
      <path d="M2 6l7 6 7-10 7 10 7-6-3 15H5z" fill="currentColor" />
      <rect x="5" y="19" width="22" height="2" fill="currentColor" />
    </svg>
  )
}

function money(value: number): string {
  return `€${value}M`
}

function yearRange(player: RoyalRumblePublicPlayer): string {
  if (player.fromYear === null && player.toYear === null) return t('activeYears')
  if (player.fromYear === player.toYear) return String(player.fromYear ?? '—')
  return `${player.fromYear ?? '—'}–${player.toYear ?? '—'}`
}

function formationHe(formation: RoyalRumbleFormation): string {
  return formation === 'defensive' ? t('formationDefensive') : t('formationCreative')
}

/* ---------------------------------------------------------------- the recent five (§54) */

const HISTORY_KEY = 'the-worker:royal-rumble:recent:v2'
const HISTORY_MAX = 8

function readHistory(): RoyalRumbleHistoryItem[] {
  try {
    const raw = window.localStorage.getItem(HISTORY_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (item): item is RoyalRumbleHistoryItem =>
        typeof item === 'object' && item !== null && typeof (item as RoyalRumbleHistoryItem).seed === 'number' && Array.isArray((item as RoyalRumbleHistoryItem).selected),
    )
  } catch {
    return []
  }
}

function pushHistory(item: RoyalRumbleHistoryItem): RoyalRumbleHistoryItem[] {
  const next = [item, ...readHistory().filter((row) => row.seed !== item.seed)].slice(0, HISTORY_MAX)
  try {
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify(next))
  } catch {
    // a private window or a full store: the list is a convenience, not a record
  }
  return next
}

/* ---------------------------------------------------------------- pieces */

function PriceBars({ price, inverted = false }: { price: number; inverted?: boolean }) {
  return (
    <div className="flex gap-1" aria-hidden="true">
      {Array.from({ length: 5 }, (_, index) => (
        <span
          key={index}
          className={`h-1.5 flex-1 ${
            index < price
              ? inverted
                ? 'bg-paper'
                : 'bg-red'
              : inverted
                ? 'bg-ink/20'
                : 'bg-ink/10'
          }`}
        />
      ))}
    </div>
  )
}

function Shirt({
  player,
  kits,
  className,
}: {
  player: RoyalRumblePublicPlayer
  kits: EraKit[]
  className: string
}) {
  // the man's real shirt, never an empty box (delta 88 — `RumbleShirt.tsx`)
  return <RumbleShirt player={player} kits={kits} className={className} />
}

/** the little pitch: five dots in the shape the FLEX pick decided (§43) */
export function FormationMini({ formation, className = '', light = false }: { formation: RoyalRumbleFormation; className?: string; light?: boolean }) {
  return (
    <div
      className={`relative aspect-[3/2] w-full overflow-hidden border-hair ${light ? 'border-ink/25 bg-transparent' : 'border-paper/25 bg-transparent'} ${className}`}
      role="img"
      aria-label={formationHe(formation)}
    >
      <div className={`absolute inset-y-0 start-1/2 w-px ${light ? 'bg-ink/15' : 'bg-paper/15'}`} />
      {formationShape(formation).map((spot, index) => (
        <span
          key={index}
          className={`absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 sm:h-2.5 sm:w-2.5 ${spot.position === 'GK' ? (light ? 'bg-ink' : 'bg-paper') : 'bg-red'}`}
          style={{ insetInlineStart: `${spot.x}%`, top: `${spot.y}%` }}
        />
      ))}
    </div>
  )
}

function DraftCard({
  offer,
  selected,
  disabled,
  onPick,
  index,
  kits,
}: {
  offer: RoyalRumbleOffer
  selected: boolean
  disabled: boolean
  onPick: (event: MouseEvent<HTMLButtonElement>) => void
  index: number
  kits: EraKit[]
}) {
  const { player, offeredAs } = offer
  const aria = disabled
    ? t('cardBlocked', { name: player.nameHe, price: money(player.price) })
    : t('cardAria', { name: player.nameHe, position: positionHe(offeredAs), price: money(player.price) })
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onPick}
      aria-pressed={selected}
      aria-label={aria}
      title={disabled ? t('fadedNote') : undefined}
      className={`group relative h-full min-h-tap overflow-hidden border-rule p-0 text-start transition duration-200 active:translate-y-1 motion-reduce:transition-none sm:min-h-[280px] ${
        selected
          ? 'translate-y-1 border-red bg-red text-paper'
          : 'border-ink bg-paper text-ink hover:-translate-y-1'
      } ${disabled ? 'cursor-not-allowed opacity-30 grayscale' : ''}`}
    >
      <div className={`absolute inset-x-0 top-0 h-1.5 ${selected ? 'bg-paper' : 'bg-red'}`} />
      <div className="absolute -start-3 -top-4 font-display text-[82px] leading-none text-ink/5 sm:text-[132px]" dir="ltr" aria-hidden="true">
        {index + 1}
      </div>

      <div className="relative flex h-full flex-col p-2 sm:min-h-[280px] sm:p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className={`font-mono tabular-nums text-[7px] font-black tracking-[0.18em] sm:text-[9px] ${selected ? 'text-paper/70' : 'text-red'}`} dir="ltr">
              ENTRY {String(index + 1).padStart(2, '0')}
            </p>
            {/* the OFFERED position — never `player.position` (§41) */}
            <p
              className="mt-0.5 inline-block font-mono tabular-nums text-[8px] font-black tracking-[0.12em] sm:text-[10px]"
              dir="ltr"
            >
              {POSITION_SHORT[offeredAs]}
            </p>
          </div>
          <div className="text-end">
            <p className={`px-1.5 py-0.5 font-display text-[22px] leading-none sm:text-[40px] ${selected ? 'bg-paper text-red' : 'bg-sheet text-red'}`} dir="ltr">
              {money(player.price)}
            </p>
            <p className={`mt-1 hidden font-body text-[8px] sm:block ${selected ? 'text-paper/55' : 'text-concrete'}`}>{t('priceEntry')}</p>
          </div>
        </div>

        <div className={`mx-auto mt-1 flex min-h-[40px] w-full flex-1 justify-center overflow-hidden border-y-hair py-0.5 ${selected ? 'border-paper/15 bg-transparent' : 'border-ink/10 bg-transparent'}`}>
          <Shirt player={player} kits={kits} className="h-full max-h-[168px] w-auto max-w-[100px] sm:h-[132px] sm:w-[116px]" />
        </div>

        <div className="mt-auto pt-1.5">
          <p className="line-clamp-2 min-h-[2em] font-display text-[17px] leading-[1] sm:text-[29px]">{player.nameHe}</p>
          <div className="mt-1 flex items-end justify-between gap-2">
            <div>
              <p className={`hidden font-body text-[8px] sm:block ${selected ? 'text-paper/55' : 'text-concrete'}`}>{t('hapoelYears')}</p>
              <p className="font-mono tabular-nums text-[8px] font-black sm:text-[9px]" dir="ltr">{yearRange(player)}</p>
            </div>
            <span className={`hidden border-hair px-2 py-1 font-body text-[8px] font-black sm:inline-block ${selected ? 'border-paper/35' : 'border-ink/25'}`}>
              {positionHe(offeredAs)}
            </span>
          </div>
          <div className="mt-1.5 [@media(max-height:700px)]:hidden"><PriceBars price={player.price} inverted={selected} /></div>
        </div>
      </div>

      {selected && (
        <div className="absolute inset-x-0 bottom-0 bg-ink py-1 text-center font-mono tabular-nums text-[9px] font-black tracking-[0.2em] text-paper" dir="ltr">
          IN THE FIVE
        </div>
      )}
    </button>
  )
}

function LineupRail({
  draft,
  picks,
  activeSlot,
  onEdit,
  kits,
}: {
  draft: RoyalRumbleDraft
  picks: RoyalRumblePick[]
  activeSlot: number
  onEdit: (index: number) => void
  kits: EraKit[]
}) {
  const formation = resolvePublicFormation(picks)
  return (
    <section className="relative overflow-hidden border-rule border-ink bg-ink p-1.5 text-paper sm:p-4">
      <div className="absolute inset-y-0 start-0 w-2 bg-red" />
      <div className="relative mb-1 flex items-end justify-between gap-3 ps-2 sm:mb-1.5">
        <div>
          <p className="font-mono tabular-nums text-[8px] font-black tracking-[0.2em] text-red sm:text-[9px]" dir="ltr">YOUR FIVE</p>
          <h3 className="hidden font-display text-[24px] leading-none sm:block">{t('lineupWall')}</h3>
        </div>
        <p className="hidden font-body text-[9px] text-paper/45 sm:block">{t('lineupEdit')}</p>
      </div>

      <div className="relative grid grid-cols-[repeat(5,minmax(0,1fr))_52px] gap-1 ps-2 sm:grid-cols-[repeat(5,minmax(0,1fr))_84px] sm:gap-2">
        {draft.slots.map((slot, index) => {
          const pick = picks[index] ?? null
          const active = activeSlot === index
          const label = slotShort(slot.rule)
          return (
            <button
              type="button"
              onClick={() => onEdit(index)}
              key={`${label}-${index}`}
              aria-label={pick ? `${label} · ${pick.player.nameHe} · ${money(pick.player.price)}` : `${label} · ${t('vacant')}`}
              aria-current={active ? 'step' : undefined}
              className={`min-h-tap min-w-0 border-hair p-1 text-center transition motion-reduce:transition-none ${
                active ? 'border-red bg-red text-paper' : pick ? 'border-paper/25 bg-paper/5' : 'border-paper/10 bg-ink'
              }`}
            >
              <span className={`font-mono tabular-nums text-[7px] font-black tracking-[0.12em] ${active ? 'text-paper/75' : 'text-red'}`} dir="ltr">
                {label}
              </span>
              {pick ? (
                <>
                  <div className="mx-auto mt-1 hidden h-12 items-center justify-center bg-transparent sm:flex">
                    <Shirt player={pick.player} kits={kits} className="h-10 w-9" />
                  </div>
                  <p className="mt-1 truncate font-display text-[11px] leading-none sm:text-[16px]">{pick.player.nameHe}</p>
                  <p className="hidden font-display text-[12px] text-paper/75 sm:mt-1 sm:block sm:text-[18px]" dir="ltr">{money(pick.player.price)}</p>
                </>
              ) : (
                <p className="mt-1 font-display text-[16px] leading-none text-paper/15 sm:mt-2 sm:text-[24px]" aria-hidden="true">?</p>
              )}
            </button>
          )
        })}
        {/* the one shape, visible from the first pick */}
        <div className="flex min-w-0 flex-col justify-center border-hair border-paper/10 p-1" title={formationHe(formation)}>
          <FormationMini formation={formation} />
          <p className="mt-0.5 hidden truncate text-center font-mono tabular-nums text-[7px] font-black text-paper/55 sm:block" dir="ltr">1–1–2–1</p>
        </div>
      </div>
    </section>
  )
}

function FighterToken({
  player,
  publicPlayer,
  ours,
  kits,
}: {
  player: RoyalRumblePitchPlayer
  publicPlayer: RoyalRumblePublicPlayer | undefined
  ours: boolean
  kits: EraKit[]
}) {
  const first = player.nameHe.split(' ')[0] ?? player.nameHe
  return (
    <div
      className="absolute z-20 -translate-x-1/2 -translate-y-1/2 transition-all duration-700 motion-reduce:transition-none"
      style={{ insetInlineStart: `${player.x}%`, top: `${player.y}%` }}
      title={`${player.nameHe} · ${positionHe(player.position)}`}
    >
      <div className={`mx-auto flex h-12 w-12 items-center justify-center border-2 sm:h-14 sm:w-14 ${ours ? 'border-red bg-transparent' : 'border-ink bg-transparent'}`}>
        {publicPlayer ? (
          <Shirt player={publicPlayer} kits={kits} className="h-10 w-9 sm:h-12 sm:w-11" />
        ) : (
          <span className="font-mono tabular-nums text-[8px] font-black text-ink">{first.slice(0, 2)}</span>
        )}
      </div>
      <div className={`mt-1 max-w-[76px] truncate border-hair px-1 py-0.5 text-center font-body text-[7px] font-bold text-paper sm:text-[8px] ${ours ? 'border-red bg-red' : 'border-paper/20 bg-ink'}`}>
        {first}
      </div>
    </div>
  )
}

function MatchPitch({
  result,
  frameIndex,
  ours,
  kits,
  bare = false,
}: {
  result: RoyalRumbleResult
  frameIndex: number
  ours: RoyalRumblePublicPlayer[]
  kits: EraKit[]
  /** inside the life: the pitch without the site's plate */
  bare?: boolean
}) {
  const frame = result.frames[Math.min(frameIndex, result.frames.length - 1)] ?? result.frames[0]
  if (!frame) return null
  const ourMap = new Map(ours.map((player) => [player.slug, player]))
  const theirMap = new Map(result.opponent.map((offer) => [offer.player.slug, offer.player]))

  return (
    <div className="relative mx-auto max-w-5xl overflow-hidden border-rule border-ink bg-ink text-paper">
      <div className="relative border-b-rule border-paper/15 px-3 py-3 sm:px-5">
        <div className="absolute inset-y-0 start-0 w-2 bg-red" />
        <div className="relative grid grid-cols-[1fr_auto_1fr] items-center gap-3 ps-2">
          <div>
            {!bare && <p className="font-mono tabular-nums text-[8px] font-black tracking-[0.2em] text-red" dir="ltr">THE WORKER · GATE 09</p>}
            <p className="font-display text-[20px] leading-none sm:text-[26px]">{t('title')}</p>
            <p className="mt-1 font-mono tabular-nums text-[7px] font-black tracking-[0.12em] text-paper/45 sm:text-[8px]" dir="ltr">
              1–1–2–1 · 1–1–2–1
            </p>
          </div>
          <div className="border-x-hair border-paper/20 px-4 text-center sm:px-8">
            <p className="font-display text-[42px] leading-none sm:text-[56px]" dir="ltr">{frame.scoreFor}–{frame.scoreAgainst}</p>
          </div>
          <div className="text-end">
            <p className="font-mono tabular-nums text-[8px] font-black tracking-[0.16em] text-paper/45" dir="ltr">MATCH CLOCK</p>
            <p className="font-display text-[24px] leading-none text-red sm:text-[30px]" dir="ltr">{String(frame.at).padStart(2, '0')}:00</p>
          </div>
        </div>
      </div>

      <div className="relative bg-sign p-2 sm:p-4">
        <div className="absolute inset-x-0 top-0 grid h-6 grid-cols-12 opacity-45">
          {Array.from({ length: 12 }, (_, index) => <span key={index} className={index % 2 === 0 ? 'bg-red' : 'bg-ink'} />)}
        </div>
        <div className="absolute inset-x-0 bottom-0 grid h-6 grid-cols-12 opacity-45">
          {Array.from({ length: 12 }, (_, index) => <span key={index} className={index % 2 === 0 ? 'bg-ink' : 'bg-red'} />)}
        </div>

        <div className="relative mb-7 mt-7 aspect-[1.52/1] overflow-hidden border-2 border-paper/65 bg-sign sm:mb-8 sm:mt-8">
          <div className="absolute inset-y-0 start-1/2 w-px -translate-x-1/2 bg-paper/55" />
          <div className="absolute start-1/2 top-1/2 aspect-square h-[28%] -translate-x-1/2 -translate-y-1/2 border border-paper/55" />
          <div className="absolute start-0 top-[28%] h-[44%] w-[13%] border-y border-e border-paper/55" />
          <div className="absolute end-0 top-[28%] h-[44%] w-[13%] border-y border-s border-paper/55" />
          <div className="absolute start-0 top-[40%] h-[20%] w-[4%] border-y border-e border-paper/45" />
          <div className="absolute end-0 top-[40%] h-[20%] w-[4%] border-y border-s border-paper/45" />
          <div className="absolute inset-x-0 top-1/2 h-px bg-paper/10" />

          {frame.us.map((player) => (
            <FighterToken key={`us-${player.slug}`} player={player} publicPlayer={ourMap.get(player.slug)} ours kits={kits} />
          ))}
          {frame.them.map((player) => (
            <FighterToken key={`them-${player.slug}`} player={player} publicPlayer={theirMap.get(player.slug)} ours={false} kits={kits} />
          ))}

          <div
            className="absolute z-30 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rotate-45 border-2 border-ink bg-paper transition-all duration-700 motion-reduce:transition-none sm:h-4 sm:w-4"
            style={{ insetInlineStart: `${frame.ball.x}%`, top: `${frame.ball.y}%` }}
          />
        </div>

        <div className="relative mb-7 grid grid-cols-[auto_1fr] items-center gap-3 border-rule border-paper/15 bg-ink px-3 py-3 sm:mb-8 sm:px-4">
          <div className="flex items-center gap-2 font-mono tabular-nums text-[8px] font-black tracking-[0.18em] text-red" dir="ltr">
            <span className="h-2 w-2 bg-red" /> LIVE
          </div>
          <p className="font-body text-[12px] font-bold leading-snug sm:text-[14px]" aria-live="polite">{frame.commentaryHe}</p>
        </div>
      </div>
    </div>
  )
}

function CompactPlayer({ offer, dark = false, kits, marked = false }: { offer: RoyalRumbleOffer; dark?: boolean; kits: EraKit[]; marked?: boolean }) {
  const { player, offeredAs } = offer
  return (
    <div className={`grid grid-cols-[42px_1fr_auto] items-center gap-2 border-b-hair py-2 ${dark ? 'border-paper/15' : 'border-ink/15'} ${marked ? 'border-s-rule border-s-red ps-2' : ''}`}>
      <div className="flex h-10 items-center justify-center bg-transparent">
        <Shirt player={player} kits={kits} className="h-9 w-8" />
      </div>
      <div className="min-w-0">
        <p className="truncate font-body text-[11px] font-black">{player.nameHe}</p>
        <p className={`mt-0.5 font-mono tabular-nums text-[8px] font-black tracking-[0.12em] ${dark ? 'text-paper/40' : 'text-concrete'}`} dir="ltr">
          {POSITION_SHORT[offeredAs]} · {yearRange(player)}
        </p>
      </div>
      <span className="font-display text-[21px] text-red" dir="ltr">{money(player.price)}</span>
    </div>
  )
}

function isPick(pick: RoyalRumblePick): pick is RoyalRumbleOffer {
  return pick !== null
}

/** the money as a trail — €15M → €11M → €7M … — tension, not a warning (§44) */
function BudgetTrail({ budget, picks }: { budget: number; picks: RoyalRumblePick[] }) {
  const steps: number[] = [budget]
  let left = budget
  for (const pick of picks) {
    if (!pick) continue
    left -= pick.player.price
    steps.push(left)
  }
  return (
    <p className="mt-0.5 truncate font-mono tabular-nums text-[7px] font-black tracking-[0.08em] text-muted sm:text-[9px]" dir="ltr" aria-hidden="true">
      {steps.map((step) => money(step)).join(' → ')}
    </p>
  )
}

type RunProps = Parameters<typeof RoyalRumbleRunInner>[0] & {
  /** every man's real shirt, from the page (`lib/kit/playerShirt.ts`); absent inside LIFE */
  looks?: Wardrobe
}

export function RoyalRumbleRun({ looks, ...props }: RunProps) {
  return (
    <RumbleLooks looks={looks}>
      <RoyalRumbleRunInner {...props} />
    </RumbleLooks>
  )
}

function RoyalRumbleRunInner({
  draft,
  shuffleDraft,
  cursor,
  roundSeed,
  playerCount,
  kits,
  embedded,
  allowShuffle = true,
  themed,
}: {
  draft: RoyalRumbleDraft
  shuffleDraft: RoyalRumbleDraft
  cursor: number
  /** the round the page dealt (`?seed=`) — what a challenge link hands over; absent inside LIFE */
  roundSeed?: number
  playerCount: number
  kits: EraKit[]
  /**
   * Opened from inside THE WORKER LIFE — Ofir's cards on the asphalt. The same draft and the
   * same match over the men who had worn the shirt before the life's year (the server plays
   * it with that window); when the whistle goes the result goes back to the pitch, where the
   * friends settle the bet. No record, no "again", no plate with a gate's number on it.
   */
  embedded?: Omit<Embedded<RoyalRumbleResult>, 'window'> & { window: { before: number } }
  /** a scene may say "these are the cards, deal with it" (§74) */
  allowShuffle?: boolean
  /**
   * ONE RED WORLD §18 — "השנים שחיית עד עכשיו", a separate themed mode over the men of the
   * LIFE chapters this device finished. It plays through its own action (the server rebuilds
   * the window from the chapters), keeps no recent-five history and hands over no challenge
   * link: those belong to the canonical gate's seed, and this is not that board.
   */
  themed?: { submit: (seed: number, selection: RoyalRumbleSelection[]) => Promise<RoyalRumbleResult | null>; againHref: string }
}) {
  const [phase, setPhase] = useState<Phase>('draft')
  const [activeDraft, setActiveDraft] = useState(draft)
  const [shuffleUsed, setShuffleUsed] = useState(false)
  const [shuffleNotice, setShuffleNotice] = useState(false)
  const [picks, setPicks] = useState<RoyalRumblePick[]>(() => Array.from({ length: draft.slots.length }, () => null))
  const [activeSlot, setActiveSlot] = useState(0)
  const [result, setResult] = useState<RoyalRumbleResult | null>(null)
  const [revealCount, setRevealCount] = useState(0)
  const [frameIndex, setFrameIndex] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  /** the stage's one sheet for what used to be desktop-only fine print (delta 87) */
  const [rulesOpen, setRulesOpen] = useState(false)
  const [history, setHistory] = useState<RoyalRumbleHistoryItem[]>([])
  /** ONE RED WORLD §6 — at most two natural doors after the whistle, from `recommend()` */
  const [next, setNext] = useState<NextAction[]>([])
  // §18: "תן חמישייה." — the gate's own opening line, the same for the same board
  const intro = voice({ gate: 9, moment: 'intro', seed: activeDraft.seed })

  const spent = lineupCost(picks)
  const remaining = activeDraft.budget - spent
  const pickedCount = countPicked(picks)
  const complete = pickedCount === activeDraft.slots.length
  const currentSlot = activeDraft.slots[activeSlot] ?? activeDraft.slots[0]
  const selectedPlayers = useMemo(() => picks.filter(isPick), [picks])
  /** slug → name over both boards — the challenger's five come back as hashes (§44) */
  const rumbleNames = useMemo(
    () => Object.fromEntries([draft, shuffleDraft].flatMap((d) => d.slots.flatMap((slot) => slot.offers.map((offer) => [offer.player.slug, offer.player.nameHe])))),
    [draft, shuffleDraft],
  )
  const formation = resolvePublicFormation(picks)
  // one shuffle, and only before the first pick (§27)
  const shuffleOpen = allowShuffle && !shuffleUsed && pickedCount === 0 && phase === 'draft' && !busy

  function canPick(slotIndex: number, offer: RoyalRumbleOffer): boolean {
    return canPickRoyalRumbleOffer(activeDraft, picks, slotIndex, offer)
  }

  function pick(slotIndex: number, offer: RoyalRumbleOffer) {
    if (phase !== 'draft' || !canPick(slotIndex, offer)) return
    setError(null)
    setPicks((previous) => {
      const next = [...previous]
      next[slotIndex] = offer
      const nextEmpty = next.findIndex((item, index) => index > slotIndex && item === null)
      const anyEmpty = next.findIndex((item) => item === null)
      if (nextEmpty >= 0) setActiveSlot(nextEmpty)
      else if (anyEmpty >= 0) setActiveSlot(anyEmpty)
      return next
    })
  }

  function shuffleOnce() {
    if (!shuffleOpen) return
    setActiveDraft(shuffleDraft)
    setPicks(Array.from({ length: shuffleDraft.slots.length }, () => null))
    setActiveSlot(0)
    setShuffleUsed(true)
    setShuffleNotice(true)
    setError(null)
    window.setTimeout(() => setShuffleNotice(false), 1100)
  }

  async function lockFive() {
    const selection = toSelection(picks)
    if (!selection || remaining < 0 || busy) return
    setBusy(true)
    setError(null)
    const resolved = themed ? await themed.submit(activeDraft.seed, selection) : await submitRoyalRumble(activeDraft.seed, selection, embedded?.window)
    setBusy(false)
    if (!resolved) {
      setError(t('invalidFive'))
      return
    }
    setResult(resolved)
    setPhase('reveal')
    setRevealCount(0)
    if (!embedded && !themed) {
      setHistory(
        pushHistory({
          seed: activeDraft.seed,
          selected: selection.map((item) => item.slug),
          formation: resolved.formation,
          cost: spent,
          scoreFor: resolved.scoreFor,
          scoreAgainst: resolved.scoreAgainst,
          result: resolved.winner === 'us' ? 'W' : resolved.winner === 'draw' ? 'D' : 'L',
        }),
      )
    }
  }

  useEffect(() => {
    if (phase !== 'reveal' || !result) return
    if (revealCount >= result.opponent.length) {
      const launch = window.setTimeout(() => setPhase('match'), 900)
      return () => window.clearTimeout(launch)
    }
    const timer = window.setTimeout(() => setRevealCount((value) => value + 1), 520)
    return () => window.clearTimeout(timer)
  }, [phase, result, revealCount])

  // inside the life the full-time whistle ends in the room, not on a result page
  useEffect(() => {
    if (!embedded || phase !== 'result' || !result) return
    embedded.onResult(result)
  }, [embedded, phase, result])

  // the ResultContext of a finished rumble: the five he chose, resolved on the server (§5, §38)
  useEffect(() => {
    if (embedded || phase !== 'result' || !result) return
    track('run_complete', { detail: 'royal-rumble', value: result.scoreFor })
    let live = true
    nextAfterRumble(selectedPlayers.map((offer) => offer.player.slug), `${activeDraft.seed}`)
      .then((answer) => {
        if (live) setNext(answer)
      })
      .catch(() => {})
    return () => {
      live = false
    }
    // one whistle, one context
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, result, embedded])

  useEffect(() => {
    if (phase !== 'match' || !result) return
    if (frameIndex >= result.frames.length - 1) {
      const finish = window.setTimeout(() => setPhase('result'), 1500)
      return () => window.clearTimeout(finish)
    }
    const timer = window.setTimeout(() => setFrameIndex((value) => value + 1), 1150)
    return () => window.clearTimeout(timer)
  }, [phase, result, frameIndex])

  if (phase === 'reveal' && result) {
    return (
      <div className="relative mx-auto flex min-h-0 w-full flex-1 flex-col overflow-y-auto overscroll-contain border-rule border-ink bg-ink px-3 py-4 text-paper max-w-5xl sm:px-6 sm:py-8 md:block md:flex-none md:overflow-visible">
        <div className="absolute inset-y-0 start-0 w-2 bg-red" />
        <div className="relative text-center">
          <p className="font-mono tabular-nums text-[9px] font-black tracking-[0.32em] text-red" dir="ltr">OPPONENT ENTRANCE</p>
          <h2 className="mt-2 font-display text-[38px] leading-[0.85] sm:text-[66px]">{voiceAction(9, 'opponent')}</h2>
          <p className="mx-auto mt-4 hidden max-w-lg font-body text-[11px] text-paper/50 sm:block">{t('opponentBody')}</p>
        </div>

        <div className="relative mt-4 grid grid-cols-5 gap-1 sm:mt-8 sm:gap-2" aria-live="polite">
          {result.opponent.map((offer, index) => {
            const open = index < revealCount
            const { player, offeredAs } = offer
            return (
              <div key={player.slug} className={`relative min-h-[176px] overflow-hidden border-rule sm:min-h-[280px] ${open ? 'border-red bg-paper text-ink' : 'border-paper/15 bg-ink text-paper'}`}>
                {!open ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-ink">
                    <span className="font-display text-[54px] leading-none text-paper/10 sm:text-[80px]" aria-hidden="true">?</span>
                    <span className="mt-4 border-t-hair border-red pt-2 font-mono tabular-nums text-[7px] font-black tracking-[0.2em] text-red sm:text-[9px]" dir="ltr">
                      {index === revealCount ? 'SPINNING' : 'LOCKED'}
                    </span>
                  </div>
                ) : (
                  <div className="relative flex h-full min-h-[176px] animate-[rrDrop_.32s_ease-out] flex-col p-2 motion-reduce:animate-none sm:min-h-[280px] sm:p-3">
                    <div className="absolute inset-x-0 top-0 h-2 bg-red" />
                    <div className="flex items-start justify-between gap-1">
                      <span className="font-mono tabular-nums text-[7px] font-black tracking-[0.14em] text-red sm:text-[9px]" dir="ltr">ENTRY {index + 1}</span>
                      <span className="font-display text-[22px] text-red sm:text-[30px]" dir="ltr">{money(player.price)}</span>
                    </div>
                    <div className="mx-auto mt-2 flex w-full justify-center border-y-hair border-ink/10 bg-transparent py-2">
                      <Shirt player={player} kits={kits} className="h-[96px] w-[84px] sm:h-[126px] sm:w-[112px]" />
                    </div>
                    <div className="mt-auto pt-2">
                      <p className="font-display text-[17px] leading-[0.9] sm:text-[25px]">{player.nameHe}</p>
                      <p className="mt-2 font-mono tabular-nums text-[7px] font-black tracking-[0.1em] text-concrete sm:text-[9px]" dir="ltr">{POSITION_SHORT[offeredAs]}</p>
                      <div className="mt-3"><PriceBars price={player.price} /></div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <div className="relative mt-4 text-center sm:mt-6">
          <span className="inline-block border-x-rule border-red px-5 py-2 font-display text-[30px] text-red sm:text-[42px]" dir="ltr">VS</span>
          <p className="mt-2 font-mono tabular-nums text-[8px] font-black tracking-[0.2em] text-paper/45" dir="ltr">
            1–1–2–1 · 1–1–2–1
          </p>
          {!embedded && <p className="mt-2 font-mono tabular-nums text-[8px] font-black tracking-[0.24em] text-paper/40" dir="ltr">ROYAL RUMBLE · GATE 09</p>}
        </div>
        <style>{`@keyframes rrDrop{0%{opacity:0;transform:translateY(-18px) scale(.96)}100%{opacity:1;transform:none}}`}</style>
      </div>
    )
  }

  if (phase === 'match' && result) {
    return (
      <div className="mx-auto flex min-h-0 w-full flex-1 flex-col overflow-y-auto overscroll-contain max-w-5xl py-2 md:block md:flex-none md:overflow-visible">
        <MatchPitch result={result} frameIndex={frameIndex} ours={selectedPlayers.map((offer) => offer.player)} kits={kits} bare={Boolean(embedded)} />
      </div>
    )
  }

  if (phase === 'result' && result) {
    if (embedded) return null
    const won = result.winner === 'us'
    const draw = result.winner === 'draw'
    const formationLine = t('formationCreativeMade')
    // §18: "זאת החמישייה שלך. זה מה שיצא." — competitive, never toxic; the tier only picks the body
    const tier: ResultTier = won ? 'high' : draw ? 'done' : 'low'
    const spoken = voice({ gate: 9, moment: 'result', result: tier, seed: activeDraft.seed })
    return (
      <div className="mx-auto flex min-h-0 w-full flex-1 flex-col overflow-y-auto overscroll-contain max-w-5xl pb-3 pt-1 md:block md:flex-none md:overflow-visible">
        <RecordRun gate="royal-rumble" score={won ? 3 : draw ? 1 : 0} correct={won ? 1 : 0} asked={1} />
        {/* `shrink-0` on every block: a flex column lets an `overflow-hidden` child collapse to nothing on a phone */}
        <section className="relative shrink-0 overflow-hidden border-rule border-ink bg-ink px-4 py-5 text-center text-paper sm:px-8 sm:py-8">
          <div className="pointer-events-none absolute -start-8 top-1/2 -translate-y-1/2 font-display text-[190px] leading-none text-paper/5" dir="ltr" aria-hidden="true">09</div>
          <p className="relative font-mono tabular-nums text-[9px] font-black tracking-[0.3em] text-red" dir="ltr">FULL TIME · ROYAL RUMBLE</p>
          <p className="relative mt-3 font-display text-[92px] leading-[0.8] sm:text-[132px]" dir="ltr">{result.scoreFor}–{result.scoreAgainst}</p>
          <div className="relative mx-auto mt-5 h-1 w-20 bg-red" />
          <h2 className="relative mt-5 font-display text-[34px] leading-none sm:text-[46px]" data-exit="emotion">
            {spoken.title}
          </h2>
          {spoken.body && <p className="relative mt-2 font-body text-[13px] text-paper/80">{spoken.body}</p>}
          {/* the small story (§50): one line the server chose, one line the formation earned */}
          <div className="relative mx-auto mt-4 flex max-w-lg flex-col items-center gap-1.5">
            {result.highlight && (
              <p className="border-hair border-red px-3 py-1.5 font-body text-[13px] font-black text-paper sm:text-[14px]">{result.highlight.textHe}</p>
            )}
            {(won || draw) && <p className="font-body text-[11px] text-paper/70">{formationLine}</p>}
          </div>
          <p className="relative mx-auto mt-3 max-w-lg font-body text-[11px] leading-relaxed text-paper/50">{t('resultSecret')}</p>
        </section>

        <div className="mt-3 grid shrink-0 gap-3 sm:grid-cols-2">
          <section className="border-rule border-ink bg-paper p-4 text-ink">
            <div className="mb-2 flex items-end justify-between gap-2">
              <div><p className="font-mono tabular-nums text-[8px] font-black tracking-[0.18em] text-red" dir="ltr">YOUR FIVE</p><h3 className="font-display text-[24px]">{t('yourFive')}</h3></div>
              <div className="flex items-center gap-2">
                <div className="w-14"><FormationMini formation={result.formation} light /></div>
                <span className="font-display text-[24px] text-red" dir="ltr">{money(spent)}</span>
              </div>
            </div>
            {selectedPlayers.map((offer) => <CompactPlayer key={offer.player.slug} offer={offer} kits={kits} marked={result.highlight?.slug === offer.player.slug} />)}
          </section>
          <section className="border-rule border-ink bg-ink p-4 text-paper">
            <div className="mb-2 flex items-end justify-between gap-2">
              <div><p className="font-mono tabular-nums text-[8px] font-black tracking-[0.18em] text-red" dir="ltr">THEIR FIVE</p><h3 className="font-display text-[24px]">{t('theirFive')}</h3></div>
              <div className="w-14"><FormationMini formation={result.opponentFormation} /></div>
            </div>
            {result.opponent.map((offer) => <CompactPlayer key={offer.player.slug} offer={offer} dark kits={kits} />)}
          </section>
        </div>

        <a href={themed?.againHref ?? '/royal-rumble'} className="group mt-3 flex min-h-tap shrink-0 items-center justify-between border-rule border-red bg-red px-5 text-paper transition hover:bg-ink motion-reduce:transition-none">
          <span><span className="block font-mono tabular-nums text-[8px] font-black tracking-[0.18em] text-paper/60" dir="ltr">RUN IT BACK</span><span className="font-display text-[27px]">{t('again')}</span></span>
          <span className="font-display text-[38px] transition group-hover:-translate-x-1 motion-reduce:transition-none" aria-hidden="true">←</span>
        </a>

        {!themed && <CompareCard gate={9} mine={{ gate: 9, picks: selectedPlayers.map((offer) => offer.player.slug) }} names={rumbleNames} />}

        {roundSeed !== undefined && !themed && (
          <RoyalRumbleChallenge
            seed={activeDraft.seed}
            roundSeed={roundSeed}
            cursor={cursor}
            five={selectedPlayers.map((offer) => ({ slug: offer.player.slug, roleHe: positionHe(offer.offeredAs), nameHe: offer.player.nameHe }))}
          />
        )}

        <div className="mt-3 shrink-0">
          <ExitNext next={next} from="royal-rumble" />
        </div>

        {/* the recent five (§54): this browser's last rounds, never a lever on the seed */}
        {!themed && <section className="mt-3 shrink-0 border-rule border-ink bg-paper p-3 text-ink">
          <p className="font-mono tabular-nums text-[8px] font-black tracking-[0.18em] text-red" dir="ltr">RECENT</p>
          <h3 className="font-display text-[20px]">{t('recentTitle')}</h3>
          {history.length <= 1 ? (
            <p className="mt-1 font-body text-[11px] text-concrete">{t('recentEmpty')}</p>
          ) : (
            <ol className="mt-1 divide-y divide-ink/10">
              {history.map((item) => (
                <li key={item.seed} className="grid grid-cols-[auto_1fr_auto] items-center gap-3 py-1.5">
                  <span className={`w-6 text-center font-display text-[16px] ${item.result === 'W' ? 'text-red' : 'text-ink/60'}`} dir="ltr">
                    {item.result === 'W' ? t('recentWin').slice(0, 1) : item.result === 'D' ? t('recentDraw').slice(0, 1) : t('recentLoss').slice(0, 1)}
                  </span>
                  <span className="min-w-0 truncate font-body text-[11px]">
                    {item.formation === 'defensive' ? '1–2–1–1' : '1–1–2–1'} · <bdi dir="ltr">{money(item.cost)}</bdi>
                  </span>
                  <span className="font-mono tabular-nums text-[12px] font-black" dir="ltr">{item.scoreFor}–{item.scoreAgainst}</span>
                </li>
              ))}
            </ol>
          )}
        </section>}
      </div>
    )
  }

  if (!currentSlot) return null

  const progress = (pickedCount / activeDraft.slots.length) * 100
  const slotName = positionHe(currentSlot.rule.position)

  return (
    <div className="flex min-h-0 flex-1 flex-col max-md:flex-none md:block md:flex-none md:pb-3">
      <header data-rumble="header" className="relative shrink-0 overflow-hidden border-rule border-ink bg-red text-paper">
        {!embedded && <div className="pointer-events-none absolute -start-4 -top-8 font-display text-[190px] leading-none text-ink/10 sm:text-[300px]" dir="ltr" aria-hidden="true">09</div>}

        <div className="relative grid grid-cols-[minmax(0,1fr)_auto] items-stretch gap-2 px-3 py-2 sm:gap-5 sm:px-6 sm:py-6">
          <div className="min-w-0 self-center">
            <div className="flex items-center gap-2">
              {!embedded && <span className="border-hair border-paper px-1.5 py-0.5 font-mono tabular-nums text-[9px] font-black tracking-[0.18em] text-paper" dir="ltr">GATE 09</span>}
              <span className="hidden font-mono tabular-nums text-[9px] font-black tracking-[0.18em] text-paper/80 sm:inline" dir="ltr">5V5 · HAPOEL ALL-TIME</span>
            </div>
            <h1 className="mt-1 font-display text-[28px] leading-[0.85] sm:mt-3 sm:text-[76px]">{t('title')}</h1>
            <p className="mt-1 max-w-md font-body text-[12px] leading-snug text-paper sm:mt-4 sm:text-[13px] sm:leading-relaxed" data-rumble="intro">
              <span className="font-extrabold">{intro.title}</span>
              {intro.body && <span className="hidden sm:inline"> {intro.body}</span>}
            </p>
          </div>

          {/* the money: a cream plate with the crown — what is left, and the trail of how it went */}
          <div data-rumble="budget" className="flex min-w-[112px] flex-col justify-center border-rule border-ink bg-paper px-2.5 py-1.5 text-ink sm:min-w-[190px] sm:px-4 sm:py-3">
            <div className="flex items-center justify-between gap-2">
              <p className="font-body text-[10px] font-extrabold leading-none text-red sm:text-[11px]">{t('moneyLeft')}</p>
              <Crown className="h-3.5 w-5 text-ink sm:h-5 sm:w-7" />
            </div>
            <p className={`mt-0.5 font-display text-[32px] leading-none sm:text-[52px] ${remaining < 0 ? 'text-red' : 'text-ink'}`} dir="ltr">{money(remaining)}</p>
            <BudgetTrail budget={activeDraft.budget} picks={picks} />
            <div className="mt-1 h-1.5 bg-ink/15 sm:mt-3 sm:h-2"><div className="h-full bg-red transition-all duration-300 motion-reduce:transition-none" style={{ width: `${Math.min(100, progress)}%` }} /></div>
            <div className="mt-1 hidden justify-between font-body text-[9px] text-muted sm:flex">
              <span>{t('lockedCount', { count: String(pickedCount) })}</span>
              <span>{t('archiveCount', { count: String(playerCount) })}</span>
            </div>
          </div>
        </div>
      </header>

      <div className="mt-1.5 shrink-0 md:mt-2"><LineupRail draft={activeDraft} picks={picks} activeSlot={activeSlot} onEdit={setActiveSlot} kits={kits} /></div>

      {/* SHUFFLE and RULES — a compact chip rail instead of a full-width desktop bar */}
      <div className="mt-1.5 flex shrink-0 gap-1.5 md:mt-2">
        {allowShuffle && (
          <button
            type="button"
            disabled={!shuffleOpen}
            aria-disabled={!shuffleOpen}
            onClick={(event) => {
              shuffleOnce()
              firePickFxAt(event.currentTarget, { tone: 'sign', haptic: 'tap' })
            }}
            className={`flex min-h-tap flex-1 items-center justify-between gap-2 border-hair px-2.5 font-body text-[11.5px] font-extrabold transition motion-reduce:transition-none ${
              shuffleOpen ? 'border-ink bg-paper text-ink' : 'border-ink/15 text-ink/35'
            }`}
          >
            <span className="truncate">
              {shuffleNotice ? t('shuffleFresh') : shuffleUsed ? t('shuffleUsed') : pickedCount > 0 ? t('shuffleBeforePick') : t('shuffleAction')}
            </span>
            <span className="shrink-0 font-mono tabular-nums text-[9px] font-black tracking-[0.16em] text-red" dir="ltr">×1</span>
          </button>
        )}
        <button
          type="button"
          onClick={() => setRulesOpen(true)}
          className={`flex min-h-tap items-center border-hair border-ink/35 px-2.5 font-body text-[11.5px] font-extrabold text-ink ${allowShuffle ? 'shrink-0' : 'flex-1'}`}
        >
          {t('stageRulesChip')}
        </button>
      </div>

      <section className="mt-1.5 flex min-h-0 flex-1 flex-col border-rule border-ink bg-paper p-2 max-md:flex-none md:mt-2 md:flex-none md:p-4">
        <div className="mb-1 flex shrink-0 items-end gap-2 sm:gap-3">
          <div className="font-display text-[20px] leading-none text-red sm:text-[62px]" dir="ltr">{String(activeSlot + 1).padStart(2, '0')}</div>
          <div className="min-w-0 border-s-rule border-ink ps-2">
            <p className="font-mono tabular-nums text-[7px] font-black tracking-[0.2em] text-red sm:text-[8px]" dir="ltr">PICK {activeSlot + 1}/5 · {slotShort(currentSlot.rule)}</p>
            <h2 className="truncate font-display text-[15px] leading-none sm:text-[34px]">{t('draftQuestion')}</h2>
            <p className="mt-0.5 hidden truncate font-body text-[9px] text-concrete sm:block">
              {t('draftPosition', { position: slotName })}
            </p>
          </div>
        </div>

        <div className="md:hidden">
          <div className="relative">
            <RoyalRumbleSlotReveal offers={currentSlot.offers} signature={`${activeDraft.seed}-${activeSlot}`} />
            <div className="grid w-full grid-cols-3 gap-1.5 [&>button]:min-h-[270px]" role="group" aria-label={`${slotShort(currentSlot.rule)} · ${t('draftQuestion')}`}>
              {currentSlot.offers.map((offer, index) => (
                <DraftCard
                  key={`${offer.player.slug}-${offer.offeredAs}-m`}
                  offer={offer}
                  index={index}
                  selected={picks[activeSlot]?.player.slug === offer.player.slug}
                  disabled={!canPick(activeSlot, offer)}
                  onPick={(event) => {
                    pick(activeSlot, offer)
                    firePickFxAt(event.currentTarget, { label: money(offer.player.price), tone: 'red', haptic: offer.player.price === 5 ? 'lock' : 'tap', big: offer.player.price === 5 })
                  }}
                  kits={kits}
                />
              ))}
            </div>
          </div>
        </div>
        <div className="max-md:hidden">
        <FitBox ratio={1.08} className="min-h-0 flex-1" innerClassName="flex items-stretch">
          <div className="relative flex w-full">
            <RoyalRumbleSlotReveal offers={currentSlot.offers} signature={`${activeDraft.seed}-${activeSlot}`} />
            <div className="grid w-full grid-cols-3 gap-1.5 sm:gap-3" role="group" aria-label={`${slotShort(currentSlot.rule)} · ${t('draftQuestion')}`}>
              {currentSlot.offers.map((offer, index) => (
                <DraftCard
                  key={`${offer.player.slug}-${offer.offeredAs}`}
                  offer={offer}
                  index={index}
                  selected={picks[activeSlot]?.player.slug === offer.player.slug}
                  disabled={!canPick(activeSlot, offer)}
                  onPick={(event) => {
                    pick(activeSlot, offer)
                    firePickFxAt(event.currentTarget, { label: money(offer.player.price), tone: 'red', haptic: offer.player.price === 5 ? 'lock' : 'tap', big: offer.player.price === 5 })
                  }}
                  kits={kits}
                />
              ))}
            </div>
          </div>
        </FitBox>
        </div>
      </section>

      {error && <p className="mt-1.5 shrink-0 border-rule border-red bg-red/10 p-2.5 font-body text-[11px] font-black text-red md:mt-2 md:p-3" role="alert">{error}</p>}

      <button
        type="button"
        disabled={!complete || remaining < 0 || busy}
        onClick={(event) => {
          if (!complete || remaining < 0 || busy) return
          firePickFx(event.clientX, event.clientY, { label: t('lockReady'), tone: 'red', big: true, haptic: 'lock' })
          void lockFive()
        }}
        className="group mt-1.5 grid min-h-tap w-full shrink-0 grid-cols-[1fr_auto] items-center border-rule border-red bg-red px-5 text-start text-paper transition hover:bg-ink disabled:cursor-not-allowed disabled:border-concrete disabled:bg-concrete disabled:text-ink/55 motion-reduce:transition-none md:mt-2 max-md:sticky max-md:bottom-0 max-md:z-10"
      >
        <span className="min-w-0">
          <span className="block truncate font-mono tabular-nums text-[8px] font-black tracking-[0.2em] opacity-60" dir="ltr">
            LOCK THE FIVE · 1–1–2–1 · {money(remaining)} LEFT
          </span>
          <span className="block truncate font-display text-[23px] sm:text-[31px]">
            {busy ? t('locking') : complete ? t('lockReady') : t('missingPlayers', { count: String(5 - pickedCount) })}
          </span>
        </span>
        <span className="font-display text-[34px] transition sm:text-[42px] group-hover:-translate-x-1 motion-reduce:transition-none" aria-hidden="true">←</span>
      </button>

      <SlideSheet open={rulesOpen} onClose={() => setRulesOpen(false)} title={t('stageRulesTitle')} latin="RULES">
        <div className="flex flex-col gap-3">
          <div className="bc-stage flex justify-center border-rule border-ink"><GateLogo logo="royal-rumble" className="h-[110px] w-auto" /></div>
          <p className="font-body text-[13px] leading-relaxed text-ink">{t('heroBody')}</p>
          <div className="grid gap-2">
            <p className="border-s-rule border-red ps-2.5 font-body text-[12px] leading-relaxed text-ink/85">{t('rulePrice')}</p>
            <p className="border-s-rule border-red ps-2.5 font-body text-[12px] leading-relaxed text-ink/85">{t('ruleRange')}</p>
            <p className="border-s-rule border-red ps-2.5 font-body text-[12px] leading-relaxed text-ink/85">{t('fixedOrderHint')}</p>
            <p className="border-s-rule border-red ps-2.5 font-body text-[12px] leading-relaxed text-ink/85">{t('shuffleBeforePick')}</p>
            <p className="border-s-rule border-red ps-2.5 font-body text-[12px] leading-relaxed text-ink/85">{t('ruleOpponent')}</p>
          </div>
          <div className="border-hair border-ink/20 p-2.5">
            <p className="font-mono tabular-nums text-[8px] font-black tracking-[0.16em] text-concrete" dir="ltr">SECRET RATING</p>
            <p className="mt-1 font-body text-[12px] text-ink/85">{t('ratingNever')}</p>
          </div>
          <p className="font-body text-[11px] text-concrete">{t('fadedNote')}</p>
          <p className="font-body text-[11px] text-concrete">{t('kitNearest')}</p>
          <p className="font-body text-[11px] text-concrete">{t('budgetOf', { budget: money(activeDraft.budget) })}</p>
        </div>
      </SlideSheet>

      <span className="sr-only">{cursor + 1}</span>
    </div>
  )
}
