import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { closetCard, decadeText, gapsCard, isolate, matchCard, shirtDateText, slotText, wantedCard } from '@/lib/collector/cards'
import { collectorShirts } from '@/lib/collector/catalog'
import { claimAllowed, draftOf, movePhoto, patchFrom, precheck } from '@/lib/collector/editor'
import {
  busiestSeason,
  closetSummary,
  decadeCoverage,
  focusDecade,
  gapsOf,
  IN_CLOSET,
  oldestShirt,
  seasonSlots,
  type ItemLike,
  type ShirtLike,
} from '@/lib/collector/metrics'
import { ADMIN_KINDS, NOTIFICATION_TEXT, notificationHref } from '@/lib/collector/notify'
import type { NotificationKind, OwnerItem } from '@/lib/collector/types'
import { MESSAGES } from '@/lib/i18n'
import { challengeUrl, dareKey } from '@/lib/share/copy'

/**
 * הארון (22.9.2026) — מה שאפשר לבדוק בלי מסד: המדדים, העורך, ההתראות, כרטיסי השיתוף, והגבול
 * בין שני האוספים. ההתנהגות מול המסד נבדקת ב-`scripts/db/verify.sh`; כאן נבדק שהמסך אומר את
 * אותם כללים ושאינו ממציא מספר שהמסד לא ספר.
 */
const ROOT = join(__dirname, '..')

const shirt = (slug: string, year: number, seasonLabel: string | null, decade = Math.floor(year / 10) * 10): ShirtLike => ({
  slug,
  year,
  decade,
  seasonLabel,
  seasonAmbiguous: seasonLabel === null,
  yearRaw: seasonLabel === null ? year : null,
})

const ARCHIVE: ShirtLike[] = [
  shirt('vp-1989-home', 1989, null),
  shirt('vp-1991-home', 1991, null),
  shirt('vp-1991-away', 1991, null),
  shirt('vp-1992-home', 1992, null),
  shirt('vp-1994-home', 1994, null),
  shirt('fka-1994-95-home', 1994, '1994/95'),
  shirt('vp-1997-home', 1997, null),
  shirt('fka-2016-17-home', 2016, '2016/17'),
  shirt('vp-2016-home', 2016, null),
  shirt('fka-2019-20-away', 2019, '2019/20'),
]
const BY_SLUG = Object.fromEntries(ARCHIVE.map((row) => [row.slug, row]))
const held = (slug: string, extra: Partial<ItemLike> = {}): ItemLike => ({ archiveSlug: slug, state: 'held', forTrade: false, forSale: false, ...extra })

describe('מדדי הארון — the archive is the denominator (spec §11)', () => {
  it('makes one slot per year the archive holds, and names the season only when it is certain', () => {
    const slots = seasonSlots(ARCHIVE)
    expect(slots.map((slot) => slot.year)).toEqual([1989, 1991, 1992, 1994, 1997, 2016, 2019])
    // two photographs of 1991, neither dated to a season: one slot, still "בערך"
    expect(slots.find((slot) => slot.year === 1991)).toMatchObject({ seasonLabel: null, slugs: ['vp-1991-home', 'vp-1991-away'] })
    // a certain season and a year-only photograph of the same year share the slot, and the label is the certain one
    expect(slots.find((slot) => slot.year === 1994)?.seasonLabel).toBe('1994/95')
  })

  it('counts every decade against its own slots, never against ten', () => {
    const rows = decadeCoverage([held('vp-1991-away'), held('vp-1994-home'), held('fka-1994-95-home')], ARCHIVE, BY_SLUG)
    const nineties = rows.find((row) => row.decade === 1990)
    expect(nineties).toMatchObject({ total: 4, have: 2, copies: 3 })
    expect(rows.map((row) => row.decade)).toEqual([1980, 1990, 2010])
    expect(gapsOf(nineties!).map((slot) => slot.year)).toEqual([1992, 1997])
  })

  it('holds the real archive to the same arithmetic — 1990s is 7 slots, and every total is a distinct year', () => {
    const archive = collectorShirts()
    const rows = decadeCoverage([], archive, Object.fromEntries(archive.map((row) => [row.slug, row])))
    for (const row of rows) {
      const years = new Set(archive.filter((row2) => row2.decade === row.decade && row2.year > 0).map((row2) => row2.year))
      expect(row.total, `decade ${row.decade}`).toBe(years.size)
      expect(row.total).toBeLessThanOrEqual(10)
    }
    expect(rows.find((row) => row.decade === 1990)?.total).toBe(7)
  })

  it('summarises the header the way spec §10 reads it', () => {
    const items: ItemLike[] = [
      held('vp-1991-home', { forTrade: true }),
      held('vp-1992-home', { forSale: true }),
      held('vp-1992-home', { forSale: true, forTrade: true }),
      held('fka-2016-17-home', { state: 'reserved', forSale: true }),
      held('vp-1989-home', { state: 'sold' }),
      held('vp-1997-home', { state: 'suspended' }),
    ]
    expect(closetSummary(items, 8, BY_SLUG)).toEqual({
      copies: 5,
      shirts: 4,
      topDecade: { decade: 1990, copies: 4 },
      forTrade: 2,
      forSale: 2, // the reserved copy is promised, not open
      wants: 8,
      span: { from: 1991, to: 2016 },
    })
  })

  it('never counts a copy that left the closet', () => {
    expect([...IN_CLOSET].sort()).toEqual(['held', 'reserved', 'suspended'])
    const gone: ItemLike[] = ['sold', 'traded', 'removed'].map((state) => held('vp-1991-home', { state: state as ItemLike['state'] }))
    expect(closetSummary(gone, 0, BY_SLUG)).toMatchObject({ copies: 0, topDecade: null, span: null })
    expect(decadeCoverage(gone, ARCHIVE, BY_SLUG).every((row) => row.have === 0)).toBe(true)
  })

  it('names the oldest shirt, preferring the certain one within a year', () => {
    expect(oldestShirt([held('fka-2016-17-home'), held('vp-1994-home'), held('fka-1994-95-home')], BY_SLUG)?.slug).toBe('fka-1994-95-home')
    expect(oldestShirt([], BY_SLUG)).toBeNull()
  })

  it('names the busiest season only when a season holds two copies', () => {
    expect(busiestSeason([held('vp-1991-home'), held('vp-1992-home')], ARCHIVE, BY_SLUG)).toBeNull()
    expect(busiestSeason([held('vp-1991-home'), held('vp-1991-away'), held('vp-1992-home')], ARCHIVE, BY_SLUG)).toMatchObject({ year: 1991, copies: 2 })
  })

  it('opens the strip on the decade the closet is strongest in', () => {
    // most seasons held wins: 2/4 in the nineties over a complete 1/1 in the eighties
    expect(focusDecade(decadeCoverage([held('vp-1989-home'), held('vp-1991-home'), held('vp-1992-home')], ARCHIVE, BY_SLUG))).toBe(1990)
    // a tie on seasons goes to the decade closer to complete
    const rows = decadeCoverage([held('vp-1989-home'), held('vp-1991-home')], ARCHIVE, BY_SLUG)
    expect(focusDecade(rows)).toBe(1980) // 1/1 beats 1/4
    expect(focusDecade(decadeCoverage([], ARCHIVE, BY_SLUG))).toBe(2010) // nothing held: the newest
  })

  it('words a date the archive way — "1994 בערך", never a guessed season', () => {
    expect(shirtDateText({ seasonLabel: null, seasonAmbiguous: true, yearRaw: 1994, year: 1994 })).toBe('1994 בערך')
    expect(shirtDateText({ seasonLabel: '1994/95', seasonAmbiguous: false, yearRaw: null, year: 1994 })).toBe('1994/95')
    expect(slotText({ seasonLabel: null, year: 1991 })).toBe('1991 בערך')
    expect(decadeText(1990)).toBe('שנות ה-90')
    expect(decadeText(2010)).toBe('שנות ה-2010')
  })
})

const ownerItem = (extra: Partial<OwnerItem> = {}): OwnerItem => ({
  id: '00000000-0000-4000-8000-000000000001',
  archiveSlug: 'vp-1994-home',
  kitId: null,
  size: null,
  condition: null,
  itemType: 'unknown',
  authenticityClaim: null,
  playerName: null,
  playerNumber: null,
  personalization: null,
  description: null,
  forTrade: false,
  forSale: false,
  askingPrice: null,
  currency: 'ILS',
  openToOffers: true,
  state: 'held',
  photos: [],
  openedAt: null,
  suspendedReason: null,
  createdAt: '2026-09-22T10:00:00Z',
  openConnections: 0,
  lot: null,
  wanters: 0,
  ...extra,
})

describe('עורך העותק — the database rules, said before the round trip', () => {
  it('asks for size, condition and type only when the copy opens to the market (spec §7)', () => {
    const draft = draftOf(ownerItem())
    expect(precheck(draft)).toBeNull() // "יש לי" alone needs nothing
    expect(precheck({ ...draft, forTrade: true })).toEqual({ error: 'details_required', missing: ['size', 'condition', 'itemType'] })
    expect(precheck({ ...draft, forSale: true, size: 'm', condition: 'good' })).toEqual({ error: 'details_required', missing: ['itemType'] })
  })

  it('wants a price or open offers for a sale', () => {
    const ready = { ...draftOf(ownerItem()), size: 'm' as const, condition: 'good' as const, itemType: 'original_period' as const, forSale: true }
    expect(precheck({ ...ready, openToOffers: false })).toEqual({ error: 'price_required' })
    expect(precheck({ ...ready, openToOffers: true })).toBeNull()
    expect(precheck({ ...ready, openToOffers: false, askingPrice: '450' })).toBeNull()
  })

  it('never lets a replica claim to be original (spec §24, the replica_honest constraint)', () => {
    expect(claimAllowed('replica', 'original')).toBe(false)
    expect(claimAllowed('fan_reproduction', 'match_worn')).toBe(false)
    expect(claimAllowed('replica', 'replica')).toBe(true)
    expect(claimAllowed('original_period', 'match_worn')).toBe(true)
    expect(precheck({ ...draftOf(ownerItem()), itemType: 'replica', authenticityClaim: 'original' })).toEqual({ error: 'replica_claim' })
  })

  it('says which number is wrong, the way the database names the key', () => {
    const draft = draftOf(ownerItem())
    expect(precheck({ ...draft, playerNumber: '100' })).toEqual({ error: 'bad_value', key: 'playerNumber' })
    expect(precheck({ ...draft, playerNumber: 'ז' })).toEqual({ error: 'bad_value', key: 'playerNumber' })
    expect(precheck({ ...draft, playerNumber: '7' })).toBeNull()
    expect(precheck({ ...draft, askingPrice: '0' })).toEqual({ error: 'bad_value', key: 'askingPrice' })
    expect(precheck({ ...draft, askingPrice: '12.345' })).toEqual({ error: 'bad_value', key: 'askingPrice' })
    expect(precheck({ ...draft, askingPrice: '12,5' })).toBeNull()
  })

  it('sends only what changed, normalised the way the row stores it', () => {
    const item = ownerItem({ playerName: 'זהבי', askingPrice: 450 })
    const draft = draftOf(item)
    expect(patchFrom(item, draft)).toEqual({})
    expect(patchFrom(item, { ...draft, playerName: '  ', playerNumber: '07', askingPrice: '450' })).toEqual({ playerName: null, playerNumber: 7 })
    expect(patchFrom(item, { ...draft, forTrade: true, description: ' חולצה ' })).toEqual({ forTrade: true, description: 'חולצה' })
  })

  it('moves a photo one place and never off the end', () => {
    expect(movePhoto(['a', 'b', 'c'], 2, -1)).toEqual(['a', 'c', 'b'])
    expect(movePhoto(['a', 'b', 'c'], 0, 1)).toEqual(['b', 'a', 'c'])
    expect(movePhoto(['a', 'b', 'c'], 0, -1)).toEqual(['a', 'b', 'c'])
    expect(movePhoto(['a', 'b', 'c'], 2, 1)).toEqual(['a', 'b', 'c'])
  })
})

const KINDS: NotificationKind[] = Object.keys(NOTIFICATION_TEXT) as NotificationKind[]
const ID = '6f1c2a9e-41d3-4b7c-9a1e-0f6b2d8c7a31'
const ID2 = '0b7e4c1d-2f3a-4e5b-8c6d-7a9f1e2d3c4b'

describe('התראות — a sentence and a door for every kind (spec §40, §69)', () => {
  it('covers every NotificationKind the types declare, each with a real Hebrew sentence', () => {
    const declared = readFileSync(join(ROOT, 'lib/collector/types.ts'), 'utf8').match(/export type NotificationKind =([\s\S]*?)\n\n/)?.[1] ?? ''
    const names = [...declared.matchAll(/'([A-Z_]+)'/g)].map((m) => m[1])
    expect(names.length).toBe(23)
    expect([...KINDS].sort()).toEqual([...names].sort())
    for (const kind of KINDS) {
      const text = MESSAGES[NOTIFICATION_TEXT[kind]]
      expect(text, kind).toBeTruthy()
      expect(text, kind).toMatch(/[֐-׿]/)
    }
  })

  it('uses the spec’s own words where it has them', () => {
    expect(MESSAGES['collector.notify.COLLECTOR_WANT_MATCHED']).toContain('החולצה שחיפשת הופיעה')
    expect(MESSAGES['collector.notify.COLLECTOR_ITEM_REQUESTED']).toContain('מישהו רוצה חולצה שיש לך')
    expect(MESSAGES['collector.notify.COLLECTOR_OFFER_RECEIVED']).toContain('קיבלת הצעת מחיר')
    expect(MESSAGES['collector.notify.COLLECTOR_OFFER_ACCEPTED']).toContain('ההצעה שלך התקבלה')
    expect(MESSAGES['collector.notify.AUCTION_OUTBID']).toContain('מישהו הציע יותר ממך')
    expect(MESSAGES['collector.notify.AUCTION_STARTED']).toContain('המכירה הפומבית מתחילה')
    expect(MESSAGES['collector.notify.AUCTION_ENDING']).toContain('המכירה מסתיימת בקרוב')
    expect(MESSAGES['collector.notify.AUCTION_WON']).toContain('זכית')
  })

  it('links a connection, a lot, an item and the admin kinds to their own pages', () => {
    expect(notificationHref({ kind: 'COLLECTOR_MESSAGE', payload: { connectionId: ID } })).toBe(`/kits/market/c/${ID}`)
    expect(notificationHref({ kind: 'AUCTION_OUTBID', payload: { lotId: ID } })).toBe(`/kits/auction/${ID}`)
    expect(notificationHref({ kind: 'COLLECTOR_WANT_MATCHED', payload: { itemId: ID } })).toBe(`/kits/market/item/${ID}`)
    // a finished auction deal carries the lot, not a connection
    expect(notificationHref({ kind: 'CONNECTION_COMPLETED', payload: { lotId: ID, kind: 'auction' } })).toBe(`/kits/auction/${ID}`)
    expect(notificationHref({ kind: 'AUCTION_WON', payload: { lotId: ID, connectionId: ID2 } })).toBe(`/kits/auction/${ID}`)
    for (const kind of ADMIN_KINDS) expect(notificationHref({ kind, payload: { lotId: ID } })).toBe('/kits/admin')
    expect([...ADMIN_KINDS].sort()).toEqual(['AUCTION_SUBMITTED', 'REPORT_RECEIVED'])
  })

  it('builds no link from something that is not an id', () => {
    expect(notificationHref({ kind: 'COLLECTOR_MESSAGE', payload: { connectionId: '../admin' } })).toBeNull()
    expect(notificationHref({ kind: 'AUCTION_STARTED', payload: {} })).toBeNull()
  })
})

describe('שיתוף מהארון — the one share system (rules 19, 22)', () => {
  it('draws a list card with every row it is given', () => {
    const rows = ['1991 בערך', '1992 בערך', '1994 בערך', '1997 בערך', '1999 בערך', '2000', '2001', '2002', '2003', '2004']
    const card = gapsCard('שנות ה-90', '0/10', rows)
    expect(card.template).toBe('gaps')
    expect(card.collector).toMatchObject({ kind: 'gaps', rows })
    expect(gapsCard('שנות ה-50', '5/5', []).collector).toMatchObject({ label: MESSAGES['collector.card.gaps.complete'] })
  })

  it('words the four cards the way the spec does', () => {
    expect(closetCard({ name: 'אספן #1842', copies: 24, span: { from: 1989, to: 2026 }, keeper: '1999/00' }).collector).toEqual({
      kind: 'closet',
      title: 'הארון של אספן #1842',
      count: '24',
      countLabel: 'חולצות',
      span: { from: '1989', to: '2026' },
      keeper: { label: 'החולצה שאני בחיים לא מוכר:', shirt: '1999/00' },
    })
    expect(wantedCard('1994/95').collector).toMatchObject({ lead: 'מחפש את זאת.', club: 'הפועל תל אביב', plea: 'אם היא אצל מישהו בארון — תעבירו לו אותי.' })
    expect(matchCard('1989/90', '1999/00').collector).toMatchObject({ head: 'MATCH COMPLETED', from: '1989/90', to: '1999/00', via: 'דרך The Worker' })
    expect(matchCard('1999/00', null).collector).toMatchObject({ to: null })
  })

  it('hands over a closet or a shirt, never a seed', () => {
    expect(challengeUrl('wanted', 1, 0, '/kits/archive?shirt=vp-1994-home')).toMatch(/\/kits\/archive\?shirt=vp-1994-home&from=share$/)
    expect(challengeUrl('closet', 1, 0, '/kits/closet/1842?t=abc')).toMatch(/\/kits\/closet\/1842\?t=abc&from=share$/)
    for (const kind of ['closet', 'wanted', 'gaps', 'match'] as const) {
      expect(challengeUrl(kind, 7, 3)).not.toContain('seed=')
      expect(MESSAGES[dareKey(kind)], kind).toBeTruthy()
      expect(MESSAGES[`share.msg.${kind}`], kind).toBeTruthy()
    }
    expect(isolate('1994/95')).toBe('⁦1994/95⁩')
  })

  it('puts every collector template into the overlap harness, built by the closet’s own builders', () => {
    const story = readFileSync(join(ROOT, 'lib/share/story.ts'), 'utf8')
    const proof = readFileSync(join(ROOT, 'app/qa/story/StoryProof.tsx'), 'utf8')
    const overlap = readFileSync(join(ROOT, 'scripts/brand/story-overlap.mjs'), 'utf8')
    for (const template of ['closet', 'wanted', 'gaps', 'match']) {
      expect(story.match(/export type StoryTemplate =([^\n]+)/)?.[1] ?? '').toContain(`'${template}'`)
      expect(proof, template).toContain(`name: '${template}'`)
      expect(overlap).toContain(`'${template}'`)
    }
    expect(proof).toContain("from '@/lib/collector/cards'")
  })

  it('positions nothing on a collector card by a guessed multiple of the point size', () => {
    const story = readFileSync(join(ROOT, 'lib/share/story.ts'), 'utf8')
    const body = story.slice(story.indexOf('function drawCollectorCard('), story.indexOf("const PITCH_GREEN"))
    expect(body.length).toBeGreaterThan(1000)
    // a baseline is `something + box.ascent`, never `y + size * 0.8`
    expect(body).not.toMatch(/(?:Base|base|y)\s*[=+-][^\n;]*size\s*\*\s*0\.\d/)
    expect(body).toContain('recordInk(')
  })
})

/* ------------------------------------------------------------------ the two collections */

function walk(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) out.push(...walk(path))
    else if (/\.(ts|tsx)$/.test(path)) out.push(path)
  }
  return out
}

const CLOSET_FILES = [
  ...walk(join(ROOT, 'lib/collector')),
  ...walk(join(ROOT, 'components/collector')),
  ...walk(join(ROOT, 'app/kits/closet')),
  ...walk(join(ROOT, 'app/qa/collector')),
]

describe('UNLOCKED_IN_GAME ≠ OWNED_IN_REAL_LIFE — the closet never writes the game’s collection (spec §43)', () => {
  it('finds the closet’s files', () => {
    expect(CLOSET_FILES.length).toBeGreaterThan(15)
  })

  it('never writes the Gate 4 collection from anywhere in the closet', () => {
    for (const path of CLOSET_FILES) {
      const text = readFileSync(path, 'utf8')
      expect(text, path).not.toMatch(/\.(record|adopt|clear)\(/)
      expect(text, path).not.toContain('LocalCollectionStore')
      expect(text, path).not.toContain('worker.kits.v1')
    }
  })

  it('reads it in exactly one place — the public closet’s spoiler shield — and only reads', () => {
    const readers = CLOSET_FILES.filter((path) => readFileSync(path, 'utf8').includes("from '@/lib/kit/collection'"))
    expect(readers.map((path) => path.slice(ROOT.length + 1))).toEqual(['app/kits/closet/[handle]/PublicCloset.tsx'])
    const text = readFileSync(readers[0] as string, 'utf8')
    expect(text).toMatch(/store\.read\(\)/)
  })

  it('keeps the Gate 4 question out of the game’s store, and the store out of the closet', () => {
    const ask = readFileSync(join(ROOT, 'components/collector/RealShirtAsk.tsx'), 'utf8')
    expect(ask).not.toContain('@/lib/kit/collection')
    expect(ask).not.toContain('activeCollection')
    const store = readFileSync(join(ROOT, 'lib/kit/collection.ts'), 'utf8')
    expect(store).not.toContain('@/lib/collector')
    // the reveal records the game's shirt exactly where it always did, and the closet question
    // sits beside it without touching `store`
    const run = readFileSync(join(ROOT, 'app/kits/build/KitGameRun.tsx'), 'utf8')
    expect(run.match(/store\.record\(/g)?.length).toBe(1)
    expect(run).toContain('<RealShirtAsk')
  })

  it('never keeps a real closet in the browser — the pending marks are session-scoped and short-lived', () => {
    // the code, not the comment that quotes spec §78 back at itself
    const pending = readFileSync(join(ROOT, 'lib/collector/pending.ts'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
    expect(pending).toContain('sessionStorage')
    expect(pending).not.toContain('localStorage')
    expect(pending).toMatch(/TTL_MS\s*=\s*60 \* 60 \* 1000/)
  })
})

describe('pending intents — what a guest marked, until the account opens (spec §44)', () => {
  const store = new Map<string, string>()
  const fake = {
    sessionStorage: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => void store.set(key, value),
      removeItem: (key: string) => void store.delete(key),
    },
  }
  afterEach(() => {
    store.clear()
    delete (globalThis as { window?: unknown }).window
  })

  it('keeps the last word per shirt and clears what was served', async () => {
    ;(globalThis as { window?: unknown }).window = fake
    const { rememberIntent, pendingIntents, clearIntents } = await import('@/lib/collector/pending')
    rememberIntent({ slug: 'vp-1994-home', kitId: null, action: 'want' })
    rememberIntent({ slug: 'vp-1994-home', kitId: null, action: 'have' })
    rememberIntent({ slug: 'fka-2016-17-home', kitId: 'kit-2016-17-home', action: 'want' })
    expect(pendingIntents().map((row) => [row.slug, row.action])).toEqual([
      ['vp-1994-home', 'have'],
      ['fka-2016-17-home', 'want'],
    ])
    clearIntents(['vp-1994-home'])
    expect(pendingIntents().map((row) => row.slug)).toEqual(['fka-2016-17-home'])
    // a hand-edited entry that is not a slug is dropped, not served to the database
    store.set('the-worker:collector:pending', JSON.stringify([{ slug: '../x', kitId: null, action: 'have', at: Date.now() }]))
    expect(pendingIntents()).toEqual([])
  })
})

describe('the closet in the product — entry points, sitemap, and a closet no crawler finds', () => {
  const read = (path: string) => readFileSync(join(ROOT, path), 'utf8')
  it('is linked from the personal area and the archive, and listed', () => {
    expect(read('app/tik/page.tsx')).toContain('<ClosetDoor')
    expect(read('app/kits/archive/page.tsx')).toContain('<ClosetDoor')
    expect(read('app/sitemap.ts')).toContain('`${SITE_URL}/kits/closet`')
    expect(read('lib/seo.ts')).toContain("path: '/kits/closet'")
  })

  it('keeps a collector’s own closet out of every index', () => {
    const page = read('app/kits/closet/[handle]/page.tsx')
    expect(page).toContain('index: false')
    expect(read('app/sitemap.ts')).not.toMatch(/kits\/closet\/\$\{/)
  })

  it('renders the archive bar and the shops in the shirt sheet, and never a shielded photograph', () => {
    const wing = read('app/kits/archive/ArchiveWing.tsx')
    expect(wing).toContain('<HaveWantBar')
    expect(wing).toContain('<MerchantOffers slug={shirt.slug} kitId={kitId} season={shirt.seasonLabel} />')
    // the sheet's photograph sits behind `shielded` — the button branch has no <img> in it
    const sheet = wing.slice(wing.indexOf('{shielded ? ('), wing.indexOf('<HaveWantBar'))
    const shieldBranch = sheet.slice(0, sheet.indexOf(') : ('))
    expect(shieldBranch).not.toContain('<img')
    expect(shieldBranch).not.toContain('shirt.src')
  })
})
