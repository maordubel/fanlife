'use client'

import { t, type MessageKey } from '@/lib/i18n'

/**
 * השורה היחידה שהמשחק מלמד — and it leaves for good once the player has obeyed it.
 *
 * Two sentences, in this order: how to move, then how to act. Each one disappears the
 * moment the player does the thing, and neither ever comes back — the flags live in the
 * save, so a returning player is not taught to walk again. After the front door there is
 * no teaching at all: the world is the teacher from there on.
 *
 * (27.9.2026, plan §2.2) The sentence says WHY first — "move to get close to things and
 * people", "act: talk / take / open" — and the keys second, smaller. It sits under the
 * HUD and never blocks the glass; the action cue appears only while something is in reach,
 * and the button itself rings once beside it (`ControlDeck pulse`).
 */
export function Teach({ id, touch }: { id: 'move' | 'act'; touch: boolean }) {
  const how = `life.teach.${id}.${touch ? 'touch' : 'desktop'}` as MessageKey
  const why = `life92.teach.${id}` as MessageKey
  return (
    <div className="pointer-events-none absolute inset-x-0 top-[calc(154px+env(safe-area-inset-top))] z-20 flex justify-center px-gutter" data-life="teach" data-teach-id={id}>
      <span className="flex max-w-[420px] flex-col items-center gap-1 border-hair border-ink bg-ink/90 px-3 py-2 text-center text-sheet">
        <bdi className="font-body text-[14px] font-bold leading-tight">{t(why)}</bdi>
        <bdi className="font-body text-[12px] leading-tight text-sheet/80">{t(how)}</bdi>
      </span>
    </div>
  )
}
