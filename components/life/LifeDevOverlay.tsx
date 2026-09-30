'use client'

import { useEffect, useState } from 'react'

import { chosenOutfit, ritualFor } from '@/lib/life/matchRitual'
import { resolveLifeOpportunities } from '@/lib/life/opportunityResolver'
import type { HudState } from '@/lib/life/runtime/bus'
import { directiveFor } from '@/lib/life/storyDirector'
import type { LifeState, LocationId } from '@/lib/life/types'
import { PLACE_LIFECYCLES } from '@/lib/life/world/placeLifecycle'

/**
 * DIRECTOR — the dev overlay (delta 93, brief §25, §48).
 *
 * What the story director and the resolver think this minute, printed in a corner so a
 * manual QA pass can see WHY the room is pointing where it points. It shows the engine's
 * own words and nothing else; it never ships: the caller mounts it only outside a
 * production build (`LifeStage`), and even there only with `?lifeDebug=1` in the address,
 * so a screenshot pass of the dev server is not cluttered by it. Same rule as `DebugPanel`:
 * no runtime toggle a player could flip.
 */
export function lifeDebugRequested(): boolean {
  if (process.env.NODE_ENV === 'production') return false
  if (typeof window === 'undefined') return false
  try {
    return new URLSearchParams(window.location.search).get('lifeDebug') === '1'
  } catch {
    return false
  }
}

export function useLifeDebug(): boolean {
  const [on, setOn] = useState(false)
  useEffect(() => setOn(lifeDebugRequested()), [])
  return on
}

function Line({ k, v }: { k: string; v: string }) {
  return (
    <p className="font-mono text-[10px] leading-snug tabular-nums">
      <span className="text-concrete">{k} </span>
      <bdi className="text-sheet">{v}</bdi>
    </p>
  )
}

export function LifeDevOverlay({ state, hud }: { state: LifeState; hud: HudState }) {
  const scene = (hud.scene ?? state.location) as LocationId
  const directive = directiveFor({ state, scene })
  const resolved = resolveLifeOpportunities({ state, scene })
  const side = resolved.strong?.[0] ?? resolved.optional?.[0] ?? resolved.ambient?.[0] ?? '—'
  const outfit = chosenOutfit(state, state.chapter)
  const ritual = ritualFor(state, state.chapter)
  const places = PLACE_LIFECYCLES.map((place) => `${place.id}=${place.state(state)}`).join(' ')
  const hh = String(Math.floor(state.minute / 60)).padStart(2, '0')
  const mm = String(state.minute % 60).padStart(2, '0')
  return (
    <aside
      aria-hidden="true"
      data-life="dev-overlay"
      className="pointer-events-none absolute bottom-[max(8px,env(safe-area-inset-bottom))] end-2 z-[70] max-w-[300px] border-hair border-sheet/40 bg-ink/90 px-2 py-1.5"
    >
      <Line k="CHAPTER" v={`${state.chapter} · ${scene} · ${hh}:${mm}`} />
      <Line k="DIRECTOR" v={directive ? `${directive.mode} ${directive.id}` : 'none'} />
      <Line k="OBJECTIVE" v={directive?.objectiveHe ?? '—'} />
      <Line k="DEST" v={(directive?.destinations ?? []).map((d) => d.to).join(', ') || '—'} />
      <Line k="MANDATORY" v={resolved.mandatory ?? '—'} />
      <Line k="PRIMARY" v={resolved.primary ?? '—'} />
      <Line k="SIDE" v={`${side} (${(resolved.strong?.length ?? 0) + (resolved.optional?.length ?? 0) + (resolved.ambient?.length ?? 0)})`} />
      <Line k="PRE-MATCH" v={ritual ? `${ritual.eventId} · ${outfit ? (outfit === 'plain' ? 'plain' : outfit.id) : 'not chosen'}` : 'none'} />
      <Line k="PLACES" v={places} />
      <Line k="CUE" v={hud.pendingCue ?? '—'} />
    </aside>
  )
}
