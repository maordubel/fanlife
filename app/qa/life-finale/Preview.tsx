'use client'

import { EndingCard } from '@/components/life/EndingCard'
import { StageFinale } from '@/components/life/StageFinale'
import type { LifeBusEvents } from '@/lib/life/runtime/bus'

/**
 * The client half: the finale needs a handler, and a server component may not pass one.
 *
 * `ending` is the other half of rule 49's pair — `EndingCard` closes a Saturday and
 * `StageFinale` closes a chapter — and since 16.9.2026 the first one can hold up the real
 * object from the night it is closing. That gate depends on `presence`, so it has to be
 * LOOKED at with a presence that earns the object and with one that does not; a screen
 * that hands a ticket stub to the man who listened on a base is the exact failure the
 * gate exists to prevent, and it is invisible in a diff.
 */
export function Preview({
  finale,
  ending,
}: {
  finale: NonNullable<LifeBusEvents['finale']>
  ending?: { titleHe: string; bodyHe: string; memoryHe: string; chapter: string; presence?: string | null } | null
}) {
  if (ending) {
    return (
      <EndingCard
        titleHe={ending.titleHe}
        bodyHe={ending.bodyHe}
        memoryHe={ending.memoryHe}
        chapter={ending.chapter}
        presence={ending.presence ?? null}
        onClose={() => {}}
      />
    )
  }
  return <StageFinale finale={finale} onContinue={() => {}} />
}
