import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import type { Beat } from '@/lib/life/content/beats'
import { CHAPTERS } from '@/lib/life/content/chapters'
import { eraFor } from '@/lib/life/content/era'
import { MATCH_SCRIPTS } from '@/lib/life/content/matchScripts'
import { CUTSCENES, autoCutsceneFor, autoPlayable } from '@/lib/life/cutscenes'
import type { LifeState } from '@/lib/life/types'

/**
 * הסרט מהארכיון — registry ↔ trigger (design pass v2 §23.3, Workstream D, delta 90).
 *
 * "Registry ≠ integration." A film is only implemented when a chapter actually opens it at
 * the right moment and the player lands on a reachable next action. This file GENERATES
 * the wiring matrix from the live content (every chapter's `Era.cutscene` and every beat's
 * `{ a: 'cutscene' }`), holds it as a regression fixture, and runs the inverse check: every
 * trigger names a registry row, and every registry row is either a verified payoff with
 * exactly one trigger or a film nothing opens by itself.
 *
 * The browser half — skip, end callback, autoplay blocked, embed unavailable, reload —
 * is `scripts/life/footage-probe.mjs`, because what an `<iframe>` does when it never
 * loads cannot be asked of a unit test.
 */

const ROOT = process.cwd()

type Row = { chapter: string; via: string; film: string }

function triggers(): Row[] {
  const rows: Row[] = []
  for (const def of CHAPTERS) {
    const era = eraFor(def.id)
    if (era.cutscene) rows.push({ chapter: def.id, via: 'era', film: era.cutscene })
    for (const beat of (era.beats ?? []) as readonly Beat[]) {
      for (const action of beat.do) if (action.a === 'cutscene') rows.push({ chapter: def.id, via: `beat:${beat.id}`, film: action.id })
    }
  }
  // one chapter's era can be shared by several chapter ids — a trigger is counted once
  const seen = new Set<string>()
  return rows.filter((row) => {
    const key = `${eraFor(row.chapter).chapter}|${row.via}|${row.film}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

/**
 * The matrix, as of delta 91. A change here is a design decision (a film wired, retired or
 * verified) and must be made on purpose — which is what a fixture is for.
 *
 * 25.9.2026: the three candidates were watched by the owner and locked in one sentence —
 * **"מאשר את כולם."** — so each is a `CINEMATIC_PAYOFF` with exactly one beat trigger,
 * placed after its chapter's payoff (the horn, the hug, the shoot-out). The full 2000
 * summary stays optional: the double never shows two films back to back.
 */
const MATRIX: Record<string, { status: string; role: string; auto: boolean; triggeredBy: string[] }> = {
  '1986-championship': { status: 'locked_verified', role: 'CINEMATIC_PAYOFF', auto: true, triggeredBy: ['1986/era'] },
  '1993-cup': { status: 'locked_verified', role: 'CINEMATIC_PAYOFF', auto: true, triggeredBy: ['1993-cup/beat:93-film'] },
  '1999-basket-context': { status: 'context_only', role: 'BACKGROUND_CONTEXT', auto: false, triggeredBy: [] },
  '2000-title': { status: 'locked_verified', role: 'CINEMATIC_PAYOFF', auto: true, triggeredBy: ['2000-title/beat:t-film'] },
  '2000-double': { status: 'verified_optional', role: 'ARCHIVE_FOOTAGE', auto: false, triggeredBy: [] },
  '2000-penalties': { status: 'locked_verified', role: 'CINEMATIC_PAYOFF', auto: true, triggeredBy: ['2000-double/beat:d-film'] },
}

describe('footage wiring — registry ↔ trigger matrix (§23.3)', () => {
  const rows = triggers()

  it('generates the same matrix as the fixture', () => {
    const generated: typeof MATRIX = {}
    for (const [id, scene] of Object.entries(CUTSCENES)) {
      generated[id] = {
        status: scene.status,
        role: scene.role,
        auto: autoPlayable(scene),
        triggeredBy: rows.filter((row) => row.film === id).map((row) => `${eraFor(row.chapter).chapter}/${row.via}`),
      }
    }
    expect(generated).toEqual(MATRIX)
  })

  it('inverse: every chapter trigger names a registry row', () => {
    for (const row of rows) expect(CUTSCENES[row.film], `${row.chapter} ${row.via} → ${row.film}`).toBeDefined()
  })

  it('every automatic film has exactly one trigger, in its own chapter, after the player’s action', () => {
    for (const [id, scene] of Object.entries(CUTSCENES)) {
      const mine = rows.filter((row) => row.film === id)
      if (!autoPlayable(scene)) continue
      expect(mine.length, `${id} is a verified payoff that nothing opens — dead registry data`).toBe(1)
      expect(eraFor(mine[0]!.chapter).chapter).toBe(scene.chapter)
      expect(scene.trigger, `${id} names no trigger`).toBeTruthy()
      // the registry's `trigger` is the same string the content generates — not a claim beside it
      expect(scene.trigger).toBe(mine[0]!.via === 'era' ? scene.trigger : mine[0]!.via)
    }
  })

  it('a chapter never opens two films by itself (the 2000 double keeps its full summary optional)', () => {
    const byChapter = new Map<string, string[]>()
    for (const row of rows) {
      if (!autoCutsceneFor(row.film)) continue
      const chapter = eraFor(row.chapter).chapter
      byChapter.set(chapter, [...(byChapter.get(chapter) ?? []), row.film])
    }
    for (const [chapter, films] of byChapter) expect(films, chapter).toHaveLength(1)
    expect(CUTSCENES['2000-double']!.status).toBe('verified_optional')
    expect(CUTSCENES['2000-double']!.trigger).toBeNull()
  })

  it('an unverified film never opens by itself, even if a chapter names it', () => {
    for (const [id, scene] of Object.entries(CUTSCENES)) {
      if (scene.status === 'locked_verified') continue
      expect(autoCutsceneFor(id), `${id} (${scene.status}) could auto-play`).toBeNull()
      expect(scene.trigger, `${id} is ${scene.status} and still names an automatic trigger`).toBeNull()
    }
    expect(autoCutsceneFor('no-such-film')).toBeNull()
    expect(autoCutsceneFor(null)).toBeNull()
  })

  it('every row carries its chapter, status, role and a provenance line', () => {
    const chapters = new Set(CHAPTERS.map((c) => c.id))
    for (const [id, scene] of Object.entries(CUTSCENES)) {
      expect(chapters.has(scene.chapter), `${id} → unknown chapter ${scene.chapter}`).toBe(true)
      expect(scene.provenanceHe.length, id).toBeGreaterThan(10)
    }
  })
})

/**
 * 25.9.2026 — "מאשר את כולם." The three films the owner locked, each held to the same two
 * things the 1986 slice is held to: it opens AFTER the chapter's payoff, and the objective
 * the registry promises is the one the chapter prints (or the chapter prints nothing and
 * the next beat takes over at once).
 */
describe('the three films locked on 25.9.2026', () => {
  const beatOf = (chapter: string, id: string): Beat => {
    const beat = ((eraFor(chapter).beats ?? []) as readonly Beat[]).find((row) => row.id === id)
    expect(beat, `${chapter} has no beat ${id}`).toBeDefined()
    return beat!
  }
  const cutsceneIn = (beat: Beat) => beat.do.find((action) => action.a === 'cutscene')

  it('1993: the film opens on the pavement after the horn, and hands him the walk-home question', () => {
    const film = CUTSCENES['1993-cup']!
    const beat = beatOf('1993-cup', '93-film')
    expect(cutsceneIn(beat)).toEqual({ a: 'cutscene', id: '1993-cup' })
    // after the horn: `after:walk` is raised by `after-1993`, the conversation the horn leads into
    expect(JSON.stringify(beat.when)).toContain('after:walk')
    expect(beat.at).toBe('ussishkin-outside')
    const era = eraFor('1993-cup')
    const after = { flags: { 'final:over': true, 'after:walk': true, '93:film': true, [film.completionFlag]: true }, agorot: 0 } as unknown as LifeState
    expect(era.objective(after, 'ussishkin-outside', true)).toBe(film.nextObjectiveHe)
  })

  it('2000 title: the film opens after the confirmation and the hug, and the credits come after the film', () => {
    const beats = (eraFor('2000-title').beats ?? []) as readonly Beat[]
    const film = beats.findIndex((row) => row.id === 't-film')
    const credits = beats.findIndex((row) => row.id === 't-credits')
    expect(film).toBeGreaterThan(-1)
    expect(credits).toBeGreaterThan(film)
    expect(cutsceneIn(beats[film]!)).toEqual({ a: 'cutscene', id: '2000-title' })
    expect(JSON.stringify(beats[film]!.when)).toContain('t:confirmed')
    expect(JSON.stringify(beats[credits]!.when)).toContain('t:film')
    expect(beats[credits]!.do).toEqual([{ a: 'talk', conversation: 't-close' }])
    // the hug no longer chains into the credits — the film sits between them
    const title = readFileSync(join(ROOT, 'lib/life/content/chapter2000double.ts'), 'utf8')
    const champions = title.slice(title.indexOf("id: 't-champions'"), title.indexOf("id: 't-close'"))
    expect(champions).not.toContain("node: 't-close'")
  })

  it('2000 double: the shoot-out film is the first beat after "זה נגמר. דאבל.", before the walk home', () => {
    const beats = (eraFor('2000-double').beats ?? []) as readonly Beat[]
    const film = beats.findIndex((row) => row.id === 'd-film')
    const walk = beats.findIndex((row) => row.id === 'd-after')
    expect(film).toBeGreaterThan(-1)
    expect(walk).toBeGreaterThan(film)
    expect(cutsceneIn(beats[film]!)).toEqual({ a: 'cutscene', id: '2000-penalties' })
    expect(JSON.stringify(beats[film]!.when)).toContain('d:over')
    // the id that plays is the one the owner watched; the archive's other id is named in the provenance
    const scene = CUTSCENES['2000-penalties']!
    expect(scene.youtubeId).toBe('EGlBnUQN5AQ')
    expect(scene.provenanceHe).toContain('RvyReKDwCC0')
    expect(scene.provenanceHe).toContain('מאשר את כולם')
  })

  it('every locked film quotes the owner in its provenance', () => {
    for (const scene of Object.values(CUTSCENES)) {
      if (scene.status !== 'locked_verified') continue
      expect(scene.provenanceHe, scene.id).toMatch(/מאור/)
    }
  })
})

describe('the 1986 vertical slice (§23.5)', () => {
  it('opens at the goal step of the directed final — after he got in, not instead of it', () => {
    const script = MATCH_SCRIPTS['final-86']!
    const steps = script.steps
    const goal = steps.findIndex((step) => step.authored)
    expect(goal).toBeGreaterThan(0)
    // the lived match comes first: the terrace talks, the tension builds
    expect(steps.slice(0, goal).some((step) => step.talk)).toBe(true)
    expect(steps.slice(goal).some((step) => step.end)).toBe(true)
    expect(CUTSCENES['1986-championship']!.trigger).toBe('era:1986@final-86/goal')
  })

  it('hands the player the same objective the chapter prints once the film is behind him', () => {
    const film = CUTSCENES['1986-championship']!
    const era = eraFor('1986')
    const after = { flags: { 'match:over': true, 'entry:granted': true, [film.completionFlag]: true } } as unknown as LifeState
    expect(era.objective(after, 'bloomfield-inside', true)).toBe(film.nextObjectiveHe)
    // …and Kobi is what the objective points at: finding him is the ending
    const found = { flags: { ...after.flags, 'found:kobi': true } } as unknown as LifeState
    expect(era.objective(found, 'bloomfield-inside', true)).toBeNull()
  })

  it('all three outcomes converge in the runtime, and the beat path records the registry flags', () => {
    const world = readFileSync(join(ROOT, 'lib/life/runtime/scenes/WorldScene.ts'), 'utf8')
    // no chapter can reach the player's screen with an unverified film
    expect(world).not.toMatch(/cutsceneFor\(this\.era\.cutscene\)/)
    expect(world.match(/autoCutsceneFor\(/g)?.length ?? 0).toBeGreaterThanOrEqual(3)
    const body = world.slice(world.indexOf('endCutscene(outcome: CutsceneOutcome)'))
    const beatBranch = body.slice(0, body.indexOf('const film = this.cutscene'))
    expect(beatBranch).toContain('completionFlag')
    expect(beatBranch).toContain('watchedFlag')
    expect(beatBranch.indexOf('watchedFlag')).toBeGreaterThan(beatBranch.indexOf("outcome === 'watched'"))
  })

  it('the overlay offers the play button as soon as autoplay is refused, and knows when it is offline', () => {
    const overlay = readFileSync(join(ROOT, 'components/life/HistoricalCutscene.tsx'), 'utf8')
    expect(overlay).toMatch(/AUTOPLAY_MS = [0-9_]+/)
    expect(overlay).toContain('navigator.onLine === false')
    // attribution under the frame, always: the house SourceNote → /credits, where the film's
    // title and owner are named (the credits rule forbids a screen printing its own source line)
    expect(overlay).toContain('<SourceNote')
  })
})
