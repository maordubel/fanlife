import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import * as React from 'react'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { FilmSkipButton, skipKeyHandler } from '@/components/life/FilmSkipButton'
import { MESSAGES } from '@/lib/i18n'
import { isSkipKey, nextFilmStep, outcomeForPlayError } from '@/lib/life/filmPlayback'

// the components are compiled with the classic JSX runtime under vitest
;(globalThis as { React?: typeof React }).React = React

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8')

describe('one playback policy for both films (upgrade plan §6)', () => {
  it('autoplay allowed → the film runs', () => {
    expect(nextFilmStep('started')).toBe('run')
  })

  it('autoplay with sound refused → retry muted', () => {
    expect(nextFilmStep('refused-with-sound')).toBe('retry-muted')
    expect(outcomeForPlayError({ name: 'NotAllowedError' }, false)).toBe('refused-with-sound')
  })

  it('muted refused too → the ▶ gate; refused after the gate’s own gesture → fallback', () => {
    expect(nextFilmStep('refused-muted')).toBe('gate')
    expect(outcomeForPlayError({ name: 'NotAllowedError' }, true)).toBe('refused-muted')
    expect(nextFilmStep('refused-muted', { gestured: true })).toBe('fallback')
  })

  it('media error → fallback', () => {
    expect(nextFilmStep('error')).toBe('fallback')
    expect(outcomeForPlayError({ name: 'NotSupportedError' }, true)).toBe('error')
  })

  it('YouTube / network blocked → fallback', () => {
    expect(nextFilmStep('blocked')).toBe('fallback')
  })

  it('an AbortError (load() interrupting play()) says nothing', () => {
    expect(outcomeForPlayError({ name: 'AbortError' }, true)).toBeNull()
    expect(outcomeForPlayError(null, false)).toBeNull()
  })

  it('a refusal never walks straight to fallback without the gate being offered first', () => {
    // with sound → muted → gate → (gesture) → fallback: four steps, never fewer
    const path = [
      nextFilmStep('refused-with-sound'),
      nextFilmStep('refused-muted'),
      nextFilmStep('refused-muted', { gestured: true }),
    ]
    expect(path).toEqual(['retry-muted', 'gate', 'fallback'])
  })

  it('both films consume the shared policy and the shared skip control', () => {
    for (const file of ['components/life/OpeningFilm.tsx', 'components/life/HistoricalCutscene.tsx']) {
      const text = read(file)
      expect(text, file).toContain("from '@/lib/life/filmPlayback'")
      expect(text, file).toContain('nextFilmStep(')
      expect(text, file).toContain('<FilmSkipButton')
      expect(text, file).toContain('useDialog')
    }
  })
})

describe('FilmSkipButton (upgrade plan §7)', () => {
  const html = renderToStaticMarkup(createElement(FilmSkipButton, { onSkip: () => undefined, 'data-life': 'opening-skip' }))

  it('renders the label, an aria-label, the icon and the Esc hint', () => {
    const label = (MESSAGES as Record<string, string>)['life.film.skip']
    expect(label).toBe('דלג על הסרטון')
    expect(html).toContain(`aria-label="${label}"`)
    expect(html).toContain(`>${label}<`)
    expect(html).toContain('⏭')
    expect(html).toContain('<kbd')
    expect(html).toContain('data-life="opening-skip"')
    expect(html).toContain('type="button"')
  })

  it('Escape calls onSkip once and stops the press; other keys do nothing', () => {
    const onSkip = vi.fn()
    const handler = skipKeyHandler(onSkip)
    const stop = vi.fn()
    const prevent = vi.fn()
    handler({ key: 'Enter', stopPropagation: stop, preventDefault: prevent })
    expect(onSkip).not.toHaveBeenCalled()
    handler({ key: 'Escape', stopPropagation: stop, preventDefault: prevent })
    expect(onSkip).toHaveBeenCalledTimes(1)
    expect(stop).toHaveBeenCalledTimes(1)
    expect(isSkipKey({ key: 'Escape' })).toBe(true)
  })

  it('click calls onSkip', () => {
    const onSkip = vi.fn()
    const el = FilmSkipButton({ onSkip }) as React.ReactElement<{ onClick: () => void }>
    el.props.onClick()
    expect(onSkip).toHaveBeenCalledTimes(1)
  })

  it('is styled for reading, not hiding: 44px+, full opacity, ≥14px, focus ring, safe-area, logical insets', () => {
    const css = read('app/globals.css')
    const block = css.slice(css.indexOf('FILM SKIP — begin'), css.indexOf('FILM SKIP — end'))
    expect(block).toMatch(/min-height: var\(--tap\)/)
    expect(block).toMatch(/min-width: 44px/)
    expect(block).toMatch(/opacity: 1;/)
    expect(block).not.toMatch(/opacity: 0/)
    for (const [, px] of block.matchAll(/font-size: (\d+)px/g)) expect(Number(px)).toBeGreaterThanOrEqual(14)
    expect(block).toContain(':focus-visible')
    expect(block).toContain('env(safe-area-inset-bottom)')
    expect(block).toContain('inset-inline-start')
    expect(block).toContain('inset-block-end')
    expect(block).toContain('border-radius: 0')
    expect(block).not.toMatch(/#[0-9a-f]{3,8}\b/i)
    expect(block).toContain('rgb(var(--red))')
    expect(block).toContain('rgb(var(--ink))')
  })
})
