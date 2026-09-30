import Image from 'next/image'

import { t, type MessageKey } from '@/lib/i18n'

/**
 * קרדיט הבנייה — mandatory on every Dubel Team project.
 *
 * The earlier version was a bare underlined line of mono text. It met the letter of the
 * spec and none of its intent: the credit sat at the same weight as the metadata beside
 * it, so nothing said this page was BUILT by anyone. It now carries the emblem, which
 * the spec asks for and this footer has room for.
 *
 * `engineered` is the right register for this project. It is not a storefront and not a
 * studio site — it is a data engine with a game on top, and the credit should read the
 * way the rest of the interface reads: dry, no adjectives.
 *
 * Contrast: `--concrete` on `--ink` is 7.5:1, well past AA, and the mark is
 * `aria-hidden` because the adjacent text already carries the meaning. The emblem is a
 * 256px PNG upstream, so it is served at 128 and rendered at 22 — sharp on a 3× phone,
 * and never larger, because at any real size the crowned dog smears into a red dot.
 */
export function BuiltByDubel({
  variant = 'engineered',
  showEmblem = true,
}: {
  variant?:
    | 'builtBy'
    | 'engineered'
    | 'designedDev'
    | 'built'
    | 'developedBy'
    | 'madeWithLove'
  showEmblem?: boolean
}) {
  const label = t(`credit.${variant}` as MessageKey)
  return (
    <a
      href="https://DubelTeam.com"
      target="_blank"
      rel="noopener noreferrer"
      aria-label={t('credit.aria', { label })}
      className="group inline-flex min-h-tap items-center gap-2.5 text-concrete transition-colors duration-press ease-stamp hover:text-sheet focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red motion-reduce:transition-none"
    >
      {showEmblem && (
        <Image
          src="/brand/dubel-emblem.png"
          alt=""
          aria-hidden="true"
          width={22}
          height={22}
          sizes="22px"
          unoptimized
          className="shrink-0"
        />
      )}
      <span className="font-latin text-[11px] font-bold tracking-[0.14em]" dir="ltr">
        {label}
      </span>
    </a>
  )
}
