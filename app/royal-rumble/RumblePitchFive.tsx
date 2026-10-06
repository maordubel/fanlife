'use client'

import type { KitSpec } from '@/lib/kit/spec'
import { surname } from '@/lib/game/roster-search'
import type { RumbleSide, RumbleVisualPlayer } from '@/lib/game/royal-rumble-presentation'

import { RumbleShirt } from './RumbleShirt'

type EraKit = { seasonLabel: string; spec: KitSpec }

/** a slot on the vertical pitch: ours attack UP from the bottom half, theirs DOWN from the top */
export function screenPos(player: Pick<RumbleVisualPlayer, 'x' | 'y' | 'side'>): { x: number; y: number } {
  // spread the slots across the width and centre each half between its goal and the halfway line
  const x = 50 + (player.x - 50) * 1.7
  const depth = 54 + player.y * 0.44
  return player.side === 'us' ? { x, y: depth } : { x: 100 - x, y: 100 - depth }
}

/** where the ball ends up when a side scores: the goal it attacks */
export function goalPos(side: RumbleSide): { x: number; y: number } {
  return side === 'us' ? { x: 50, y: 1.5 } : { x: 50, y: 98.5 }
}

function Token({
  player,
  kits,
  shown,
  active,
  pulse,
}: {
  player: RumbleVisualPlayer
  kits: EraKit[]
  shown: boolean
  active: boolean
  pulse: boolean
}) {
  const at = screenPos(player)
  const ours = player.side === 'us'
  return (
    <div
      className="absolute z-20 -translate-x-1/2 -translate-y-1/2"
      style={{ insetInlineStart: `${at.x}%`, top: `${at.y}%` }}
      data-rumble-token={`${player.side}:${player.slug}`}
    >
      {/* transform-only: the man is drawn, then scaled in — no opacity, no layout */}
      <div className={`flex flex-col items-center transition-transform duration-300 ease-out motion-reduce:transition-none ${shown ? 'scale-100' : 'scale-0'}`}>
        <div className={`relative flex h-[46px] w-[42px] items-center justify-center sm:h-[54px] sm:w-[50px] ${active ? 'scale-110' : ''} ${pulse ? 'rr-pulse' : ''}`}>
          <svg viewBox="0 0 60 16" aria-hidden="true" className="absolute inset-x-[-14%] bottom-[-6%] block h-auto w-[128%]">
            <ellipse cx="30" cy="8" rx="22" ry="5" fill="rgb(var(--p-ink))" opacity=".3" />
            {active && <ellipse cx="30" cy="8" rx="27" ry="6.5" fill="none" stroke="rgb(var(--p-line))" strokeWidth="1.6" />}
          </svg>
          <span className="relative block [filter:drop-shadow(0_2px_1.5px_rgb(var(--p-ink)/.45))]">
            <RumbleShirt player={player.player} kits={kits} className="h-9 w-8 sm:h-11 sm:w-10" />
          </span>
        </div>
        <div className="mt-0.5 max-w-[68px] truncate px-1 text-center font-body text-[9px] font-extrabold leading-[1.35] text-paper [paint-order:stroke] [-webkit-text-stroke:3px_rgb(var(--p-ink))] sm:max-w-[88px] sm:text-[11px]">
          {surname(player.nameHe)}
        </div>
        <span className="font-mono tabular-nums text-[7px] font-black tracking-[0.14em] text-paper/80 [paint-order:stroke] [-webkit-text-stroke:2px_rgb(var(--p-ink))]" dir="ltr">{player.position}</span>
      </div>
    </div>
  )
}

/**
 * The pitch both fives stand on (delta 99). Entrance, head-to-head and the match itself
 * all draw THIS — one pitch, so a man stands in the same place the whole show.
 */
export function RumblePitchFive({
  us,
  them,
  usCount,
  themCount,
  kits,
  activeSlug,
  ball,
  pulse = false,
  className = '',
  children,
}: {
  us: RumbleVisualPlayer[]
  them: RumbleVisualPlayer[]
  usCount: number
  themCount: number
  kits: EraKit[]
  activeSlug?: { side: RumbleSide; slug: string } | null
  ball?: { x: number; y: number } | null
  /** the fifth man is in: the whole five breathes once */
  pulse?: boolean
  className?: string
  children?: React.ReactNode
}) {
  return (
    <div className={`relative mx-auto aspect-[4/5] w-full max-w-[460px] overflow-hidden border-2 border-ink ${className}`} data-rumble="pitch" style={{ backgroundImage: 'repeating-linear-gradient(180deg, rgb(var(--p-grass-dark) / .34) 0 12.5%, transparent 12.5% 25%), linear-gradient(180deg, rgb(var(--p-grass-dark)), rgb(var(--p-grass)) 55%, rgb(var(--p-grass-dark))), radial-gradient(ellipse at 50% 42%, transparent 55%, rgb(var(--p-ink) / .18))', backgroundColor: 'rgb(var(--p-grass))' }}>
      <div className="absolute inset-x-0 top-1/2 h-px bg-paper" />
      <div className="absolute inset-x-[38%] top-0 h-[3%] border-x-2 border-b-2 border-paper bg-paper/25" data-rumble="goal" />
      <div className="absolute inset-x-[38%] bottom-0 h-[3%] border-x-2 border-t-2 border-paper bg-paper/25" data-rumble="goal" />
      <div className="absolute start-1/2 top-1/2 aspect-square h-[22%] -translate-x-1/2 -translate-y-1/2 border border-paper" />
      <div className="absolute inset-x-[24%] top-0 h-[16%] border-x border-b border-paper" />
      <div className="absolute inset-x-[24%] bottom-0 h-[16%] border-x border-t border-paper" />
      {us.map((player, index) => (
        <Token
          key={`us-${player.slug}`}
          player={player}
          kits={kits}
          shown={index < usCount}
          active={activeSlug?.side === 'us' && activeSlug.slug === player.slug}
          pulse={pulse}
        />
      ))}
      {them.map((player, index) => (
        <Token
          key={`them-${player.slug}`}
          player={player}
          kits={kits}
          shown={index < themCount}
          active={activeSlug?.side === 'them' && activeSlug.slug === player.slug}
          pulse={false}
        />
      ))}
      {ball && (
        <div
          className="absolute z-30 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rotate-45 border-2 border-ink bg-paper transition-[inset-inline-start,top] duration-500 ease-out motion-reduce:transition-none"
          style={{ insetInlineStart: `${ball.x}%`, top: `${ball.y}%` }}
          aria-hidden="true"
        />
      )}
      {children}
      <style>{`@keyframes rrPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.12)}}.rr-pulse{animation:rrPulse .7s ease-in-out 1}@media (prefers-reduced-motion:reduce){.rr-pulse{animation:none}}`}</style>
    </div>
  )
}
