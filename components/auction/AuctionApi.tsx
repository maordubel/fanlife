'use client'

import { createContext, useContext, type ReactNode } from 'react'

import * as api from '@/lib/collector/api'
import { sessionUserId } from '@/lib/portal/sync'

/**
 * הצינור של המכירה הפומבית, כהקשר — כדי שמסך אחד ירוץ גם מול המסד וגם מול מתקן הבדיקה.
 *
 * המסכים לא מייבאים את `lib/collector/api` ישירות: הם שואלים את ההקשר, ובאתר ההקשר הוא
 * הצינור האמיתי. `app/qa/auction` מחליף אותו בנתוני דוגמה (רק בפיתוח ובתצוגה מקדימה), כך
 * שכל מצב של לוט — לפני, חי, מוביל, עקפו אותך, מוכר, זוכה, הושלם — נראה על המסך בלי מסד.
 */
export type AuctionApi = {
  signedIn: () => Promise<boolean>
  auctionList: typeof api.auctionList
  auctionState: typeof api.auctionState
  auctionBid: typeof api.auctionBid
  auctionWatch: typeof api.auctionWatch
  auctionComplete: typeof api.auctionComplete
  auctionWithdraw: typeof api.auctionWithdraw
  auctionSubmit: typeof api.auctionSubmit
  closetMine: typeof api.closetMine
  adminWhoami: typeof api.adminWhoami
  adminOverview: typeof api.adminOverview
  adminLots: typeof api.adminLots
  adminLotDecide: typeof api.adminLotDecide
  adminLotCancel: typeof api.adminLotCancel
  adminBidVoid: typeof api.adminBidVoid
  adminReports: typeof api.adminReports
  adminReportResolve: typeof api.adminReportResolve
  adminConnectionView: typeof api.adminConnectionView
  adminItemSuspend: typeof api.adminItemSuspend
  adminMerchantList: typeof api.adminMerchantList
  adminMerchantUpsert: typeof api.adminMerchantUpsert
  adminAudit: typeof api.adminAudit
}

export const liveApi: AuctionApi = {
  signedIn: async () => (await sessionUserId()) !== null,
  auctionList: api.auctionList,
  auctionState: api.auctionState,
  auctionBid: api.auctionBid,
  auctionWatch: api.auctionWatch,
  auctionComplete: api.auctionComplete,
  auctionWithdraw: api.auctionWithdraw,
  auctionSubmit: api.auctionSubmit,
  closetMine: api.closetMine,
  adminWhoami: api.adminWhoami,
  adminOverview: api.adminOverview,
  adminLots: api.adminLots,
  adminLotDecide: api.adminLotDecide,
  adminLotCancel: api.adminLotCancel,
  adminBidVoid: api.adminBidVoid,
  adminReports: api.adminReports,
  adminReportResolve: api.adminReportResolve,
  adminConnectionView: api.adminConnectionView,
  adminItemSuspend: api.adminItemSuspend,
  adminMerchantList: api.adminMerchantList,
  adminMerchantUpsert: api.adminMerchantUpsert,
  adminAudit: api.adminAudit,
}

const Context = createContext<AuctionApi>(liveApi)

export function AuctionApiProvider({ api: value, children }: { api: AuctionApi; children: ReactNode }) {
  return <Context.Provider value={value}>{children}</Context.Provider>
}

export const useAuctionApi = () => useContext(Context)
