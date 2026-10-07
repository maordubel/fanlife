import { readFileSync } from 'node:fs'
import { beforeEach, describe, expect, it } from 'vitest'

import { barsOf, ME_KEY, rankOf, readCard, sanitize, writeCard, type MeCard } from '@/lib/fanlife/me'

const store = new Map<string, string>()
beforeEach(() => {
  store.clear()
  ;(globalThis as { localStorage?: unknown }).localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  }
})

describe('FAN LIFE · Me card', () => {
  it('mints the member number once and never rewrites it', () => {
    const first = readCard()
    expect(first.memberNo).toMatch(/^FL-\d{4}$/)
    expect(readCard().memberNo).toBe(first.memberNo)
    const saved = writeCard({ ...first, memberNo: 'FL-0001', joined: '1999-01-01', name: 'Red' })
    expect(saved.memberNo).toBe(first.memberNo)
    expect(saved.joined).toBe(first.joined)
    expect(JSON.parse(store.get(ME_KEY)!).name).toBe('Red')
  })

  it('cleans every declared field instead of trusting the device', () => {
    const dirty = { v: 1, memberNo: 'FL-1234', joined: 'x', name: '  a   very   long nickname indeed  ', club: 'NOT A CLUB', since: 1700, began: 'magic', first: 'x'.repeat(200), number: 120 } as unknown as MeCard
    const c = sanitize(dirty)
    expect(c.name.length).toBeLessThanOrEqual(18)
    expect(c.name).not.toMatch(/\s{2}/)
    expect([c.club, c.since, c.began, c.number]).toEqual([null, null, null, null])
    expect(c.first.length).toBe(60)
    expect(c.joined).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('earns the standing only from finished rounds', () => {
    expect([0, 4, 5, 19, 20, 59, 60].map(rankOf)).toEqual([0, 0, 1, 1, 2, 2, 3])
  })

  it('prints the bars from the number, so two cards differ', () => {
    expect(barsOf('FL-1234')).not.toEqual(barsOf('FL-4321'))
    expect(barsOf('FL-1234')).toEqual(barsOf('FL-1234'))
  })

  it('every me.* / file.* key the area asks for exists', () => {
    const copy = JSON.parse(readFileSync('messages/en.fanlife.json', 'utf8')) as Record<string, string>
    for (const file of ['components/fanlife/me/MeArea.tsx', 'components/fanlife/me/MyFile.tsx']) {
      const src = readFileSync(file, 'utf8')
      for (const [, key] of src.matchAll(/fl\('([a-z.]+)'/g)) expect(copy[key!], `${file}: ${key}`).toBeTruthy()
    }
    for (const n of [0, 1, 2, 3]) expect(copy[`me.rank.${n}`]).toBeTruthy()
    for (const t of ['card', 'oath', 'story', 'details']) expect(copy[`me.tab.${t}`]).toBeTruthy()
  })
})

describe('FAN LIFE · prices in euros', () => {
  it('no fork defaults to shekels or offers a currency other than EUR', async () => {
    const { readdirSync, statSync } = await import('node:fs')
    const walk = (d: string): string[] => readdirSync(d).flatMap((f) => { const p = `${d}/${f}`; return statSync(p).isDirectory() ? walk(p) : [p] })
    for (const f of [...walk('components/fanlife'), ...walk('lib/fanlife')].filter((f) => /\.tsx?$/.test(f))) {
      const src = readFileSync(f, 'utf8')
      expect(src, f).not.toMatch(/\?\? 'ILS'|Currency = 'ILS'|CURRENCIES\.map\(|>₪</)
    }
  })
})
