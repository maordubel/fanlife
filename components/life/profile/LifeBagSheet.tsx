'use client'

import { useState } from 'react'

import { t } from '@/lib/i18n'
import { bagOverviewReading, type MemoryThing } from '@/lib/life/personal'
import type { SubscriptionReading } from '@/lib/life/profile'
import type { LifeSnapshot } from '@/lib/life/runtime/game'

import { BagOverview, type BagPage } from './BagOverview'
import { CurrentCarry } from './CurrentCarry'
import { LifeSheetShell, SectionBoundary } from './LifeSheetShell'
import { MemoryDrawer } from './MemoryDrawer'
import { MoneyAndSubscriptions } from './MoneyAndSubscriptions'
import { WardrobeRail } from './WardrobeRail'

/**
 * התיק שלי — "מה נשאר איתי" (spec §16–29).
 *
 * The other half of the dossier, and it must feel like the other half: `אני` is type and
 * lines, the bag is objects. Four compartments on one screen (§17, §40), each a drawer
 * that pulls out (§18). The reading is composed once per opening (`bagOverviewReading`),
 * so the face of a compartment and the drawer behind it can never disagree.
 *
 * What is NOT here any more, on purpose: "איפה הייתי". A day he was at is not an object he
 * carries; it moved to אני → הסיפור שלי (§13, §48, §76).
 */
export function LifeBagSheet({
  snapshot,
  subscription,
  page,
  onPage,
  onClose,
  onOther,
  onShare,
  turn,
}: {
  snapshot: LifeSnapshot
  subscription?: SubscriptionReading | null
  page: BagPage | null
  onPage: (page: BagPage | null) => void
  onClose: () => void
  onOther: () => void
  onShare: (thing: MemoryThing) => void
  turn: 'next' | 'back' | null
}) {
  const [reading] = useState(() => bagOverviewReading(snapshot.state, subscription))

  const titles: Record<BagPage, string> = {
    carry: t('life90h.bag.carry'),
    wardrobe: t('life90h.bag.wardrobe'),
    memories: t('life90h.bag.memories'),
    money: t('life90h.bag.money'),
  }
  const subtitles: Record<BagPage, string> = {
    carry: t('life90h.bag.carrySub'),
    wardrobe: t('life90h.bag.wardrobeSub'),
    memories: t('life.bag.boxNote'),
    money: t('life90h.bag.moneySub'),
  }

  return (
    <LifeSheetShell
      title={page ? titles[page] : t('life90h.bag.title')}
      subtitle={page ? subtitles[page] : t('life90h.bag.sub')}
      label={page ? titles[page] : t('life90h.bag.title')}
      onClose={onClose}
      onBack={page ? () => onPage(null) : null}
      backHe={t('life90h.bag.title')}
      other={{ labelHe: t('life90h.me.title'), onGo: onOther, dataLife: 'bag-to-me' }}
      turn={page ? null : turn}
      onSwipe={page ? null : (dir) => (dir === 'back' ? onOther() : undefined)}
      wide
      dataLife="profile"
    >
      <SectionBoundary>
        {page === 'carry' ? (
          <CurrentCarry carried={reading.carried} card={reading.card} />
        ) : page === 'wardrobe' ? (
          <WardrobeRail wardrobe={reading.wardrobe} merch />
        ) : page === 'memories' ? (
          <MemoryDrawer things={reading.memories} onShare={onShare} />
        ) : page === 'money' ? (
          <MoneyAndSubscriptions purses={reading.purses} subscription={subscription} card={reading.card} />
        ) : (
          <BagOverview reading={reading} onOpen={onPage} />
        )}
      </SectionBoundary>
    </LifeSheetShell>
  )
}
