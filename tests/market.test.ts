import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

import * as React from 'react'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { OFFERS, THREAD_DONE, THREAD_REQUEST, THREAD_TALK, THREAD_WAITING } from '@/app/qa/market/fixtures'
import { MerchantOffersView } from '@/components/collector/MerchantOffers'
import { DealSuccess } from '@/components/market/DealSuccess'
import {
  SYSTEM_CODES,
  copyTerms,
  dealOutcome,
  dealStation,
  donationAllowed,
  groupListings,
  merchantHref,
  offerSlipLine,
  openOfferFromOther,
  orderMerchantOffers,
  slugFromSearch,
  stampTime,
  systemSentence,
  tableFacets,
  threadActions,
} from '@/lib/collector/market'
import type { CollectorShirt, ConnectionStatus, PublicItem, Thread } from '@/lib/collector/types'
import { MESSAGES } from '@/lib/i18n'

// the components are compiled with the classic JSX runtime under vitest, as in tests/worker-card.test.ts
vi.stubGlobal('React', React)

// The donation card and the share card are other people's components; what is under test here is the
// DOOR in front of them, so each is replaced by a marker that says it was rendered.
vi.mock('@/components/collector/DonationCard', () => ({
  DonationCard: ({ dealKey }: { dealKey: string }) => createElement('i', { 'data-donation-card': dealKey }),
}))

/**
 * שוק האדומים (22.9.2026) — the market's contract, held to the spec's own words: what a system code
 * says, what an offer slip prints, which structured action a side may take in which status (§16),
 * that the donation card exists only after a completed deal (§51, §55), and that a shop link is the
 * product page and nothing else (§27).
 */

const ROOT = join(__dirname, '..')
const read = (path: string) => readFileSync(join(ROOT, path), 'utf8')
const hebrew = /[\u0590-\u05FF]/
const LRI = '\u2066'
const PDI = '\u2069'

const shirt = (slug: string, decade: number, year: number): CollectorShirt => ({
  slug,
  src: `/kits/${slug}.webp`,
  seasonLabel: null,
  yearRaw: year,
  seasonAmbiguous: true,
  year,
  decade,
  variant: 'home',
  variantHe: 'בית',
  kitId: null,
  spoiler: null,
})

const SHIRTS: Record<string, CollectorShirt> = {
  'vp-1985-away': shirt('vp-1985-away', 1980, 1985),
  'vp-1999-home': shirt('vp-1999-home', 1990, 1999),
  'vp-2001-home': shirt('vp-2001-home', 2000, 2001),
}

const copy = (id: string, archiveSlug: string, openedAt: string, patch: Partial<PublicItem> = {}): PublicItem => ({
  id,
  archiveSlug,
  kitId: null,
  size: 'l',
  condition: 'good',
  itemType: 'original_period',
  authenticityClaim: null,
  playerName: null,
  playerNumber: null,
  personalization: null,
  description: null,
  forTrade: false,
  forSale: true,
  askingPrice: 250,
  currency: 'ILS',
  openToOffers: false,
  state: 'held',
  photos: [],
  openedAt,
  ...patch,
})

describe('הודעות מערכת — every code the database writes is a Hebrew sentence', () => {
  it('names the nine codes of worker_system_message and nothing else', () => {
    expect([...SYSTEM_CODES].sort()).toEqual(
      ['accepted', 'agreed', 'auction_won', 'cancelled', 'completed', 'declined', 'half_done', 'offer_accepted', 'offer_declined'].sort(),
    )
    // the SQL is the source: every code it passes to worker_system_message is mapped
    const sql = read('supabase/migrations/20260922120000_worker_collector_market.sql')
    const written = new Set([...sql.matchAll(/worker_system_message\([^,]+,\s*'([a-z_]+)'/g)].map((m) => m[1]!))
    for (const code of [...sql.matchAll(/case when p_accept then '([a-z]+)' else '([a-z]+)' end\);/g)].flatMap((m) => [m[1]!, m[2]!])) {
      written.add(code)
    }
    for (const code of written) expect(SYSTEM_CODES, code).toContain(code)
  })

  it('gives each code its own sentence, and an unknown code the generic one', () => {
    const sentences = SYSTEM_CODES.map((code) => systemSentence(code))
    for (const sentence of sentences) {
      expect(typeof sentence).toBe('string')
      expect(sentence).toMatch(hebrew)
    }
    expect(new Set(sentences).size).toBe(SYSTEM_CODES.length)
    expect(systemSentence('completed')).toBe('✓ העסקה הושלמה')
    expect(systemSentence('something_new')).toBe(MESSAGES['market.system.unknown'])
    expect(systemSentence(null)).toBe(MESSAGES['market.system.unknown'])
  })
})

describe('פתק הצעה — "אספן #1842 הציע ₪250" (spec §17)', () => {
  it('prints who offered and the amount, the amount isolated LTR inside the sentence', () => {
    const line = offerSlipLine({ kind: 'price', amount: 250, currency: 'ILS' }, { handle: 1842, nickname: null })
    expect(line.startsWith('אספן #1842 הציע ')).toBe(true)
    expect(line).toContain(LRI)
    expect(line).toContain(PDI)
    const amount = line.slice(line.indexOf(LRI) + 1, line.indexOf(PDI))
    expect(amount.replace(/[^\d]/g, '')).toBe('250')
    expect(amount).toContain('₪')
  })

  it('says "הצעת" for my own offer, uses a nickname when there is one, and names a trade', () => {
    expect(offerSlipLine({ kind: 'price', amount: 300, currency: 'ILS' }, 'me').startsWith('הצעת ')).toBe(true)
    expect(offerSlipLine({ kind: 'price', amount: 300, currency: 'EUR' }, { handle: 9, nickname: 'הצפון האדום' })).toContain('הצפון האדום הציע')
    expect(offerSlipLine({ kind: 'trade', amount: null, currency: 'ILS' }, { handle: 1842, nickname: null })).toBe('אספן #1842 הציע החלפה')
    expect(offerSlipLine({ kind: 'trade', amount: null, currency: 'ILS' }, 'me')).toBe('הצעת החלפה')
  })

  it('stamps a time in Israel\'s clock: the time alone today, the day before it otherwise', () => {
    const now = new Date('2026-09-22T12:00:00Z')
    expect(stampTime('2026-09-22T09:05:00Z', now)).toBe('12:05')
    expect(stampTime('2026-09-20T09:05:00Z', now)).toBe('20.9 · 12:05')
    expect(stampTime('not a date', now)).toBe('')
  })
})

describe('מה מותר למי — the structured actions by side and status (spec §16)', () => {
  const view = (status: ConnectionStatus, role: 'initiator' | 'recipient' | 'observer', extra: { myDone?: boolean; theirDone?: boolean } = {}) => ({
    status,
    role,
    myDone: extra.myDone ?? false,
    theirDone: extra.theirDone ?? false,
  })
  const ALL: ConnectionStatus[] = ['requested', 'accepted', 'negotiating', 'agreed', 'completed', 'declined', 'cancelled', 'reported']

  it('lets the recipient of a request answer it — and only them, and only then', () => {
    const answer = threadActions(view('requested', 'recipient'), null)
    expect(answer.respond).toBe(true)
    expect(answer.compose).toBe(true) // a reply is an acceptance (worker_message_send)
    expect(answer.offerPrice).toBe(false)
    expect(answer.offerTrade).toBe(false)
    expect(answer.cancel).toBe(true)
    for (const status of ALL.filter((s) => s !== 'requested')) expect(threadActions(view(status, 'recipient'), null).respond, status).toBe(false)
    for (const status of ALL) expect(threadActions(view(status, 'initiator'), null).respond, status).toBe(false)
  })

  it('lets the one who asked make offers while they wait, and offer a trade of their own shirts', () => {
    const asker = threadActions(view('requested', 'initiator'), null)
    expect(asker.offerPrice).toBe(true)
    expect(asker.offerTrade).toBe(true)
    expect(asker.photoRequest).toBe(true)
    // the other side never offers ITS shirts for its own copy
    for (const status of ALL) expect(threadActions(view(status, 'recipient'), null).offerTrade, status).toBe(false)
  })

  it('answers an open offer from the other side — and counters only a price', () => {
    const price = threadActions(view('negotiating', 'recipient'), { kind: 'price' })
    expect(price.answerOffer).toBe(true)
    expect(price.counter).toBe(true)
    const trade = threadActions(view('negotiating', 'recipient'), { kind: 'trade' })
    expect(trade.answerOffer).toBe(true)
    expect(trade.counter).toBe(false)
    expect(threadActions(view('agreed', 'recipient'), { kind: 'price' }).answerOffer).toBe(false)
    expect(threadActions(view('negotiating', 'recipient'), null).answerOffer).toBe(false)
  })

  it('walks the deal: סמן שסוכם → סמן שהעסקה הושלמה → waiting → ✓', () => {
    expect(threadActions(view('accepted', 'initiator'), null).agreed).toBe(true)
    expect(threadActions(view('negotiating', 'recipient'), null).agreed).toBe(true)
    const agreed = threadActions(view('agreed', 'initiator'), null)
    expect(agreed.agreed).toBe(false)
    expect(agreed.done).toBe(true)
    expect(agreed.offerPrice).toBe(false) // worker_offer_make refuses an agreed connection
    expect(agreed.compose).toBe(true)
    const half = threadActions(view('agreed', 'initiator', { myDone: true }), null)
    expect(half.done).toBe(false)
    expect(half.waiting).toBe(true)
    const done = threadActions(view('completed', 'recipient', { myDone: true, theirDone: true }), null)
    expect(done.success).toBe(true)
    expect(done.compose || done.cancel || done.done || done.offerPrice || done.agreed).toBe(false)
  })

  it('an auction win is a conversation you finish, not one you walk away from (spec §39, §65)', () => {
    const won = threadActions({ ...view('agreed', 'initiator'), lotId: 'lot-1' }, null)
    expect(won.compose).toBe(true)
    expect(won.done).toBe(true)
    expect(won.cancel).toBe(false)
    expect(won.offerPrice || won.offerTrade).toBe(false)
    expect(threadActions(view('agreed', 'initiator'), null).cancel).toBe(true)
  })

  it('offers nothing live on a closed conversation, and nothing at all to an observer', () => {
    for (const status of ['declined', 'cancelled', 'reported'] as const) {
      const closed = threadActions(view(status, 'initiator'), { kind: 'price' })
      expect(closed.compose || closed.offerPrice || closed.answerOffer || closed.agreed || closed.done || closed.cancel || closed.success, status).toBe(false)
    }
    expect(threadActions(view('reported', 'initiator'), null).report).toBe(false)
    for (const status of ALL) {
      const seen = threadActions(view(status, 'observer'), { kind: 'price' })
      expect(Object.values(seen).some(Boolean), status).toBe(false)
    }
  })

  it('reads the open offer from the fixtures the way the screen does', () => {
    expect(openOfferFromOther(THREAD_REQUEST)?.amount).toBe(550)
    expect(openOfferFromOther(THREAD_TALK)?.amount).toBe(420)
    expect(openOfferFromOther(THREAD_WAITING)).toBeNull()
    expect(dealStation('requested')).toBe(0)
    expect(dealStation('negotiating')).toBe(1)
    expect(dealStation('completed')).toBe(3)
    expect(dealStation('cancelled')).toBe(-1)
  })
})

describe('תרומה — only after a completed deal, never during one (spec §51, §55)', () => {
  const ALL: ConnectionStatus[] = ['requested', 'accepted', 'negotiating', 'agreed', 'completed', 'declined', 'cancelled', 'reported']
  const at = (status: ConnectionStatus): Thread => ({ ...THREAD_DONE, connection: { ...THREAD_DONE.connection, status } })
  const render = (thread: Thread) =>
    renderToStaticMarkup(createElement(DealSuccess, { thread, shirts: {}, onAdd: async () => true }))

  it('opens its door on `completed` and on nothing else', () => {
    expect(ALL.filter(donationAllowed)).toEqual(['completed'])
  })

  it('renders the success panel — the only place the card lives — for a completed deal only', () => {
    for (const status of ALL.filter((s) => s !== 'completed')) expect(render(at(status)), status).toBe('')
    const done = render(at('completed'))
    expect(done).toContain('✓ העסקה הושלמה')
    expect(done).toContain('עוד חולצה מצאה בית אדום.')
    for (const action of ['שתף', 'עדכן את הארון', 'תרום', 'סגור']) expect(done).toContain(action)
    // the card is behind "תרום", not in the way (§55: "לא להציג שוב ושוב")
    expect(done).not.toContain('data-donation-card')
  })

  it('is imported by no market screen but DealSuccess, and DealSuccess closes the door first', () => {
    const files = [...walk(join(ROOT, 'components/market')), ...walk(join(ROOT, 'app/kits/market'))]
    const importers = files.filter((file) => /from '@\/components\/collector\/DonationCard'/.test(readFileSync(file, 'utf8')))
    expect(importers.map((file) => file.slice(ROOT.length + 1))).toEqual(['components/market/DealSuccess.tsx'])
    const source = read('components/market/DealSuccess.tsx')
    const gate = source.indexOf('if (!donationAllowed(thread.connection.status)) return null')
    expect(gate).toBeGreaterThan(0)
    expect(source.indexOf('<DonationCard')).toBeGreaterThan(gate)
  })
})

describe('מה עבר העסקה — עדכון הארון (spec §60)', () => {
  it('asks the buyer to add the copy, tells the seller it is sold, and gives a trader what they received', () => {
    const buyer = dealOutcome({ ...THREAD_REQUEST, connection: { ...THREAD_REQUEST.connection, role: 'initiator', status: 'completed' } })
    expect(buyer).toMatchObject({ kind: 'buy', role: 'buyer', received: [{ slug: 'vp-1985-away' }], theirs: null })
    const seller = dealOutcome({ ...THREAD_WAITING, connection: { ...THREAD_WAITING.connection, status: 'completed' } })
    expect(seller).toMatchObject({ kind: 'buy', role: 'seller', received: [] })
    const trader = dealOutcome(THREAD_DONE)
    expect(trader).toMatchObject({ kind: 'trade', role: 'trader', received: [{ slug: 'vp-2001-home' }], mine: 'vp-1992-home', theirs: 'vp-2001-home' })
    const other = dealOutcome({ ...THREAD_DONE, connection: { ...THREAD_DONE.connection, role: 'recipient' } })
    expect(other).toMatchObject({ role: 'trader', received: [{ slug: 'vp-1992-home' }], mine: 'vp-2001-home', theirs: 'vp-1992-home' })
  })
})

describe('השולחן — copies hung on the archive shirts', () => {
  const items = [
    copy('a', 'vp-1999-home', '2026-09-20T10:00:00Z'),
    copy('b', 'vp-1985-away', '2026-09-22T10:00:00Z', { forTrade: true, forSale: false, askingPrice: null }),
    copy('c', 'vp-1999-home', '2026-09-21T10:00:00Z', { forTrade: true }),
    copy('d', 'no-such-shirt', '2026-09-22T11:00:00Z'),
  ]

  it('groups by shirt, freshest shirt first, freshest copy first, and drops a slug the archive does not have', () => {
    const groups = groupListings(items, SHIRTS, { kind: 'all', decade: 'all' })
    expect(groups.map((group) => group.shirt.slug)).toEqual(['vp-1985-away', 'vp-1999-home'])
    expect(groups[1]!.items.map((row) => row.id)).toEqual(['c', 'a'])
  })

  it('filters by kind and decade, and counts the chips before the filter', () => {
    expect(groupListings(items, SHIRTS, { kind: 'trade', decade: 'all' }).flatMap((g) => g.items.map((r) => r.id))).toEqual(['b', 'c'])
    expect(groupListings(items, SHIRTS, { kind: 'sale', decade: 1990 }).flatMap((g) => g.items.map((r) => r.id))).toEqual(['c', 'a'])
    expect(tableFacets(items, SHIRTS)).toEqual({ all: 3, sale: 2, trade: 2, decades: [{ decade: 1980, count: 1 }, { decade: 1990, count: 2 }] })
  })

  it('accepts a ?slug= only when it names an archive shirt', () => {
    expect(slugFromSearch('?slug=vp-1985-away', SHIRTS)).toBe('vp-1985-away')
    expect(slugFromSearch('?slug=nope', SHIRTS)).toBeNull()
    expect(slugFromSearch('', SHIRTS)).toBeNull()
  })

  it('says what a copy asks for: a price, open to offers, a trade', () => {
    expect(copyTerms(copy('x', 'vp-1985-away', '')).join(' ')).toContain('250')
    expect(copyTerms(copy('x', 'vp-1985-away', '', { askingPrice: null, openToOffers: true }))).toEqual(['פתוח להצעות'])
    expect(copyTerms(copy('x', 'vp-1985-away', '', { forSale: false, forTrade: true, askingPrice: null }))).toEqual(['⇄ להחלפה'])
  })
})

describe('לקנות חדשה — shop links carry nothing but the product page (spec §23, §24, §27)', () => {
  const markup = renderToStaticMarkup(createElement(MerchantOffersView, { offers: OFFERS }))
  const links = [...markup.matchAll(/<a\b[^>]*>/g)].map((m) => m[0])

  it('strips every query and fragment, and refuses a link that is not http(s)', () => {
    expect(merchantHref('https://shop.example/p/1?ref=aff&utm_source=x#top')).toBe('https://shop.example/p/1')
    expect(merchantHref('javascript:alert(1)')).toBeNull()
    expect(merchantHref('not a url')).toBeNull()
  })

  it('renders no link with a query parameter, and every link opens safely in a new tab', () => {
    expect(links.length).toBe(2) // the javascript: row is not a link at all
    for (const tag of links) {
      const href = /href="([^"]*)"/.exec(tag)?.[1] ?? ''
      expect(href, tag).not.toContain('?')
      expect(href, tag).not.toContain('#')
      expect(href.startsWith('https://'), tag).toBe(true)
      expect(tag).toContain('target="_blank"')
      expect(tag).toContain('rel="noopener noreferrer"')
    }
  })

  it('puts the club store first, in the spec\'s words, and never shows a replica without its label and note', () => {
    expect(orderMerchantOffers(OFFERS)[0]!.isOfficialClubStore).toBe(true)
    const official = markup.indexOf('חדש · רשמי')
    const replica = markup.indexOf('שחזור / רפליקה')
    expect(official).toBeGreaterThan(-1)
    expect(replica).toBeGreaterThan(official)
    expect(markup).toContain('זמין בחנות הרשמית')
    expect(markup).toContain('קנה מהמועדון ↗')
    expect(markup).toContain('מוצר חדש המבוסס על החולצה ההיסטורית. אינו העותק המקורי מהתקופה.')
  })

  it('renders nothing at all when there is nothing to buy', () => {
    expect(renderToStaticMarkup(createElement(MerchantOffersView, { offers: [] }))).toBe('')
  })

  it('never builds a query into a shop link in its own source', () => {
    const source = read('components/collector/MerchantOffers.tsx')
    const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
    expect(code).not.toMatch(/searchParams|URLSearchParams|\?ref=|utm_|affiliate/)
    expect(source).toContain('merchantHref(offer.productUrl)')
  })
})

describe('בלי פרטי קשר — the market never asks for or links to one (spec §18)', () => {
  it('has no tel:, mailto:, wa.me or contact field in any market screen', () => {
    const files = [...walk(join(ROOT, 'components/market')), ...walk(join(ROOT, 'app/kits/market'))]
    expect(files.length).toBeGreaterThan(5)
    for (const file of files) {
      const text = readFileSync(file, 'utf8')
      expect(text, file).not.toMatch(/\btel:|mailto:|wa\.me\/|whatsapp:\/\/|type="tel"|type="email"|autoComplete="(?:tel|email)"/i)
    }
  })

  it('says, in the conversation, that contact details are not needed and not shown', () => {
    expect(MESSAGES['market.thread.noContact']).toMatch(/טלפון/)
    expect(read('components/market/ThreadView.tsx')).toContain("t('market.thread.noContact')")
  })

  it('offers no payment inside the market (spec §17, §39)', () => {
    const catalogue = JSON.parse(read('messages/he.market.json')) as Record<string, string>
    for (const [key, value] of Object.entries(catalogue)) expect(`${key} ${value}`, key).not.toMatch(/לשלם עכשיו|תשלום מאובטח|checkout|pay now/i)
  })
})

describe('the market routes', () => {
  it('are in the metadata table and the sitemap; listings and conversations stay out of both', () => {
    expect(read('lib/seo.ts')).toContain("path: '/kits/market'")
    const sitemap = read('app/sitemap.ts')
    expect(sitemap).toContain('`${SITE_URL}/kits/market`')
    expect(sitemap).not.toContain('/kits/market/')
    expect(read('app/kits/market/c/[id]/page.tsx')).toMatch(/robots: \{ index: false, follow: false \}/)
  })

  it('polls a conversation every ten seconds and stops while the tab is hidden', () => {
    const screen = read('app/kits/market/c/[id]/ThreadScreen.tsx')
    expect(screen).toContain('const POLL_MS = 10_000')
    expect(screen).toContain("document.addEventListener('visibilitychange'")
    expect(screen).toMatch(/if \(document\.hidden\) stop\(\)/)
  })
})

function walk(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) out.push(...walk(path))
    else if (/\.tsx?$/.test(path)) out.push(path)
  }
  return out
}
