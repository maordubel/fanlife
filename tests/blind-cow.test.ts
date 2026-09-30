import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { BANK, dailyQuestion, questionById, searchEntries, soloPool } from '@/lib/game/blind-cow/bank'
import { buildBank, COMPETITIVE_CLUES } from '@/lib/game/blind-cow/build'
import { giveUp, guess, newRun, reveal, viewOf } from '@/lib/game/blind-cow/engine'
import { duelWinner, SCORING_VERSION, scoringConfig, secondsLabel, weightedTimeMs } from '@/lib/game/blind-cow/scoring'
import { searchPlayers } from '@/lib/game/blind-cow/search'
import { duelSeedSql } from '@/lib/game/blind-cow/seed-sql'
import { open, seal } from '@/lib/game/blind-cow/token'
import { validateBank } from '@/lib/game/blind-cow/validate'
import { GATES } from '@/lib/gates'
import { readInputs } from '@/scripts/blind-cow/inputs'

const ROOT = join(__dirname, '..')

/* ---------------------------------------------------------------- the bank */

describe('פרה עיוורת — the bank is generated, deterministic and clean', () => {
  const input = readInputs(BANK)

  it('is exactly what a fresh build makes from the masters — twice', () => {
    const a = buildBank(input)
    const b = buildBank(input)
    expect(JSON.stringify(a)).toBe(JSON.stringify(b))
    expect(JSON.stringify(a)).toBe(JSON.stringify(BANK))
  })

  it('passes its own validator: no name in a clue, no restatement back to back, no widening, provenance on every clue', () => {
    expect(validateBank(BANK, input.players)).toEqual([])
  })

  it('has enough questions for every mode, and the competitive ones are 10 clues from 3+ families that settle it', () => {
    expect(BANK.counts.solo).toBeGreaterThanOrEqual(300)
    expect(BANK.counts.daily).toBeGreaterThanOrEqual(100)
    expect(BANK.counts.duel).toBe(BANK.counts.daily)
    for (const q of BANK.questions.filter((x) => x.eligibleModes.includes('duel'))) {
      expect(q.clueIds).toHaveLength(COMPETITIVE_CLUES)
      expect(q.families.length).toBeGreaterThanOrEqual(3)
      expect(q.remaining[q.remaining.length - 1]).toBe(1)
      expect(q.remaining[0]).toBeGreaterThanOrEqual(20)
    }
  })

  it('orders broad → narrow: the field never grows, and the first clue leaves a crowd', () => {
    for (const q of BANK.questions) {
      for (let i = 1; i < q.remaining.length; i++) expect(q.remaining[i]).toBeLessThanOrEqual(q.remaining[i - 1] as number)
    }
    const firsts = BANK.questions.map((q) => q.remaining[0] as number).sort((a, b) => a - b)
    expect(firsts[Math.floor(firsts.length / 2)]).toBeGreaterThan(100)
  })

  it('never states a career total, and a shirt number always with its season', () => {
    for (const clue of Object.values(BANK.clues)) {
      expect(clue.valueHe).not.toMatch(/סה"כ|בסך הכול|\d+ שערים/)
      if (clue.type === 'shirt_number') expect(clue.valueHe).toMatch(/בעונת \d{4}\/\d{2}/)
      expect(clue.sourceRefs.length).toBeGreaterThan(0)
      expect(clue.confidence).toBeGreaterThanOrEqual(2)
    }
  })

  it('a goal clue stands only on a scorer row attached to the target id', () => {
    const mm = input.matches
    for (const q of BANK.questions) {
      for (const id of q.clueIds) {
        const clue = BANK.clues[id]!
        const m = /^goal-match:(m_[0-9a-f]+)$/.exec(clue.factKey)
        if (!m) continue
        const match = mm.find((x) => x.matchId === m[1])!
        const attached =
          match.scorers.some((s) => s.playerId === q.targetPlayerId && !s.ownGoal) ||
          match.events.some((e) => e.playerId === q.targetPlayerId && /goal/.test(e.type))
        expect(attached, `${q.targetDisplayNameHe} · ${clue.valueHe}`).toBe(true)
        expect(match.conflictRefs).toEqual([])
      }
    }
  })

  it('seeds exactly the duel questions into the migration', () => {
    const sql = readFileSync(join(ROOT, 'supabase/migrations/20260924090000_worker_blind_cow.sql'), 'utf8')
    expect(sql).toContain(duelSeedSql(BANK))
    expect(sql).toContain(`duel_questions ${BANK.counts.duel}`)
  })
})

/* ---------------------------------------------------------------- scoring */

describe('זמן משוקלל (spec §6.2)', () => {
  it('prints the spec example: יוסף 3 clues · 18.4 s = 48.4, אופיר 4 clues · 9.2 s = 54.2 — יוסף wins', () => {
    const yosef = weightedTimeMs({ rawElapsedMs: 18_400, hintsUsed: 3, wrongGuesses: 0 })
    const ofir = weightedTimeMs({ rawElapsedMs: 9_200, hintsUsed: 4, wrongGuesses: 0 })
    expect(secondsLabel(yosef)).toBe('48.4')
    expect(secondsLabel(ofir)).toBe('54.2')
    expect(duelWinner({ status: 'solved', weightedTimeMs: yosef }, { status: 'solved', weightedTimeMs: ofir })).toBe(1)
  })

  it('charges 15 s a clue after the first and 5 s a wrong guess, from a versioned config', () => {
    const cfg = scoringConfig(SCORING_VERSION)
    expect(cfg).toMatchObject({ extraHintPenaltyMs: 15_000, wrongGuessPenaltyMs: 5_000, duelMaxMs: 120_000 })
    expect(weightedTimeMs({ rawElapsedMs: 1000, hintsUsed: 1, wrongGuesses: 2 })).toBe(11_000)
  })

  it('a solver beats a non-solver; nobody solving is no winner, never an invented one', () => {
    expect(duelWinner({ status: 'gave_up', weightedTimeMs: null }, { status: 'solved', weightedTimeMs: 99_000 })).toBe(2)
    expect(duelWinner({ status: 'timeout', weightedTimeMs: null }, { status: 'gave_up', weightedTimeMs: null })).toBe('none')
    expect(duelWinner({ status: 'solved', weightedTimeMs: 5 }, { status: 'solved', weightedTimeMs: 5 })).toBe('tie')
  })

  it('the database uses the same penalties', () => {
    const sql = readFileSync(join(ROOT, 'supabase/migrations/20260924090000_worker_blind_cow.sql'), 'utf8')
    expect(sql).toMatch(/values \(1, 15000, 5000, 120000\)/)
  })
})

/* ---------------------------------------------------------------- the run */

describe('the run — server state, idempotent moves, no answer before the whistle', () => {
  const q = BANK.questions.find((x) => x.eligibleModes.includes('duel'))!
  const T0 = 1_000_000

  it('reveal opens one clue per screen state — a double tap does not open two', () => {
    const s0 = newRun('solo', q, T0)
    const s1 = reveal(s0, 1)
    expect(s1.shown).toBe(2)
    expect(reveal(s1, 1)).toBe(s1)
    expect(reveal(s1, 2).shown).toBe(3)
  })

  it('the same wrong id twice is one mistake; the right id closes the run on the server clock', () => {
    const other = BANK.questions.find((x) => x.targetPlayerId !== q.targetPlayerId)!.targetPlayerId
    let s = reveal(reveal(newRun('solo', q, T0), 1), 2)
    s = guess(s, other, T0 + 1000).state
    s = guess(s, other, T0 + 2000).state
    expect(s.wrong).toBe(1)
    const done = guess(s, q.targetPlayerId, T0 + 18_400)
    expect(done.correct).toBe(true)
    const view = viewOf(done.state)!
    expect(view.result?.rawElapsedMs).toBe(18_400)
    expect(view.result?.weightedTimeMs).toBe(18_400 + 2 * 15_000 + 5_000)
    expect(view.result?.caughtBy).toBe(3)
    // after the whistle nothing moves
    expect(guess(done.state, other, T0 + 30_000).state).toBe(done.state)
    expect(giveUp(done.state, T0 + 30_000)).toBe(done.state)
  })

  it('a playing view carries neither the answer id nor his name nor an unopened clue', () => {
    const s = reveal(newRun('solo', q, T0), 1)
    const json = JSON.stringify(viewOf(s))
    expect(json).not.toContain(q.targetPlayerId)
    expect(json).not.toContain(q.targetDisplayNameHe)
    expect(json).not.toContain(q.id)
    for (const id of q.clueIds.slice(2)) expect(json).not.toContain(BANK.clues[id]!.valueHe)
    expect(viewOf(s)!.clues).toHaveLength(2)
  })

  it('the finished view opens the whole file: name, real shirt, all ten clues, the archive card', () => {
    const s = giveUp(newRun('solo', q, T0), T0 + 4000)
    const r = viewOf(s)!.result!
    expect(r.playerId).toBe(q.targetPlayerId)
    expect(r.allClues).toHaveLength(q.clueIds.length)
    expect(r.archiveHref).toBe(`/archive?at=${q.targetPlayerId}`)
    expect(['photo', 'engine']).toContain(r.shirt.kind)
  })

  it('the run cookie is sealed: it opens, and an edited one does not', () => {
    const s = newRun('daily', q, T0, { day: '2026-09-24' })
    const token = seal(s)
    expect(token).not.toContain(q.id)
    expect(open<typeof s>(token)).toEqual(s)
    const flipped = token.slice(0, 40) + (token[40] === 'A' ? 'B' : 'A') + token.slice(41)
    expect(open(flipped)).toBeNull()
  })

  it('the daily is one question per date, from the server, and it changes with the date', () => {
    const a = dailyQuestion('2026-09-24')!
    expect(dailyQuestion('2026-09-24')!.id).toBe(a.id)
    expect(a.eligibleModes).toContain('daily')
    const week = new Set(['2026-09-24', '2026-09-25', '2026-09-26', '2026-09-27', '2026-09-28'].map((d) => dailyQuestion(d)!.id))
    expect(week.size).toBeGreaterThan(2)
  })

  it('the lobby filters are real facets', () => {
    expect(soloPool('foreign').every((x) => x.tags.origin === 'foreign')).toBe(true)
    expect(soloPool('hardcore').every((x) => x.eligibleModes.includes('hardcore'))).toBe(true)
    expect(soloPool('1980').length).toBeGreaterThan(20)
    expect(questionById('nope')).toBeNull()
  })
})

/* ---------------------------------------------------------------- search */

describe('the guess drawer finds a man by Hebrew, Latin and alias — and answers with his id', () => {
  const entries = searchEntries()

  it('lists the whole pool with ids', () => {
    expect(entries.length).toBe(BANK.rules.pool)
    expect(entries.every((e) => /^p_[0-9a-f]{10}$/.test(e.id))).toBe(true)
  })

  it('by family name first', () => {
    expect(searchPlayers(entries, 'שבתאי לוי')[0]?.nameHe).toBe('שבתאי לוי')
  })

  it('by Latin spelling', () => {
    const hit = searchPlayers(entries, 'shabtai')
    expect(hit.map((e) => e.nameHe)).toContain('שבתאי לוי')
  })

  it('by a reviewed Hebrew alias', () => {
    const withAlias = entries.find((e) => e.aliasesHe.some((a) => a.replace(/[׳״'"-]/g, '') !== e.nameHe.replace(/[׳״'"-]/g, '')))!
    expect(withAlias).toBeTruthy()
    const alias = withAlias.aliasesHe.find((a) => a.replace(/[׳״'"-]/g, '') !== withAlias.nameHe.replace(/[׳״'"-]/g, ''))!
    expect(searchPlayers(entries, alias).map((e) => e.id)).toContain(withAlias.id)
  })

  it('folds finals and geresh the way a phone keyboard types them', () => {
    expect(searchPlayers(entries, 'כהנ').length).toBeGreaterThan(0)
  })
})

/* ---------------------------------------------------------------- nothing leaks to the client */

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    return statSync(path).isDirectory() ? files(path) : [path]
  })
}

describe('the answer never reaches the browser', () => {
  const client = files(join(ROOT, 'components/blind-cow')).map((path) => [path, readFileSync(path, 'utf8')] as const)

  it('no client component imports the bank, the engine or the token (types only from server modules)', () => {
    for (const [path, text] of client) {
      expect(text, path).not.toMatch(/from '@\/lib\/game\/blind-cow\/(bank|engine|token|build|seed-sql)'/)
      expect(text, path).not.toContain('blind-cow-bank.json')
      for (const m of text.matchAll(/^import (?!type )[^\n]*from '@\/lib\/game\/blind-cow\/duel'/gm)) {
        throw new Error(`${path}: ${m[0]} — duel.ts is server-only; import its types with \`import type\``)
      }
    }
  })

  it('the server modules that hold answers are server-only', () => {
    for (const name of ['bank', 'engine', 'token', 'duel']) {
      expect(readFileSync(join(ROOT, `lib/game/blind-cow/${name}.ts`), 'utf8')).toMatch(/^import 'server-only'/)
    }
  })

  it('the page hands down only a still-playing solo run, never a finished one', () => {
    const page = readFileSync(join(ROOT, 'app/blind-cow/page.tsx'), 'utf8')
    expect(page).toContain("initialSolo={playing(resumed('bc_solo', 'solo'))}")
  })
})

/* ---------------------------------------------------------------- the duel schema */

describe('the duel migration — rule 89 and the house pattern', () => {
  const sql = readFileSync(join(ROOT, 'supabase/migrations/20260924090000_worker_blind_cow.sql'), 'utf8')
  const code = sql
    .split('\n')
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n')
    .replace(/\/\*[\s\S]*?\*\//g, '')

  it('names everything it creates worker_blind_cow_…', () => {
    const created = [
      ...code.matchAll(/create (?:table if not exists|or replace function|trigger|policy|index if not exists|unique index if not exists)\s+(?:public\.)?(\w+)/gi),
    ].map((m) => m[1] as string)
    expect(created.length).toBeGreaterThan(15)
    for (const name of created) expect(name).toMatch(/^worker_blind_cow_/)
  })

  it('touches nothing on auth and drops nothing', () => {
    expect(code).not.toMatch(/\bon auth\./i)
    expect(code).not.toMatch(/from auth\.users/i)
    expect(code).not.toMatch(/drop\s+(table|function|schema|column)/i)
    expect(code).not.toMatch(/alter default privileges/i)
    expect(code).not.toMatch(/\bgrant\s+(select|insert|update|delete|all)\b/i)
  })

  it('turns RLS on for all six tables and opens only the seven actions', () => {
    const tables = [...code.matchAll(/create table if not exists public\.(\w+)/g)].map((m) => m[1])
    expect(tables).toHaveLength(6)
    for (const table of tables) expect(code).toContain(`'${table}'`)
    expect(code).toContain("execute format('alter table public.%I enable row level security', v_table)")
    const open = /v_open text\[\] := array\[([^\]]+)\]/.exec(code)![1]!.match(/'(\w+)'/g)!
    expect(open).toHaveLength(7)
    const functions = new Set([...code.matchAll(/create or replace function public\.(\w+)/g)].map((m) => m[1]))
    expect(functions.size).toBe(15)
    expect(sql).toContain('blind_cow_tables 6 · blind_cow_functions 15')
  })

  it('stores only hashes of the link token and the device key, and hides the answer until the run is over', () => {
    expect(code).toContain('public_token_hash')
    expect(code).toMatch(/'answer', case when v_done then v_q\.target_player_id end/)
    expect(code).toMatch(/'result', case when v_done and v_other_run\.id is not null/)
    expect(code).toContain("interval '7 days'")
    expect(code).toContain('unique (duel_id, anon_id)')
  })
})

describe('gate 10 is open', () => {
  it('points the plate at /blind-cow, playable, no longer "soon"', () => {
    const gate = GATES.find((g) => g.number === 10)!
    expect(gate.href).toBe('/blind-cow')
    expect(gate.playable).toBe(true)
    expect(gate.soon).toBeUndefined()
  })
})
