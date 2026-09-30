'use client'

import { createContext, useContext, type ReactNode } from 'react'

import { KitShirt } from '@/components/kit/KitShirt'
import { PlayerShirt } from '@/components/stage/PlayerShirt'
import type { RoyalRumblePublicPlayer } from '@/lib/game/royal-rumble'
import type { ShirtLook, Wardrobe } from '@/lib/kit/playerShirt'
import type { KitSpec } from '@/lib/kit/spec'
import { t } from '@/lib/royal-rumble/i18n'

/**
 * החולצה בראמבל — gate 9's one shirt, for solo and live alike (delta 88).
 *
 * Maor, 24.9.2026: *"החולצות צריכות להיות התמונות מקור! ואסור שיהיה שחקן ללא חולצה."* So:
 *
 *   1. the man's REAL shirt from `lib/kit/playerShirt.ts` (the page hands every slug's
 *      answer down once, as a `Wardrobe`, through `RumbleLooks`) — a photograph of his era
 *      wherever the archive has one;
 *   2. for a man the wardrobe does not know (an opponent the server dealt later), the kit
 *      engine's drawing of the home season nearest his years;
 *   3. and a man with no years at all still gets the plain red home shirt.
 *
 * There is no branch that renders an empty box.
 */

type EraKit = { seasonLabel: string; spec: KitSpec }

const LooksContext = createContext<Wardrobe | null>(null)

export function RumbleLooks({ looks, children }: { looks?: Wardrobe | null; children: ReactNode }) {
  return <LooksContext.Provider value={looks ?? null}>{children}</LooksContext.Provider>
}

const PLAIN: KitSpec = {
  seasonLabel: '',
  variant: 'home',
  base: 'red',
  pattern: 'solid',
  patternInk: 'cream',
  sleeves: 'raglan',
  sleeveInk: 'cream',
  collar: 'crew',
  collarInk: 'cream',
  sponsorHe: null,
  makerHe: null,
  nameset: 'block-solid',
  number: null,
  shorts: 'cream',
  socks: 'red',
  crestKey: null,
}

function seasonYear(label: string): number | null {
  const match = label.match(/(\d{4})/)
  return match ? Number(match[1]) : null
}

/** The engine's nearest home season to his years — the fallback, never nothing. */
function nearestKit(player: RoyalRumblePublicPlayer, kits: readonly EraKit[]): ShirtLook {
  const start = player.fromYear ?? player.toYear
  const end = player.toYear ?? player.fromYear ?? start
  const dated = kits
    .map((kit) => ({ kit, year: seasonYear(kit.seasonLabel) }))
    .filter((row): row is { kit: EraKit; year: number } => row.year !== null)
  if (start === null || start === undefined || end === null || end === undefined || dated.length === 0) {
    return { kind: 'engine', spec: PLAIN, seasonLabel: '', approx: true }
  }
  const mid = (start + end) / 2
  const inside = dated.filter(({ year }) => year >= start && year <= end)
  const kit = [...(inside.length > 0 ? inside : dated)].sort((a, b) => Math.abs(a.year - mid) - Math.abs(b.year - mid))[0]!.kit
  return { kind: 'engine', spec: kit.spec, seasonLabel: kit.seasonLabel, approx: inside.length === 0 }
}

export function useRumbleLook(player: RoyalRumblePublicPlayer, kits: readonly EraKit[]): ShirtLook {
  const looks = useContext(LooksContext)
  const at = looks?.by[player.slug]
  const found = at === undefined ? undefined : looks?.shirts[at]
  return found ?? nearestKit(player, kits)
}

export function RumbleShirt({
  player,
  kits,
  className,
  tag = true,
  dark = false,
}: {
  player: RoyalRumblePublicPlayer
  kits: readonly EraKit[]
  /** the box — size only */
  className: string
  /** the season tag in the corner */
  tag?: boolean
  dark?: boolean
}) {
  const look = useRumbleLook(player, kits)
  const title =
    look.seasonLabel === ''
      ? t('kitPlain')
      : t(look.approx ? 'kitApprox' : 'kitSeason', { season: look.seasonLabel })
  return (
    <div className="relative flex items-center justify-center overflow-visible">
      {look.kind === 'photo' ? (
        <PlayerShirt look={look} title={title} className={`aspect-[7/8] ${className} scale-[1.06]`} />
      ) : (
        <KitShirt spec={look.spec} className={`${className} scale-[1.04]`} title={title} />
      )}
      {tag && look.seasonLabel !== '' && (
        <span
          className={`absolute bottom-0 end-0 px-1.5 py-0.5 font-mono text-[6px] [@media(max-height:700px)]:hidden font-black tabular-nums tracking-[0.12em] ${
            dark ? 'bg-paper text-ink' : 'bg-ink text-paper'
          }`}
          dir="ltr"
        >
          {look.seasonLabel}
        </span>
      )}
    </div>
  )
}
