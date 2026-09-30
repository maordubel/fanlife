'use client'

/**
 * המשטח עצמו — the SVG the hand works on (spec §11, §64–§66).
 *
 * One `<svg viewBox>` in the surface's box, Pointer Events with capture, `touch-action:
 * none` so the page never scrolls under a stroke. The live stroke is a `<path>` whose `d` is
 * written straight to the DOM once per animation frame from a ref — React sees the stroke
 * only when the pointer lifts and the tool turns the trail into ONE mark. A drag of a placed
 * mark is the same: a transform on that mark's group, committed on release.
 *
 * Coordinates go through the svg's own screen matrix, so the letterbox a `meet` viewBox
 * leaves on a phone is never the bench's problem. Everything the canvas reports is 0..1.
 *
 * Keyboard: the svg is focusable and forwards keys to the bench (arrows move the selected
 * mark, `[` `]` turn it, `+` `-` size it, Delete removes it) — a place tool nobody can drive
 * without a finger is a place tool a keyboard user does not have (spec §66).
 */

import { useCallback, useEffect, useId, useRef, type KeyboardEvent, type PointerEvent } from 'react'

import { SURFACE_BASE } from '@/lib/game/craft/recipes'
import { SURFACE_BOX, type CraftColor, type CraftMark, type CraftRecipe } from '@/lib/game/craft/types'

import { GrainFilter, Marks, SURFACES } from './render'
import { TOKEN } from './render/tokens'
import { cutTool } from './tools/cut'
import { paintTool } from './tools/paint'
import { hitTest, markBox } from './tools/place'
import type { Pt, StrokeTool } from './tools/shared'
import { sprayTool } from './tools/spray'

export type CanvasMode = 'cut' | 'paint' | 'spray' | 'place'

const STROKE_TOOLS: Record<Exclude<CanvasMode, 'place'>, StrokeTool> = { cut: cutTool, paint: paintTool, spray: sprayTool }

export type CraftCanvasProps = {
  recipe: CraftRecipe
  base?: CraftColor
  marks: readonly CraftMark[]
  selected: number | null
  mode: CanvasMode
  color: CraftColor
  /** the stroke's width for the current stroke tool, as a fraction of the surface's width */
  brush: number
  label: string
  onStroke: (mark: CraftMark) => void
  onSelect: (index: number | null) => void
  /** a placed mark was dragged and released here (normalised) */
  onMove: (index: number, x: number, y: number) => void
  /** a key the bench may act on; return true when it did */
  onKey: (key: string) => boolean
}

type Drag =
  | { kind: 'stroke'; id: number; points: Pt[]; dirty: boolean }
  | { kind: 'move'; id: number; index: number; from: Pt; at: Pt; el: SVGGElement | null }

export function CraftCanvas({ recipe, base, marks, selected, mode, color, brush, label, onStroke, onSelect, onMove, onKey }: CraftCanvasProps) {
  const uid = useId().replace(/:/g, '')
  const svgRef = useRef<SVGSVGElement>(null)
  const liveRef = useRef<SVGPathElement>(null)
  const drag = useRef<Drag | null>(null)
  const frame = useRef<number | null>(null)
  const { w, h } = SURFACE_BOX[recipe.surface]
  const Surface = SURFACES[recipe.surface]
  const ground = base ?? SURFACE_BASE[recipe.surface]

  /** client → 0..1 of the surface, through the svg's own matrix */
  const toUnit = useCallback(
    (clientX: number, clientY: number): Pt => {
      const svg = svgRef.current
      const ctm = svg?.getScreenCTM()
      if (!svg || !ctm) return [0.5, 0.5]
      const p = new DOMPoint(clientX, clientY).matrixTransform(ctm.inverse())
      return [Math.max(0, Math.min(1, p.x / w)), Math.max(0, Math.min(1, p.y / h))]
    },
    [w, h],
  )

  const paintLive = useCallback(() => {
    frame.current = null
    const d = drag.current
    const path = liveRef.current
    if (!d || !path) return
    if (d.kind === 'stroke') {
      if (!d.dirty) return
      d.dirty = false
      path.setAttribute('d', d.points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${(x * w).toFixed(1)} ${(y * h).toFixed(1)}`).join(' '))
    } else if (d.el) {
      d.el.setAttribute('transform', `translate(${((d.at[0] - d.from[0]) * w).toFixed(1)} ${((d.at[1] - d.from[1]) * h).toFixed(1)})`)
    }
  }, [w, h])

  const schedule = useCallback(() => {
    if (frame.current === null) frame.current = requestAnimationFrame(paintLive)
  }, [paintLive])

  useEffect(
    () => () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current)
    },
    [],
  )

  const down = (event: PointerEvent<SVGSVGElement>) => {
    if (!event.isPrimary || drag.current) return
    const svg = event.currentTarget
    const [x, y] = toUnit(event.clientX, event.clientY)
    svg.focus({ preventScroll: true })
    if (mode === 'place') {
      const hit = hitTest(marks, recipe, x, y)
      onSelect(hit)
      if (hit === null) return
      svg.setPointerCapture(event.pointerId)
      const el = svg.querySelector<SVGGElement>('[data-craft-selected]')
      drag.current = { kind: 'move', id: event.pointerId, index: hit, from: [x, y], at: [x, y], el }
      return
    }
    svg.setPointerCapture(event.pointerId)
    const path = liveRef.current
    if (path) {
      path.setAttribute('stroke', mode === 'cut' ? TOKEN.ink : TOKEN[color])
      path.setAttribute('stroke-width', String((mode === 'cut' ? 0.006 : brush) * w))
      path.setAttribute('stroke-dasharray', mode === 'cut' ? `${w * 0.012} ${w * 0.01}` : '')
      path.setAttribute('opacity', mode === 'spray' ? '0.85' : '1')
      path.setAttribute('filter', mode === 'spray' ? `url(#craft-grain-${uid})` : '')
      path.setAttribute('d', `M${(x * w).toFixed(1)} ${(y * h).toFixed(1)} l0 0`)
    }
    drag.current = { kind: 'stroke', id: event.pointerId, points: [[x, y]], dirty: false }
    event.preventDefault()
  }

  const move = (event: PointerEvent<SVGSVGElement>) => {
    const d = drag.current
    if (!d || d.id !== event.pointerId) return
    const p = toUnit(event.clientX, event.clientY)
    if (d.kind === 'stroke') {
      const last = d.points[d.points.length - 1] as Pt
      // sample only when the hand actually moved a little: a still finger adds nothing
      if (Math.hypot(p[0] - last[0], p[1] - last[1]) < 0.004) return
      d.points.push(p)
      d.dirty = true
    } else {
      d.at = p
    }
    schedule()
  }

  const up = (event: PointerEvent<SVGSVGElement>) => {
    const d = drag.current
    if (!d || d.id !== event.pointerId) return
    drag.current = null
    if (frame.current !== null) {
      cancelAnimationFrame(frame.current)
      frame.current = null
    }
    const svg = event.currentTarget
    if (svg.hasPointerCapture(event.pointerId)) svg.releasePointerCapture(event.pointerId)
    if (d.kind === 'stroke') {
      liveRef.current?.setAttribute('d', '')
      if (mode === 'place') return
      const mark = STROKE_TOOLS[mode](d.points, { recipe, color })
      if (mark) onStroke(mark)
      return
    }
    d.el?.removeAttribute('transform')
    const mark = marks[d.index]
    if (!mark) return
    const dx = d.at[0] - d.from[0]
    const dy = d.at[1] - d.from[1]
    if (Math.abs(dx) < 0.002 && Math.abs(dy) < 0.002) return
    onMove(d.index, mark.x + dx, mark.y + dy)
  }

  const cancel = (event: PointerEvent<SVGSVGElement>) => {
    const d = drag.current
    if (!d || d.id !== event.pointerId) return
    drag.current = null
    liveRef.current?.setAttribute('d', '')
    if (d.kind === 'move') d.el?.removeAttribute('transform')
  }

  const key = (event: KeyboardEvent<SVGSVGElement>) => {
    if (onKey(event.key)) event.preventDefault()
  }

  const selectedMark = selected !== null ? marks[selected] : undefined
  const box = selectedMark ? markBox(selectedMark, recipe) : null

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${w} ${h}`}
      className="block h-full w-full select-none outline-none focus-visible:outline-hair focus-visible:outline-offset-2 focus-visible:outline-ink/50"
      style={{ touchAction: 'none' }}
      role="img"
      aria-label={label}
      tabIndex={0}
      data-craft-canvas={recipe.id}
      data-craft-mode={mode}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={cancel}
      onKeyDown={key}
    >
      <defs>
        <GrainFilter uid={uid} />
      </defs>
      <Surface
        surface={recipe.surface}
        base={ground}
        uid={uid}
        overlay={
          box ? (
            <rect
              x={box.x * w - 4}
              y={box.y * h - 4}
              width={box.w * w + 8}
              height={box.h * h + 8}
              transform={selectedMark?.rotate ? `rotate(${selectedMark.rotate} ${selectedMark.x * w} ${selectedMark.y * h})` : undefined}
              fill="none"
              stroke={TOKEN.ink}
              strokeWidth={1.5}
              strokeDasharray="6 4"
              pointerEvents="none"
              data-craft-selection
            />
          ) : null
        }
      >
        <Marks marks={marks} recipe={recipe} uid={uid} editing selected={mode === 'place' ? selected : null} />
        <path ref={liveRef} d="" fill="none" strokeLinecap="round" strokeLinejoin="round" pointerEvents="none" data-craft-live />
      </Surface>
    </svg>
  )
}
