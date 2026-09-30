import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

import * as React from 'react'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeAll, describe, expect, it, vi } from 'vitest'

import { LotView, type LotActions } from '@/components/auction/LotView'
import {
  checkBid,
  checkMerchant,
  checkSubmission,
  checklistFor,
  clockText,
  countdown,
  DAY,
  EMPTY_MERCHANT,
  fromLocalInput,
  groupLots,
  HOUR,
  icsEscape,
  icsFold,
  inSnipeWindow,
  inWords,
  livePhase,
  lotIcs,
  lotPanels,
  merchantUrlProblem,
  MINUTE,
  parseAmount,
  pollEvery,
  POLL_IDLE_MS,
  POLL_LIVE_MS,
  quickBids,
  startsInLabel,
  toLocalInput,
  type SubmitDraft,
} from '@/lib/collector/auction'
import type { LotBrief, LotState, PublicItem } from '@/lib/collector/types'

/**
 * המכירה הפומבית — ההיגיון הטהור, והשומרים שהמסך אינו יכול להפר (22.9.2026).
 *
 * השעון והשלב, קובץ היומן, ההצעה מול `minNext`, הבקשה, והקישור לחנות — ובעיקר: **למוכר אין
 * טופס הצעה**, לא כתכונה של `lotPanels` ולא בפועל, במסך מרונדר. המסד מסרב ממילא (`own_lot`);
 * כאן נבדק שהמסך לא מציע משהו שתמיד ייכשל (מפרט §38).
 */
const NOW = Date.parse('2026-09-22T12:00:00.000Z')
const iso = (offset: number) => new Date(NOW + offset).toISOString()

const brief = (extra: Partial<LotBrief> = {}): LotBrief => ({
  id: '11111111-2222-4333-8444-555555555555',
  title: 'חולצת חוץ 1998',
  phase: 'live',
  archiveSlug: 'vp-1998-away',
  kitId: null,
  photo: null,
  currency: 'ILS',
  startPrice: 300,
  currentPrice: 460,
  bidCount: 7,
  startsAt: iso(-DAY),
  endsAt: iso(3 * HOUR),
  reserveSet: true,
  reserveMet: true,
  ...extra,
})

const item: PublicItem = {
  id: '99999999-8888-4777-8666-555555555555',
  archiveSlug: 'vp-1998-away',
  kitId: null,
  size: 'l',
  condition: 'good',
  itemType: 'original_period',
  authenticityClaim: 'original',
  playerName: null,
  playerNumber: null,
  personalization: null,
  description: null,
  forTrade: false,
  forSale: false,
  askingPrice: null,
  currency: 'ILS',
  openToOffers: false,
  state: 'held',
  photos: [],
  openedAt: null,
}

const state = (lot: Partial<LotState['lot']> = {}): LotState => ({
  lot: {
    ...brief(),
    description: 'קיבלתי אותה ב-1999, כל התוויות במקום.',
    minIncrement: 20,
    antiSnipeSeconds: 120,
    requestedHours: 72,
    minNext: 480,
    isSeller: false,
    leading: false,
    yourMax: null,
    watching: false,
    watchers: 3,
    won: false,
    winningAmount: null,
    reservePrice: null,
    decisionNote: null,
    sellerDone: false,
    winnerDone: false,
    ...lot,
  },
  item,
  bids: [{ amount: 460, at: iso(-MINUTE), proxy: false, bidder: 1, you: false }],
})

describe('השעון — countdown, words, phase', () => {
  it('splits a span into days, hours, minutes and seconds, and never goes negative', () => {
    expect(countdown(3 * DAY + 2 * HOUR + 5 * MINUTE + 9000)).toMatchObject({ days: 3, hours: 2, minutes: 5, seconds: 9 })
    expect(countdown(-5000)).toMatchObject({ days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 })
    expect(clockText(2 * HOUR + 14 * MINUTE + 5000)).toBe('02:14:05')
    expect(clockText(DAY + 61_000)).toBe('1:00:01:01')
  })

  it('says it the way the poster says it (spec §29, §33)', () => {
    expect(startsInLabel(3 * DAY + 5 * HOUR)).toBe('המכירה מתחילה בעוד 3 ימים')
    expect(inWords(2 * DAY + HOUR)).toBe('בעוד יומיים')
    expect(inWords(DAY + 1000)).toBe('בעוד יום')
    expect(inWords(HOUR + MINUTE)).toBe('בעוד שעה')
    expect(inWords(2 * HOUR)).toBe('בעוד שעתיים')
    expect(inWords(5 * HOUR)).toBe('בעוד 5 שעות')
    expect(inWords(12 * MINUTE)).toBe('בעוד 12 דקות')
    expect(inWords(30_000)).toBe('בעוד דקה')
    expect(inWords(0)).toBe('עכשיו')
  })

  it('crosses the start and the end on the device clock, until the database says otherwise', () => {
    const upcoming = brief({ phase: 'upcoming', startsAt: iso(HOUR), endsAt: iso(4 * HOUR) })
    expect(livePhase(upcoming, NOW)).toBe('upcoming')
    expect(livePhase(upcoming, NOW + 2 * HOUR)).toBe('live')
    expect(livePhase(upcoming, NOW + 5 * HOUR)).toBe('closing')
    expect(livePhase(brief(), NOW + 4 * HOUR)).toBe('closing')
    expect(livePhase(brief({ phase: 'completed' }), NOW)).toBe('completed')
  })

  it('knows the anti-sniping window (spec §36)', () => {
    expect(inSnipeWindow(brief({ endsAt: iso(90_000) }), 120, NOW)).toBe(true)
    expect(inSnipeWindow(brief({ endsAt: iso(10 * MINUTE) }), 120, NOW)).toBe(false)
  })

  it('polls a live lot every three seconds, a waiting one slowly, and a finished one never', () => {
    expect(POLL_LIVE_MS).toBe(3000)
    expect(pollEvery('live')).toBe(POLL_LIVE_MS)
    expect(pollEvery('closing')).toBe(POLL_LIVE_MS)
    expect(pollEvery('upcoming')).toBe(POLL_IDLE_MS)
    expect(pollEvery('awaiting_completion')).toBe(POLL_IDLE_MS)
    for (const phase of ['completed', 'ended', 'cancelled', 'rejected'] as const) expect(pollEvery(phase)).toBeNull()
  })

  it('lays the board out as events: live by the soonest end, upcoming by the soonest start, then the closed', () => {
    const a = brief({ id: 'a', endsAt: iso(2 * HOUR) })
    const b = brief({ id: 'b', endsAt: iso(HOUR) })
    const c = brief({ id: 'c', phase: 'upcoming', startsAt: iso(3 * DAY), endsAt: iso(4 * DAY) })
    const d = brief({ id: 'd', phase: 'upcoming', startsAt: iso(DAY), endsAt: iso(2 * DAY) })
    const e = brief({ id: 'e', phase: 'completed', endsAt: iso(-DAY) })
    const groups = groupLots([a, b, c, d], [e, a], NOW)
    expect(groups.live.map((lot) => lot.id)).toEqual(['b', 'a'])
    expect(groups.upcoming.map((lot) => lot.id)).toEqual(['d', 'c'])
    expect(groups.recent.map((lot) => lot.id)).toEqual(['e'])
  })
})

describe('ההצעה — Max Bid against minNext (spec §34–§35)', () => {
  const lot = state().lot
  it('reads a typed amount the way people type one', () => {
    expect(parseAmount('1,000')).toBe(1000)
    expect(parseAmount('₪ 450')).toBe(450)
    expect(parseAmount('450.5')).toBe(450.5)
    expect(parseAmount('450.555')).toBeNull()
    expect(parseAmount('ארבע מאות')).toBeNull()
  })

  it('refuses under the minimum, and accepts the minimum itself', () => {
    expect(checkBid('', lot)).toEqual({ ok: false, reason: 'empty' })
    expect(checkBid('abc', lot)).toEqual({ ok: false, reason: 'not_number' })
    expect(checkBid('479', lot)).toEqual({ ok: false, reason: 'too_low' })
    expect(checkBid('480', lot)).toEqual({ ok: true, amount: 480 })
    expect(checkBid('1,000', lot)).toEqual({ ok: true, amount: 1000 })
    expect(checkBid('100000000', lot)).toEqual({ ok: false, reason: 'too_high' })
  })

  it('makes the leader raise above their own ceiling, as the database does (raise_above_your_max)', () => {
    const leading = { ...lot, leading: true, yourMax: 1000 }
    expect(checkBid('1000', leading)).toEqual({ ok: false, reason: 'not_above_max' })
    expect(checkBid('1001', leading)).toEqual({ ok: true, amount: 1001 })
    expect(quickBids(leading)[0]).toBeGreaterThan(1000)
  })

  it('offers three one-tap ceilings starting at the minimum', () => {
    expect(quickBids(lot)).toEqual([480, 520, 580])
  })
})

describe('מה מוצג — lotPanels, and the seller never bids (spec §38)', () => {
  it('never gives the seller the bid form, in any phase', () => {
    for (const phase of ['pending', 'upcoming', 'live', 'closing', 'awaiting_completion', 'completed', 'ended', 'cancelled'] as const) {
      const panels = lotPanels(state({ phase, isSeller: true }), NOW, true)
      expect(panels.bidForm, phase).toBe(false)
      expect(panels.signInToBid, phase).toBe(false)
      expect(panels.watch, phase).toBe(false)
      expect(panels.sellerPanel, phase).toBe(true)
    }
  })

  it('gives a signed-in bidder the form only while live, and a guest the sign-in prompt instead', () => {
    expect(lotPanels(state(), NOW, true).bidForm).toBe(true)
    expect(lotPanels(state(), NOW, false)).toMatchObject({ bidForm: false, signInToBid: true })
    expect(lotPanels(state({ phase: 'upcoming', startsAt: iso(DAY) }), NOW, true)).toMatchObject({ bidForm: false, watch: true, remind: true })
    expect(lotPanels(state({ phase: 'ended' }), NOW, true).bidForm).toBe(false)
  })

  it('shows the donation card only after COMPLETED, only to the two people who completed it (§55)', () => {
    expect(lotPanels(state({ phase: 'completed', won: true }), NOW, true).donation).toBe(true)
    expect(lotPanels(state({ phase: 'completed', isSeller: true }), NOW, true).donation).toBe(true)
    expect(lotPanels(state({ phase: 'completed' }), NOW, true).donation).toBe(false)
    expect(lotPanels(state({ phase: 'awaiting_completion', won: true }), NOW, true).donation).toBe(false)
  })

  it('asks each side to complete once, and never a third party', () => {
    expect(lotPanels(state({ phase: 'awaiting_completion', won: true }), NOW, true).complete).toBe(true)
    expect(lotPanels(state({ phase: 'awaiting_completion', won: true, winnerDone: true }), NOW, true).complete).toBe(false)
    expect(lotPanels(state({ phase: 'awaiting_completion', isSeller: true, winnerDone: true }), NOW, true).complete).toBe(true)
    expect(lotPanels(state({ phase: 'awaiting_completion' }), NOW, true).complete).toBe(false)
  })

  const noop: LotActions = {
    bid: async () => null,
    watch: async () => null,
    remind: () => undefined,
    complete: async () => null,
    withdraw: async () => null,
  }
  // vitest compiles the component's JSX with the classic runtime, which reads a global React
  beforeAll(() => {
    vi.stubGlobal('React', React)
  })
  const render = (lotState: LotState, signedIn: boolean) =>
    renderToStaticMarkup(createElement(LotView, { state: lotState, now: NOW, signedIn, shirt: undefined, actions: noop }))

  it('renders no bid form for the seller — on the screen, not only in the table', () => {
    const seller = render(state({ isSeller: true, reservePrice: 400 }), true)
    expect(seller).not.toContain('data-bid-form')
    expect(seller).toContain('data-seller-panel')
    expect(seller).toContain('400')
    const bidder = render(state(), true)
    expect(bidder).toContain('data-bid-form')
    expect(bidder).not.toContain('data-seller-panel')
    expect(render(state(), false)).not.toContain('data-bid-form')
  })

  it('never prints the reserve to anyone but the seller (§37)', () => {
    const lotState = state({ reservePrice: null })
    const html = render({ ...lotState, lot: { ...lotState.lot, reserveSet: true, reserveMet: false } }, true)
    expect(html).toContain('מחיר המינימום טרם הושג')
    expect(html).not.toContain('מחיר המינימום שלך')
  })

  it('says, on every lot, that payment is between the parties and outside the system (§39)', () => {
    expect(render(state(), true)).toContain('data-payment-note')
  })
})

describe('"הזכר לי" — the calendar file, made on the device (spec §33)', () => {
  const lot = { id: '11111111-2222-4333-8444-555555555555', title: 'חולצת בית, 1975/76; עם תוויות', startsAt: iso(3 * DAY), endsAt: iso(6 * DAY) }
  const ics = lotIcs(lot, 'https://theworker.dubelteam.com/kits/auction/11111111-2222-4333-8444-555555555555', NOW)

  it('is a VCALENDAR with one event, an alarm, CRLF line ends and a stable UID', () => {
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true)
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true)
    expect(ics.split('BEGIN:VEVENT').length).toBe(2)
    expect(ics).toContain('BEGIN:VALARM')
    expect(ics).toContain('TRIGGER:-PT15M')
    expect(ics).toContain(`UID:lot-${lot.id}@the-worker`)
    expect(ics).toContain(`DTSTART:${iso(3 * DAY).replace(/[-:]/g, '').replace(/\.\d{3}/, '')}`)
    expect(ics.replace(/\r\n/g, '')).not.toContain('\n')
  })

  it('escapes TEXT and folds every line at 75 octets without splitting a Hebrew letter', () => {
    expect(icsEscape('a,b;c\\d\ne')).toBe('a\\,b\\;c\\\\d\\ne')
    expect(ics.replace(/\r\n /g, '')).toContain('1975/76\\; עם תוויות')
    for (const line of ics.split('\r\n')) expect(Buffer.byteLength(line, 'utf8'), line).toBeLessThanOrEqual(75)
    const long = `SUMMARY:${'א'.repeat(80)}`
    const folded = icsFold(long)
    expect(folded.split('\r\n ').join('')).toBe(long)
    expect(folded).not.toContain('�')
  })
})

describe('הבקשה — the submission checklist and fields (spec §30–§32)', () => {
  const full: SubmitDraft = {
    title: 'חולצת חוץ 1998',
    description: 'קיבלתי אותה ב-1999 משחקן הקבוצה, כל התוויות במקום.',
    startPrice: '300',
    reservePrice: '',
    currency: 'ILS',
    hours: 72,
    increment: '',
    checked: Object.fromEntries(checklistFor(true).map((key) => [key, true])),
  }

  it('asks for match-worn proof only when the seller claims match-worn', () => {
    expect(checklistFor(false)).not.toContain('proof')
    expect(checklistFor(true)).toContain('proof')
    expect(checklistFor(true)).toEqual(expect.arrayContaining(['front', 'back', 'labels', 'logos', 'print', 'defects', 'size', 'condition', 'origin', 'history']))
  })

  it('passes a complete draft, and names what is missing in an incomplete one', () => {
    const ok = checkSubmission(full, true)
    expect(ok.ok).toBe(true)
    if (ok.ok) expect(ok.value).toMatchObject({ startPrice: 300, reservePrice: null, increment: null, hours: 72 })
    const missing = checkSubmission({ ...full, checked: { ...full.checked, proof: false, labels: false } }, true)
    expect(missing).toMatchObject({ ok: false, missing: ['labels', 'proof'] })
    expect(checkSubmission({ ...full, checked: { ...full.checked, proof: false } }, false).ok).toBe(true)
  })

  it('holds the same bounds as the table: title, description, reserve ≥ start, 24–336 hours', () => {
    const problems = (draft: Partial<SubmitDraft>) => {
      const result = checkSubmission({ ...full, ...draft }, true)
      return result.ok ? [] : result.problems
    }
    expect(problems({ title: 'אב' })).toContain('title')
    expect(problems({ description: 'קצר מדי' })).toContain('description')
    expect(problems({ startPrice: '0' })).toContain('start')
    expect(problems({ reservePrice: '200' })).toContain('reserve')
    expect(problems({ reservePrice: '300' })).toEqual([])
    expect(problems({ hours: 12 })).toContain('hours')
    expect(problems({ hours: 400 })).toContain('hours')
    expect(problems({ increment: '-5' })).toContain('increment')
  })

  it('turns the admin clock into an instant and back', () => {
    const local = toLocalInput(NOW)
    expect(local).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)
    expect(Date.parse(fromLocalInput(local) as string)).toBe(Math.floor(NOW / MINUTE) * MINUTE)
    expect(fromLocalInput('tomorrow')).toBeNull()
  })
})

describe('החנויות — no parameters, official only from the club (spec §23–§27, §77)', () => {
  it('refuses any query string or fragment, not only the known affiliate names', () => {
    expect(merchantUrlProblem('https://shop.htafc.co.il/product/red-match-t-shirt/')).toBeNull()
    expect(merchantUrlProblem('https://shop.example/p?utm_source=x')).toBe('has_query')
    expect(merchantUrlProblem('https://shop.example/p?variant=2')).toBe('has_query')
    expect(merchantUrlProblem('https://shop.example/p#reviews')).toBe('has_fragment')
    expect(merchantUrlProblem('http://shop.example/p')).toBe('not_https')
    expect(merchantUrlProblem('')).toBe('empty')
  })

  it('never lets a replica wear the club store, nor "official" come from anywhere else', () => {
    const base = { ...EMPTY_MERCHANT, merchantName: 'Retro Jerseys', seasonLabel: '1995/96', productUrl: 'https://www.retro-jerseys.com/products/x' }
    expect(checkMerchant(base).problems).toEqual([])
    expect(checkMerchant({ ...base, isOfficialClubStore: true }).problems).toContain('replica_not_store')
    expect(checkMerchant({ ...base, offerType: 'official' }).problems).toContain('official_needs_store')
    expect(checkMerchant({ ...base, seasonLabel: '' }).problems).toContain('target')
    expect(checkMerchant({ ...base, seasonLabel: '1995-96' }).problems).toContain('season')
    expect(checkMerchant({ ...base, imageUrl: 'https://img.example/a.png?w=400' }).problems).toContain('image')
  })
})

describe('הניהול — out of every public path (spec §65)', () => {
  const ROOT = join(__dirname, '..')
  function walk(dir: string): string[] {
    return readdirSync(dir).flatMap((name) => {
      const path = join(dir, name)
      return statSync(path).isDirectory() ? walk(path) : /\.(ts|tsx)$/.test(name) ? [path] : []
    })
  }

  /** prose about the route is fine; a string a component could render as a link is not */
  const code = (path: string) =>
    readFileSync(path, 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '')

  it('is linked from nowhere but itself — no menu, no tab bar, no footer, no gate', () => {
    const offenders = ['app', 'components', 'lib']
      .flatMap((dir) => walk(join(ROOT, dir)))
      .filter((path) => !path.includes('/app/kits/admin/') && !path.includes('/app/qa/'))
      // the one door that may name it: a notification only an administrator is ever sent (ADMIN_KINDS)
      .filter((path) => !path.endsWith('/lib/collector/notify.ts'))
      // Open evaluation explicitly exposes native administration from its test lab.
      .filter((path) => !path.endsWith('/lib/master/types.ts'))
      .filter((path) => /['"`]\/kits\/admin/.test(code(path)))
    expect(offenders.map((path) => path.slice(ROOT.length + 1))).toEqual([])
  })

  it('is out of the sitemap and the gate metadata, and says noindex', () => {
    expect(code(join(ROOT, 'app/sitemap.ts'))).not.toMatch(/\/kits\/admin/)
    expect(code(join(ROOT, 'lib/seo.ts'))).not.toMatch(/\/kits\/admin/)
    const page = readFileSync(join(ROOT, 'app/kits/admin/page.tsx'), 'utf8')
    expect(page).toMatch(/robots: \{ index: false/)
    expect(readFileSync(join(ROOT, 'app/sitemap.ts'), 'utf8')).toContain('/kits/auction')
  })

  it('shows a non-admin the ordinary 404, not an access-denied page', () => {
    const gate = readFileSync(join(ROOT, 'app/kits/admin/AdminGate.tsx'), 'utf8')
    expect(gate).toContain("t('notFound.body')")
    expect(gate).toContain('adminWhoami')
  })
})
