'use client'

import { useEffect, useRef, useState } from 'react'

import { haptic } from '@/lib/play/haptics'

/**
 * גרירה — drag a thing onto a zone, with the finger (delta 87).
 *
 * Maor, 23.9.2026: gates 4, 5 and 8 must be a real drag, and every pick must feel like
 * a pick. So one small pointer engine, shared: a source (`useDragSource`) lifts a ghost
 * copy of itself that follows the finger, the zone under the finger (`data-drop="<id>"`)
 * lights up, and letting go over a zone calls `onDrop(zoneId)`.
 *
 * A TAP is not a drag. Under 8px of travel the pointer is released untouched and the
 * element's own `onClick` runs, so every drag target keeps its tap-to-select path —
 * which is also the keyboard and screen-reader path (WCAG 2.5.7, dragging movements: a
 * single-pointer alternative must exist). Nothing here replaces a click; it adds one.
 *
 * Inside a horizontal rail pass `axis: 'up'`: sideways travel is left to the browser so
 * the rail still scrolls, and only a move UP off the rail picks the item up.
 */

export type DropHandler = (zone: string, payload: string) => void

const EVENT = 'tw:drag'

type DragState = { active: boolean; payload: string | null; zone: string | null }

function announce(detail: DragState) {
  window.dispatchEvent(new CustomEvent<DragState>(EVENT, { detail }))
}

/** Which payload is in the air right now, and over which zone — for "drop here" hints. */
export function useDragActive(): DragState {
  const [state, setState] = useState<DragState>({ active: false, payload: null, zone: null })
  useEffect(() => {
    const on = (event: Event) => setState((event as CustomEvent<DragState>).detail)
    window.addEventListener(EVENT, on)
    return () => window.removeEventListener(EVENT, on)
  }, [])
  return state
}

export function dropZone(id: string): { 'data-drop': string } {
  return { 'data-drop': id }
}

function zoneAt(x: number, y: number): HTMLElement | null {
  const hit = document.elementFromPoint(x, y)
  return (hit?.closest('[data-drop]') as HTMLElement | null) ?? null
}

export function useDragSource({
  payload,
  onDrop,
  disabled = false,
  axis = 'any',
}: {
  payload: string
  onDrop: DropHandler
  disabled?: boolean
  axis?: 'any' | 'up'
}) {
  const latest = useRef(onDrop)
  latest.current = onDrop
  const suppressClick = useRef(false)

  function onPointerDown(event: React.PointerEvent<HTMLElement>) {
    if (disabled || event.button !== 0) return
    const el = event.currentTarget
    const startX = event.clientX
    const startY = event.clientY
    const id = event.pointerId
    let ghost: HTMLElement | null = null
    let over: HTMLElement | null = null
    let offX = 0
    let offY = 0

    function lift(x: number, y: number) {
      const box = el.getBoundingClientRect()
      offX = startX - box.left
      offY = startY - box.top
      ghost = el.cloneNode(true) as HTMLElement
      ghost.removeAttribute('id')
      ghost.setAttribute('aria-hidden', 'true')
      ghost.classList.add('drag-ghost')
      ghost.style.width = `${box.width}px`
      ghost.style.height = `${box.height}px`
      ghost.style.margin = '0'
      // physical origin on purpose: the translation below is in client (physical) pixels
      ghost.style.insetInlineStart = 'auto'
      ghost.style.setProperty('left', '0px')
      ghost.style.direction = getComputedStyle(el).direction
      const inner = document.createElement('div')
      inner.className = 'animate-fx-lift'
      while (ghost.firstChild) inner.appendChild(ghost.firstChild)
      ghost.appendChild(inner)
      document.body.appendChild(ghost)
      el.setAttribute('data-drag-source', 'true')
      place(x, y)
      haptic('tap')
      announce({ active: true, payload, zone: null })
    }

    function place(x: number, y: number) {
      if (!ghost) return
      // pointer coordinates are physical, so the ghost is pinned to the physical origin
      // (see `lift`) and translated by them directly
      ghost.style.transform = `translate3d(${x - offX}px, ${y - offY}px, 0)`
    }

    function move(ev: PointerEvent) {
      if (ev.pointerId !== id) return
      const dx = ev.clientX - startX
      const dy = ev.clientY - startY
      if (!ghost) {
        if (Math.hypot(dx, dy) < 8) return
        if (axis === 'up' && !(dy < -8 && Math.abs(dy) > Math.abs(dx))) {
          cleanup()
          return
        }
        lift(ev.clientX, ev.clientY)
      }
      ev.preventDefault()
      place(ev.clientX, ev.clientY)
      const zone = zoneAt(ev.clientX, ev.clientY)
      if (zone !== over) {
        over?.removeAttribute('data-drop-over')
        zone?.setAttribute('data-drop-over', 'true')
        over = zone
        if (zone) haptic('tap')
        announce({ active: true, payload, zone: zone?.getAttribute('data-drop') ?? null })
      }
    }

    function up(ev: PointerEvent) {
      if (ev.pointerId !== id) return
      if (ghost) {
        suppressClick.current = true
        window.setTimeout(() => (suppressClick.current = false), 0)
        const zone = zoneAt(ev.clientX, ev.clientY)
        const zoneId = zone?.getAttribute('data-drop')
        if (zoneId) latest.current(zoneId, payload)
      }
      cleanup()
    }

    function cleanup() {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', cancel)
      over?.removeAttribute('data-drop-over')
      el.removeAttribute('data-drag-source')
      if (ghost) {
        ghost.remove()
        ghost = null
        announce({ active: false, payload: null, zone: null })
      }
    }

    function cancel(ev: PointerEvent) {
      if (ev.pointerId === id) cleanup()
    }

    window.addEventListener('pointermove', move, { passive: false })
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', cancel)
  }

  function onClickCapture(event: React.MouseEvent) {
    if (suppressClick.current) {
      event.preventDefault()
      event.stopPropagation()
      suppressClick.current = false
    }
  }

  return {
    onPointerDown,
    onClickCapture,
    style: { touchAction: axis === 'up' ? 'pan-x' : 'none' } as const,
    'data-draggable': 'true',
  }
}
