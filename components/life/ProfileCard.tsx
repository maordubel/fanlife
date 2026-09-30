'use client'

import { useState } from 'react'

import { ShareSheet } from '@/components/life/ShareSheet'
import { LifeBagSheet } from '@/components/life/profile/LifeBagSheet'
import { LifeIdentitySheet, type MePage } from '@/components/life/profile/LifeIdentitySheet'
import type { BagPage } from '@/components/life/profile/BagOverview'
import type { LifeSnapshot } from '@/lib/life/runtime/game'
import type { SubscriptionReading } from '@/lib/life/profile'
import { cardForMemory, type ShareCard } from '@/lib/life/share'

/**
 * אני · התיק שלי — two destinations, one dossier (delta 90-H, 25.9.2026).
 *
 * For five passes this was one card with two leaves, "התיק" and "אני", behind a tab —
 * a bag that opened on a character sheet's second page. Maor's spec for the personal
 * layer (`THE-WORKER-LIFE-ME-BAG-UX-IMPLEMENTATION.md`) splits it by the question each
 * half answers:
 *
 *   · **אני** — "מי נהייתי": a hero set as type, the paths of a life drawn as lines off
 *     one trunk, the people as a constellation of distances, the biography of this run
 *     (הסיפור שלי — where he was, in the first person), and how he is today.
 *   · **התיק שלי** — "מה נשאר איתי": four compartments of objects — what is on him, the
 *     wardrobe rail, the Red Box laid out on a desk, the pocket, the tin and the season
 *     card.
 *
 * They are separate destinations from the HUD (`אני` and `התיק` beside ☰), from the menu,
 * and from the bedroom desk (the bag). There is no tab between them any more; each has
 * a quiet door to the other in its header, and on a phone a swipe turns the page (§4,
 * §39). The numbers stay on `GaugesSheet` (rule 46 / 63א — "הגיליון עונה 'כמה', הכרטיס
 * עונה 'מי אתה'") and are not merged in (§49).
 *
 * This file is the router and the one owner of what the two halves share: which half is
 * open, which page of each is open (kept while you turn to the other half and back, §4 —
 * "אין reset של state במעבר פנימי מיותר"), and the share sheet a memory opens.
 * Everything it draws is in `components/life/profile/`; every reading is in
 * `lib/life/profile.ts` (the translator) and `lib/life/personal.ts` (the composition).
 * No page state is ever written to the save (§69).
 */
export type ProfileView = 'me' | 'bag'

export function ProfileCard({
  snapshot,
  subscription,
  view = 'bag',
  onView,
  onClose,
}: {
  snapshot: LifeSnapshot
  /** the season subscription — `subscriptionReading` in `lib/life/subscription.ts` */
  subscription?: SubscriptionReading | null
  /** which half of the dossier is open; the caller owns it so the HUD can open either */
  view?: ProfileView
  onView?: (view: ProfileView) => void
  onClose: () => void
}) {
  const [local, setLocal] = useState<ProfileView>(view)
  const current = onView ? view : local
  const [mePage, setMePage] = useState<MePage | null>(null)
  const [bagPage, setBagPage] = useState<BagPage | null>(null)
  const [turn, setTurn] = useState<'next' | 'back' | null>(null)
  const [sharing, setSharing] = useState<ShareCard | null>(null)

  const go = (next: ProfileView) => {
    setTurn(next === 'bag' ? 'next' : 'back')
    if (onView) onView(next)
    else setLocal(next)
  }

  return (
    <>
      {current === 'me' ? (
        <LifeIdentitySheet snapshot={snapshot} page={mePage} onPage={setMePage} onClose={onClose} onOther={() => go('bag')} turn={turn} />
      ) : (
        <LifeBagSheet
          snapshot={snapshot}
          subscription={subscription}
          page={bagPage}
          onPage={setBagPage}
          onClose={onClose}
          onOther={() => go('me')}
          onShare={(thing) => (thing.keepsake ? setSharing(cardForMemory(snapshot.state, thing.keepsake.source)) : undefined)}
          turn={turn}
        />
      )}
      {sharing ? <ShareSheet card={sharing} onClose={() => setSharing(null)} /> : null}
    </>
  )
}
