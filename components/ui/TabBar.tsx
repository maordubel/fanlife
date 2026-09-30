'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { TabMark, type MarkName } from '@/components/ui/TabMark'
import { t, type MessageKey } from '@/lib/i18n'

/**
 * הסרגל התחתון — fixed to the bottom of the viewport on every screen, above the
 * home indicator, with a real link and an active state per tab.
 *
 * It is `fixed`, not sticky-at-the-end-of-a-flex-column: on iOS the URL bar collapses
 * as you scroll and anything laid out in flow appears to drift. `Screen` reserves the
 * matching space, so nothing hides behind it.
 */

type Tab = { key: MessageKey; href: string; match: string; mark: MarkName; latin: string }

/**
 * Four places, in the order Maor set them, and each label names the place it goes to.
 *
 *   בלומפילד    `/`            the ground — the gate plan, and the way into every game
 *   אוסישקין    `/ussishkin`   the hall: the reconstruction and the memorial
 *   ה-פועל      `/hapoel`      the club itself — crests, honours, eras, songs, players
 *   המנוי שלך   `/tik`         gate 10 — the card, the punches, everything you played
 *
 * What changed, and why. The old third tab was **טריוויה**, pointing at one game, which
 * put a single mode on the same footing as the whole club and left the club itself with
 * no front door at all — 1,604 archive rows reachable only by walking in through a quiz.
 * The trivia wing is still gate 2 on the wall, where a game belongs.
 *
 * The old fourth tab was **הכרטיס**. "המנוי שלך" is not a rename for its own sake: a
 * card is a thing, a subscription is a relationship, and that tab is now where every
 * gate reports what you did (`lib/profile/store.ts`). The label had to say so.
 */
const TABS: Tab[] = [
  { key: 'tab.ground', href: '/', match: '/', mark: 'bloomfield', latin: 'BLOOMFIELD' },
  { key: 'tab.ussishkin', href: '/ussishkin', match: '/ussishkin', mark: 'ussishkin', latin: 'USSISHKIN' },
  { key: 'tab.hapoel', href: '/hapoel', match: '/hapoel', mark: 'hapoel', latin: 'HAPOEL' },
  { key: 'tab.member', href: '/tik', match: '/tik', mark: 'member', latin: 'MEMBER' },
]

export function TabBar() {
  const pathname = usePathname()

  return (
    <nav
      aria-label={t('tab.aria')}
      className="fixed inset-x-0 bottom-0 z-50 border-t-plate border-red bg-ink pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="mx-auto grid max-w-5xl grid-cols-4">
        {TABS.map((tab) => {
          const active = tab.match === '/' ? pathname === '/' : pathname.startsWith(tab.match)
          return (
            <li key={tab.key} className="relative">
              {/* the vermilion cap over the live tab — the plate is "lit", not tinted */}
              <span
                aria-hidden="true"
                className={`absolute inset-x-0 top-0 h-[3px] ${active ? 'bg-red' : 'bg-transparent'}`}
              />
              <Link
                href={tab.href}
                aria-current={active ? 'page' : undefined}
                className={`flex min-h-tap flex-col items-center justify-center gap-[5px] px-1 pb-2 pt-[9px] transition-transform duration-press ease-stamp active:scale-[.94] motion-reduce:transition-none ${
                  active ? 'text-red' : 'text-sheet'
                }`}
              >
                <TabMark name={tab.mark} active={active} />
                <span className="font-body text-[10px] font-extrabold leading-none">
                  {t(tab.key)}
                </span>
                {/* the Latin foot, the way every plate in this product is set */}
                <span
                  className={`font-latin text-[6.5px] font-bold leading-none tracking-[0.2em] ${
                    active ? 'text-red' : 'text-concrete'
                  }`}
                  dir="ltr"
                >
                  {tab.latin}
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
