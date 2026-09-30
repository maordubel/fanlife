import { readFileSync } from 'node:fs'

import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  MARKS_CAP,
  applyAnswer,
  capMarks,
  cleanMarks,
  mergeMarks,
  pendingRevenge,
  readMarks,
  recordAnswer,
  seen,
  strengths,
  type Marks,
} from '@/lib/profile/marks'
import { marksFromRows, payloadOf } from '@/lib/portal/marks-sync'

/**
 * פנקס הנקמות — the three things Revenge must never get wrong: a question you avenged
 * does not come back, a merge between two devices does not double-count, and a device
 * with no storage (or no account) plays exactly as before.
 */

const Q = (n: number) => `q_${n.toString(16).padStart(12, '0')}`

describe('פנקס הנקמות — the ledger', () => {
  it('records the last outcome and counts both ways', () => {
    let marks: Marks = {}
    marks = applyAnswer(marks, Q(1), false, '2026-09-21T10:00:00Z')
    marks = applyAnswer(marks, Q(1), false, '2026-09-21T10:01:00Z')
    marks = applyAnswer(marks, Q(1), true, '2026-09-21T10:02:00Z')
    expect(marks[Q(1)]).toEqual({ t: 3, w: 2, r: 1, last: 'r', at: '2026-09-21T10:02:00Z' })
    expect(pendingRevenge(marks)).toEqual([])
  })

  it('lists pending revenge newest first, and seen newest first', () => {
    let marks: Marks = {}
    marks = applyAnswer(marks, Q(1), false, '2026-09-21T10:00:00Z')
    marks = applyAnswer(marks, Q(2), true, '2026-09-21T10:01:00Z')
    marks = applyAnswer(marks, Q(3), false, '2026-09-21T10:02:00Z')
    expect(pendingRevenge(marks)).toEqual([Q(3), Q(1)])
    expect(seen(marks)).toEqual([Q(3), Q(2), Q(1)])
  })

  it('caps at 2,000 and evicts settled questions before pending ones', () => {
    let marks: Marks = {}
    for (let i = 0; i < MARKS_CAP + 50; i += 1) {
      marks[Q(i)] = { t: 1, w: i % 2, r: 1 - (i % 2), last: i % 2 ? 'w' : 'r', at: `2026-09-21T10:${String(i % 60).padStart(2, '0')}:00Z` }
    }
    const pendingBefore = pendingRevenge(marks).length
    marks = capMarks(marks)
    expect(Object.keys(marks)).toHaveLength(MARKS_CAP)
    // every question still waiting for revenge survived the cut
    expect(pendingRevenge(marks)).toHaveLength(pendingBefore)
  })

  it('drops a malformed entry rather than trusting it', () => {
    expect(cleanMarks({ [Q(1)]: { t: 1, w: 1, r: 0, last: 'w', at: 'x' }, bad: { t: 'no' }, [Q(2)]: null })).toEqual({
      [Q(1)]: { t: 1, w: 1, r: 0, last: 'w', at: 'x' },
    })
    expect(cleanMarks('garbage')).toEqual({})
  })
})

describe('פנקס הנקמות — the merge', () => {
  it('lets the newer outcome win and takes the max of the counters', () => {
    const phone: Marks = { [Q(1)]: { t: 3, w: 2, r: 1, last: 'r', at: '2026-09-21T12:00:00Z' } }
    const laptop: Marks = { [Q(1)]: { t: 2, w: 2, r: 0, last: 'w', at: '2026-09-20T09:00:00Z' } }
    const merged = mergeMarks(laptop, phone)
    expect(merged[Q(1)]).toEqual({ t: 3, w: 2, r: 1, last: 'r', at: '2026-09-21T12:00:00Z' })
    // the same answer either way round
    expect(mergeMarks(phone, laptop)).toEqual(merged)
  })

  it('does not bring back a question already avenged — which a plain union of misses would', () => {
    const device: Marks = { [Q(7)]: { t: 2, w: 1, r: 1, last: 'r', at: '2026-09-21T12:00:00Z' } }
    const account: Marks = { [Q(7)]: { t: 1, w: 1, r: 0, last: 'w', at: '2026-09-19T12:00:00Z' } }
    expect(pendingRevenge(mergeMarks(device, account))).toEqual([])
  })

  it('does not double-count an answer both sides already hold', () => {
    const one: Marks = { [Q(2)]: { t: 1, w: 1, r: 0, last: 'w', at: '2026-09-21T12:00:00Z' } }
    expect(mergeMarks(one, one)[Q(2)]).toEqual(one[Q(2)])
  })

  it('round-trips through the table shape the migration declares', () => {
    const marks: Marks = { [Q(3)]: { t: 3, w: 1, r: 2, last: 'r', at: '2026-09-21T12:00:00Z' } }
    const payload = payloadOf(marks, () => 'europe')
    expect(payload).toEqual([{ q: Q(3), topic: 'europe', w: 1, r: 2, last: 'r', at: '2026-09-21T12:00:00Z' }])
    const back = marksFromRows([{ question_id: Q(3), wrong: 1, right: 2, last_outcome: 'r', last_at: '2026-09-21T12:00:00Z' }])
    expect(back).toEqual(marks)
  })

  it('reports strengths per topic from right answers, never from a guess', () => {
    const marks: Marks = {
      [Q(1)]: { t: 2, w: 0, r: 2, last: 'r', at: 'a' },
      [Q(2)]: { t: 2, w: 2, r: 0, last: 'w', at: 'b' },
    }
    const out = strengths(marks, (id) => (id === Q(1) ? 'europe' : id === Q(2) ? 'kits' : null))
    expect(out.map((row) => row.topic)).toEqual(['europe', 'kits'])
    expect(out[0]?.rate).toBe(1)
  })
})

describe('פנקס הנקמות — anonymous, and without storage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('reads empty and writes nothing when there is no window (the server, a test)', () => {
    expect(readMarks()).toEqual({})
    expect(recordAnswer(Q(1), false)[Q(1)]?.last).toBe('w')
  })

  it('keeps playing when storage throws — private mode is a first visit, not a crash', () => {
    vi.stubGlobal('window', {
      localStorage: {
        getItem: () => {
          throw new Error('blocked')
        },
        setItem: () => {
          throw new Error('blocked')
        },
      },
    })
    expect(readMarks()).toEqual({})
    expect(() => recordAnswer(Q(1), true)).not.toThrow()
  })

  it('persists through the device store when storage works', () => {
    const store = new Map<string, string>()
    vi.stubGlobal('window', {
      localStorage: {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => void store.set(key, value),
      },
    })
    recordAnswer(Q(9), false)
    expect(pendingRevenge(readMarks())).toEqual([Q(9)])
    recordAnswer(Q(9), true)
    expect(pendingRevenge(readMarks())).toEqual([])
  })

  it('never reaches for the network without an account, and is off without keys', async () => {
    const { syncMarks, pullMarks, pushMarks } = await import('@/lib/portal/marks-sync')
    expect(await syncMarks()).toBe('off')
    expect(await pullMarks()).toBeNull()
    expect(await pushMarks({ [Q(1)]: { t: 1, w: 1, r: 0, last: 'w', at: 'x' } })).toBe(false)
  })
})

describe('הסכימה — worker_question_mark', () => {
  const sql = readFileSync('supabase/migrations/20260922090000_worker_shared_project.sql', 'utf8')
  const table = sql.slice(
    sql.indexOf('create table if not exists public.worker_question_mark'),
    sql.indexOf('create index if not exists worker_question_mark_pending_idx'),
  )

  it('is additive, keyed on (user, question), with RLS on own rows only', () => {
    expect(table).toContain('primary key (user_id, question_id)')
    expect(sql).toMatch(/alter table public\.worker_question_mark\s+enable row level security/)
    expect(sql).toMatch(
      /create policy worker_question_mark_read on public\.worker_question_mark\s+for select to authenticated using \(user_id = auth\.uid\(\)\)/,
    )
    expect(sql).not.toMatch(/create policy \w+ on public\.worker_question_mark\s+for (insert|update|delete|all)/)
    expect(sql).not.toMatch(/drop table/i)
    expect(sql).toContain('comment on table public.worker_question_mark is')
  })

  it('merges on the server with the device rule — newer outcome, max counters', () => {
    expect(sql).toContain('security definer set search_path = public')
    expect(sql).toContain('greatest(worker_question_mark.wrong, excluded.wrong)')
    expect(sql).toContain('case when excluded.last_at > worker_question_mark.last_at')
    expect(sql).toMatch(/grant execute on function public\.worker_mark_questions\(jsonb\)\s+to authenticated/)
  })
})
