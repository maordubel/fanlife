import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

/**
 * שני הקבצים של דלתא 89 — המדידה והדו-קרב החי — נקראים כאן על המקור (כלל 89), ורצים
 * באמת ב-`scripts/db/verify.sh` (supabase/tests/31-blind-cow-live.sql, 40-events.sql).
 */
const ROOT = join(__dirname, '..')
const FILES = ['supabase/migrations/20260925090000_worker_events.sql', 'supabase/migrations/20260925091000_worker_blind_cow_live.sql']
const TAXONOMY = 'supabase/migrations/20260928090000_worker_events_taxonomy.sql'

function code(path: string): string {
  return readFileSync(join(ROOT, path), 'utf8')
    .split('\n')
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n')
    .replace(/\/\*[\s\S]*?\*\//g, '')
}

describe.each(FILES)('%s — a shared project, touched only where THE WORKER lives', (file) => {
  const sql = code(file)

  it('names everything it creates worker_…', () => {
    const created = [...sql.matchAll(/create (?:table if not exists|or replace function|trigger|policy|index if not exists|unique index if not exists)\s+(?:public\.)?(\w+)/gi)].map(
      (m) => m[1] as string,
    )
    expect(created.length).toBeGreaterThan(2)
    for (const name of created) expect(name).toMatch(/^worker_/)
  })

  it('touches nothing on auth, alters and deletes only its own tables', () => {
    expect(sql).not.toMatch(/\bon auth\./i)
    expect(sql).not.toMatch(/from auth\.users/i)
    expect(sql).not.toMatch(/alter default privileges/i)
    expect(sql).not.toMatch(/drop\s+(table|function|schema|column)/i)
    // `format('alter table public.%I …')` loops are over worker_ names the file lists itself
    for (const m of sql.matchAll(/\b(?:alter table|delete from|update)\s+(?:public\.)?(\w+)(?![.\w])/gi)) expect(m[1], m[0]).toMatch(/^worker_/)
  })

  it('grants no table to anyone, and every function is security definer with a pinned path', () => {
    expect(sql).not.toMatch(/grant\s+(all|select|insert|update|delete)[^;]*\bon\s+(?:table\s+)?public\./i)
    const fns = [...sql.matchAll(/create or replace function[\s\S]*?\$\$/gi)].map((m) => m[0])
    expect(fns.length).toBeGreaterThan(2)
    for (const fn of fns) expect(fn).toMatch(/security definer set search_path = public/)
  })

  it('never raises to refuse a caller — failures are values', () => {
    // the only raise is the order guard at the top of the live file
    const raises = [...sql.matchAll(/raise exception '([^']*)'/g)].map((m) => m[1])
    for (const r of raises) expect(r).toMatch(/run 20260924090000_worker_blind_cow\.sql first|shape/)
  })
})

describe('the measurement file', () => {
  const sql = code(FILES[0] as string)

  it('stores no id, no address, no agent — only a daily-salted hash', () => {
    const table = /create table if not exists public\.worker_event \(([\s\S]*?)\n\);/.exec(sql)?.[1] ?? ''
    expect(table).toContain("visitor text not null check (visitor ~ '^[0-9a-f]{64}$')")
    expect(table).not.toMatch(/\b(user_id|ip|user_agent|email|device)\b/)
    expect(sql).toContain("sha256(convert_to(public.worker_events_salt() || '|' || p_device, 'UTF8'))")
    expect(sql).toContain('delete from public.worker_event_salt where day < v_day - 1')
  })

  it('opens the write to the browser and the sums to the server only', () => {
    expect(sql).toMatch(/proname = 'worker_events_record' then\s+execute format\('grant execute on function %s to anon, authenticated'/)
    expect(sql).toMatch(/'worker_events_daily', 'worker_events_funnel', 'worker_events_blind_cow'\) then\s+execute format\('grant execute on function %s to service_role'/)
  })

  it('bounds a call: 25 events, 8 KB, 240 a minute per visitor', () => {
    expect(sql).toContain('jsonb_array_length(p_events) > 25')
    expect(sql).toContain('octet_length(p_events::text) > 8192')
    expect(sql).toContain('> 240 then')
  })

  it('accepts exactly the events the client sends — as the latest check on the column says', () => {
    // the column's check was widened on 28.9.2026 by the taxonomy file; that file's list is
    // the one in force, and the original file's list must be a subset of it (nothing retired)
    const original = [...(/name\s+text not null check \(name in \(([\s\S]*?)\)\)/.exec(sql)?.[1] ?? '').matchAll(/'([a-z_]+)'/g)].map((m) => m[1])
    const latest = code(TAXONOMY)
    const names = /add constraint worker_event_name_check check \(name in \(([\s\S]*?)\)\)/.exec(latest)?.[1] ?? ''
    for (const name of original) expect(names).toContain(`'${name}'`)
    const list = [...names.matchAll(/'([a-z_]+)'/g)].map((m) => m[1]).sort()
    const client = readFileSync(join(ROOT, 'lib/analytics/events.ts'), 'utf8')
    const declared = [...(/EVENT_NAMES = \[([\s\S]*?)\] as const/.exec(client)?.[1] ?? '').matchAll(/'([a-z_]+)'/g)].map((m) => m[1]).sort()
    expect(declared.length).toBeGreaterThan(10)
    expect(list).toEqual(declared)
  })

  it('ends on its check line', () => {
    expect(readFileSync(join(ROOT, FILES[0] as string), 'utf8')).toContain('event_tables 2 · event_functions 5 · anon_can_read 0 · anon_can_sum 0 · auth_triggers 0')
  })
})

describe('the live duel file', () => {
  const sql = code(FILES[1] as string)
  it('adds two columns and three functions, and starts every live run at the shared go time', () => {
    expect(sql).toContain('add column if not exists live_go_at timestamptz')
    expect(sql).toContain('add column if not exists live_ready_at timestamptz')
    for (const fn of ['worker_blind_cow_live_state', 'worker_blind_cow_live_ready', 'worker_blind_cow_live_start']) {
      expect(sql).toContain(`create or replace function public.${fn}(`)
    }
    expect(sql).toMatch(/scoring_version, started_at\)\s+values \([^)]*v_duel\.live_go_at\)/)
    expect(sql).toContain("worker_blind_cow_fail('too_early')")
  })
  it('sets the go time once, by a conditional write', () => {
    expect(sql).toContain('where d.id = v_duel.id and d.live_go_at is null')
  })
  it('ends on its check line', () => {
    expect(readFileSync(join(ROOT, FILES[1] as string), 'utf8')).toContain('live_functions 3 · live_columns 2 · blind_cow_functions 18 · anon_can_write 0 · auth_triggers 0')
  })
})

describe('the taxonomy file (ONE RED WORLD §37, 28.9.2026)', () => {
  const sql = code(TAXONOMY)

  it('only replaces the name check on worker_event — no table, function, grant or auth', () => {
    expect(sql).not.toMatch(/create (table|or replace function|trigger|policy)/i)
    expect(sql).not.toMatch(/\bgrant\b/i)
    expect(sql).not.toMatch(/\bauth\./i)
    expect(sql).not.toMatch(/drop\s+(table|function|schema|column)/i)
    for (const m of sql.matchAll(/\balter table\s+(?:public\.)?(\w+)/gi)) expect(m[1]).toBe('worker_event')
    expect(sql).toContain('drop constraint if exists worker_event_name_check,')
  })

  it('carries every name of the plan (§37) except gate_open, which is gate_view', () => {
    for (const name of [
      'run_start', 'run_complete', 'result_view', 'archive_open', 'entity_follow', 'life_chapter_complete',
      'share_open', 'share_created', 'share_joined', 'challenge_created', 'challenge_joined', 'challenge_complete',
      'stand_created', 'stand_joined', 'stand_daily_complete', 'daily_open', 'daily_item_complete', 'daily_complete',
    ]) expect(sql).toContain(`'${name}'`)
    expect(sql).not.toContain("'gate_open'")
  })

  it('ends on its check line', () => {
    expect(readFileSync(join(ROOT, TAXONOMY), 'utf8')).toContain('event_names 42 · anon_can_read 0 · auth_triggers 0')
  })
})
