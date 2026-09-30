import type { ReactNode } from 'react'

import { PressPitch } from '@/components/press/PressPitch'

import type { PitchSlot } from '@/lib/game/lineup'

/**
 * The slot layer over the printed pitch.
 *
 * The pitch itself is `PressPitch` — the DUBID printed-page recipe. The earlier flat
 * ink diagram avoided looking like "every other football app", and it succeeded by
 * looking like nothing at all. A printed pitch is not the FIFA green field either: it
 * is two ink screens and a halftone, which is what a pitch looked like in a newspaper.
 *
 * Slots are positioned by percentage, so one component serves every formation. Their
 * coordinates are geometric and physical — geometry does not flip with the language.
 */
export function Pitch({
  slots,
  renderSlot,
}: {
  slots: readonly PitchSlot[]
  renderSlot: (slot: PitchSlot) => ReactNode
}) {
  return (
    <PressPitch>
      {/*
        Slots live inside an inset area so a chip centred at x=8% or x=92% cannot hang
        over the touchline. Their x is remapped into that area rather than clamped, so
        the shape of a formation is preserved.
      */}
      <div className="absolute inset-[3%]">
        {slots.map((slot) => (
          <div
            key={slot.slotId}
            className="absolute w-[22%] max-w-[86px] -translate-x-1/2 -translate-y-1/2 rtl:translate-x-1/2"
            style={{ insetInlineStart: `${slot.x}%`, top: `${slot.y}%` }}
          >
            {renderSlot(slot)}
          </div>
        ))}
      </div>
    </PressPitch>
  )
}
