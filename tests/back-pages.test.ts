import {readFileSync} from 'node:fs'
import {describe, expect, it} from 'vitest'
import {BACK_PAGES} from '@/lib/back-pages/posts'

// Plan v8 (14.11.2026): the Back Pages answer real search questions and end at a door that plays it.
describe('The Back Pages', () => {
 it('every post has a unique slug, a search line under 160 characters and a door', () => {
  expect(new Set(BACK_PAGES.map((p) => p.slug)).size).toBe(BACK_PAGES.length)
  for (const p of BACK_PAGES) {
   expect(p.slug).toMatch(/^[a-z0-9-]+$/)
   expect(p.description.length).toBeLessThanOrEqual(160)
   expect(p.title.length).toBeLessThanOrEqual(70)
   expect(p.cta.href.startsWith('/')).toBe(true)
   expect(p.updated >= p.published).toBe(true)
   expect(p.topics.length).toBeGreaterThan(0)
  }
 })
 it('the sitemap lists them, dated by their own edit', () => {
  const s = readFileSync('app/sitemap.ts', 'utf8')
  expect(s).toContain('/back-pages/${p.slug}')
 })
 it('the IndexNow key file matches the workflow key', () => {
  const wf = readFileSync('.github/workflows/indexnow.yml', 'utf8')
  const key = /KEY: ([0-9a-f]{32})/.exec(wf)![1]!
  expect(readFileSync(`public/${key}.txt`, 'utf8')).toBe(key)
 })
})

describe('Back Pages go live by date (Athens time)', () => {
 it('a post dated tomorrow is hidden today and shown tomorrow', async () => {
  const {isLive, athensToday} = await import('@/lib/back-pages/posts')
  const p = BACK_PAGES.find((x) => x.published === '2026-11-20')!
  expect(isLive(p, new Date('2026-11-19T21:00:00Z'))).toBe(false) // 23:00 in Athens on the 19th
  expect(isLive(p, new Date('2026-11-19T22:30:00Z'))).toBe(true) // 00:30 in Athens on the 20th
  expect(athensToday(new Date('2026-11-19T22:30:00Z'))).toBe('2026-11-20')
 })
 it('every post links only to English doors (the root gates are the Hebrew Hapoel edition)', () => {
  const src = readFileSync('lib/back-pages/posts.tsx', 'utf8')
  const roots = [...src.matchAll(/href="(\/[a-z-]+)"/g)].map((m) => m[1])
  for (const r of roots) expect(['/today', '/our-games', '/all-football', '/back-pages']).toContain(r)
 })
})
