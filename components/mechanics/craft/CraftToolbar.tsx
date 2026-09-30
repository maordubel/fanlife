'use client'

/**
 * הכלים — small, under the surface on a phone, beside it on a desk (spec §61, §65).
 *
 * Every control is a labelled 48px button: the tool's name is written on it, the colour
 * chip carries its name, nothing is colour-only (spec §66). What the bar shows is derived
 * from the recipe — a bench with one tool has no tool row; a recipe without `rotate` has no
 * turn buttons — so the shirt's bar and the confetti's bar are the same component with
 * different rows.
 */

import { useState, type ReactNode } from 'react'

import { placeables } from '@/lib/game/craft/recipes'
import type { CraftColor, CraftRecipe } from '@/lib/game/craft/types'
import { t, type MessageKey } from '@/lib/i18n'

import type { CanvasMode } from './CraftCanvas'
import { StampMotif } from './render/stamps'
import { TOKEN, contrastOn } from './render/tokens'
import type { Placeable } from './tools/place'

const MODE_KEY: Record<CanvasMode, MessageKey> = {
  cut: 'craft.tool.cut',
  paint: 'craft.tool.paint',
  spray: 'craft.tool.spray',
  place: 'craft.tool.place',
}

const COLOR_KEY: Record<CraftColor, MessageKey> = {
  red: 'craft.color.red',
  ink: 'craft.color.ink',
  sheet: 'craft.color.sheet',
  concrete: 'craft.color.concrete',
  sign: 'craft.color.sign',
}

const WORDS: readonly MessageKey[] = ['craft.word.1', 'craft.word.2', 'craft.word.3', 'craft.word.4']

export type CraftToolbarProps = {
  recipe: CraftRecipe
  modes: readonly CanvasMode[]
  mode: CanvasMode
  onMode: (mode: CanvasMode) => void
  palette: readonly CraftColor[]
  color: CraftColor
  onColor: (color: CraftColor) => void
  /** put a new thing down (a word, a stamp by id, a stripe, the stencil card) */
  onPlace: (kind: Placeable, value?: string) => void
  /** free typing is a teen's and an adult's; a child picks from the words */
  freeText: boolean
  full: boolean
  canUndo: boolean
  canRedo: boolean
  onUndo: () => void
  onRedo: () => void
  hasWork: boolean
  onReset: () => void
  /** the selected mark's own controls, when there is one and the recipe has the tools */
  selection: { rotate: boolean; scale: boolean } | null
  onRotate: (degrees: number) => void
  onScale: (factor: number) => void
  onDelete: () => void
}

function Key({ children, onClick, pressed, label, className = '', disabled = false, testId }: { children: ReactNode; onClick: () => void; pressed?: boolean; label?: string; className?: string; disabled?: boolean; testId?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={pressed}
      aria-label={label}
      data-craft-key={testId}
      className={`flex min-h-tap min-w-tap items-center justify-center gap-1 border-rule px-2 font-sign text-[13px] leading-none transition-colors duration-press motion-reduce:transition-none disabled:opacity-35 ${
        pressed ? 'border-ink bg-ink text-sheet' : 'border-ink bg-sheet text-ink active:bg-ink active:text-sheet'
      } ${className}`}
    >
      {children}
    </button>
  )
}

export function CraftToolbar(props: CraftToolbarProps) {
  const { recipe, modes, mode, onMode, palette, color, onColor, onPlace, freeText, full, canUndo, canRedo, onUndo, onRedo, hasWork, onReset, selection, onRotate, onScale, onDelete } = props
  const [typing, setTyping] = useState(false)
  const [text, setText] = useState('')
  const [confirm, setConfirm] = useState(false)
  const tray = mode === 'place' ? placeables(recipe) : []
  const maxText = recipe.constraints?.maxText ?? 12

  const add = (word: string) => {
    const value = word.trim().slice(0, maxText)
    if (!value) return
    onPlace('text', value)
    setText('')
    setTyping(false)
  }

  return (
    <div className="flex flex-col gap-1.5" data-craft-toolbar>
      {(modes.length > 1 || palette.length > 1) && (
        <div className="flex flex-wrap gap-1">
          {modes.length > 1 &&
            modes.map((m) => (
              <Key key={m} onClick={() => onMode(m)} pressed={mode === m} testId={`mode-${m}`}>
                {t(MODE_KEY[m])}
              </Key>
            ))}
          {palette.length > 1 && (
            <div className="ms-auto flex gap-1" role="group" aria-label={t('craft.tray.text')}>
              {palette.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => onColor(c)}
                  aria-pressed={color === c}
                  aria-label={t(COLOR_KEY[c])}
                  data-craft-color={c}
                  className={`flex min-h-tap min-w-tap flex-col items-center justify-center gap-0.5 border-rule px-1 ${color === c ? 'border-ink' : 'border-ink/30'}`}
                >
                  <span aria-hidden="true" className="block h-4 w-6 border-hair border-ink/50" style={{ background: TOKEN[c] }} />
                  <span className="font-body text-[10px] leading-none text-ink">{t(COLOR_KEY[c])}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {tray.length > 0 && (
        <div className="flex flex-wrap gap-1" role="group" aria-label={t('craft.tool.place')}>
          {tray.includes('text') && (
            <Key onClick={() => setTyping((v) => !v)} pressed={typing} disabled={full} testId="tray-text">
              {t('craft.tray.text')}
            </Key>
          )}
          {tray.includes('stamp') &&
            (recipe.stamps ?? []).map((id) => (
              <Key key={id} onClick={() => onPlace('stamp', id)} disabled={full} label={t(`craft.stamp.${id}` as MessageKey)} testId={`tray-stamp-${id}`}>
                <svg viewBox="-22 -22 44 44" width="22" height="22" aria-hidden="true">
                  <StampMotif id={id} fill={TOKEN[color]} line={contrastOn(color)} />
                </svg>
                <span>{t(`craft.stamp.${id}` as MessageKey)}</span>
              </Key>
            ))}
          {tray.includes('stripe') && (
            <Key onClick={() => onPlace('stripe')} disabled={full} testId="tray-stripe">
              {t('craft.tray.stripe')}
            </Key>
          )}
          {tray.includes('stencil') && (
            <Key onClick={() => onPlace('stencil')} disabled={full} testId="tray-stencil">
              {t('craft.tray.stencil')}
            </Key>
          )}
        </div>
      )}

      {typing && (
        <div className="flex flex-wrap items-center gap-1 border-s-rule border-red ps-2" data-craft-words>
          {WORDS.map((key) => (
            <Key key={key} onClick={() => add(t(key))} testId={`word-${key.slice(-1)}`}>
              {t(key)}
            </Key>
          ))}
          {freeText && (
            <form
              className="flex min-w-0 flex-1 gap-1"
              onSubmit={(event) => {
                event.preventDefault()
                add(text)
              }}
            >
              <input
                value={text}
                onChange={(event) => setText(event.target.value)}
                maxLength={maxText}
                placeholder={t('craft.text.placeholder')}
                aria-label={t('craft.text.placeholder')}
                data-craft-text
                className="min-h-tap min-w-0 flex-1 border-rule border-ink bg-sheet px-2 font-body text-[15px] text-ink placeholder:text-muted"
              />
              <Key onClick={() => add(text)} disabled={text.trim() === ''} testId="text-add">
                {t('craft.text.add')}
              </Key>
            </form>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-1">
        <Key onClick={onUndo} disabled={!canUndo} testId="undo">
          {t('craft.undo')}
        </Key>
        <Key onClick={onRedo} disabled={!canRedo} testId="redo">
          {t('craft.redo')}
        </Key>
        {confirm ? (
          <span className="flex flex-wrap items-center gap-1" data-craft-confirm>
            <span className="px-1 font-body text-[13px] text-ink">{t('craft.reset.ask')}</span>
            <Key
              onClick={() => {
                onReset()
                setConfirm(false)
              }}
              className="!border-red !bg-red !text-sheet"
              testId="reset-yes"
            >
              {t('craft.reset.yes')}
            </Key>
            <Key onClick={() => setConfirm(false)} testId="reset-no">
              {t('craft.reset.no')}
            </Key>
          </span>
        ) : (
          <Key onClick={() => (hasWork ? setConfirm(true) : undefined)} disabled={!hasWork} testId="reset">
            {t('craft.reset')}
          </Key>
        )}
        {selection && (
          <span className="ms-auto flex gap-1" data-craft-selection-keys>
            {selection.rotate && (
              <>
                <Key onClick={() => onRotate(-15)} label={t('craft.rotate.ccw')} testId="rotate-ccw">
                  <span aria-hidden="true">↺</span>
                </Key>
                <Key onClick={() => onRotate(15)} label={t('craft.rotate.cw')} testId="rotate-cw">
                  <span aria-hidden="true">↻</span>
                </Key>
              </>
            )}
            {selection.scale && (
              <>
                <Key onClick={() => onScale(1 / 1.15)} label={t('craft.scale.down')} testId="scale-down">
                  <span aria-hidden="true" className="font-mono tabular-nums">−</span>
                </Key>
                <Key onClick={() => onScale(1.15)} label={t('craft.scale.up')} testId="scale-up">
                  <span aria-hidden="true" className="font-mono tabular-nums">+</span>
                </Key>
              </>
            )}
            <Key onClick={onDelete} label={t('craft.delete')} testId="delete">
              <span aria-hidden="true">✕</span>
            </Key>
          </span>
        )}
      </div>
    </div>
  )
}
