import {describe,it,expect,vi,beforeEach} from 'vitest'
const request = vi.hoisted(() => ({host: 'hapoeltelaviv.localhost', paused: false, gates: [10], values: new Map<string, string>()}))
vi.mock('next/headers', () => ({headers: () => new Headers({host: request.host}), cookies: () => ({get: (key: string) => request.values.has(key) ? {value: request.values.get(key)} : undefined, set: (key: string, value: string) => request.values.set(key, value)})}))
vi.mock('@/lib/master/store', () => ({readState: async () => ({clubs: ['olympiacos', 'zrinjski-mostar', 'hapoel-tel-aviv'].map(id => ({id, status: request.paused ? 'paused' : 'live', gates: request.gates}))})}))
import {startMysteryMode, moveMysteryMode} from '@/app/clubs/[slug]/[gate]/mystery-modes'
import {startMystery, moveMystery} from '@/app/clubs/[slug]/[gate]/mystery-actions'
import {lobbyState, modeKey, settle} from '@/lib/clubs/mystery-modes'
import {loadClub} from '@/lib/clubs/resolver'
import {clubMystery} from '@/lib/clubs/mystery'
import {open, seal} from '@/lib/game/blind-cow/token'
import type {RunState} from '@/lib/game/blind-cow/solo-engine'

beforeEach(() => { request.host = 'hapoeltelaviv.localhost'; request.paused = false; request.gates = [10]; request.values.clear() })
const club = async (id = 'hapoel-tel-aviv') => (await loadClub(id))!.data

describe('gate 10 · the rulebook against the real banks', () => {
 it('Hapoel: every competitive mystery is ten typed clues, three families, a never-rising ladder ending on one', async () => {
  const data = await club(), game = clubMystery(data)
  expect(game.competitiveSize).toBeGreaterThan(20)
  for (const f of data.mysteries) {
   const e = game.evaluations.get(f.id); if (!e?.competitive.ok) continue
   expect(f.value.clues).toHaveLength(10); expect(e.families.length).toBeGreaterThanOrEqual(3)
   const r = f.value.remaining!; expect(r[9]).toBe(1)
   for (let i = 1; i < r.length; i++) expect(r[i]!).toBeLessThanOrEqual(r[i - 1]!)
   expect(f.value.clues.every(c => c.family && c.facet && c.factKey && c.sources.length)).toBe(true)
  }
 }, 60000)
 it('Hapoel: no clue of any playable mystery names its target', async () => {
  const data = await club(), game = clubMystery(data)
  for (const f of data.mysteries) { const e = game.evaluations.get(f.id); if (e?.practice.ok) expect(e.practice.blockers).toEqual([]) }
 }, 60000)
 it('Hapoel: shirt-number clues carry their season', async () => {
  const data = await club()
  const shirts = data.mysteries.flatMap(f => f.value.clues).filter(c => c.type === 'shirt_number')
  expect(shirts.length).toBeGreaterThan(0); for (const c of shirts) expect(c.scope?.season).toMatch(/^\d{4}\/\d{2}$/)
 })
 it('a club whose mysteries are prose only offers practice as exploration and locks daily and duel', async () => {
  const data = await club('olympiacos'), game = clubMystery(data), lobby = lobbyState(data, null)
  expect(data.mysteries.length).toBeGreaterThan(0)
  expect(game.competitiveSize).toBe(0); expect(lobby.modes.daily.open).toBe(false); expect(lobby.modes.duel.open).toBe(false)
  expect(lobby.modes.daily.codes.map(c => c.code)).toContain('BLIND_COW_NOT_UNIQUE')
  expect(lobby.modes.practice.open).toBe(true); expect(lobby.modes.unique).toBe(0)
  expect([...game.evaluations.values()].filter(e => e.practice.ok).every(e => e.practice.kind === 'exploration')).toBe(true)
  // practice never deals a 4-clue mystery
  for (const f of data.mysteries) if (f.value.clues.length < 5) expect(game.evaluations.get(f.id)?.practice.ok).toBe(false)
 })
 it('a club with no competitive pool cannot start a daily or a challenge', async () => {
  request.host = 'olympiacos.localhost'
  const data = await club('olympiacos')
  expect(await startMysteryMode('olympiacos', data.version, 'duel', '5')).toBeNull()
 }, 30000)
 it('the lobby tells how many are open and why the rest are not — numbers, never the answer', async () => {
  const data = await club(), lobby = lobbyState(data, null)
  expect(lobby.modes.daily.open).toBe(true); expect(lobby.modes.daily.count).toBe(clubMystery(data).competitiveSize)
  expect(lobby.modes.limitMs).toBe(120_000)
  expect(JSON.stringify(lobby)).not.toMatch(/targetPlayerId|playerId/)
 })
})

describe('gate 10 · the run contract', () => {
 it('duplicate delivery charges once: a repeated wrong guess and a replayed reveal', async () => {
  const data = await club(), id = data.identity.id
  const run = (await startMystery(id, data.version))!
  const target = data.mysteries.find(q => q.id === open<{run: RunState}>(request.values.get(`fanlife-mystery-${id}`)!)!.run.qid)!.value.targetPlayerId
  const wrong = data.players!.map(p => p.value.id).find(p => p !== target)!
  const a = (await moveMystery(id, data.version, run.rid, 'guess', wrong))!, b = (await moveMystery(id, data.version, run.rid, 'guess', wrong))!
  expect(a.wrong).toBe(1); expect(b.wrong).toBe(1)
  expect((await moveMystery(id, data.version, run.rid, 'reveal', 1))!.shown).toBe(2)
  expect((await moveMystery(id, data.version, run.rid, 'reveal', 1))!.shown).toBe(2)
  const solved = (await moveMystery(id, data.version, run.rid, 'guess', target))!
  expect(solved.status).toBe('solved'); expect((await moveMystery(id, data.version, run.rid, 'guess', wrong))!.wrong).toBe(1)
  // the reveal explains itself: every clue with its sources, the scope, and an honest coverage line
  expect(solved.result!.reveal).toHaveLength(solved.total); expect(solved.result!.reveal.every(c => c.sources.length > 0)).toBe(true)
  expect(solved.result!.coverage).toBe('unique-in-archive')
 }, 30000)
 it('the start timestamp is the server\'s, and a resumed run keeps it', async () => {
  const data = await club(), id = data.identity.id
  const before = Date.now(), first = (await startMysteryMode(id, data.version, 'duel', '9'))!
  expect(first.startedAt).toBeGreaterThanOrEqual(before - 5); expect(first.startedAt).toBeLessThanOrEqual(Date.now())
  expect((await startMysteryMode(id, data.version, 'duel', '9'))!.startedAt).toBe(first.startedAt)
 }, 30000)
 it('a duel closes at 120 s as a timeout stamped at the deadline: a late right guess cannot win', async () => {
  const data = await club(), id = data.identity.id, first = (await startMysteryMode(id, data.version, 'duel', '31'))!
  const key = modeKey('duel', id), session = open<{run: RunState; [k: string]: unknown}>(request.values.get(key)!)!
  const target = data.mysteries.find(q => q.id === session.run.qid)!.value.targetPlayerId
  const old = {...session.run, started: Date.now() - 125_000}
  expect(settle('duel', old, Date.now())).toMatchObject({status: 'timeout', finished: old.started + 120_000})
  expect(settle('duel', {...old, started: Date.now() - 119_000}, Date.now()).status).toBe('playing')
  expect(settle('daily', old, Date.now()).status).toBe('playing')
  request.values.set(key, seal({...session, run: old}))
  const late = (await moveMysteryMode(id, data.version, 'duel', '31', first.rid, 'guess', target))!
  expect(late.status).toBe('timeout'); expect(late.result?.rawElapsedMs).toBe(120_000)
  expect(late.result!.weightedTimeMs).toBe(120_000)
  expect(lobbyState(data, null).duel?.status).toBe('timeout')
 }, 30000)
 it('refuses a run sealed under a scoring version it cannot honour', async () => {
  const data = await club(), id = data.identity.id, game = clubMystery(data)
  const run = (await startMystery(id, data.version))!, key = `fanlife-mystery-${id}`, parsed = open<{run: RunState}>(request.values.get(key)!)!
  const bad = {...parsed.run, sv: 2}
  expect(game.valid(bad)).toBe(false); expect(game.unsupportedVersion(bad)).toBe(true); expect(game.unsupportedVersion(parsed.run)).toBe(false)
  request.values.set(key, seal({...parsed, run: bad}))
  expect(await moveMystery(id, data.version, run.rid, 'reveal', 1)).toBeNull()
 }, 30000)
 it('a daily is one frozen target for the club-local day: the same tag resumes it, and a finished one stays finished', async () => {
  const data = await club(), id = data.identity.id, day = lobbyState(data, null).daily.day
  const a = (await startMysteryMode(id, data.version, 'daily', day))!
  expect(lobbyState(data, null).daily.zone).toBe('Asia/Jerusalem')
  expect((await startMysteryMode(id, data.version, 'daily', day))!.rid).toBe(a.rid)
  const gu = (await moveMysteryMode(id, data.version, 'daily', day, a.rid, 'give_up', 0))!
  expect(gu.status).toBe('gave_up'); expect((await startMysteryMode(id, data.version, 'daily', day))!.status).toBe('gave_up')
 }, 30000)
})
