'use client'

import { useMemo } from 'react'

import { AuctionApiProvider, liveApi, type AuctionApi } from '@/components/auction/AuctionApi'
import type { AuctionShirt } from '@/lib/collector/auction'

import { AuctionBoard } from '@/app/kits/auction/AuctionBoard'
import { LotRoom } from '@/app/kits/auction/[id]/LotRoom'
import { SubmitLot } from '@/app/kits/auction/submit/[itemId]/SubmitLot'
import { AdminGate } from '@/app/kits/admin/AdminGate'

import { fixtureApi, ITEM_ID, LOT_ID } from './fixtures'
import type { QaView } from './views'


export function AuctionQa({ view, shirts }: { view: QaView; shirts: Record<string, AuctionShirt> }) {
  const api: AuctionApi = useMemo(() => ({ ...liveApi, ...fixtureApi(view) }), [view])
  return (
    <AuctionApiProvider api={api}>
      {view === 'board' ? <AuctionBoard shirts={shirts} /> : null}
      {view.startsWith('lot-') ? <LotRoom lotId={LOT_ID} shirts={shirts} /> : null}
      {view === 'submit' ? <SubmitLot itemId={ITEM_ID} shirts={shirts} /> : null}
      {view === 'admin' ? <AdminGate /> : null}
    </AuctionApiProvider>
  )
}
