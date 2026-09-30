'use client'

import dynamic from 'next/dynamic'

import { t } from '@/lib/i18n'
import type { CraftOutput } from '@/lib/game/craft/types'
import { callbacksAt, confettiTier, type ConfettiTier } from '@/lib/life/callbacks'
import type { LifeState, LocationId } from '@/lib/life/types'

/**
 * מה שנראה שוב — the world callback overlay (delta 91, PERFORMED §47, MASTER §60).
 *
 * A banner painted under the stand years ago HANGS over the terrace when the player walks
 * back into it; confetti cut in the afternoon falls in the hall that evening. Both are
 * drawn over the paused-or-live painting from the kept `CraftOutput` (never a picture),
 * through the bench's own read-only renderer, loaded only when there is something to show
 * (`next/dynamic` — a life that never made anything never downloads it). CSS only: the
 * confetti is a tier, not a simulation, and it stops under `prefers-reduced-motion`.
 *
 * The component reads the state it is handed and dispatches nothing. `data-life="callback"`
 * is what the probe photographs.
 */

const CraftOutputView = dynamic(() => import('@/components/mechanics/craft/CraftOutputView').then((mod) => ({ default: mod.CraftOutputView })), {
  ssr: false,
  loading: () => null,
})

/** deterministic flecks — the same banner day gives the same snow; never `Math.random` */
function flecks(count: number): { x: number; y: number; d: number; s: number }[] {
  const out: { x: number; y: number; d: number; s: number }[] = []
  let h = 7
  for (let i = 0; i < count; i += 1) {
    h = (h * 1103515245 + 12345) & 0x7fffffff
    const x = (h % 1000) / 10
    h = (h * 1103515245 + 12345) & 0x7fffffff
    const y = (h % 1000) / 10
    h = (h * 1103515245 + 12345) & 0x7fffffff
    out.push({ x, y, d: 6 + (h % 9), s: 3 + (h % 4) })
  }
  return out
}

function Confetti({ tier }: { tier: ConfettiTier }) {
  if (tier === 'none') return null
  const count = tier === 'full' ? 48 : 18
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" data-life="callback" data-callback="confetti" data-tier={tier} aria-hidden="true">
      {flecks(count).map((fleck, i) => (
        <span
          key={i}
          className={`absolute block ${i % 3 === 0 ? 'bg-sheet' : 'bg-red'} motion-safe:animate-[craft-fleck_var(--d)_linear_infinite] motion-reduce:animate-none`}
          style={{ insetInlineStart: `${fleck.x}%`, top: `${fleck.y}%`, width: fleck.s, height: fleck.s * 1.6, '--d': `${fleck.d}s`, opacity: 0.85 } as React.CSSProperties}
        />
      ))}
      <span className="sr-only">{tier === 'full' ? t('life91m.callback.confettiFull') : t('life91m.callback.confetti')}</span>
    </div>
  )
}

function Banner({ output, frame }: { output: CraftOutput; frame: number }) {
  // hung from the lip of the upper terrace, under the HUD plates and clear of the walk band:
  // a fifth of the framed picture, or on a full-bleed phone just under the love badge
  const top = frame > 0 ? Math.round(frame * 0.2) : 'calc(158px + env(safe-area-inset-top))'
  return (
    <div
      className="pointer-events-none absolute inset-x-0 flex justify-center"
      style={{ top }}
      data-life="callback"
      data-callback="banner"
      aria-label={t('life91m.callback.banner')}
    >
      <div className="w-[min(62vw,380px)] border-hair border-ink/60 bg-ink/20 p-[2px] motion-safe:animate-[craft-sway_7s_ease-in-out_infinite] motion-reduce:animate-none">
        <CraftOutputView output={output} className="block h-auto w-full" />
      </div>
    </div>
  )
}

export function CraftCallback({ state, room, frame }: { state: LifeState; room: LocationId; frame: number }) {
  const due = callbacksAt(state, room)
  const banner = due.find((row) => row.kind === 'banner')?.output ?? null
  const confetti = room === 'ussishkin-hall' ? confettiTier(state) : 'none'
  if (!banner && confetti === 'none') return null
  return (
    <div className="pointer-events-none absolute inset-0 z-[12]" data-life="callback-layer">
      {banner ? <Banner output={banner.data} frame={frame} /> : null}
      <Confetti tier={confetti} />
    </div>
  )
}
