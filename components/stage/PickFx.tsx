'use client'

import { useEffect, useState } from 'react'

import { haptic } from '@/lib/play/haptics'

/**
 * אפקט הבחירה — one print hit, anywhere on the stage (delta 87).
 *
 * Maor, 23.9.2026: every pick must carry a visual effect, it has to be fun. So every gate
 * fires the SAME hit — rays, a square stamp ring in two misregistered plates, and a label
 * on an ink plate — from the point the finger let go. One effect for the whole ground is
 * what makes eleven gates read as one product.
 *
 * It is fired, not rendered: `firePickFx(x, y, …)` dispatches a window event and the one
 * `<PickFxLayer />` (mounted by `Screen`) draws it. A gate does not need to own an overlay,
 * a z-index or a timer to celebrate a pick.
 *
 * Colours are the two press inks, solid. No opacity is animated (rule 8, the grass note
 * in globals.css): every piece moves, shrinks to nothing and is removed.
 */

/** `away` — gate 11's end carries no vermilion at all: navy and ink only */
export type PickFxTone = 'red' | 'sign' | 'ink' | 'away'

type Hit = { id: number; x: number; y: number; label?: string; tone: PickFxTone; big: boolean }

const EVENT = 'tw:pickfx'

let seq = 0

export function firePickFx(
  x: number,
  y: number,
  opts: { label?: string; tone?: PickFxTone; big?: boolean; haptic?: 'tap' | 'lock' | 'miss' | false } = {},
): void {
  if (typeof window === 'undefined') return
  seq += 1
  const detail: Hit = { id: seq, x, y, label: opts.label, tone: opts.tone ?? 'red', big: opts.big ?? false }
  window.dispatchEvent(new CustomEvent<Hit>(EVENT, { detail }))
  if (opts.haptic !== false) haptic(opts.haptic ?? 'tap')
}

/** Fire from the centre of an element — the usual case: "this slot just got filled". */
export function firePickFxAt(
  el: Element | null | undefined,
  opts: Parameters<typeof firePickFx>[2] = {},
): void {
  if (!el) return
  const box = el.getBoundingClientRect()
  firePickFx(box.left + box.width / 2, box.top + box.height / 2, opts)
}

const INK: Record<PickFxTone, { a: string; b: string }> = {
  red: { a: 'bg-red', b: 'bg-sign' },
  sign: { a: 'bg-sign', b: 'bg-red' },
  ink: { a: 'bg-ink', b: 'bg-red' },
  away: { a: 'bg-sign', b: 'bg-ink' },
}

const RAYS = [0, 45, 90, 135, 180, 225, 270, 315]

export function PickFxLayer() {
  const [hits, setHits] = useState<Hit[]>([])

  useEffect(() => {
    function onHit(event: Event) {
      const hit = (event as CustomEvent<Hit>).detail
      setHits((list) => [...list.slice(-5), hit])
      window.setTimeout(() => setHits((list) => list.filter((h) => h.id !== hit.id)), 950)
    }
    window.addEventListener(EVENT, onHit)
    return () => window.removeEventListener(EVENT, onHit)
  }, [])

  if (hits.length === 0) return null

  return (
    // `dir="ltr"` so inline-start is the physical left the pointer coordinates are in.
    <div dir="ltr" aria-hidden="true" className="pointer-events-none fixed inset-0 z-[65] overflow-hidden">
      {hits.map((hit) => {
        const ink = INK[hit.tone]
        const d = hit.big ? 46 : 30
        const len = hit.big ? 30 : 20
        return (
          <div key={hit.id} className="absolute top-0" style={{ transform: `translate3d(${hit.x}px, ${hit.y}px, 0)`, insetInlineStart: 0 }}>
            {RAYS.map((a, i) => (
              <span
                key={a}
                className={`fx-ray ${i % 2 ? ink.b : ink.a}`}
                style={{ ['--a' as string]: `${a + 22}deg`, ['--d' as string]: `${d}px`, ['--len' as string]: `${i % 2 ? len * 0.7 : len}px` }}
              />
            ))}
            <span
              className="fx-ring block border-[4px] border-sign"
              style={{ width: d * 1.6, height: d * 1.6, marginInlineStart: 3, marginTop: 3 }}
            />
            <span
              className={`fx-ring block border-[4px] ${hit.tone === 'sign' || hit.tone === 'away' ? 'border-ink' : 'border-red'}`}
              style={{ width: d * 1.6, height: d * 1.6 }}
            />
            {hit.label && (
              <span className="fx-label block whitespace-nowrap border-plate border-ink bg-ink px-2.5 py-1">
                <span className="relative block font-poster text-[26px] leading-none">
                  <span className="plate-shift absolute inset-0 text-sign">{hit.label}</span>
                  <span className={`plate-top relative ${hit.tone === 'away' ? 'text-paper' : 'text-red'}`}>{hit.label}</span>
                </span>
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}
