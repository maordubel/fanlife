import Link from 'next/link'

import { t } from '@/lib/i18n'

/**
 * אני / התיק שלי — two destinations, not two tabs of one screen (ONE RED WORLD §24).
 *
 * "אני" is who you are (the card, how the terrace sees you, where you stand); "התיק שלי" is
 * what you made and kept. Both are real routes — `/tik` and `/tik/file` — so a link, the back
 * button and a shared URL each land on the right half. The bottom tab bar's "המנוי שלך" lights
 * for both (`/tik` prefix), and every old `/tik#…` link keeps working (rule 26).
 */
export function AreaSwitch({ active }: { active: 'me' | 'file' }) {
  const items = [
    { id: 'me' as const, href: '/tik', label: t('personal.switch.me'), latin: 'ME' },
    { id: 'file' as const, href: '/tik/file', label: t('personal.switch.file'), latin: 'FILE' },
  ]
  return (
    <nav aria-label={t('personal.switch.aria')} data-personal="switch" className="mt-stack">
      <ul className="grid grid-cols-2 border-rule border-ink md:inline-grid md:min-w-[360px]">
        {items.map((item) => {
          const on = item.id === active
          return (
            <li key={item.id}>
              <Link
                href={item.href}
                aria-current={on ? 'page' : undefined}
                className={`flex min-h-tap flex-col items-center justify-center px-3 py-1.5 transition-transform duration-press ease-stamp active:scale-[.98] motion-reduce:transition-none ${
                  on ? 'bg-ink text-paper' : 'bg-sheet text-ink'
                }`}
              >
                <span dir="ltr" className={`font-latin text-[8px] font-bold tracking-[0.24em] ${on ? 'text-red' : 'text-muted'}`}>
                  {item.latin}
                </span>
                <span className="font-display text-[19px] leading-none">{item.label}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
