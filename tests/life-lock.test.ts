import {describe, expect, it} from 'vitest'
import {isLifePath} from '@/lib/life/lock/paths'
import {ownerFromCookie} from '@/lib/master/admin-edge'
import {issueToken} from '@/lib/master/admin-token'
import {DEFAULT_FEATURES, featureDoor} from '@/lib/features'

const KEY = 'a-long-enough-owner-key-123'
const env = {FAN_LIFE_ADMIN_KEY: KEY, NODE_ENV: 'production'}

describe('LIFE lock (owner, 24.11.2026)', () => {
  it('names every LIFE page and player, and nothing the other games share', () => {
    for (const p of ['/life', '/life/', '/life/voxel', '/life/stage', '/life/voxel/lab.html', '/life/town/play.html', '/clubs/olympiacos/life', '/clubs/zrinjski/life/', '/telegram/olympiacos/life', '/qa/life-rush', '/qa/life-opening']) expect(isLifePath(p), p).toBe(true)
    for (const p of ['/', '/clubs/olympiacos', '/clubs/olympiacos/timeline', '/life/sfx/whistle-1.m4a', '/life/art/standCrowd.webp', '/our-games', '/coming-soon/life', '/master/life', '/lifestyle', '/qa/stats']) expect(isLifePath(p), p).toBe(false)
  })
  it('opens only for the control room’s own cookie', async () => {
    expect(await ownerFromCookie(env, issueToken(KEY))).toBe(true)
    expect(await ownerFromCookie(env, issueToken('another-key-of-enough-length'))).toBe(false)
    expect(await ownerFromCookie(env, undefined)).toBe(false)
    expect(await ownerFromCookie(env, 'v1.1.2.' + 'x'.repeat(43))).toBe(false)
    expect(await ownerFromCookie({NODE_ENV: 'production'}, issueToken(KEY))).toBe(false)
  })
  it('the switch stays off by default and the owner alone enters', () => {
    expect(DEFAULT_FEATURES.life).toBe(false)
    expect(featureDoor(false, false).open).toBe(false)
    expect(featureDoor(false, true).open).toBe(true)
  })
})

describe('fans are redirected to an absolute Coming soon address on the public host', () => {
  it('builds the address from the host the request came in on, never another site', async () => {
    const {NextRequest} = await import('next/server')
    const {middleware} = await import('@/middleware')
    const prev = {k: process.env.FAN_LIFE_ADMIN_KEY, n: process.env.NODE_ENV}
    process.env.FAN_LIFE_ADMIN_KEY = 'a-long-enough-owner-key-123'
    const go = async (host: string) => (await middleware(new NextRequest('https://localhost:3000/clubs/olympiacos/life', {headers: {host}}))).headers.get('location')
    expect(await go('fanlife.dubelteam.com')).toBe('https://fanlife.dubelteam.com/coming-soon/life')
    expect(await go('evil.example')).toBe('https://fanlife.dubelteam.com/coming-soon/life')
    process.env.FAN_LIFE_ADMIN_KEY = prev.k
  })
})
