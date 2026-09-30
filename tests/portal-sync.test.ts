import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { activeStore, LocalBallotStore } from '@/lib/polls/store'
import {
  earlier,
  emptyIdentity,
  later,
  mergeDeviceProfiles,
  mergeIdentity,
  mergeProfiles,
  mergeRotation,
  mergeStat,
  remoteProfile,
  type PortalProfile,
} from '@/lib/portal/merge'
import { foldRuns } from '@/lib/portal/sync'
import { emptyBook, type MemberBook } from '@/lib/game/member'
import {
  editWinner,
  foldItems,
  LEGACY_EDIT,
  mergeCardUnit,
  mergeSupporter,
  unitOfBook,
} from '@/lib/portal/merge'
import {
  bookAfter,
  deedsToPush,
  itemsToPush,
  parseDeedKey,
  planSync,
  unitOfRow,
  type AppProfileRow,
  type RemoteSide,
} from '@/lib/portal/plan'
import { runSyncHandlers, SYNC_HANDLERS, type SyncHandler } from '@/lib/portal/handlers'
import { applyEvent } from '@/lib/profile/events'
import { emptyProfile, emptyStat, type Profile } from '@/lib/profile/store'

/**
 * הפורטל מדבר עם עצמו — the two seams that decide whether a person is one person.
 *
 * Both subjects here are pure by construction, and that is the whole reason this file
 * can exist: the merge is a function on two records, and `activeStore()` is a function
 * on two environment variables. Neither of them needs a network, a browser or a Supabase
 * project to be checked, which means the decisions they encode — *which side wins for
 * `since`*, *which side wins for a file number*, *what happens on a build with no keys* —
 * are settled here rather than by somebody signing in on two phones and hoping.
 *
 * What is NOT tested here is anything that talks to Postgres. The RLS policies and the
 * RPCs are SQL, they are applied by hand (Maor does not use a terminal), and a mock of a
 * Supabase client would only ever assert that this file's own mock behaves like this
 * file's own mock.
 */

const ROOT = join(__dirname, '..')

function card(over: Partial<Profile> = {}): Profile {
  return { ...emptyProfile(), since: '', days: [], ...over }
}

function side(since: string, memberNo: string | null, profile: Partial<Profile> = {}): PortalProfile {
  return {
    identity: { ...emptyIdentity(), memberNo, since },
    profile: card({ since, ...profile }),
  }
}

describe('מאז — `since` takes the earlier, and that is not a max()', () => {
  it('keeps the older card when a newer device signs in', () => {
    // The whole failure this rule exists to stop: a laptop opened for the first time
    // today carries today's date, and a "latest wins" merge would reset a card that
    // began in 2026 every single time somebody opened the app somewhere new.
    const phone = side('2026-01-04', 'TIK-0417')
    const laptop = side('2026-09-17', null)
    expect(mergeProfiles(laptop, phone).identity.since).toBe('2026-01-04')
    expect(mergeProfiles(phone, laptop).identity.since).toBe('2026-01-04')
  })

  it('is symmetric — the answer does not depend on which side was called local', () => {
    const a = side('2026-03-01', null)
    const b = side('2026-02-01', null)
    expect(mergeProfiles(a, b).identity.since).toBe(mergeProfiles(b, a).identity.since)
  })

  it('treats an empty date as "nothing known", never as the beginning of time', () => {
    // An untouched profile carries '' and the naive string compare makes it the winner
    // of every `<`, which would answer '' for every merge in the app.
    expect(earlier('', '2026-05-05')).toBe('2026-05-05')
    expect(earlier('2026-05-05', '')).toBe('2026-05-05')
    expect(later('', '2026-05-05')).toBe('2026-05-05')
    expect(mergeProfiles(side('', null), side('2026-05-05', null)).identity.since).toBe('2026-05-05')
  })

  it('carries the same rule into the device profile, so the two copies cannot disagree', () => {
    const merged = mergeProfiles(side('2026-09-17', null), side('2026-01-04', null))
    expect(merged.profile.since).toBe('2026-01-04')
    expect(merged.profile.since).toBe(merged.identity.since)
  })
})

describe('מספר המנוי — issued once, never re-earned', () => {
  it('never lets a fresh device number displace the account one', () => {
    const phone = side('2026-01-04', 'TIK-0417')
    const laptop = side('2026-09-17', 'TIK-8123')
    expect(mergeProfiles(laptop, phone).identity.memberNo).toBe('TIK-0417')
  })

  it('adopts a device number upward when the account has none', () => {
    const local = side('2026-01-04', 'TIK-0417')
    const remote = side('2026-01-04', null)
    expect(mergeProfiles(local, remote).identity.memberNo).toBe('TIK-0417')
  })

  it('answers null when neither side has one, rather than inventing a number', () => {
    expect(mergeProfiles(side('2026-01-04', null), side('2026-02-02', null)).identity.memberNo).toBe(
      null,
    )
  })

  it('does not treat blank as a number', () => {
    const local = { ...emptyIdentity(), memberNo: 'TIK-0417', since: '2026-01-01' }
    const remote = { ...emptyIdentity(), memberNo: '   ', since: '2026-01-01' }
    expect(mergeIdentity(local, remote).memberNo).toBe('TIK-0417')
  })

  it('is what `lib/game/member.ts` now makes stable — a file number is written when minted', () => {
    // Until 17.9.2026 `readBook()` minted a fresh TIK on every call for a device that had
    // never saved anything, so the one field the card calls unearnable was the one that
    // changed most. `member_no` is only a key if the number survives a reload.
    const source = readFileSync(join(ROOT, 'lib/game/member.ts'), 'utf8')
    expect(source).toContain('export function storedBook()')
    const readBody = source.slice(source.indexOf('export function readBook'))
    expect(readBody.slice(0, readBody.indexOf('\n}\n'))).toContain('writeBook(fresh)')
  })
})

describe('מונים — max(), because a sync runs again tomorrow', () => {
  it('never sums two totals, however many times it is run', () => {
    const local = side('2026-01-01', null, {
      gates: { '/memory': { ...emptyStat(), plays: 40, correct: 300, asked: 400, best: 91 } },
    })
    const remote = side('2026-01-01', null, {
      gates: { '/memory': { ...emptyStat(), plays: 30, correct: 250, asked: 320, best: 88 } },
    })

    const once = mergeProfiles(local, remote)
    expect(once.profile.gates['/memory']?.plays).toBe(40)
    expect(once.profile.gates['/memory']?.correct).toBe(300)
    expect(once.profile.gates['/memory']?.best).toBe(91)

    // The property that decided max() over sum: merging the answer back in is a no-op.
    const twice = mergeProfiles(once, remote)
    const thrice = mergeProfiles(twice, remote)
    expect(thrice.profile.gates['/memory']).toEqual(once.profile.gates['/memory'])
  })

  it('takes the LATER date for "last played", which is the one field on a stat that is a date', () => {
    const merged = mergeStat(
      { ...emptyStat(), plays: 2, lastOn: '2026-04-01' },
      { ...emptyStat(), plays: 9, lastOn: '2026-08-08' },
    )
    expect(merged.plays).toBe(9)
    expect(merged.lastOn).toBe('2026-08-08')
  })

  it('keeps a gate only one side has ever played', () => {
    const merged = mergeDeviceProfiles(
      card({ gates: { '/xi': { ...emptyStat(), plays: 1 } } }),
      card({ gates: { '/polls': { ...emptyStat(), plays: 3 } } }),
    )
    expect(Object.keys(merged.gates).sort()).toEqual(['/polls', '/xi'])
    expect(merged.gates['/polls']?.plays).toBe(3)
  })

  it('takes the higher share count and the higher duel count', () => {
    const merged = mergeDeviceProfiles(
      card({ shares: 5, duelsTaken: 0 }),
      card({ shares: 2, duelsTaken: 7 }),
    )
    expect(merged.shares).toBe(5)
    expect(merged.duelsTaken).toBe(7)
  })
})

describe('קבוצות — days and collections are a union, so they are exact', () => {
  it('unions the days without ever counting one twice', () => {
    const merged = mergeDeviceProfiles(
      card({ days: ['2026-01-01', '2026-01-02'] }),
      card({ days: ['2026-01-02', '2026-01-03'] }),
    )
    expect(merged.days).toEqual(['2026-01-01', '2026-01-02', '2026-01-03'])
  })

  it('unions a collection by id, which is why 45 of 45 cannot become 90', () => {
    const merged = mergeDeviceProfiles(
      card({ collections: { ussishkin: ['a', 'b'] } }),
      card({ collections: { ussishkin: ['b', 'c'], archive: ['z'] } }),
    )
    expect(merged.collections.ussishkin).toEqual(['a', 'b', 'c'])
    expect(merged.collections.archive).toEqual(['z'])
  })
})

describe('רוטציה — a deck position belongs to the device walking it', () => {
  it('walks the further cursor when both sides are in the same shuffle', () => {
    expect(mergeRotation({ seed: 41, cursor: 2 }, { seed: 41, cursor: 9 })).toEqual({
      seed: 41,
      cursor: 9,
    })
  })

  it('keeps the local deck when the two are in different shuffles', () => {
    // Taking the other device's cursor into this device's seed would skip rounds this
    // person has never been dealt — the exact thing the deck exists to prevent.
    expect(mergeRotation({ seed: 41, cursor: 2 }, { seed: 77, cursor: 9 })).toEqual({
      seed: 41,
      cursor: 2,
    })
  })

  it('adopts the other side when this device has no deck at all', () => {
    expect(mergeRotation(undefined, { seed: 77, cursor: 3 })).toEqual({ seed: 77, cursor: 3 })
    expect(mergeRotation(undefined, undefined)).toBe(null)
    expect(mergeRotation({ seed: 0, cursor: 4 }, { seed: 77, cursor: 3 })).toEqual({
      seed: 77,
      cursor: 3,
    })
  })
})

describe('התחברות ראשונה — nothing is destroyed', () => {
  it('returns the device card untouched when the account holds nothing yet', () => {
    const local = side('2026-01-04', 'TIK-0417', {
      days: ['2026-01-04'],
      gates: { '/goal': { ...emptyStat(), plays: 3, best: 40 } },
    })
    expect(mergeProfiles(local, null)).toEqual(local)
  })

  it('reads a partial remote profile without inventing the parts it does not hold', () => {
    const remote = remoteProfile({ days: ['2026-02-02'] })
    expect(remote.since).toBe('')
    expect(remote.gates).toEqual({})
    expect(remote.collections).toEqual({})
    expect(remote.shares).toBe(0)
  })
})

describe('worker_gate_run — the rows are the count, the counters are derived', () => {
  it('folds rows into exactly the shape the device keeps', () => {
    const folded = foldRuns([
      { gate: '/memory', score: 40, asked: 8, correct: 6, played_on: '2026-03-01' },
      { gate: '/memory', score: 90, asked: 8, correct: 8, played_on: '2026-03-04' },
      { gate: '/xi', score: 0, asked: 0, correct: 0, played_on: '2026-03-04' },
    ])
    expect(folded.days).toEqual(['2026-03-01', '2026-03-04'])
    expect(folded.since).toBe('2026-03-01')
    expect(folded.gates?.['/memory']).toEqual({
      plays: 2,
      best: 90,
      bestRate: 1,
      lastOn: '2026-03-04',
      correct: 14,
      asked: 16,
    })
    // A wing reports a deed: no score, no denominator, and it still lights its plate.
    expect(folded.gates?.['/xi']?.plays).toBe(1)
    expect(folded.gates?.['/xi']?.bestRate).toBe(0)
  })

  it('counts nothing from no rows, rather than starting anybody at zero-of-something', () => {
    expect(foldRuns([])).toEqual({ since: '', days: [], gates: {} })
  })
})

describe('הקלפי — which store this build votes into', () => {
  it('falls back to the local store when the environment holds no keys', () => {
    // This is the state the repository builds and tests in, and the one every screen has
    // to keep working in: no project, no account, no count — the slip and the honesty
    // plate, exactly as gate 7 shipped.
    expect(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').toBe('')
    const store = activeStore()
    expect(store).toBeInstanceOf(LocalBallotStore)
    expect(store.countable).toBe(false)
  })

  it('resolves a null tally locally, so the board draws the honesty plate', async () => {
    expect(await activeStore().tally('favourite')).toBe(null)
  })

  it('decides on the keys alone — a session is not part of the question', () => {
    // The ballot is keyed to a DEVICE and never to a person (`worker_poll_vote` carries no
    // user_id at all), so requiring a sign-in to vote would be the quietest possible way
    // of turning an anonymous ballot into an identified one. Asserted on the source,
    // because the decision is the thing worth protecting, not the branch.
    const source = readFileSync(join(ROOT, 'lib/polls/store.ts'), 'utf8')
    const body = source.slice(source.indexOf('export function activeStore'))
    expect(body).toContain('portalConfigured()')
    expect(body).not.toContain('auth')
  })

  it('never reads the vote table, only the two functions', () => {
    // `worker_poll_vote` has RLS on and no policy of any kind. A `from('worker_poll_vote')` anywhere in
    // the client would be a query that silently returns nothing — and a sign that
    // somebody had added the read policy to make it work.
    const source = readFileSync(join(ROOT, 'lib/polls/store.ts'), 'utf8')
    expect(source).not.toContain("from('worker_poll_vote')")
    expect(source).toContain('worker_poll_cast')
    expect(source).toContain('worker_poll_tally')
  })
})

describe('הפרדת המזהים — the ballot id never travels with a user id', () => {
  const device = readFileSync(join(ROOT, 'lib/portal/device.ts'), 'utf8')
  const record = readFileSync(join(ROOT, 'components/play/RecordRun.tsx'), 'utf8')

  it('mints the device id from the platform, never from Math.random', () => {
    expect(device).toContain('randomUUID')
    expect(device).not.toContain('Math.random')
  })

  it('keeps the ballot id out of the run report', () => {
    // `worker_gate_run` rows carry `user_id`. If the ballot's device id were used as an
    // idempotency key there, the two tables could be joined and every anonymous vote
    // would have a name on it.
    expect(record).not.toContain('deviceId')
  })
})

const WORKER_SQL = 'supabase/migrations/20260922090000_worker_shared_project.sql'

describe('הסכימה — what the migration promises the code', () => {
  const sql = readFileSync(join(ROOT, WORKER_SQL), 'utf8')

  it('keeps the exact ballot shape `lib/polls/store.ts` committed to', () => {
    expect(sql).toContain('create table if not exists public.worker_poll_vote')
    for (const column of ['device_id', 'question_id', 'pick', 'voted_at']) {
      expect(sql, column).toContain(column)
    }
    expect(sql).toContain('unique (device_id, question_id)')
  })

  it('gives worker_poll_vote no policy and no grant, so a row can never be read out of it', () => {
    expect(sql).toMatch(/alter table public\.worker_poll_vote\s+enable row level security/)
    expect(sql).not.toMatch(/create policy \w+ on public\.worker_poll_vote/)
    expect(sql).not.toMatch(/grant [^;]* on public\.worker_poll_vote/)
  })

  it('puts no user id on a vote — the privacy guarantee is structural, not a promise', () => {
    const table = sql.slice(
      sql.indexOf('create table if not exists public.worker_poll_vote'),
      sql.indexOf('create index if not exists worker_poll_vote_question_idx'),
    )
    expect(table).not.toContain('user_id')
  })

  it('enables row level security on every table it creates', () => {
    const created = [...sql.matchAll(/create table if not exists public\.(\w+)/g)].map((m) => m[1] as string)
    expect(created).toHaveLength(7)
    for (const table of created) {
      expect(sql, `${table} has no RLS`).toMatch(new RegExp(`alter table public\\.${table}\\s+enable row level security`))
    }
  })

  it('says what every table is for, in Hebrew, like every other migration here', () => {
    const created = [...sql.matchAll(/create table if not exists public\.(\w+)/g)].map((m) => m[1] as string)
    for (const table of created) {
      expect(sql, `${table} has no comment`).toMatch(new RegExp(`comment on table public\\.${table} is\\s*\\n\\s*'[^']*[֐-׿]`))
    }
  })

  it('creates no server table that no code reads — the life log stays on the device', () => {
    // 17.9 declared life_save, life_checkpoint, kit_built and xi_pick. Nothing in `app`,
    // `components` or `lib` ever read or wrote them, so the shared project does not get them.
    for (const table of ['life_save', 'life_checkpoint', 'kit_built', 'xi_pick']) {
      expect(sql, table).not.toContain(table)
    }
  })

  it('records on the server, with an idempotency key', () => {
    expect(sql).toContain('security definer set search_path = public')
    expect(sql).toContain('on conflict (user_id, idempotency_key) do nothing')
  })

  it('never lets a member number be re-issued or a start date move forward', () => {
    expect(sql).toContain('member_no cannot be re-issued')
    expect(sql).toContain('new.since := least(old.since, new.since)')
  })

  it('bounds the card and the seal, and keeps the newest edit', () => {
    expect(sql).toContain('octet_length(card::text) <= 2048')
    expect(sql).toContain('octet_length(supporter::text) <= 2048')
    expect(sql).toContain('shirt_number between 1 and 99')
    expect(sql).toContain('new.card_edited_at < old.card_edited_at')
  })

  it('writes collections idempotently, for signed-in callers only', () => {
    expect(sql).toMatch(/create or replace function public\.worker_collect\(p_set text, p_ids text\[\]\)/)
    expect(sql).toContain('on conflict (user_id, set_id, item_id) do nothing')
    expect(sql).toContain('grant execute on function public.worker_collect(text, text[])                                     to authenticated')
    expect(sql).not.toMatch(/grant execute on function public\.worker_collect[^;]*anon/)
  })

  it('opens exactly the ballot to anon, and nothing else', () => {
    const toAnon = [...sql.matchAll(/grant execute on function public\.(\w+)\([^)]*\)\s+to anon/g)].map((m) => m[1])
    expect(toAnon.sort()).toEqual(['worker_poll_cast', 'worker_poll_tally'])
    expect(sql).not.toMatch(/grant (all|insert|update|delete)[^;]* to anon/)
  })

  it('ships no seeded vote, no baseline and no invented row', () => {
    expect(sql).not.toMatch(/insert into public\.worker_poll_vote\s*\(device_id[^)]*\)\s*values\s*\(\s*'/)
    expect(sql).not.toMatch(/votes:\s*\d/)
  })
})

/*
 * The Supabase project is SHARED with DUBID (22.9.2026). Every rule below is a way the
 * 17.9 file would have reached into the other app: a trigger on every sign-up in the
 * project, a card row for every DUBID user, and table names DUBID could just as well own.
 */
describe('פרויקט משותף עם DUBID — THE WORKER touches only what it created', () => {
  const sql = readFileSync(join(ROOT, WORKER_SQL), 'utf8')
  const code = sql
    .split('\n')
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n')
    .replace(/\/\*[\s\S]*?\*\//g, '')

  it('puts no trigger on auth and copies nobody out of auth.users', () => {
    expect(code).not.toMatch(/create trigger[^;]*\bon auth\./i)
    expect(code).not.toMatch(/from auth\.users/i)
    expect(code).not.toMatch(/handle_new_user|on_auth_user_created/)
  })

  it('names every table, function, trigger, policy and index it creates worker_…', () => {
    const created = [
      ...code.matchAll(/create (?:table if not exists|or replace function|trigger|policy|index if not exists|unique index if not exists)\s+(?:public\.)?(\w+)/gi),
    ].map((m) => m[1] as string)
    expect(created.length).toBeGreaterThan(30)
    for (const name of created) expect(name, name).toMatch(/^worker_/)
  })

  it('alters, drops and revokes only its own objects', () => {
    for (const m of code.matchAll(/\b(?:alter table|drop trigger if exists \w+ on|drop policy if exists \w+ on)\s+(?:public\.)?(\w+)/gi)) {
      expect(m[1], m[0]).toMatch(/^worker_/)
    }
    expect(code).not.toMatch(/drop\s+(table|function|schema|column)/i)
    expect(code).not.toMatch(/\b(delete\s+from|truncate)\b/i)
    expect(code).not.toMatch(/alter default privileges/i)
  })

  it('creates the card when the person first opens THE WORKER, not when they sign up anywhere', () => {
    expect(code).toContain('create or replace function public.worker_profile_ensure()')
    expect(readFileSync(join(ROOT, 'lib/portal/sync.ts'), 'utf8')).toContain("rpc('worker_profile_ensure')")
  })

  it('reports its own check: 7 tables, 15 functions, no trigger on auth', () => {
    const tables = [...code.matchAll(/create table if not exists public\.(\w+)/g)].length
    const functions = new Set([...code.matchAll(/create or replace function public\.(\w+)/g)].map((m) => m[1])).size
    expect(tables).toBe(7)
    expect(functions).toBe(15)
    expect(sql).toContain('worker_tables 7 · worker_functions 15 · auth_triggers 0')
  })

  it('leaves every older migration an empty file that says which one to run', () => {
    const dir = join(ROOT, 'supabase/migrations')
    // 24.9.2026: gate 10's duel is its own standalone file (tests/blind-cow-schema.test.ts)
    // 25.9.2026 (delta 89): the measurement and the live duel are standalone files too
    // (tests/events-schema.test.ts)
    const live = [
      '20260922090000_worker_shared_project.sql',
      '20260922120000_worker_collector_market.sql',
      '20260924090000_worker_blind_cow.sql',
      '20260925090000_worker_events.sql',
      '20260925091000_worker_blind_cow_live.sql',
      '20260925092000_worker_away_been.sql',
      // 28.9.2026 (ONE RED WORLD §37): widens the event name check only (tests/events-schema.test.ts)
      '20260928090000_worker_events_taxonomy.sql',
      // 28.9.2026 (ONE RED WORLD §8, §45): "היציע שלי" — standalone (tests/stand.test.ts)
      '20260928120000_worker_stands.sql',
      // 28.9.2026 (ONE RED WORLD §35): the public identity, "אדום #N" (tests/personal-area.test.ts)
      '20260928130000_worker_public_identity.sql',
    ]
    for (const name of readdirSync(dir)) {
      if (live.includes(name)) continue
      const body = readFileSync(join(dir, name), 'utf8')
      const statements = body
        .split('\n')
        .filter((line) => !line.trim().startsWith('--') && line.trim() !== '')
        .join('\n')
      expect(statements, name).toMatch(/^select '[^']*20260922090000_worker_shared_project\.sql[^']*' as note;$/)
    }
  })
})

describe('המפתח הציבורי אינו בקוד', () => {
  it('never hardcodes a Supabase key or URL in a committed source file', () => {
    // The publishable key is a PUBLIC key and it still does not belong in the repository:
    // it is an environment variable so that a rotation is a click in Vercel rather than
    // a delta, and so that a preview, production and a future second project are not the
    // same string in three places.
    for (const path of [
      'lib/portal/env.ts',
      'lib/portal/sync.ts',
      'lib/polls/store.ts',
      'app/tik/AccountPlate.tsx',
      'app/auth/callback/route.ts',
    ]) {
      const text = readFileSync(join(ROOT, path), 'utf8')
      expect(text, path).not.toContain('sb_publishable_')
      expect(text, path).not.toMatch(/https:\/\/[a-z0-9]+\.supabase\.co/)
    }
  })
})

/* ==========================================================================================
 * 21.9.2026 — the card, the collections and the deeds travel too
 * ======================================================================================= */

function book(over: Partial<MemberBook> = {}): MemberBook {
  return { ...emptyBook(), tik: 'TIK-0417', nameHe: '', number: 17, punches: [], ...over }
}

function account(over: Partial<AppProfileRow> = {}): AppProfileRow {
  // An account row that carries the Google name and no card — the case the merge must not
  // let overwrite what the fan typed (worker_profile_ensure itself writes no name at all).
  return { display_name: 'Maor Dubel', member_no: null, since: '2026-09-21', ...over }
}

function remoteSide(over: Partial<RemoteSide> = {}): RemoteSide {
  return { row: account(), runs: [], items: [], cardColumns: true, accountName: 'Maor Dubel', ...over }
}

describe('worker_profile_item — the account\'s collections, folded like the device keeps them', () => {
  it('groups by set, keeps first-seen order, and counts an id once', () => {
    expect(
      foldItems([
        { set_id: 'ussishkin', item_id: 'a' },
        { set_id: 'kits', item_id: '1984/85|home' },
        { set_id: 'ussishkin', item_id: 'b' },
        { set_id: 'ussishkin', item_id: 'a' },
        { set_id: '', item_id: 'x' },
        { set_id: 'kits', item_id: '' },
      ]),
    ).toEqual({ ussishkin: ['a', 'b'], kits: ['1984/85|home'] })
  })

  it('makes a union exact across devices — and pushes only what the account lacks', () => {
    const local = card({ collections: { ussishkin: ['a', 'b', 'c'], 'lineup.reveal': ['skipped'] } })
    const remote = foldItems([{ set_id: 'ussishkin', item_id: 'b' }, { set_id: 'ussishkin', item_id: 'z' }])
    const merged = mergeDeviceProfiles(local, remoteProfile({ collections: remote }))
    expect(merged.collections.ussishkin).toEqual(['a', 'b', 'c', 'z'])
    // a preference never leaves the device
    expect(itemsToPush(merged.collections, remote)).toEqual([{ set: 'ussishkin', ids: ['a', 'c'] }])
  })

  it('chunks a big push under the function\'s own ceiling', () => {
    const ids = Array.from({ length: 450 }, (_, i) => `id-${i}`)
    const chunks = itemsToPush({ archive: ids }, {})
    expect(chunks.map((c) => c.ids.length)).toEqual([200, 200, 50])
  })
})

describe('מעשים בחשבון — one row per gate per day', () => {
  it('reads deeds back off the account\'s keys', () => {
    expect(parseDeedKey('deed:/xi:2026-09-21')).toEqual({ gate: '/xi', day: '2026-09-21' })
    expect(parseDeedKey('0d6f…uuid')).toBeNull()
    const folded = foldRuns([
      { gate: '/xi', score: 0, asked: 0, correct: 0, played_on: '2026-09-20', idempotency_key: 'deed:/xi:2026-09-20' },
      { gate: '/xi', score: 0, asked: 0, correct: 0, played_on: '2026-09-21', idempotency_key: 'deed:/xi:2026-09-21' },
    ])
    expect(folded.deeds).toEqual({ '/xi': { on: '2026-09-21' } })
    expect(folded.gates?.['/xi']?.plays).toBe(2)
  })

  it('pushes a deed only when its key is not already there', () => {
    const deeds = { '/xi': { on: '2026-09-21' }, '/polls': { on: '2026-09-20' } }
    expect(deedsToPush(deeds, new Set(['deed:/xi:2026-09-21']))).toEqual([
      { key: 'deed:/polls:2026-09-20', gate: '/polls', day: '2026-09-20' },
    ])
  })
})

describe('הכינוי הוא השם — newest edit wins, and Google\'s seed is not an edit', () => {
  it('decides by the edit clock', () => {
    expect(editWinner({ editedAt: '', has: true }, { editedAt: '' })).toBe('local')
    expect(editWinner({ editedAt: '', has: false }, { editedAt: '' })).toBe('remote')
    expect(editWinner({ editedAt: '', has: true }, { editedAt: '2026-09-01T00:00:00.000Z' })).toBe('remote')
    expect(editWinner({ editedAt: '2026-09-21T00:00:00.000Z', has: true }, { editedAt: '2026-09-01T00:00:00.000Z' })).toBe('local')
    expect(editWinner({ editedAt: '2026-09-01T00:00:00.000Z', has: true }, { editedAt: '2026-09-01T00:00:00.000Z' })).toBe('remote')
  })

  it('sends the device nickname up over the Google name — the bug this fixes', () => {
    const plan = planSync({ profile: card(), book: book({ nameHe: 'פוגי' }) }, remoteSide())
    expect(plan.update.display_name).toBe('פוגי')
    expect(plan.update.card_edited_at).toBe(LEGACY_EDIT)
    expect(plan.identity.displayName).toBe('פוגי')
    expect(bookAfter(book({ nameHe: 'פוגי' }), plan).nameHe).toBe('פוגי')
  })

  it('does it before the SQL is run too, with the name alone', () => {
    const plan = planSync({ profile: card(), book: book({ nameHe: 'פוגי' }) }, remoteSide({ cardColumns: false }))
    expect(plan.update.display_name).toBe('פוגי')
    expect(plan.update).not.toHaveProperty('card')
    expect(plan.update).not.toHaveProperty('card_edited_at')
    expect(plan.update).not.toHaveProperty('supporter')
  })

  it('never writes a person\'s legal name into their nickname', () => {
    const plan = planSync({ profile: card(), book: book() }, remoteSide())
    expect(plan.update).not.toHaveProperty('display_name')
    expect(bookAfter(book(), plan).nameHe).toBe('')
    expect(unitOfRow(account(), true)).toEqual({ nameHe: '', number: null, card: null, editedAt: '' })
  })

  it('carries a nickname, a number and a card DOWN to a second device', () => {
    const row = account({
      display_name: 'פוגי',
      member_no: 'TIK-0417',
      card_edited_at: '2026-09-21T10:00:00+00:00',
      shirt_number: 7,
      card: { homeGate: 5, fanSince: 1983, began: 'father', first: { venueSlug: 'בלומפילד' }, values: ['moments'], issuedOn: '2026-09-21' },
    })
    const laptop = book({ tik: 'TIK-8123' })
    const plan = planSync({ profile: card(), book: laptop }, remoteSide({ row }))
    const after = bookAfter(laptop, plan)
    expect(after.nameHe).toBe('פוגי')
    expect(after.number).toBe(7)
    expect(after.tik).toBe('TIK-0417')
    expect(after.card).toMatchObject({ homeGate: 5, fanSince: 1983, began: 'father', issuedOn: '2026-09-21' })
    expect(after.card?.editedAt).toBe('2026-09-21T10:00:00.000Z')
  })

  it('lets a newer device edit win, and keeps the earliest issue date', () => {
    const local = unitOfBook(
      book({ nameHe: 'פוגי', number: 9, card: { homeGate: 7, fanSince: null, began: null, first: null, values: [], issuedOn: '2026-09-25', editedAt: '2026-09-25T08:00:00.000Z' } }),
    )
    const remote = unitOfRow(
      account({ display_name: 'ישן', card_edited_at: '2026-09-21T10:00:00Z', shirt_number: 5, card: { homeGate: 2, issuedOn: '2026-09-20' } }),
      true,
    )
    const merged = mergeCardUnit(local, remote)
    expect(merged?.nameHe).toBe('פוגי')
    expect(merged?.number).toBe(9)
    expect(merged?.card?.homeGate).toBe(7)
    expect(merged?.card?.issuedOn).toBe('2026-09-20')
  })

  it('keeps the newer seal from gate 7, and never lets a missing one erase it', () => {
    const older = { favouriteId: 'a', positionCode: 'ST', reasons: {}, sealedOn: '2026-09-01' }
    const newer = { favouriteId: 'b', positionCode: 'GK', reasons: {}, sealedOn: '2026-09-21' }
    expect(mergeSupporter(older, newer)).toBe(newer)
    expect(mergeSupporter(newer, older)).toBe(newer)
    expect(mergeSupporter(null, older)).toBe(older)
    expect(mergeSupporter(older, undefined)).toBe(older)
  })
})

describe('אנונימי ← מחובר — the first sign-in keeps everything and sends it up', () => {
  const DAY = '2026-09-21'
  let local = card({ since: '2026-09-01', days: ['2026-09-01', DAY] })
  for (const event of [
    { type: 'gate_completed', gate: '/trivia', variant: 'europe', score: 90, correct: 10, asked: 12 },
    { type: 'deed', gate: '/xi' },
    { type: 'collected', set: 'ussishkin', ids: ['a', 'b'] },
    { type: 'archive_saved', entityId: 'moment-1' },
    { type: 'collected', set: 'lineup.reveal', ids: ['skipped'] },
  ] as const) {
    local = applyEvent(local, event, { date: DAY }).profile
  }
  const device = book({ nameHe: 'פוגי', number: 7 })

  it('keeps the device\'s card whole', () => {
    const plan = planSync({ profile: local, book: device }, remoteSide({ items: [] }))
    expect(plan.profile.gates['/trivia/europe']?.plays).toBe(1)
    expect(plan.profile.gates['/xi']?.plays).toBe(1)
    expect(plan.profile.collections.ussishkin).toEqual(['a', 'b'])
    expect(plan.profile.since).toBe('2026-09-01')
    expect(plan.identity.memberNo).toBe('TIK-0417')
    expect(plan.update.member_no).toBe('TIK-0417')
  })

  it('sends up the collections and the deed as rows, and the preference not at all', () => {
    const plan = planSync({ profile: local, book: device }, remoteSide({ items: [] }))
    expect(plan.items).toEqual([
      { set: 'ussishkin', ids: ['a', 'b'] },
      { set: 'archive.mine', ids: ['moment-1#1'] },
    ])
    expect(plan.deeds).toEqual([{ key: `deed:/xi:${DAY}`, gate: '/xi', day: DAY }])
    expect(plan.update.display_name).toBe('פוגי')
    expect(plan.update.shirt_number).toBe(7)
  })

  it('pushes no collections before the SQL is run, and loses nothing locally', () => {
    const plan = planSync({ profile: local, book: device }, remoteSide({ items: null, cardColumns: false }))
    expect(plan.items).toEqual([])
    expect(plan.profile.collections.ussishkin).toEqual(['a', 'b'])
  })

  it('does not re-send a deed the account already holds', () => {
    const plan = planSync(
      { profile: local, book: device },
      remoteSide({
        runs: [{ gate: '/xi', score: 0, asked: 0, correct: 0, played_on: DAY, idempotency_key: `deed:/xi:${DAY}` }],
      }),
    )
    expect(plan.deeds).toEqual([])
    expect(plan.profile.gates['/xi']?.plays).toBe(1)
  })

  it('with no account row, changes nothing and pushes nothing', () => {
    const plan = planSync({ profile: local, book: device }, remoteSide({ row: null }))
    expect(plan.remote).toBeNull()
    expect(plan.update).toEqual({})
    expect(plan.items).toEqual([])
  })
})

describe('נקודת החיבור — a gate\'s own ledger syncs without editing sync.ts', () => {
  it('keys every handler uniquely, runs each in isolation, and never throws', async () => {
    // the list grows when a cluster registers its ledger (gate 2's marks-sync); ids stay unique
    expect(new Set(SYNC_HANDLERS.map((h) => h.id)).size).toBe(SYNC_HANDLERS.length)
    const ok: SyncHandler = { id: 'ok', sync: async () => true }
    const broken: SyncHandler = {
      id: 'broken',
      sync: async () => {
        throw new Error('no table')
      },
    }
    const out = await runSyncHandlers({ db: {} as never, userId: 'u' }, [broken, ok])
    expect(out).toEqual({ broken: false, ok: true })
  })
})

describe('הפרדת המזהים — the progress layer keeps the ballot id out too', () => {
  it('never puts the device id into anything that carries a user', () => {
    for (const path of ['lib/profile/events.ts', 'lib/portal/plan.ts', 'lib/portal/sync.ts']) {
      expect(readFileSync(join(ROOT, path), 'utf8'), path).not.toContain('deviceId')
    }
  })
})
