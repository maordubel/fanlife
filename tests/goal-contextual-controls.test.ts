import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import he from '../messages/he.stage.goal88.json'

/** Gate 8 polish, 29.9.2026: fewer controls on screen, the same capability behind them. */
const read = (path: string) => readFileSync(join(__dirname, '..', path), 'utf8')

describe('gate 8 — contextual controls', () => {
  const run = read('app/goal/GoalRun.tsx')
  it('the verb row appears only once there is a man to act with', () => {
    expect(run).toMatch(/showVerbs=\{[^}]*holder !== null[^}]*armed !== null/)
    expect(read('components/replay/ReplayBuilder.tsx')).toContain('if (!showVerbs && touches.length === 0) return null')
  })
  it('undo and clear are not offered on a phone until they can act', () => {
    expect(run).toContain('(history.length > 0 || !phone)')
    expect(run).toContain('(draft.actorHe || editing !== null || !phone)')
  })
  it('every verb stays available for taps, keys and drags (capability untouched)', () => {
    const builder = read('components/replay/ReplayBuilder.tsx')
    expect(builder).toContain('REPLAY_ACTIONS.map')
    expect(read('components/press/GoalPitch.tsx')).toContain('data-goal="zone"')
  })
})

describe('gate 8 — short prompts and a visible active man', () => {
  it('captions are one short line each', () => {
    for (const [key, text] of Object.entries(he)) {
      if (!key.startsWith('goal88.cap.')) continue
      expect(text.length, key).toBeLessThanOrEqual(40)
    }
    expect(he['goal88.cap.start']).toBe('בחרו את השחקן עם הכדור')
  })
  it('the active man carries a ring, and every man keeps a 44px hit box', () => {
    const pitch = read('components/press/GoalPitch.tsx')
    expect(pitch).toContain('data-goal-active')
    expect(pitch).toMatch(/data-goal="player"[\s\S]{0,900}min-h-tap min-w-\[44px\]/)
  })
})
