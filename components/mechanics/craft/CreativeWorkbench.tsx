'use client'

/**
 * סדנת האוהדים — the one bench every craft recipe is worked on (spec §10, §36, §61, §67).
 *
 * The surface is the picture; the toolbar is small and under it on a phone, beside it on
 * a desk (two layouts, not one scaled). The bench owns the marks and their history — undo
 * is mandatory, redo is there, reset asks first — and hands back ONE thing when the player
 * says "מוכן": the normalised output and the engine's measure. No money, no reputation, no
 * route: the life decides what the work was worth.
 *
 * There is no score on the screen. The button reads "מוכן" when the target is met and
 * "עוד קצת" when it is not; pressing "עוד קצת" says what is missing, in words, and offers
 * to hand the piece in as it is. A child's bench (`constraints.hints`) says it while
 * working. A teen's timer, when the recipe allows one, hands the work in when it runs out.
 */

import { useCallback, useEffect, useMemo, useReducer, useRef, useState, type CSSProperties } from 'react'

import { EMPTY_BENCH, reduceBench } from '@/lib/game/craft/bench'
import { DEFAULT_PALETTE, SURFACE_BASE, brushWidth } from '@/lib/game/craft/recipes'
import { scoreCraft } from '@/lib/game/craft/score'
import { DEFAULT_MAX_MARKS, normaliseMark, toOutput } from '@/lib/game/craft/serialize'
import { SURFACE_BOX, type CraftColor, type CraftMark, type CraftOutput, type CraftRecipe } from '@/lib/game/craft/types'
import { t } from '@/lib/i18n'
import type { MechanicLevel } from '@/lib/mechanics/types'

import { CraftCanvas, type CanvasMode } from './CraftCanvas'
import { CraftToolbar } from './CraftToolbar'
import { moved, newPlaced, rotated, scaled, type Placeable } from './tools/place'

export type CraftDone = {
  output: CraftOutput
  /** progress toward the recipe's target, 0..1 — 1 is done */
  measure: number
  done: boolean
}

export type CreativeWorkbenchProps = {
  /** the recipe already resolved for the level (`recipeForLevel`) */
  recipe: CraftRecipe
  level: MechanicLevel
  onDone: (result: CraftDone) => void
  /** the words on the "מוכן" button when the caller has its own (the life's "back to the room") */
  doneLabel?: string
}

/** the modes a recipe's tools make: the three drawing tools, and "place" for anything put down */
function modesOf(recipe: CraftRecipe): CanvasMode[] {
  const modes: CanvasMode[] = []
  if (recipe.tools.includes('cut')) modes.push('cut')
  if (recipe.tools.includes('paint')) modes.push('paint')
  if (recipe.tools.includes('spray')) modes.push('spray')
  if (recipe.tools.some((tool) => tool === 'place' || tool === 'text' || tool === 'stamp' || tool === 'stencil')) modes.push('place')
  return modes.length > 0 ? modes : ['place']
}

export function CreativeWorkbench({ recipe, level, onDone, doneLabel }: CreativeWorkbenchProps) {
  const modes = useMemo(() => modesOf(recipe), [recipe])
  // scissors have no colour: a cut-only bench shows no palette
  const palette = useMemo(() => (modes.every((m) => m === 'cut') ? [] : recipe.palette ?? DEFAULT_PALETTE), [modes, recipe.palette])
  const base = SURFACE_BASE[recipe.surface]
  const maxMarks = recipe.constraints?.maxMarks ?? DEFAULT_MAX_MARKS
  const [bench, dispatch] = useReducer(reduceBench, EMPTY_BENCH)
  const [mode, setMode] = useState<CanvasMode>(modes[0] ?? 'place')
  const [color, setColor] = useState<CraftColor>(palette[0] ?? 'red')
  const [nudged, setNudged] = useState(false)
  const score = useMemo(() => scoreCraft(recipe, { marks: bench.marks }), [recipe, bench.marks])
  const full = bench.marks.length >= maxMarks
  const hasWork = bench.marks.length > 0
  const { w, h } = SURFACE_BOX[recipe.surface]

  const finish = useCallback(() => {
    const output = toOutput(recipe, bench.marks, base, score.measure)
    onDone({ output, measure: score.measure, done: score.done })
  }, [recipe, bench.marks, base, score, onDone])

  /* ------------------------------------------------------------ the teen's timer */
  const seconds = recipe.constraints?.timePressure ? (recipe.constraints.seconds ?? 90) : 0
  const [left, setLeft] = useState(seconds)
  const finishRef = useRef(finish)
  finishRef.current = finish
  useEffect(() => {
    if (seconds <= 0) return
    const started = Date.now()
    const id = window.setInterval(() => {
      const remaining = Math.max(0, seconds - Math.floor((Date.now() - started) / 1000))
      setLeft(remaining)
      if (remaining === 0) {
        window.clearInterval(id)
        finishRef.current()
      }
    }, 1000)
    return () => window.clearInterval(id)
  }, [seconds])

  /* ------------------------------------------------------------ marks in, marks changed */
  const addStroke = useCallback(
    (mark: CraftMark) => {
      if (full) return
      dispatch({ type: 'add', mark: normaliseMark(mark), select: false })
    },
    [full],
  )

  const place = useCallback(
    (kind: Placeable, value?: string) => {
      if (full) return
      // one card per wall: placing the stencil again moves the one that is there
      const existing = kind === 'stencil' ? bench.marks.findIndex((mark) => mark.kind === 'stencil') : -1
      if (existing >= 0) {
        dispatch({ type: 'select', index: existing })
        return
      }
      dispatch({ type: 'add', mark: newPlaced(kind, recipe, color, value), select: true })
      setMode('place')
    },
    [full, bench.marks, recipe, color],
  )

  const selectedMark = bench.selected !== null ? bench.marks[bench.selected] : undefined
  const update = useCallback(
    (next: (mark: CraftMark) => CraftMark) => {
      if (bench.selected === null || !selectedMark) return
      dispatch({ type: 'replace', index: bench.selected, mark: next(selectedMark) })
    },
    [bench.selected, selectedMark],
  )

  const pickColor = (next: CraftColor) => {
    setColor(next)
    if (selectedMark && selectedMark.kind !== 'cut') update((mark) => ({ ...mark, color: next }))
  }

  const canRotate = recipe.tools.includes('rotate')
  const canScale = recipe.tools.includes('scale')
  const step = recipe.constraints?.snap ?? 0.02

  const onKey = (key: string): boolean => {
    if (key === 'Escape') {
      if (bench.selected !== null) dispatch({ type: 'select', index: null })
      return bench.selected !== null
    }
    if (!selectedMark || mode !== 'place') return false
    switch (key) {
      case 'ArrowUp':
        update((mark) => moved(mark, recipe, mark.x, mark.y - step))
        return true
      case 'ArrowDown':
        update((mark) => moved(mark, recipe, mark.x, mark.y + step))
        return true
      case 'ArrowLeft':
        update((mark) => moved(mark, recipe, mark.x - step, mark.y))
        return true
      case 'ArrowRight':
        update((mark) => moved(mark, recipe, mark.x + step, mark.y))
        return true
      case '[':
        if (!canRotate) return false
        update((mark) => rotated(mark, -15))
        return true
      case ']':
        if (!canRotate) return false
        update((mark) => rotated(mark, 15))
        return true
      case '+':
      case '=':
        if (!canScale) return false
        update((mark) => scaled(mark, 1.15))
        return true
      case '-':
        if (!canScale) return false
        update((mark) => scaled(mark, 1 / 1.15))
        return true
      case 'Delete':
      case 'Backspace':
        if (bench.selected !== null) dispatch({ type: 'remove', index: bench.selected })
        return true
      default:
        return false
    }
  }

  const strokeMode = mode === 'cut' || mode === 'paint' || mode === 'spray' ? mode : null
  const brush = strokeMode ? brushWidth(recipe, strokeMode) : 0
  const hintKey = score.hintHe
  const showHint = !score.done && hintKey && (nudged || (recipe.constraints?.hints && hasWork))
  const primary = doneLabel && score.done ? doneLabel : t(score.done ? 'craft.done' : 'craft.more')

  return (
    <div className="flex flex-col gap-2 md:flex-row md:items-start md:gap-4" data-craft-bench={recipe.id} data-craft-level={level} data-craft-done={score.done ? '1' : '0'}>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div
          className="mx-auto w-full max-w-[calc(var(--bench-h)*var(--bench-ar))] [--bench-h:42dvh] md:[--bench-h:70dvh]"
          style={{ aspectRatio: `${w} / ${h}`, '--bench-ar': String(w / h) } as CSSProperties}
        >
          <CraftCanvas
            recipe={recipe}
            base={base}
            marks={bench.marks}
            selected={bench.selected}
            mode={mode}
            color={color}
            brush={brush}
            label={t('craft.canvas.label')}
            onStroke={addStroke}
            onSelect={(index) => dispatch({ type: 'select', index })}
            onMove={(index, x, y) => {
              const mark = bench.marks[index]
              if (mark) dispatch({ type: 'replace', index, mark: moved(mark, recipe, x, y) })
            }}
            onKey={onKey}
          />
        </div>
        {seconds > 0 && (
          <div
            className="h-1 w-full bg-ink/15"
            role="progressbar"
            aria-label={t('craft.time')}
            aria-valuemin={0}
            aria-valuemax={seconds}
            aria-valuenow={left}
            data-craft-timer={left}
          >
            <div className="h-full bg-red transition-[width] duration-1000 ease-linear motion-reduce:transition-none" style={{ width: `${(left / seconds) * 100}%` }} />
          </div>
        )}
        {selectedMark && mode === 'place' && (
          <p className="hidden font-body text-[11px] leading-snug text-muted md:block" data-craft-keys>
            {t('craft.keys')}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2 md:w-[220px] md:shrink-0">
        <CraftToolbar
          recipe={recipe}
          modes={modes}
          mode={mode}
          onMode={(next) => {
            setMode(next)
            if (next !== 'place') dispatch({ type: 'select', index: null })
          }}
          palette={palette}
          color={color}
          onColor={pickColor}
          onPlace={place}
          freeText={level !== 'child'}
          full={full}
          canUndo={bench.past.length > 0}
          canRedo={bench.future.length > 0}
          onUndo={() => dispatch({ type: 'undo' })}
          onRedo={() => dispatch({ type: 'redo' })}
          hasWork={hasWork}
          onReset={() => dispatch({ type: 'reset' })}
          selection={selectedMark && mode === 'place' ? { rotate: canRotate, scale: canScale } : null}
          onRotate={(deg) => update((mark) => rotated(mark, deg))}
          onScale={(factor) => update((mark) => scaled(mark, factor))}
          onDelete={() => bench.selected !== null && dispatch({ type: 'remove', index: bench.selected })}
        />
        {full && (
          <p className="font-body text-[12px] leading-snug text-muted" data-craft-full>
            {t('craft.full')}
          </p>
        )}
        <div className="flex flex-col gap-1.5">
          <button
            type="button"
            onClick={() => (score.done ? finish() : setNudged(true))}
            data-craft-done-button
            className={`flex min-h-tap w-full items-center justify-center px-4 font-sign text-[16px] transition-colors duration-press motion-reduce:transition-none ${
              score.done ? 'bg-red text-sheet active:bg-sign' : 'border-rule border-ink bg-sheet text-ink active:bg-ink active:text-sheet'
            }`}
          >
            {primary}
          </button>
          {showHint && (
            <p className="border-s-rule border-red ps-2 font-body text-[13px] leading-snug text-ink" data-craft-hint={hintKey} aria-live="polite">
              {t(hintKey)}
            </p>
          )}
          {nudged && !score.done && hasWork && (
            <button
              type="button"
              onClick={finish}
              data-craft-submit-anyway
              className="flex min-h-tap w-full items-center justify-center px-4 font-body text-[13px] text-muted underline underline-offset-4"
            >
              {t('craft.submit.anyway')}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
