'use client'

import { useMemo } from 'react'

import { HaveWantBar } from '@/components/collector/HaveWantBar'
import { MatchShare } from '@/components/collector/MatchShare'
import { NotificationList } from '@/components/collector/NotificationList'
import { RealShirtAsk } from '@/components/collector/RealShirtAsk'
import { Screen } from '@/components/ui/Screen'
import { draftOf, precheck } from '@/lib/collector/editor'
import type {
  Closet,
  ClosetView,
  CollectorNotification,
  CollectorShirt,
  ConnectionSummary,
  NotificationKind,
  OwnerItem,
  Want,
} from '@/lib/collector/types'
import { t } from '@/lib/i18n'

import type { ClosetApi } from '../../kits/closet/api'
import { ClosetBoard } from '../../kits/closet/ClosetBoard'
import { ClosetInvite } from '../../kits/closet/ClosetScreen'
import { PublicCloset } from '../../kits/closet/[handle]/PublicCloset'

/** the clock every fixture is read against, so a relative time never differs between two renders */
const NOW = Date.parse('2026-09-22T12:00:00Z')
const ago = (minutes: number) => new Date(NOW - minutes * 60_000).toISOString()
const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`

const LABEL = { handle: 1842, nickname: null, since: 2026, completed: 3, trades: 2, sales: 1, items: 11 }

function item(n: number, slug: string, kitId: string | null, extra: Partial<OwnerItem> = {}): OwnerItem {
  return {
    id: uuid(n),
    archiveSlug: slug,
    kitId,
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
    createdAt: ago(10_000 - n * 100),
    openConnections: 0,
    lot: null,
    wanters: 0,
    ...extra,
  }
}

/** a spread of real archive shirts: one of every decade first, then the newest few */
function sample(shirts: Record<string, CollectorShirt>): CollectorShirt[] {
  const all = Object.values(shirts).sort((a, b) => a.year - b.year)
  const byDecade = new Map<number, CollectorShirt>()
  for (const shirt of all) if (!byDecade.has(shirt.decade)) byDecade.set(shirt.decade, shirt)
  const nineties = all.filter((shirt) => shirt.decade === 1990)
  const picks = [...byDecade.values(), ...nineties.slice(1, 5), ...all.slice(-6)]
  return [...new Map(picks.map((shirt) => [shirt.slug, shirt])).values()]
}

function fixtures(shirts: Record<string, CollectorShirt>) {
  const s = sample(shirts)
  const at = (i: number) => s[i % s.length] as CollectorShirt
  const items: OwnerItem[] = [
    item(1, at(1).slug, at(1).kitId, { size: 'l', condition: 'good', itemType: 'original_period', authenticityClaim: 'original', forTrade: true, wanters: 37, openConnections: 1 }),
    item(2, at(3).slug, at(3).kitId),
    item(3, at(6).slug, at(6).kitId, { size: 'm', condition: 'excellent', itemType: 'official_reissue', forSale: true, askingPrice: 450, playerName: 'זהבי', playerNumber: 7, wanters: 4 }),
    item(4, at(6).slug, at(6).kitId, { itemType: 'replica', authenticityClaim: 'replica' }),
    item(5, at(7).slug, at(7).kitId, { state: 'reserved', size: 'xl', condition: 'worn', itemType: 'original_period', forSale: true, askingPrice: 300 }),
    item(6, at(8).slug, at(8).kitId, { state: 'suspended', suspendedReason: 'דיווח על תמונה שאינה של העותק' }),
    item(7, at(9).slug, at(9).kitId),
    item(8, at(10).slug, at(10).kitId, { size: 's', condition: 'mint', itemType: 'original_period', forTrade: true, forSale: true, askingPrice: null, openToOffers: true, lot: { id: uuid(900), status: 'scheduled' } }),
    item(9, at(12).slug, at(12).kitId),
    item(10, at(13).slug, at(13).kitId),
    item(11, at(14).slug, at(14).kitId),
    item(12, at(15).slug, at(15).kitId, { state: 'sold' }),
  ]
  const wants: Want[] = [
    { id: uuid(101), archiveSlug: at(2).slug, kitId: at(2).kitId, preferredSize: 'l', notes: null, createdAt: ago(300), available: 2 },
    { id: uuid(102), archiveSlug: at(4).slug, kitId: at(4).kitId, preferredSize: null, notes: null, createdAt: ago(900), available: 0 },
    { id: uuid(103), archiveSlug: at(5).slug, kitId: at(5).kitId, preferredSize: null, notes: null, createdAt: ago(1900), available: 1 },
  ]
  const closet: Closet = {
    profile: { handle: 1842, showNickname: false, visibility: 'link_only', shareToken: '5f0c2a9e41d34b7c9a1e0f6b2d8c7a31' },
    label: LABEL,
    items,
    wants,
    unread: 4,
  }
  const counterpart = { handle: 311, nickname: null, since: 2026, completed: 7, trades: 4, sales: 3, items: 38 }
  const connections: ConnectionSummary[] = [
    { id: uuid(201), kind: 'trade', status: 'negotiating', role: 'recipient', counterpart, item: items[0] as OwnerItem, lastMessageAt: ago(12), unread: true, myDone: false, theirDone: false },
    { id: uuid(202), kind: 'buy', status: 'requested', role: 'initiator', counterpart: { ...counterpart, handle: 77, completed: 0 }, item: { ...(items[2] as OwnerItem), archiveSlug: at(2).slug }, lastMessageAt: ago(200), unread: false, myDone: false, theirDone: false },
    { id: uuid(203), kind: 'buy', status: 'completed', role: 'recipient', counterpart: { ...counterpart, handle: 9021 }, item: null, lastMessageAt: ago(9000), unread: false, myDone: true, theirDone: true },
  ]
  const kinds: NotificationKind[] = [
    'COLLECTOR_WANT_MATCHED', 'COLLECTOR_ITEM_REQUESTED', 'COLLECTOR_REQUEST_ACCEPTED', 'COLLECTOR_REQUEST_DECLINED',
    'COLLECTOR_MESSAGE', 'COLLECTOR_OFFER_RECEIVED', 'COLLECTOR_OFFER_ACCEPTED', 'COLLECTOR_OFFER_DECLINED',
    'CONNECTION_COMPLETED', 'CONNECTION_CANCELLED', 'AUCTION_SUBMITTED', 'AUCTION_APPROVED', 'AUCTION_REJECTED',
    'AUCTION_SCHEDULED', 'AUCTION_STARTED', 'AUCTION_OUTBID', 'AUCTION_ENDING', 'AUCTION_WON', 'AUCTION_SOLD',
    'AUCTION_UNSOLD', 'AUCTION_CANCELLED', 'ITEM_SUSPENDED', 'REPORT_RECEIVED',
  ]
  const payload = (kind: NotificationKind): CollectorNotification['payload'] => {
    if (kind.startsWith('AUCTION_') || kind === 'REPORT_RECEIVED') {
      return { lotId: uuid(900), archiveSlug: at(10).slug, amount: 820, currency: 'ILS', startsAt: '2026-09-24T17:00:00Z', endsAt: '2026-09-27T17:00:00Z', note: kind === 'AUCTION_REJECTED' ? 'צריך תמונה של הגב' : undefined }
    }
    if (kind === 'COLLECTOR_WANT_MATCHED') return { itemId: uuid(3), archiveSlug: at(2).slug }
    if (kind === 'ITEM_SUSPENDED') return { itemId: uuid(6), reason: 'דיווח על תמונה שאינה של העותק' }
    if (kind === 'COLLECTOR_ITEM_REQUESTED') return { connectionId: uuid(201), itemId: uuid(1), archiveSlug: at(1).slug, kind: 'trade', from: 311 }
    if (kind === 'COLLECTOR_OFFER_RECEIVED') return { connectionId: uuid(201), offerId: uuid(301), kind: 'price', amount: 380, currency: 'ILS' }
    return { connectionId: uuid(201) }
  }
  const notices: CollectorNotification[] = kinds.map((kind, index) => ({ id: uuid(400 + index), kind, payload: payload(kind), read: index > 3, at: ago(index * 47 + 3) }))
  const view: ClosetView = {
    label: { ...LABEL, handle: 311, completed: 7 },
    items: items.slice(0, 9).map((row) => ({ archiveSlug: row.archiveSlug, kitId: row.kitId, itemType: row.itemType, playerName: row.playerName, playerNumber: row.playerNumber, forTrade: row.forTrade, forSale: row.forSale, id: row.forSale || row.forTrade ? row.id : null })),
    wants: wants.map((row) => row.archiveSlug),
  }
  return { closet, connections, notices, view, sample: s }
}

function fakeApi(data: ReturnType<typeof fixtures>): ClosetApi {
  const items = new Map(data.closet.items.map((row) => [row.id, row]))
  let next = 1000
  return {
    reload: async () => ({ ok: true, ...data.closet }),
    have: async (slug, kitId) => {
      const row = item((next += 1), slug, kitId ?? null, { createdAt: new Date(NOW).toISOString() })
      items.set(row.id, row)
      return { ok: true, created: true, item: row }
    },
    unhave: async () => ({ ok: true }),
    wantSet: async (_slug, on) => ({ ok: true, wanting: on }),
    // the database's own rules, run on the merged row — the harness answers what the database would
    itemUpdate: async (id, patch) => {
      const row = items.get(id)
      if (!row) return { ok: false, error: 'not_found' }
      const merged = { ...row, ...patch } as OwnerItem
      const problem = precheck(draftOf(merged))
      if (problem) return { ok: false, error: problem.error, missing: problem.missing, key: problem.key }
      items.set(id, merged)
      return { ok: true, item: merged }
    },
    photoUpload: async () => ({ ok: false, error: 'off' }),
    photoRemove: async (path) => ({ ok: true, path, photos: [] }),
    photoOrder: async (_id, paths) => ({ ok: true, photos: [...paths] }),
    settings: async (patch) => ({
      ok: true,
      visibility: patch.visibility ?? data.closet.profile.visibility,
      showNickname: patch.showNickname ?? data.closet.profile.showNickname,
      shareToken: patch.rotateToken ? '9b1d4c7e2f6a4d3e8c0b5a7f1e2d3c4b' : data.closet.profile.shareToken,
    }),
    connections: async () => ({ ok: true, connections: data.connections }),
    notifications: async () => ({ ok: true, unread: data.notices.filter((row) => !row.read).length, items: data.notices }),
    notificationsRead: async () => ({ ok: true }) as Awaited<ReturnType<ClosetApi['notificationsRead']>>,
  }
}

export function CollectorHarness({ view, shirts }: { view: string; shirts: Record<string, CollectorShirt> }) {
  const data = useMemo(() => fixtures(shirts), [shirts])
  const api = useMemo(() => fakeApi(data), [data])
  const archive = useMemo(() => Object.values(shirts), [shirts])
  const first = data.closet.items[0] as OwnerItem
  const s = data.sample

  if (view === 'public' || view === 'hidden') {
    return (
      <Screen title={t('collector.public.title')} sub={t('collector.public.sub')}>
        <div data-qa-collector="ready">
          <PublicCloset handle={311} token={null} shirts={shirts} fixture={view === 'hidden' ? 'hidden' : data.view} />
        </div>
      </Screen>
    )
  }

  if (view === 'parts') {
    const bare = s[1] as CollectorShirt
    const held = s[6] as CollectorShirt
    return (
      <Screen title={t('collector.closet.title')} sub={t('collector.closet.sub')}>
        <div data-qa-collector="ready" className="grid gap-6 lg:grid-cols-2">
          <div>
            <p className="mt-stack font-mono text-[11px] tabular-nums text-muted">HaveWantBar · no database (signal undefined)</p>
            <HaveWantBar slug={bare.slug} kitId={bare.kitId} dateLabel={bare.seasonLabel ?? String(bare.year)} variantHe={null} signal={undefined} />
            <p className="mt-stack font-mono text-[11px] tabular-nums text-muted">HaveWantBar · counted, not yours</p>
            <HaveWantBar slug={bare.slug} kitId={bare.kitId} dateLabel={bare.seasonLabel ?? String(bare.year)} variantHe={bare.variantHe} signal={{ have: 4, want: 37, forTrade: 0, forSale: 0, live: 0, youHave: false, youWant: true }} />
            <p className="mt-stack font-mono text-[11px] tabular-nums text-muted">HaveWantBar · yours, wanted, in the market and at auction</p>
            <HaveWantBar slug={held.slug} kitId={held.kitId} dateLabel={held.seasonLabel ?? String(held.year)} variantHe={null} signal={{ have: 5, want: 37, forTrade: 1, forSale: 2, live: 1, youHave: true, youWant: false }} />
          </div>
          <div>
            <p className="mt-stack font-mono text-[11px] tabular-nums text-muted">Gate 4 · RealShirtAsk</p>
            <div className="max-w-[460px]">
              <RealShirtAsk slug={held.slug} kitId={held.kitId} />
            </div>
            <p className="mt-stack font-mono text-[11px] tabular-nums text-muted">NotificationList · every kind</p>
            <NotificationList items={data.notices} shirts={shirts} now={NOW} />
            <p className="mt-stack font-mono text-[11px] tabular-nums text-muted">MatchShare · trade</p>
            <MatchShare kind="trade" mine={(s[1] as CollectorShirt).seasonLabel ?? '1989/90'} theirs={held.seasonLabel ?? '1999/00'} />
            <p className="mt-stack font-mono text-[11px] tabular-nums text-muted">ClosetInvite · off</p>
            <ClosetInvite off />
          </div>
        </div>
      </Screen>
    )
  }

  const closet: Closet = view === 'empty' ? { ...data.closet, items: [], wants: [], unread: 0 } : data.closet
  return (
    <Screen title={t('collector.closet.title')} sub={t('collector.closet.sub')}>
      <p className="mt-stack max-w-prose font-body text-step-0 leading-relaxed text-ink">{t('collector.closet.lede')}</p>
      <div data-qa-collector="ready">
        <ClosetBoard
          closet={closet}
          shirts={shirts}
          archive={archive}
          api={api}
          initialEdit={view === 'editor' ? first.id : null}
          initialNotices={view === 'notices'}
          initialTab={view === 'want' ? 'want' : view === 'open' ? 'open' : view === 'connections' ? 'connections' : 'have'}
          now={NOW}
        />
      </div>
    </Screen>
  )
}
