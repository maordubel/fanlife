import type { ReactNode } from 'react'

import { KitShirt } from '@/components/kit/KitShirt'
import type { ShirtLook } from '@/lib/kit/playerShirt'
import type { KitSpec } from '@/lib/kit/spec'
import { PlayerShirt } from './PlayerShirt'

/**
 * השחקן על הדשא — a picked player as a shirt standing on the grass (delta 87).
 *
 * Maor, 23.9.2026: remove the squares around the shirts, make it clean. So the shirt is
 * printed straight onto the pitch — no paper tile, no border — and the name sits under
 * it on a slim ink strip with a vermilion cap, the way a team-sheet name is set. It lands
 * with a pop (`animate-fx-pop`, motion only — rule 8 on grass) keyed by whoever calls it,
 * so a new pick re-stamps and an unchanged one stays still.
 *
 * Delta 88: pass `look` (from `lib/kit/playerShirt.ts`) and the man wears his real shirt —
 * the photograph of his era, or the engine's drawing where none exists. `spec` still works
 * for callers that only have a drawing.
 *
 * Sized in container units: the pitch that holds it declares `[container-type:inline-size]`
 * and the shirt is a fixed share of the pitch's width, so eleven shirts fit a 320px phone
 * and a 1200px screen alike.
 */
export function ShirtToken({
  spec = null,
  look,
  name,
  sub,
  title,
  live = false,
  captain = false,
  flag = false,
  struck = false,
  fallback,
  size = 'md',
}: {
  spec?: KitSpec | null
  /** the resolver's answer — wins over `spec` */
  look?: ShirtLook | null
  name: string
  sub?: ReactNode
  title?: string
  live?: boolean
  captain?: boolean
  flag?: boolean
  struck?: boolean
  /** what to print when there is no shirt for this season */
  fallback?: ReactNode
  size?: 'sm' | 'md' | 'lg'
}) {
  const width = size === 'lg' ? 'w-[17cqw]' : size === 'sm' ? 'w-[11cqw]' : 'w-[13.5cqw]'
  return (
    <span className="flex animate-fx-pop flex-col items-center motion-reduce:animate-none">
      <span className={`relative block ${width} max-w-[76px] ${live ? 'animate-fx-wobble motion-reduce:animate-none' : ''}`}>
        {look ? (
          <PlayerShirt look={look} eager title={title} className="aspect-[5/6] w-full" />
        ) : spec ? (
          <KitShirt spec={spec} density="mini" className="block aspect-[5/6] h-auto w-full" title={title} />
        ) : (
          <span className="grid aspect-[5/6] w-full place-items-center bg-press-ink font-poster text-[18px] leading-none text-press-paper">
            {fallback}
          </span>
        )}
        {captain && (
          <span className="absolute -top-1 end-0 grid h-[18px] w-[18px] place-items-center bg-press-ink font-mono text-[10px] font-bold leading-none text-press-paper">
            <bdi dir="ltr">C</bdi>
          </span>
        )}
        {flag && (
          <span className="absolute -top-1 start-0 grid h-[18px] w-[18px] place-items-center bg-red font-mono text-[11px] font-bold leading-none text-paper">
            !
          </span>
        )}
      </span>
      <span
        className={`mt-0.5 block max-w-[24cqw] truncate border-t-[3px] px-1.5 pb-[3px] pt-[2px] font-body text-[10.5px] font-extrabold leading-tight ${
          live ? 'border-sign bg-red text-paper' : 'border-red bg-ink text-paper'
        } ${struck ? 'line-through' : ''}`}
      >
        {name}
      </span>
      {sub && <span className="mt-px block font-mono text-[9px] tabular-nums leading-none text-press-ink">{sub}</span>}
    </span>
  )
}
