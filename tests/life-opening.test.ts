import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import * as React from 'react'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { Opening } from '@/components/life/Opening'
import { OpeningDocumentary } from '@/components/life/OpeningDocumentary'
import { MESSAGES } from '@/lib/i18n'
import { isYellow } from '@/lib/isYellow'
import { resolvePrologueAnchor } from '@/lib/life/anchor-server'
import { beatForFilmMs, captionPieces, FILM, OPENING, OPENING_MODES, openingLines, openingMs } from '@/lib/life/opening'
import { OPENING_AIR, OPENING_AIR_KEYS } from '@/lib/life/openingAir'
import {
  choosePath,
  clockFor,
  committed,
  FILM_CLOCK,
  FILM_START,
  signalForPlayError,
  step,
  worstAutomaticWaitMs,
  type FilmSignal,
  type FilmState,
} from '@/lib/life/openingAttempt'
import { LifeAudio } from '@/lib/life/runtime/audio'
import catalogue90g from '@/messages/he.stage.life90g.json'

/**
 * הפתיח — video first, and a documentary that needs nothing (owner spec 25.9.2026,
 * "OPENING DOCUMENTARY HYBRID"). Architecture §63, content §64, visual semantics §65, the
 * failure matrix §66 — each walked here without a browser. The browser half (blocked media,
 * refused autoplay, reduced motion, skip, handoff into the game) is in the delta-90 report.
 */

// the components are compiled with the classic JSX runtime under vitest
;(globalThis as { React?: typeof React }).React = React

const ROOT = process.cwd()
const read = (path: string) => readFileSync(join(ROOT, path), 'utf8')
const run = (signals: FilmSignal[], from: FilmState = FILM_START) => signals.reduce(step, from)
const anchor = resolvePrologueAnchor()

describe('the film is tried fairly — the retry state machine (§34–37, §57–58)', () => {
  it('walks every row of the failure matrix to the right answer', () => {
    // WebM (or MP4) plays straight away
    expect(run(['playing']).attempt).toBe('rolling')
    // the network was slow but recovered inside the retry window
    expect(run(['deadline', 'data', 'playing']).attempt).toBe('rolling')
    // autoplay refused, the gesture worked
    expect(run(['refused', 'tap', 'playing']).attempt).toBe('rolling')
    // codec unsupported / both sources failed / offline
    expect(run(['broken']).attempt).toBe('failed')
    expect(run(['deadline', 'broken']).attempt).toBe('failed')
    expect(run(['deadline', 'deadline']).attempt).toBe('failed')
    // poster failed but the media is fine and never started: one tap is offered, then we go
    expect(run(['data', 'deadline', 'deadline']).attempt).toBe('gesture-ready')
    expect(run(['data', 'deadline', 'deadline', 'deadline']).attempt).toBe('failed')
    // a gesture that still could not start it is a real failure, not a second prompt
    expect(run(['refused', 'tap', 'refused']).attempt).toBe('failed')
    expect(run(['refused', 'tap', 'deadline']).attempt).toBe('failed')
  })

  it('has two automatic attempts and one gesture — never a loop', () => {
    expect(run(['deadline']).attempt).toBe('retry-load')
    // no path returns to `initial` or `retry-load` once it has left them
    const signals: FilmSignal[] = ['playing', 'data', 'refused', 'broken', 'deadline', 'tap', 'stalled']
    const seen = new Set<string>()
    const walk = (state: FilmState, depth: number) => {
      seen.add(state.attempt)
      if (depth === 0) return
      for (const signal of signals) {
        const next = step(state, signal)
        if (state.attempt !== 'initial') expect(next.attempt, `${state.attempt} → ${signal}`).not.toBe('initial')
        if (!['initial', 'retry-load'].includes(state.attempt)) expect(next.attempt).not.toBe('retry-load')
        walk(next, depth - 1)
      }
    }
    walk(FILM_START, 5)
    expect([...seen].sort()).toEqual(['failed', 'gesture-ready', 'initial', 'retry-load', 'rolling'])
  })

  it('never keeps a player looking at a poster for long (§36)', () => {
    expect(worstAutomaticWaitMs()).toBeLessThanOrEqual(5000)
    expect(worstAutomaticWaitMs()).toBeGreaterThanOrEqual(3000)
    expect(FILM_CLOCK.handover).toBeGreaterThanOrEqual(300)
    expect(FILM_CLOCK.handover).toBeLessThanOrEqual(500)
    expect(clockFor(run(['playing']))).toBeNull()
    expect(clockFor(run(['broken']))).toBeNull()
  })

  it('commits to one path — a late load never flips the documentary back to the film (§58)', () => {
    const failed = run(['broken'])
    expect(committed(failed)).toBe(true)
    for (const signal of ['playing', 'data', 'tap', 'deadline'] as FilmSignal[]) expect(step(failed, signal).attempt).toBe('failed')
    const rolling = run(['playing'])
    for (const signal of ['refused', 'deadline', 'tap', 'data'] as FilmSignal[]) expect(step(rolling, signal).attempt).toBe('rolling')
    // the one rescue: a film that froze under the player
    expect(step(rolling, 'stalled').attempt).toBe('failed')
  })

  it('reads a refused play() for what it is', () => {
    expect(signalForPlayError({ name: 'NotAllowedError' })).toBe('refused')
    expect(signalForPlayError({ name: 'NotSupportedError' })).toBe('broken')
    // load() interrupting play() is not a failure
    expect(signalForPlayError({ name: 'AbortError' })).toBeNull()
  })

  it('a frozen film hands over at the matching beat, and a fresh one at the start', () => {
    expect(beatForFilmMs(0)).toBe(0)
    expect(beatForFilmMs(FILM.ms)).toBe(OPENING.length - 1)
    let last = 0
    for (let ms = 0; ms <= FILM.ms; ms += 500) {
      const beat = beatForFilmMs(ms)
      expect(beat).toBeGreaterThanOrEqual(last)
      last = beat
    }
  })
})

describe('the orchestrator — film first, documentary when it cannot (§63)', () => {
  it('chooses the film unless motion is reduced', () => {
    expect(choosePath(false)).toBe('film')
    expect(choosePath(true)).toBe('documentary')
  })

  it('renders the film by default, and the film only', () => {
    const html = renderToStaticMarkup(createElement(Opening, { anchor, onDone: () => undefined }))
    expect(html).toContain('<video')
    expect(html).toContain('data-path="film"')
    expect(html).not.toContain('data-path="documentary"')
    expect(html).toContain('opening-film.webm')
    expect(html).toContain('opening-film.mp4')
  })

  it('reaches the documentary, and the documentary only', () => {
    const html = renderToStaticMarkup(createElement(Opening, { anchor, onDone: () => undefined, force: 'documentary' }))
    expect(html).toContain('data-path="documentary"')
    expect(html).not.toContain('<video')
    expect(html).not.toContain('<img')
    expect(html).toContain('role="dialog"')
    // the first sentence is already DOM on the first paint — no fetch, no await (§55)
    expect(html).toContain(captionPieces(OPENING[0]!.captionHe)[0]!.trim())
  })

  it('has exactly one orchestrator and two paths — the slideshow is gone (§3)', () => {
    expect(existsSync(join(ROOT, 'components/life/OpeningSequence.tsx'))).toBe(false)
    const orchestrator = read('components/life/Opening.tsx')
    expect(orchestrator).toContain('<OpeningDocumentary')
    expect(orchestrator).toContain('<OpeningFilm')
    for (const file of ['app/life/LifeStage.tsx', 'app/qa/life-opening/Preview.tsx']) {
      expect(read(file)).not.toContain('OpeningSequence')
    }
  })

  it('can be skipped from the first frame, by button and by Escape, on both paths (§32, §59)', () => {
    for (const file of ['components/life/OpeningFilm.tsx', 'components/life/OpeningDocumentary.tsx']) {
      const text = read(file)
      expect(text, file).toContain('data-life="opening-skip"')
      expect(text, file).toContain('useDialog')
      expect(text, file).toMatch(/z-\[60\]/)
    }
    expect(read('components/ui/useDialog.ts')).toContain("'Escape'")
    const html = renderToStaticMarkup(createElement(OpeningDocumentary, { anchor, onDone: () => undefined }))
    expect(html).toContain('data-life="opening-skip"')
    const film = read('components/life/OpeningFilm.tsx')
    // muted, inline, autoplaying — the one combination every phone allows without a gesture
    expect(film).toContain('muted={!sound}')
    expect(film).toContain('playsInline')
    expect(film).toContain('autoPlay')
  })
})

describe('the documentary content — directing, not rewriting (§15, §16, §64)', () => {
  it('every beat has a caption, a duration and a valid mode, in the spec order', () => {
    expect(OPENING.map((beat) => beat.mode)).toEqual([...OPENING_MODES])
    for (const beat of OPENING) {
      expect(beat.captionHe.trim().length, beat.id).toBeGreaterThan(8)
      expect(beat.ms, beat.id).toBeGreaterThanOrEqual(3000)
      expect(OPENING_MODES).toContain(beat.mode)
      expect(beat).not.toHaveProperty('art')
      expect(beat).not.toHaveProperty('kind')
      if (beat.leadMs) expect(beat.leadMs).toBeLessThan(beat.ms)
    }
    // a real alternative to the 21.4 s film, not the 27 s slideshow (§31)
    expect(openingMs()).toBeGreaterThanOrEqual(18000)
    expect(openingMs()).toBeLessThanOrEqual(24000)
  })

  it('keeps the canonical captions word for word', () => {
    const canon = [
      'עוד לפני שידע לדבר, כבר החליטו בשבילו איפה הלב שלו יהיה.',
      'בפעם הראשונה הוא לא זכר כלום. אבא זוכר הכול.',
      'הוא לא הבין את החוקים. הוא הבין את אבא.',
      'אחר כך ציירו אותו שוב ושוב, עד שהילד ידע לצייר אותו לבד.',
      'ומהחלון שלו רואים את הזרקורים.',
    ]
    expect(OPENING.slice(0, canon.length).map((beat) => beat.captionHe)).toEqual(canon)
  })

  it('cuts a caption into breaths without changing a character, and emphasis is a piece of it', () => {
    for (const beat of OPENING) {
      expect(captionPieces(beat.captionHe).join('')).toBe(beat.captionHe)
      if (beat.emphasisHe) {
        expect(beat.captionHe).toContain(beat.emphasisHe)
        expect(captionPieces(beat.captionHe).map((piece) => piece.trim())).toContain(beat.emphasisHe)
      }
    }
  })

  it('carries the archive line only on the archive beat, read off the anchor', () => {
    for (const beat of OPENING) {
      if (beat.archiveLine) expect(beat.mode, beat.id).toBe('archive')
      if (!beat.archiveLine) expect(openingLines(beat, anchor).archiveHe).toBeNull()
    }
    const archive = OPENING.find((beat) => beat.mode === 'archive')!
    const lines = openingLines(archive, anchor)
    if (anchor.match) {
      expect(lines.stampHe).toBe(anchor.match.playedOn.slice(0, 4))
      expect(lines.archiveHe).toContain(anchor.match.opponentHe)
    } else {
      expect(lines.archiveHe).toBeNull()
    }
  })

  it('does not reveal the life axis — only the years the opening itself knows (§6)', () => {
    const years = OPENING.map((beat) => openingLines(beat, anchor).stampHe).filter(Boolean) as string[]
    const known = ['1978', anchor.match?.playedOn.slice(0, 4)].filter(Boolean)
    for (const year of years) expect(known).toContain(year)
    expect(years.length).toBeLessThanOrEqual(2)
    for (const beat of OPENING) {
      for (const text of [beat.captionHe, beat.overlineHe ?? '', beat.noteHe ?? '', beat.emphasisHe ?? '']) {
        expect(/\b(19|20)\d{2}\b/.test(text), `${beat.id}: a year typed into copy`).toBe(false)
      }
    }
  })

  it('writes no sentence of the story inside a component, and every UI word is a catalogue key', () => {
    const hebrew = /[֐-׿]/
    for (const file of ['components/life/Opening.tsx', 'components/life/OpeningFilm.tsx', 'components/life/OpeningDocumentary.tsx']) {
      const code = read(file)
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
        .replace(/^\s*\/\/.*$/gm, '')
        .replace(/\s\/\/ .*$/gm, '')
      expect(hebrew.test(code), `${file} carries Hebrew outside a comment`).toBe(false)
      for (const [, key] of code.matchAll(/\bt\('([^']+)'\)/g)) {
        expect(MESSAGES, `${file}: ${key}`).toHaveProperty(key as string)
      }
    }
    // the cluster file: every key used, every key under its own prefix
    const used = ['components/life/OpeningFilm.tsx', 'components/life/OpeningDocumentary.tsx'].map(read).join('\n')
    for (const key of Object.keys(catalogue90g)) {
      expect(key.startsWith('life90g.'), key).toBe(true)
      expect(used, `orphan ${key}`).toContain(`'${key}'`)
    }
  })
})

describe('the documentary is code only — and on brand (§43–44, §52, §65)', () => {
  const doc = read('components/life/OpeningDocumentary.tsx')
  const css = read('app/globals.css')
  const block = css.slice(css.indexOf('OPENING DOCUMENTARY — begin'), css.indexOf('OPENING DOCUMENTARY — end'))

  it('requires no image and no video', () => {
    expect(block.length).toBeGreaterThan(2000)
    for (const banned of ['<img', 'backgroundImage', 'url(', '/life/opening/', '/life/art/', '<video', 'fetch(']) {
      expect(doc, banned).not.toContain(banned)
    }
    // the only url() in its CSS is a data: URI the browser draws itself (the grain)
    const urls = [...block.matchAll(/url\(("?)([^)"]+)\1\)/g)].map((match) => match[2] as string)
    for (const url of urls) expect(url.startsWith('data:') || url.startsWith('%23'), url).toBe(true)
    // grain is reused from FilmFx, in its code-drawn variant (§45)
    expect(doc).toMatch(/<Grain[^>]*\bcode\b/)
    expect(doc).toContain('<Letterbox')
  })

  it('has no slideshow semantics left — no pagination, no next, no progress bars (§32–33, §61)', () => {
    expect(doc).not.toMatch(/OPENING\.map\([^)]*\)\s*=>\s*\(\s*<span[^>]*h-\[2px\]/)
    expect(doc).not.toContain('opening-bed')
    expect(doc).not.toContain('opening-stage')
    for (const dead of ['.opening-bed', '.opening-stage', '.opening-frame', '.opening-caption']) expect(css).not.toContain(dead)
    // the coda still drifts on the one keyframe the slideshow shared with it
    expect(css).toContain('@keyframes openingDrift')
  })

  it('draws with brand tokens only — no yellow, gold, amber or orange, no raw colour, no press layer', () => {
    expect(/#[0-9a-f]{3,8}\b/i.test(block.replace(/%23n/g, ''))).toBe(false)
    expect(/\b(yellow|gold|amber|orange)\b/i.test(block.replace(/no yellow, gold, amber,\s*orange/gi, ''))).toBe(false)
    expect(block).not.toMatch(/--p-|--n-|--hate-/)
    const tokens = new Set([...block.matchAll(/var\(--([a-z-]+)\)/g)].map((match) => match[1] as string))
    const colour = [...tokens].filter((name) => !name.startsWith('font-') && !['p', 'd', 'c', 'thread-y', 'gutter-doc'].includes(name))
    expect(colour.sort()).toEqual(['concrete', 'ink', 'red', 'sheet', 'sign'].filter((name) => colour.includes(name)).sort())
    for (const name of colour) {
      const match = css.match(new RegExp(`--${name}:\\s*(\\d+)\\s+(\\d+)\\s+(\\d+)`))
      expect(match, name).not.toBeNull()
      const [r, g, b] = [Number(match![1]), Number(match![2]), Number(match![3])]
      expect(isYellow(r, g, b), `--${name}`).toBe(false)
    }
    // radius 0, and no shadows (§ brand)
    expect(block).not.toMatch(/border-radius|box-shadow|rounded-/)
    expect(doc).not.toMatch(/rounded-|shadow-/)
  })

  it('has a reduced-motion mode of its own (§38)', () => {
    expect(block).toContain('@media (prefers-reduced-motion: reduce)')
    expect(doc).toContain('prefers-reduced-motion')
  })

  it('tells a screen reader one beat at a time, never the visuals (§40–41)', () => {
    expect(doc).toContain('aria-live="polite"')
    expect(doc).toContain('aria-modal="true"')
    const html = renderToStaticMarkup(createElement(OpeningDocumentary, { anchor, onDone: () => undefined }))
    expect(html.match(/aria-live="polite"/g)).toHaveLength(1)
  })
})

describe('what stays — the stills are not deleted, and the sound is only his (§17, §39)', () => {
  it('keeps the stills and the clips on disk as optional polish, never as a dependency', () => {
    for (const file of ['born.png', 'shoulders.png', 'drawing.png', 'clip-family.mp4', 'clip-family-poster.png', 'clip-memory.mp4', 'clip-memory-poster.png']) {
      expect(existsSync(join(ROOT, 'public/life/opening', file)), file).toBe(true)
    }
    for (const path of [FILM.webm, FILM.mp4, FILM.poster]) expect(existsSync(join(ROOT, 'public', path)), path).toBe(true)
  })

  it('plays only recordings Maor made or sent, and only atmosphere', () => {
    for (const key of OPENING_AIR_KEYS) expect(LifeAudio.allowed, key).toContain(key)
    for (const mode of OPENING_MODES) expect(OPENING_AIR).toHaveProperty(mode)
    expect(OPENING_AIR.handoff.street + OPENING_AIR.handoff.far).toBe(0)
  })
})
