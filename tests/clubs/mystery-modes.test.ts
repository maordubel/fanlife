import {describe,it,expect,vi,beforeEach} from 'vitest'
const request = vi.hoisted(() => ({host: 'hapoeltelaviv.localhost', paused: false, gates: [10], values: new Map<string, string>()}))
vi.mock('next/headers', () => ({headers: () => new Headers({host: request.host}), cookies: () => ({get: (key: string) => request.values.has(key) ? {value: request.values.get(key)} : undefined, set: (key: string, value: string) => request.values.set(key, value)})}))
vi.mock('@/lib/master/store', () => ({readState: async () => ({clubs: ['olympiacos', 'zrinjski-mostar', 'hapoel-tel-aviv'].map(id => ({id, status: request.paused ? 'paused' : 'live', gates: request.gates}))})}))
import {startMysteryMode, moveMysteryMode} from '@/app/clubs/[slug]/[gate]/mystery-modes'
import {startMystery} from '@/app/clubs/[slug]/[gate]/mystery-actions'
import {lobbyState, soloRun, todayFor, legalTag, modeKey} from '@/lib/clubs/mystery-modes'
import {loadClub} from '@/lib/clubs/resolver'
import {clubMystery} from '@/lib/clubs/mystery'
import {open, seal} from '@/lib/game/blind-cow/token'
import {pickIndex} from '@/lib/clubs/mystery-model'
import type {RunState} from '@/lib/game/blind-cow/solo-engine'

beforeEach(() => { request.host = 'hapoeltelaviv.localhost'; request.paused = false; request.gates = [10]; request.values.clear() })
const club = async () => (await loadClub('hapoel-tel-aviv'))!.data

describe('gate 10 · daily and challenge are dealt from a tag', () => {
 it('deals the same mystery for the same seed, resumes it, and never puts the answer in the view or cookie', async () => {
  const data = await club(), id = data.identity.id
  const first = (await startMysteryMode(id, data.version, 'duel', '482913'))!
  expect(first.shown).toBe(1); expect(first.result).toBeUndefined()
  const cookie = request.values.get(modeKey('duel', id))!, session = open<{tag: string; run: RunState}>(cookie)!
  const idx = pickIndex(id, data.version, '482913', clubMystery(data).poolSize)
  expect(session.run.qid).toBe(data.mysteries[idx]!.id)
  const target = data.mysteries.find(q => q.id === session.run.qid)!.value.targetPlayerId
  expect(cookie).not.toContain(target); expect(JSON.stringify(first)).not.toContain(target)
  expect((await startMysteryMode(id, data.version, 'duel', '482913'))!.rid).toBe(first.rid)
  expect((await moveMysteryMode(id, data.version, 'duel', '482913', first.rid, 'reveal', 1))!.shown).toBe(2)
  const solved = (await moveMysteryMode(id, data.version, 'duel', '482913', first.rid, 'guess', target))!
  expect(solved.status).toBe('solved'); expect(solved.result?.playerId).toBe(target)
 }, 30000)
 it('keeps the solo run, the daily and the duel apart', async () => {
  const data = await club(), id = data.identity.id
  const solo = (await startMystery(id, data.version))!
  const daily = (await startMysteryMode(id, data.version, 'daily', todayFor(data)))!
  const duel = (await startMysteryMode(id, data.version, 'duel', '5'))!
  expect(new Set([solo.rid, daily.rid, duel.rid]).size).toBe(3)
  const lobby = lobbyState(data, soloRun(data))
  expect(lobby.solo?.shown).toBe(1); expect(lobby.daily.status).toBe('playing'); expect(lobby.duel?.seed).toBe(5)
  expect(JSON.stringify(lobby)).not.toMatch(/targetPlayerId|playerId|"name"/)
 }, 30000)
 it('only deals a daily for the club\'s own today, and only well-formed seeds', async () => {
  const data = await club(), id = data.identity.id
  expect(legalTag('daily', todayFor(data), data)).toBe(true)
  expect(legalTag('daily', '2020-01-01', data)).toBe(false)
  expect(legalTag('duel', '0', data)).toBe(false)
  expect(legalTag('duel', '1000000', data)).toBe(false)
  expect(legalTag('duel', '12ab', data)).toBe(false)
  expect(await startMysteryMode(id, data.version, 'daily', '2020-01-01')).toBeNull()
  expect(await startMysteryMode(id, data.version, 'duel', '../../x')).toBeNull()
  expect(await startMysteryMode(id, data.version, 'solo' as never, '5')).toBeNull()
 })
 it('rejects stale versions, wrong tags and run ids, tampering, other tenants and revoked gates', async () => {
  const data = await club(), id = data.identity.id, run = (await startMysteryMode(id, data.version, 'duel', '77'))!, key = modeKey('duel', id), token = request.values.get(key)!
  expect(await startMysteryMode(id, 'stale', 'duel', '77')).toBeNull()
  expect(await moveMysteryMode(id, 'stale', 'duel', '77', run.rid, 'reveal', 1)).toBeNull()
  expect(await moveMysteryMode(id, data.version, 'duel', '78', run.rid, 'reveal', 1)).toBeNull()
  expect(await moveMysteryMode(id, data.version, 'duel', '77', 'deadbeef', 'reveal', 1)).toBeNull()
  request.values.set(key, token.slice(0, -3) + 'AAA'); expect(await moveMysteryMode(id, data.version, 'duel', '77', run.rid, 'reveal', 1)).toBeNull()
  const parsed = open<Record<string, unknown>>(token)!; request.values.set(key, seal({...parsed, club: 'olympiacos'})); expect(await moveMysteryMode(id, data.version, 'duel', '77', run.rid, 'reveal', 1)).toBeNull()
  request.values.set(key, token); request.host = 'zrinjski.localhost'; expect(await moveMysteryMode(id, data.version, 'duel', '77', run.rid, 'reveal', 1)).toBeNull()
  request.host = 'hapoeltelaviv.localhost'; request.gates = [13]; expect(await startMysteryMode(id, data.version, 'duel', '77')).toBeNull()
  request.gates = [10]; request.paused = true; expect(await moveMysteryMode(id, data.version, 'duel', '77', run.rid, 'give_up', 0)).toBeNull()
 }, 30000)
})
