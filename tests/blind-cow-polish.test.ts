import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import he from '../messages/he.stage.blindcow.json'

/** Gate 10 polish, 29.9.2026 — presentation only; the rules, the daily, the duel and the
 *  server's authority are other files and are not read here. */
const read = (path: string) => readFileSync(join(__dirname, '..', path), 'utf8')

describe('gate 10 — clues', () => {
  const stack = read('components/blind-cow/ClueStack.tsx')
  it('the newest clue is tagged and the older ones are quieter', () => {
    expect(stack).toContain('data-blindcow="new"')
    expect(stack).toContain("t('blindcow.clue.new')")
    expect(stack).toContain('text-ink/70')
    expect(he['blindcow.clue.new']).toBe('חדש')
  })
  it('the "another clue" button says how many are left', () => {
    expect(read('components/blind-cow/BlindCowGame.tsx')).toContain("t('blindcow.more.left'")
    expect(he['blindcow.more.left']).toContain('{n}')
  })
})

describe('gate 10 — guess drawer', () => {
  const drawer = read('components/blind-cow/GuessDrawer.tsx')
  it('rows are at least 52px, the pending pick is marked, the bottom clears the safe area', () => {
    expect(drawer).toContain('min-h-[52px]')
    expect(drawer).toContain('pending === entry.id')
    expect(drawer).toContain('env(safe-area-inset-bottom)')
  })
  it('input is locked while a pick is being checked and the pool logic is untouched', () => {
    expect(drawer).toContain('disabled={struck || busy}')
    expect(drawer).toContain('searchPlayers(entries, term, 30)')
  })
})

describe('gate 10 — one primary action per state', () => {
  const game = read('components/blind-cow/BlindCowGame.tsx')
  it('in play the guess is the red button and the clue button is the paper one', () => {
    const more = game.indexOf('onClick={more}')
    const guess = game.indexOf('onClick={() => setDrawer(true)}')
    expect(game.slice(more, more + 400)).toContain('bg-paper')
    expect(game.slice(guess, guess + 400)).toContain('bg-red')
  })
  it('the result ends in one red button; the clue list is a paper one', () => {
    const result = read('components/blind-cow/ResultPanel.tsx')
    expect((result.match(/border-ink bg-red px-4/g) ?? []).length).toBe(1)
  })
})
