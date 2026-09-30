import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { matchById } from '@/lib/archive/match-master'
import { MESSAGES } from '@/lib/i18n'
import { DEBATE_REASONS, DEBATE_ROUND, DEBATES, debateDeck, debateQuestionId, debateRound } from '@/lib/polls/debates'
import { debateOptions, debateRoundView } from '@/lib/polls/debates-server'

/**
 * שער 7 · הוויכוח של היציע (ONE RED WORLD §16, P0.3) — the rotating debate beside the
 * identity ballot. Opinion questions only, options from the masters, a count that is read
 * and never made up, and a rotation that is the house engine's.
 */

const ROOT = join(__dirname, '..')
const read = (path: string) => readFileSync(join(ROOT, path), 'utf8')

describe('the debate bank', () => {
  it('holds twenty or more prompts, each id unique and short enough for the box', () => {
    expect(DEBATES.length).toBeGreaterThanOrEqual(20)
    const ids = DEBATES.map((debate) => debate.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const id of ids) expect(debateQuestionId(id).length).toBeLessThanOrEqual(64)
  })

  it('asks opinions, not facts: every prompt is a question and carries no figure', () => {
    for (const debate of DEBATES) {
      expect(debate.promptHe.trim().endsWith('?'), debate.id).toBe(true)
      // a digit is a date, a score or a count — a claim, not a debate
      expect(debate.promptHe, debate.id).not.toMatch(/\d/)
      // no quoted line: nobody real is given a sentence
      expect(debate.promptHe, debate.id).not.toMatch(/["״”“]/)
    }
  })

  it('never types an answer: roster prompts use the sheet, list prompts name a master source', () => {
    for (const debate of DEBATES) {
      if (debate.kind === 'roster') expect(debate.options, debate.id).toBeUndefined()
      else expect(debate.options, debate.id).toBeTruthy()
      expect(Object.keys(debate).sort()).toEqual(expect.arrayContaining(['id', 'kind', 'promptHe']))
      expect(debate).not.toHaveProperty('choices')
    }
  })
})

describe('the options come from the archive', () => {
  const sources = [...new Set(DEBATES.flatMap((debate) => (debate.options ? [debate.options] : [])))]

  it('resolves every source to a non-empty list of master ids', () => {
    for (const source of sources) {
      const options = debateOptions(source)
      expect(options.length, source).toBeGreaterThan(0)
      expect(new Set(options.map((option) => option.id)).size, source).toBe(options.length)
      for (const option of options) expect(option.id).toMatch(/^(m_[0-9a-f]{12}|season:\d{4}(\/\d{2})?)$/)
    }
  })

  it('offers only clean matches: football, dated to the day, sourced, undisputed', () => {
    for (const source of sources) {
      for (const option of debateOptions(source)) {
        if (!option.id.startsWith('m_')) continue
        const match = matchById(option.id)
        expect(match, option.id).not.toBeNull()
        expect(match!.sport).toBe('football')
        expect(match!.playedOn.precision).toBe('day')
        expect(match!.confidence).toBeGreaterThanOrEqual(2)
        expect(match!.claims).toHaveLength(0)
        expect(match!.conflictRefs).toHaveLength(0)
      }
    }
  })

  it('a derby is Maccabi Tel Aviv and nothing else (rule 13)', () => {
    for (const option of debateOptions('derby-wins')) expect(matchById(option.id)!.opponent).toBe('מכבי-תל-אביב')
  })
})

describe('the rotation', () => {
  it('deals four to six prompts, the same ones for the same seed and cursor', () => {
    expect(DEBATE_ROUND).toBeGreaterThanOrEqual(4)
    expect(DEBATE_ROUND).toBeLessThanOrEqual(6)
    for (const cursor of [0, 1, 4, 5, 37]) {
      const a = debateRound(90210, cursor)
      expect(a.debates).toHaveLength(DEBATE_ROUND)
      expect(debateRound(90210, cursor)).toEqual(a)
    }
    expect(debateDeck(1)).not.toEqual(debateDeck(2))
  })

  it('walks the whole bank before any prompt repeats, over 500 cursors', () => {
    const seed = 424_242
    const lap = debateRound(seed, 0).slices
    for (let cursor = 0; cursor < 500; cursor += lap) {
      const seen: string[] = []
      for (let step = 0; step < lap; step += 1) seen.push(...debateRound(seed, cursor + step).debates.map((d) => d.id))
      // a lap is the bank, once — the last slice may wrap only when the bank does not divide
      const firstLap = seen.slice(0, DEBATES.length)
      expect(new Set(firstLap).size, `lap at cursor ${cursor}`).toBe(DEBATES.length)
    }
  })

  it('a new cursor is a new slice', () => {
    const r0 = debateRound(7, 0).debates.map((d) => d.id)
    const r1 = debateRound(7, 1).debates.map((d) => d.id)
    expect(r0.some((id) => r1.includes(id))).toBe(false)
  })

  it('the route view carries the same prompts with their options', () => {
    const view = debateRoundView(90210, 3)
    expect(view.debates.map((d) => d.id)).toEqual(debateRound(90210, 3).debates.map((d) => d.id))
    for (const debate of view.debates) expect(debate.choices === null).toBe(debate.kind === 'roster')
  })
})

describe('no vote is invented, and the ballot is untouched', () => {
  const files = [
    'lib/polls/debates.ts',
    'lib/polls/debates-server.ts',
    'lib/polls/debate-store.ts',
    'components/ballot/DebateStand.tsx',
    'app/polls/TerraceWing.tsx',
    'content/manual/terrace-debates.json',
  ]

  it('ships no seeded or baseline vote and no randomness in a deal', () => {
    for (const path of files) {
      const text = read(path)
      expect(text, path).not.toMatch(/votes:\s*\d/)
      expect(text, path).not.toMatch(/Math\.random/)
    }
  })

  it('keeps storage behind the store: the screen never names a storage API', () => {
    for (const path of ['components/ballot/DebateStand.tsx', 'app/polls/TerraceWing.tsx', 'lib/polls/debates.ts', 'app/polls/page.tsx']) {
      expect(read(path), path).not.toMatch(/localStorage|sessionStorage|indexedDB/)
    }
    expect(read('lib/polls/debate-store.ts')).toContain('localStorage')
  })

  it('is async on every call and honest about counting', () => {
    const store = read('lib/polls/debate-store.ts')
    for (const signature of [
      'read(): Promise<DebateVotes>',
      'save(debateId: string, pick: string): Promise<void>',
      'tally(debateId: string): Promise<Tally | null>',
    ]) {
      expect(store, signature).toContain(signature)
    }
    expect(store).toContain('readonly countable = false')
    const uses = store.split('\n').filter((line) => line.includes('window.localStorage'))
    expect(store.match(/catch\s*\{/g)?.length ?? 0).toBeGreaterThanOrEqual(uses.length)
  })

  it('never sends the reason chip — the cast carries device, question and pick only', () => {
    const store = read('lib/polls/debate-store.ts')
    const cast = store.slice(store.indexOf("rpc('worker_poll_cast'"), store.indexOf('/** counts only'))
    expect(cast).toContain('p_question_id: debateQuestionId(debateId)')
    expect(cast).not.toContain('reason')
  })

  it('keeps its own keys, so the identity ballot’s storage cannot break', () => {
    const debate = read('lib/polls/debate-store.ts')
    expect(debate).toContain("'worker.debate.v1'")
    expect(debate).not.toMatch(/'worker\.ballot/)
    const ballot = read('lib/polls/store.ts')
    expect(ballot).toContain("const KEY = 'worker.ballot.v1'")
    expect(ballot).toContain("const SEAL_KEY = 'worker.ballot.sealed.v1'")
    expect(ballot).toContain("const REASON_KEY = 'worker.ballot.reasons.v1'")
  })

  it('prints the spec’s lines, and the four reasons — from the Red Voice (lib/voice)', () => {
    // wave 2 moved gate 7's words into `messages/he.voice.json`; the lines themselves did not move
    expect(MESSAGES['voice.g7.intro.0.title']).toBe('אין פה תשובה נכונה. בגלל זה באנו.')
    expect(MESSAGES['voice.g7.act.voted']).toBe('זאת הבחירה שלך.')
    expect(MESSAGES['voice.g7.act.seeTerrace']).toBe('רוצה לראות מה היציע אמר?')
    expect(MESSAGES['terrace.open']).toBeUndefined()
    expect(DEBATE_REASONS.map((reason) => MESSAGES[reason.he])).toEqual(['ראיתי בעיניים', 'אבא סיפר לי', 'פשוט הוא', 'הרגע הזה'])
  })
})
